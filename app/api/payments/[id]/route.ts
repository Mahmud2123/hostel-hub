import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdatePaymentSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  rejection_reason: z.string().optional(),
});

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

    if (!["LANDLORD", "ADMIN"].includes(profile?.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Get proof + booking info
    const { data: proof } = await supabase
      .from("payment_proofs")
      .select("*, booking:bookings(hostel_id, id)")
      .eq("id", params.id)
      .single();

    if (!proof) return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });

    // Verify landlord owns hostel
    if (profile?.role === "LANDLORD") {
      const hostelId = (proof.booking as { hostel_id: string })?.hostel_id;
      const { data: hostel } = await supabase
        .from("hostels")
        .select("landlord_id")
        .eq("id", hostelId)
        .single();
      if (hostel?.landlord_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("payment_proofs")
      .update({
        status: parsed.data.status,
        rejection_reason: parsed.data.rejection_reason,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    // Auto-update booking status
    const bookingId = (proof.booking as { id: string })?.id;
    if (bookingId) {
      const newBookingStatus = parsed.data.status === "VERIFIED" ? "CONFIRMED" : "REJECTED";
      await supabase
        .from("bookings")
        .update({ status: newBookingStatus })
        .eq("id", bookingId);

      if (parsed.data.status === "VERIFIED") {
        // Mark room unavailable
        const { data: booking } = await supabase
          .from("bookings")
          .select("room_id, hostel_id")
          .eq("id", bookingId)
          .single();
        if (booking) {
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
        }
      }
    }

    return NextResponse.json({ data, message: `Payment ${parsed.data.status.toLowerCase()}` });
  } catch {
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
