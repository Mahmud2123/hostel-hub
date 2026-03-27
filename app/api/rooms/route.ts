import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateRoomSchema = z.object({
  hostel_id: z.string().uuid(),
  room_number: z.string().min(1),
  price: z.number().positive(),
  capacity: z.number().int().positive().default(1),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const hostelId = searchParams.get("hostel_id");

    let query = supabase.from("rooms").select("*").order("room_number");
    if (hostelId) query = query.eq("hostel_id", hostelId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    // Verify landlord owns the hostel
    const { data: hostel } = await supabase
      .from("hostels")
      .select("landlord_id, total_rooms, available_rooms")
      .eq("id", parsed.data.hostel_id)
      .single();

    if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (hostel.landlord_id !== user.id && profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("rooms")
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;

    // Update hostel room count
    await supabase
      .from("hostels")
      .update({
        total_rooms: hostel.total_rooms + 1,
        available_rooms: hostel.available_rooms + 1,
      })
      .eq("id", parsed.data.hostel_id);

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
