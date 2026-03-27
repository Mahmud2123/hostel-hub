import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateHostelSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(20).optional(),
  location: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  price_per_year: z.number().positive().optional(),
  facilities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_name: z.string().optional(),
  whatsapp_number: z.string().optional(),
  total_rooms: z.number().int().positive().optional(),
  available_rooms: z.number().int().min(0).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("hostels")
      .select("*, landlord:users!landlord_id(id, name, email, phone), rooms(*)")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch hostel" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    // Check ownership or admin
    const { data: hostel } = await supabase
      .from("hostels")
      .select("landlord_id")
      .eq("id", params.id)
      .single();

    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const isOwner = hostel.landlord_id === user.id;
    const isAdmin = profile?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateHostelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Only admin can change status
    if (parsed.data.status && !isAdmin) {
      delete parsed.data.status;
    }

    const { data, error } = await supabase
      .from("hostels")
      .update(parsed.data)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: "Hostel updated" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update hostel" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const { data: hostel } = await supabase
      .from("hostels")
      .select("landlord_id")
      .eq("id", params.id)
      .single();

    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    if (hostel.landlord_id !== user.id && profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("hostels").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ message: "Hostel deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete hostel" }, { status: 500 });
  }
}
