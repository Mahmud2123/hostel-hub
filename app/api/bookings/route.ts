import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateBookingSchema = z.object({
  hostel_id:     z.string().uuid("Invalid hostel ID"),
  academic_year: z.string().min(4, "Academic year required"),
  notes:         z.string().max(500).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET — list bookings filtered by role
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();

    const { searchParams } = new URL(request.url);
    const status   = searchParams.get("status");
    const hostelId = searchParams.get("hostel_id");

    let query = supabase
      .from("bookings")
      .select(`
        *,
        student:users!student_id(id, name, email, phone),
        room:rooms!room_id(id, room_number, price, capacity),
        hostel:hostels!hostel_id(id, name, location, address, bank_name, account_number, account_name, whatsapp_number),
        payment_proof:payment_proofs(*)
      `)
      .order("created_at", { ascending: false });

    if (profile?.role === "STUDENT") {
      query = query.eq("student_id", user.id);
    } else if (profile?.role === "LANDLORD") {
      const { data: myHostels } = await supabase
        .from("hostels").select("id").eq("landlord_id", user.id);
      const ids = (myHostels ?? []).map((h) => h.id);
      if (ids.length === 0) return NextResponse.json({ data: [] });
      query = query.in("hostel_id", ids);
    }

    if (status)   query = query.eq("status",    status);
    if (hostelId) query = query.eq("hostel_id", hostelId);

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data ?? []).map((b) => ({
      ...b,
      payment_proof: Array.isArray(b.payment_proof)
        ? (b.payment_proof[0] ?? null)
        : b.payment_proof,
    }));

    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error("GET /api/bookings:", err);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — create a booking with automatic room assignment
// Does NOT require any SQL migration or RPC function to be installed first.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
    }

    // ── 2. Role check ────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();

    if (profile?.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can make bookings" }, { status: 403 });
    }

    // ── 3. Input validation ──────────────────────────────────────────────────
    const body = await request.json();
    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { hostel_id, academic_year, notes } = parsed.data;

    // ── 4. Fetch hostel — must exist and be approved ─────────────────────────
    const { data: hostel, error: hostelErr } = await supabase
      .from("hostels")
      .select("id, name, status, total_rooms, available_rooms, price_per_year")
      .eq("id", hostel_id)
      .single();

    if (hostelErr || !hostel) {
      console.error("Hostel fetch error:", hostelErr);
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }
    if (hostel.status !== "APPROVED") {
      return NextResponse.json({ error: "This hostel is not yet approved for booking" }, { status: 403 });
    }
    if ((hostel.available_rooms ?? 0) <= 0) {
      return NextResponse.json({ error: "This hostel is fully booked — no bed spaces left" }, { status: 409 });
    }

    // ── 5. Check for duplicate active booking by this student ────────────────
    const { data: duplicate } = await supabase
      .from("bookings")
      .select("id")
      .eq("student_id", user.id)
      .eq("hostel_id",  hostel_id)
      .in("status", ["PENDING_VERIFICATION", "CONFIRMED"])
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        { error: "You already have an active booking at this hostel" },
        { status: 409 }
      );
    }

    // ── 6. Get or create rooms for this hostel ───────────────────────────────
    // This block works regardless of whether auto_rooms.sql has been applied.
    // It ensures there are always rooms to assign.
    const { data: existingRooms } = await supabase
      .from("rooms")
      .select("id, room_number, price, is_available")
      .eq("hostel_id", hostel_id)
      .order("created_at", { ascending: true });

    let rooms = existingRooms ?? [];

    // If no rooms exist yet, auto-generate them now using the admin client
    if (rooms.length === 0 && hostel.total_rooms > 0) {
      console.log(`Auto-generating ${hostel.total_rooms} rooms for hostel ${hostel_id}`);

      // Try admin client first (bypasses RLS for insert); fall back to regular client
      let insertClient: ReturnType<typeof createAdminClient> | ReturnType<typeof createClient>;
      try {
        insertClient = createAdminClient();
      } catch {
        insertClient = supabase;
      }

      const roomsToCreate = Array.from({ length: hostel.total_rooms }, (_, i) => ({
        hostel_id,
        room_number:  `Room ${i + 1}`,
        price:        hostel.price_per_year,
        capacity:     1,
        is_available: true,
      }));

      const { data: createdRooms, error: createErr } = await insertClient
        .from("rooms")
        .insert(roomsToCreate)
        .select("id, room_number, price, is_available");

      if (createErr) {
        console.error("Room auto-creation failed:", createErr);
        // Don't throw — fall through and let the "no rooms" error surface below
      } else {
        rooms = createdRooms ?? [];
        // Set available_rooms on hostel
        await supabase
          .from("hostels")
          .update({ available_rooms: hostel.total_rooms })
          .eq("id", hostel_id);
      }
    }

    // ── 7. Find the first available room ─────────────────────────────────────
    // Sort: "Room 1" < "Room 2" < ... numerically
    const available = rooms
      .filter((r) => r.is_available)
      .sort((a, b) => {
        const numA = parseInt(a.room_number.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.room_number.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });

    if (available.length === 0) {
      return NextResponse.json(
        { error: "No bed spaces available. This hostel may be fully booked." },
        { status: 409 }
      );
    }

    const assignedRoom = available[0];

    // ── 8. Create the booking record ─────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        student_id:    user.id,
        room_id:       assignedRoom.id,
        hostel_id,
        academic_year,
        notes:         notes?.trim() ?? null,
        status:        "PENDING_VERIFICATION",
      })
      .select()
      .single();

    if (bookingErr) {
      console.error("Booking insert error:", bookingErr);
      return NextResponse.json(
        { error: `Booking failed: ${bookingErr.message}` },
        { status: 500 }
      );
    }

    // ── 9. Mark room taken + decrement counter ───────────────────────────────
    // Do both in parallel; use admin client if available (bypasses RLS for update)
    let updateClient: ReturnType<typeof createAdminClient> | ReturnType<typeof createClient>;
    try {
      updateClient = createAdminClient();
    } catch {
      updateClient = supabase;
    }

    await Promise.all([
      updateClient
        .from("rooms")
        .update({ is_available: false })
        .eq("id", assignedRoom.id),
      updateClient
        .from("hostels")
        .update({ available_rooms: Math.max(0, (hostel.available_rooms ?? 1) - 1) })
        .eq("id", hostel_id),
    ]);

    return NextResponse.json(
      {
        data: {
          ...booking,
          assigned_room: assignedRoom.room_number,
        },
        message: `Success! You have been assigned ${assignedRoom.room_number}. Please upload your payment receipt.`,
      },
      { status: 201 }
    );
  } catch (err) {
    // Log the full error object so it appears in terminal during dev
    console.error("POST /api/bookings — unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create booking" },
      { status: 500 }
    );
  }
}
