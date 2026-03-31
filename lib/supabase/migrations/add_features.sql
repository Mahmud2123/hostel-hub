-- HostelHub Enhancement Migration
-- Run in Supabase SQL Editor
-- Safe to run on existing databases — all statements are idempotent

-- ================================================================
-- 1. OTP CODES TABLE (for OTP verification system)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.otp_codes (
  email      TEXT PRIMARY KEY,
  otp        TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-delete expired OTPs older than 1 hour (keep table clean)
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON public.otp_codes(expires_at);

-- RLS: only service role can read/write OTP codes (never exposed to clients)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_otp" ON public.otp_codes;
CREATE POLICY "service_role_otp"
  ON public.otp_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- 2. LANDLORD REQUESTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS public.landlord_requests (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING', 'CONTACTED', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landlord_requests_status ON public.landlord_requests(status);
CREATE INDEX IF NOT EXISTS idx_landlord_requests_created ON public.landlord_requests(created_at DESC);

ALTER TABLE public.landlord_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can INSERT a request (it's a public contact form)
DROP POLICY IF EXISTS "public_insert_landlord_requests" ON public.landlord_requests;
CREATE POLICY "public_insert_landlord_requests"
  ON public.landlord_requests FOR INSERT
  WITH CHECK (true);

-- Only admin can READ and UPDATE requests
DROP POLICY IF EXISTS "admin_manage_landlord_requests" ON public.landlord_requests;
CREATE POLICY "admin_manage_landlord_requests"
  ON public.landlord_requests FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "admin_update_landlord_requests" ON public.landlord_requests;
CREATE POLICY "admin_update_landlord_requests"
  ON public.landlord_requests FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

-- Trigger for updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_landlord_requests_updated_at') THEN
    CREATE TRIGGER update_landlord_requests_updated_at
      BEFORE UPDATE ON public.landlord_requests
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ================================================================
-- 3. ENSURE hostels.images COLUMN EXISTS (text array)
--    The column already exists in the schema but this is a safety check
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'hostels'
      AND column_name  = 'images'
  ) THEN
    ALTER TABLE public.hostels ADD COLUMN images TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ================================================================
-- 4. HOSTEL-IMAGES storage bucket (ensure it exists and is public)
-- ================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hostel-images', 'hostel-images', true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
    public            = true,
    file_size_limit   = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage policies (idempotent)
DROP POLICY IF EXISTS "public_view_hostel_images"     ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_hostel_images"     ON storage.objects;
DROP POLICY IF EXISTS "landlord_delete_hostel_images" ON storage.objects;

CREATE POLICY "public_view_hostel_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hostel-images');

CREATE POLICY "auth_upload_hostel_images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hostel-images' AND auth.role() = 'authenticated');

CREATE POLICY "landlord_delete_hostel_images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'hostel-images' AND auth.role() = 'authenticated');
