-- ================================================================
-- HostelHub: Auto-Room Generation Migration
-- Run in Supabase SQL Editor — fully idempotent
-- ================================================================

-- ── 1. Ensure total_capacity column exists (alias for total_rooms) ──────────
-- The existing schema already has total_rooms. We add total_capacity
-- as a generated alias so both work. No data loss.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'hostels'
      AND column_name  = 'total_capacity'
  ) THEN
    -- Mirror total_rooms into total_capacity (same data, alternate name)
    ALTER TABLE public.hostels
      ADD COLUMN total_capacity INTEGER
        GENERATED ALWAYS AS (total_rooms) STORED;
  END IF;
END $$;

-- ── 2. Auto-room generation function ────────────────────────────────────────
-- Fires after INSERT or UPDATE on hostels.
-- Creates/adds missing rooms so total count always equals total_rooms.
-- Uses UPSERT to avoid duplicates on re-run.
CREATE OR REPLACE FUNCTION public.auto_generate_rooms()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  existing_count INTEGER;
  i INTEGER;
  room_label TEXT;
BEGIN
  -- How many rooms already exist for this hostel?
  SELECT COUNT(*) INTO existing_count
  FROM public.rooms
  WHERE hostel_id = NEW.id;

  -- Create rooms for any slots that are missing
  IF NEW.total_rooms > existing_count THEN
    FOR i IN (existing_count + 1)..NEW.total_rooms LOOP
      room_label := 'Room ' || i;
      INSERT INTO public.rooms (hostel_id, room_number, price, capacity, is_available)
      VALUES (NEW.id, room_label, NEW.price_per_year, 1, TRUE)
      ON CONFLICT (hostel_id, room_number) DO NOTHING;
    END LOOP;
  END IF;

  -- If total_rooms was reduced, mark excess rooms unavailable (don't delete)
  IF NEW.total_rooms < existing_count THEN
    UPDATE public.rooms
    SET is_available = FALSE
    WHERE hostel_id = NEW.id
      AND CAST(REPLACE(room_number, 'Room ', '') AS INTEGER) > NEW.total_rooms
      AND room_number ~ '^Room [0-9]+$';
  END IF;

  -- Sync available_rooms = count of rooms that are still available
  UPDATE public.hostels
  SET available_rooms = (
    SELECT COUNT(*) FROM public.rooms
    WHERE hostel_id = NEW.id AND is_available = TRUE
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Drop and recreate triggers (idempotent)
DROP TRIGGER IF EXISTS trg_auto_generate_rooms_insert ON public.hostels;
DROP TRIGGER IF EXISTS trg_auto_generate_rooms_update ON public.hostels;

CREATE TRIGGER trg_auto_generate_rooms_insert
  AFTER INSERT ON public.hostels
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_rooms();

-- Only fires when total_rooms actually changes on update
CREATE TRIGGER trg_auto_generate_rooms_update
  AFTER UPDATE OF total_rooms ON public.hostels
  FOR EACH ROW
  WHEN (OLD.total_rooms IS DISTINCT FROM NEW.total_rooms)
  EXECUTE FUNCTION public.auto_generate_rooms();

-- ── 3. Backfill rooms for existing hostels that have none ───────────────────
DO $$
DECLARE
  h RECORD;
  i INTEGER;
BEGIN
  FOR h IN
    SELECT id, total_rooms, price_per_year
    FROM public.hostels
    WHERE total_rooms > 0
      AND id NOT IN (SELECT DISTINCT hostel_id FROM public.rooms)
  LOOP
    FOR i IN 1..h.total_rooms LOOP
      INSERT INTO public.rooms (hostel_id, room_number, price, capacity, is_available)
      VALUES (h.id, 'Room ' || i, h.price_per_year, 1, TRUE)
      ON CONFLICT (hostel_id, room_number) DO NOTHING;
    END LOOP;

    UPDATE public.hostels
    SET available_rooms = h.total_rooms
    WHERE id = h.id;
  END LOOP;
END $$;

-- ── 4. Auto-booking assignment function ─────────────────────────────────────
-- Called by the API. Finds the lowest-numbered available room,
-- claims it, decrements available_rooms, returns the room row.
-- Wrapped in a transaction so two concurrent bookings can't grab the same room.
CREATE OR REPLACE FUNCTION public.claim_next_room(
  p_hostel_id UUID,
  p_student_id UUID
)
RETURNS TABLE (
  room_id    UUID,
  room_number TEXT,
  price      NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room RECORD;
BEGIN
  -- Lock the hostel row for this transaction (prevents race conditions)
  PERFORM id FROM public.hostels
  WHERE id = p_hostel_id AND available_rooms > 0
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HOSTEL_FULL: No bed spaces available';
  END IF;

  -- Check this student does not already have an active booking here
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE student_id = p_student_id
      AND hostel_id  = p_hostel_id
      AND status IN ('PENDING_VERIFICATION', 'CONFIRMED')
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_BOOKING: You already have an active booking at this hostel';
  END IF;

  -- Grab the first available room (ordered by room number)
  SELECT r.id, r.room_number, r.price
  INTO v_room
  FROM public.rooms r
  WHERE r.hostel_id   = p_hostel_id
    AND r.is_available = TRUE
  ORDER BY
    -- Sort numerically if the room_number matches "Room N" pattern
    CASE WHEN r.room_number ~ '^Room [0-9]+$'
         THEN CAST(REPLACE(r.room_number, 'Room ', '') AS INTEGER)
         ELSE 9999
    END,
    r.room_number
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HOSTEL_FULL: No bed spaces available';
  END IF;

  -- Mark the room as taken
  UPDATE public.rooms
  SET is_available = FALSE
  WHERE id = v_room.id;

  -- Decrement available count on the hostel
  UPDATE public.hostels
  SET available_rooms = available_rooms - 1
  WHERE id = p_hostel_id;

  RETURN QUERY SELECT v_room.id, v_room.room_number, v_room.price;
END;
$$;

-- Grant execute to authenticated users (called via service-role server)
GRANT EXECUTE ON FUNCTION public.claim_next_room(UUID, UUID) TO service_role;

-- ── 5. Release room when booking is cancelled or rejected ──────────────────
CREATE OR REPLACE FUNCTION public.release_room_on_booking_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- When a booking moves to CANCELLED or REJECTED from a non-cancelled state
  IF NEW.status IN ('CANCELLED', 'REJECTED')
     AND OLD.status NOT IN ('CANCELLED', 'REJECTED')
     AND NEW.room_id IS NOT NULL THEN

    UPDATE public.rooms
    SET is_available = TRUE
    WHERE id = NEW.room_id;

    UPDATE public.hostels
    SET available_rooms = available_rooms + 1
    WHERE id = NEW.hostel_id;
  END IF;

  -- When a booking is CONFIRMED, ensure room stays marked unavailable
  IF NEW.status = 'CONFIRMED' AND OLD.status != 'CONFIRMED' AND NEW.room_id IS NOT NULL THEN
    UPDATE public.rooms SET is_available = FALSE WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_room ON public.bookings;
CREATE TRIGGER trg_release_room
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.release_room_on_booking_change();


-- ── 6. Manual room release (rollback helper used when booking INSERT fails) ──
CREATE OR REPLACE FUNCTION public.release_room_manual(
  p_room_id    UUID,
  p_hostel_id  UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.rooms
  SET is_available = TRUE
  WHERE id = p_room_id;

  UPDATE public.hostels
  SET available_rooms = LEAST(available_rooms + 1, total_rooms)
  WHERE id = p_hostel_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_room_manual(UUID, UUID) TO service_role;
