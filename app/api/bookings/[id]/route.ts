import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateBookingSchema = z.object({
  status: z.enum(["PENDING_VERIFICATION", "CONFIRMED", "REJECTED", "CANCELLED"]),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        student:users!student_id(id, name, email, phone),
        room:rooms!room_id(*),
        hostel:hostels!hostel_id(id, name, location, address, bank_name, account_number, account_name, whatsapp_number),
        payment_proof:payment_proofs(*)
      `)
      .eq("id", params.id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const normalized = {
      ...data,
      payment_proof: Array.isArray(data.payment_proof) ? data.payment_proof[0] ?? null : data.payment_proof,
    };

    return NextResponse.json({ data: normalized });
  } catch {
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const { data: booking } = await supabase
      .from("bookings")
      .select("student_id, hostel_id, room_id, status")
      .eq("id", params.id)
      .single();

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const body = await request.json();
    const parsed = UpdateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { status } = parsed.data;
    const role = profile?.role;

    // Permission checks
    if (role === "STUDENT") {
      if (booking.student_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (status !== "CANCELLED") return NextResponse.json({ error: "Students can only cancel bookings" }, { status: 403 });
    } else if (role === "LANDLORD") {
      const { data: hostel } = await supabase
        .from("hostels")
        .select("landlord_id")
        .eq("id", booking.hostel_id)
        .single();
      if (hostel?.landlord_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!["CONFIRMED", "REJECTED"].includes(status)) {
        return NextResponse.json({ error: "Landlords can only confirm or reject" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    // If confirmed → mark room unavailable; if cancelled/rejected → mark available
    if (status === "CONFIRMED") {
      await supabase.from("rooms").update({ is_available: false }).eq("id", booking.room_id);
      const { data: hostelData } = await supabase
        .from("hostels")
        .select("available_rooms")
        .eq("id", booking.hostel_id)
        .single();
      if (hostelData && hostelData.available_rooms > 0) {
        await supabase
          .from("hostels")
          .update({ available_rooms: hostelData.available_rooms - 1 })
          .eq("id", booking.hostel_id);
      }
    } else if (
      ["CANCELLED", "REJECTED"].includes(status) &&
      !["CANCELLED", "REJECTED"].includes(booking.status)
    ) {
      // Release the room whenever a booking is cancelled/rejected (regardless of previous status)
      if (booking.room_id) {
        await supabase.from("rooms").update({ is_available: true }).eq("id", booking.room_id);
      }
      const { data: hostelData } = await supabase
        .from("hostels")
        .select("available_rooms, total_rooms")
        .eq("id", booking.hostel_id)
        .single();
      if (hostelData) {
        await supabase
          .from("hostels")
          .update({
            available_rooms: Math.min(
              (hostelData.available_rooms ?? 0) + 1,
              hostelData.total_rooms ?? 999
            ),
          })
          .eq("id", booking.hostel_id);
      }
    }

    return NextResponse.json({ data, message: `Booking ${status.toLowerCase()}` });
  } catch {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
