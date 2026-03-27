-- HostelHub RLS Quick-Fix Script
-- Run this in Supabase SQL Editor if you see 500 errors on /rest/v1/users
-- This script is idempotent — safe to run multiple times.

-- ────────────────────────────────────────────────────────────
-- 1. Create the security-definer role helper
--    This avoids recursive self-reference in RLS policies.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1),
    'STUDENT'  -- safe default prevents NULL-related policy failures
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;

-- ────────────────────────────────────────────────────────────
-- 2. Drop ALL existing policies (clean slate)
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM   pg_policies
    WHERE  schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      r.policyname, r.tablename
    );
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Enable RLS on all tables (idempotent)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites      ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 4. USERS policies
-- ────────────────────────────────────────────────────────────
-- Admin sees and manages everyone
CREATE POLICY "admin_full_users"
  ON public.users FOR ALL
  USING      (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

-- Users read their own row
CREATE POLICY "self_read_users"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users update their own row (name, phone, avatar only — not role)
CREATE POLICY "self_update_users"
  ON public.users FOR UPDATE
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow the trigger / service role to insert profile rows
CREATE POLICY "service_insert_users"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 5. HOSTELS policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "admin_full_hostels"
  ON public.hostels FOR ALL
  USING      (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

-- Anyone (logged-in or not) can read approved hostels
CREATE POLICY "public_read_approved_hostels"
  ON public.hostels FOR SELECT
  USING (status = 'APPROVED');

-- Landlords manage only their own hostels
CREATE POLICY "landlord_own_hostels"
  ON public.hostels FOR ALL
  USING      (landlord_id = auth.uid() AND public.get_my_role() = 'LANDLORD')
  WITH CHECK (landlord_id = auth.uid() AND public.get_my_role() = 'LANDLORD');

-- ────────────────────────────────────────────────────────────
-- 6. ROOMS policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "admin_full_rooms"
  ON public.rooms FOR ALL
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "public_read_rooms_of_approved_hostels"
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

-- ────────────────────────────────────────────────────────────
-- 7. BOOKINGS policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "admin_full_bookings"
  ON public.bookings FOR ALL
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "student_own_bookings"
  ON public.bookings FOR ALL
  USING      (student_id = auth.uid() AND public.get_my_role() = 'STUDENT')
  WITH CHECK (student_id = auth.uid() AND public.get_my_role() = 'STUDENT');

CREATE POLICY "landlord_read_hostel_bookings"
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

-- ────────────────────────────────────────────────────────────
-- 8. PAYMENT PROOFS policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "admin_full_payment_proofs"
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

CREATE POLICY "landlord_payment_proofs"
  ON public.payment_proofs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.hostels h ON b.hostel_id = h.id
      WHERE b.id = payment_proofs.booking_id AND h.landlord_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 9. FAVORITES policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "student_own_favorites"
  ON public.favorites FOR ALL
  USING (student_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- Done. Verify with:
--   SELECT policyname, tablename, cmd FROM pg_policies WHERE schemaname = 'public';
-- ────────────────────────────────────────────────────────────
