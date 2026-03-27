import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateBookingSchema = z.object({
  room_id: z.string().uuid(),
  hostel_id: z.string().uuid(),
  academic_year: z.string().min(4),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const hostelId = searchParams.get("hostel_id");

    let query = supabase
      .from("bookings")
      .select(`
        *,
        student:users!student_id(id, name, email, phone),
        room:rooms!room_id(*),
        hostel:hostels!hostel_id(id, name, location, address),
        payment_proof:payment_proofs(*)
      `)
      .order("created_at", { ascending: false });

    if (profile?.role === "STUDENT") {
      query = query.eq("student_id", user.id);
    } else if (profile?.role === "LANDLORD") {
      // Get landlord's hostel IDs
      const { data: hostels } = await supabase
        .from("hostels")
        .select("id")
        .eq("landlord_id", user.id);
      const hostelIds = (hostels ?? []).map((h) => h.id);
      if (hostelIds.length === 0) return NextResponse.json({ data: [] });
      query = query.in("hostel_id", hostelIds);
    }
    // Admin sees all

    if (status) query = query.eq("status", status);
    if (hostelId) query = query.eq("hostel_id", hostelId);

    const { data, error } = await query;
    if (error) throw error;

    // Flatten payment_proof (it's an array from the join)
    const normalized = (data ?? []).map((b) => ({
      ...b,
      payment_proof: Array.isArray(b.payment_proof) ? b.payment_proof[0] ?? null : b.payment_proof,
    }));

    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can book rooms" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    // Check room availability
    const { data: room } = await supabase
      .from("rooms")
      .select("is_available, hostel_id")
      .eq("id", parsed.data.room_id)
      .single();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (!room.is_available) return NextResponse.json({ error: "Room is not available" }, { status: 409 });

    // Check no existing active booking by this student for this room
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("student_id", user.id)
      .eq("room_id", parsed.data.room_id)
      .in("status", ["PENDING_VERIFICATION", "CONFIRMED"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You already have an active booking for this room" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        student_id: user.id,
        room_id: parsed.data.room_id,
        hostel_id: parsed.data.hostel_id,
        academic_year: parsed.data.academic_year,
        notes: parsed.data.notes,
        status: "PENDING_VERIFICATION",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: "Booking created. Please upload your payment proof." }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
