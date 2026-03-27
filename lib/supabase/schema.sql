-- HostelHub Database Schema v2
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING

-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'STUDENT'
                CHECK (role IN ('ADMIN', 'LANDLORD', 'STUDENT')),
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hostels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  location        TEXT NOT NULL,
  address         TEXT NOT NULL DEFAULT '',
  price_per_year  NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  facilities      TEXT[]  DEFAULT '{}',
  images          TEXT[]  DEFAULT '{}',
  bank_name       TEXT NOT NULL DEFAULT '',
  account_number  TEXT NOT NULL DEFAULT '',
  account_name    TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT,
  total_rooms     INTEGER NOT NULL DEFAULT 0,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id   UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  price       NUMERIC(12,2) NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 1,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hostel_id, room_number)
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  room_id       UUID NOT NULL REFERENCES public.rooms(id)   ON DELETE CASCADE,
  hostel_id     UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
                  CHECK (status IN ('PENDING_VERIFICATION','CONFIRMED','REJECTED','CANCELLED')),
  academic_year TEXT NOT NULL DEFAULT '2024/2025',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  image_url        TEXT,
  whatsapp_proof   TEXT,
  note             TEXT,
  amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favorites (
  student_id UUID NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  hostel_id  UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, hostel_id)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_hostels_landlord_id  ON public.hostels(landlord_id);
CREATE INDEX IF NOT EXISTS idx_hostels_status        ON public.hostels(status);
CREATE INDEX IF NOT EXISTS idx_hostels_location      ON public.hostels(location);
CREATE INDEX IF NOT EXISTS idx_rooms_hostel_id       ON public.rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_available       ON public.rooms(is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id   ON public.bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id      ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hostel_id    ON public.bookings(hostel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_payment_booking_id    ON public.payment_proofs(booking_id);
CREATE INDEX IF NOT EXISTS idx_favorites_student_id  ON public.favorites(student_id);

-- ================================================================
-- updated_at TRIGGER
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON public.users FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_hostels_updated_at') THEN
    CREATE TRIGGER update_hostels_updated_at
      BEFORE UPDATE ON public.hostels FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_rooms_updated_at') THEN
    CREATE TRIGGER update_rooms_updated_at
      BEFORE UPDATE ON public.rooms FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at') THEN
    CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON public.bookings FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_proofs_updated_at') THEN
    CREATE TRIGGER update_payment_proofs_updated_at
      BEFORE UPDATE ON public.payment_proofs FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ================================================================
-- SECURITY DEFINER HELPER — avoids recursive RLS
-- ================================================================
-- This function runs as the definer (superuser context), so it can
-- read public.users freely even inside RLS policies.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites       ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------
-- Admins can do everything
CREATE POLICY "admin_all_users"
  ON public.users FOR ALL
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

-- Users can read + update their own row
CREATE POLICY "own_profile_select"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "own_profile_update"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert from trigger / service role (handle_new_user)
CREATE POLICY "insert_own_profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- ----------------------------------------------------------------
-- HOSTELS
-- ----------------------------------------------------------------
CREATE POLICY "admin_all_hostels"
  ON public.hostels FOR ALL
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY "public_approved_hostels"
  ON public.hostels FOR SELECT
  USING (status = 'APPROVED');

CREATE POLICY "landlord_own_hostels"
  ON public.hostels FOR ALL
  USING (landlord_id = auth.uid() AND public.get_my_role() = 'LANDLORD')
  WITH CHECK (landlord_id = auth.uid() AND public.get_my_role() = 'LANDLORD');

-- ----------------------------------------------------------------
-- ROOMS
-- ----------------------------------------------------------------
CREATE POLICY "admin_all_rooms"
  ON public.rooms FOR ALL
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "public_rooms_of_approved_hostels"
  ON public.rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hostels
      WHERE id = rooms.hostel_id AND status = 'APPROVED'
    )
  );

CREATE POLICY "landlord_manage_own_rooms"
  ON public.rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.hostels
      WHERE id = rooms.hostel_id AND landlord_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- BOOKINGS
-- ----------------------------------------------------------------
CREATE POLICY "admin_all_bookings"
  ON public.bookings FOR ALL
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "student_own_bookings"
  ON public.bookings FOR ALL
  USING (student_id = auth.uid() AND public.get_my_role() = 'STUDENT')
  WITH CHECK (student_id = auth.uid() AND public.get_my_role() = 'STUDENT');

CREATE POLICY "landlord_hostel_bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hostels
      WHERE id = bookings.hostel_id AND landlord_id = auth.uid()
    )
  );

CREATE POLICY "landlord_update_booking_status"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.hostels
      WHERE id = bookings.hostel_id AND landlord_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- PAYMENT PROOFS
-- ----------------------------------------------------------------
CREATE POLICY "admin_all_payment_proofs"
  ON public.payment_proofs FOR ALL
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "student_own_payment_proofs"
  ON public.payment_proofs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = payment_proofs.booking_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "landlord_hostel_payment_proofs"
  ON public.payment_proofs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.hostels h ON b.hostel_id = h.id
      WHERE b.id = payment_proofs.booking_id AND h.landlord_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- FAVORITES
-- ----------------------------------------------------------------
CREATE POLICY "student_own_favorites"
  ON public.favorites FOR ALL
  USING (student_id = auth.uid());

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs', 'payment-proofs', false,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hostel-images', 'hostel-images', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies (safe re-run)
DROP POLICY IF EXISTS "auth_upload_payment_proofs"  ON storage.objects;
DROP POLICY IF EXISTS "auth_view_payment_proofs"    ON storage.objects;
DROP POLICY IF EXISTS "public_view_hostel_images"   ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_hostel_images"   ON storage.objects;

CREATE POLICY "auth_upload_payment_proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "auth_view_payment_proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "public_view_hostel_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hostel-images');

CREATE POLICY "auth_upload_hostel_images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hostel-images' AND auth.role() = 'authenticated');

-- ================================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    name  = EXCLUDED.name,
    role  = EXCLUDED.role,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- MAKE YOUR FIRST ADMIN (run separately after creating your account)
-- ================================================================
-- UPDATE public.users SET role = 'ADMIN' WHERE email = 'your@email.com';
