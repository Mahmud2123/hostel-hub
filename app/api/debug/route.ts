/**
 * GET /api/debug?hostel_id=XXX
 * Dev-only endpoint: shows hostel availability and room state.
 * Remove or protect this before going to production.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const hostelId = searchParams.get("hostel_id");

    if (hostelId) {
      // Show detail for one hostel
      const [{ data: hostel }, { data: rooms }, { data: bookings }] = await Promise.all([
        supabase.from("hostels")
          .select("id, name, status, total_rooms, available_rooms")
          .eq("id", hostelId).single(),
        supabase.from("rooms")
          .select("id, room_number, is_available")
          .eq("hostel_id", hostelId)
          .order("room_number"),
        supabase.from("bookings")
          .select("id, status, room_id, student_id, academic_year")
          .eq("hostel_id", hostelId),
      ]);
      return NextResponse.json({ hostel, rooms: rooms ?? [], bookings: bookings ?? [] });
    }

    // List all hostels summary
    const { data: hostels } = await supabase
      .from("hostels")
      .select("id, name, status, total_rooms, available_rooms")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ hostels: hostels ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
