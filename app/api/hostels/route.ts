import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateHostelSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(20, "Description too short"),
  location: z.string().min(2),
  address: z.string().min(5),
  price_per_year: z.number().positive("Price must be positive"),
  facilities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  bank_name: z.string().min(2),
  account_number: z.string().min(10),
  account_name: z.string().min(3),
  whatsapp_number: z.string().optional(),
  total_rooms: z.number().int().positive().default(1),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const location = searchParams.get("location");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const status = searchParams.get("status");
    const facilities = searchParams.get("facilities");
    const landlordOnly = searchParams.get("landlord_only") === "true";

    const { data: { user } } = await supabase.auth.getUser();

    // Determine role
    let role: string | null = null;
    if (user) {
      // Always use admin client for role lookup to avoid RLS recursion
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? null;
    }

    // Choose the right db client: admin client bypasses RLS for admin
    // Regular client applies RLS for landlords and students
    const isAdmin = role === "ADMIN";
    const db = isAdmin ? createAdminClient() : supabase;

    let query = db
      .from("hostels")
      .select("*, landlord:users!landlord_id(id, name, email)")
      .order("created_at", { ascending: false });

    if (landlordOnly && user && role === "LANDLORD") {
      query = query.eq("landlord_id", user.id);
    } else if (status) {
      query = query.eq("status", status);
    } else if (!user) {
      // Public: only approved
      query = query.eq("status", "APPROVED");
    } else if (role === "LANDLORD") {
      // Landlord sees only their own
      query = query.eq("landlord_id", user.id);
    } else if (role === "STUDENT") {
      // Students see only approved
      query = query.eq("status", "APPROVED");
    }
    // Admin: no filter — sees everything

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%`
      );
    }
    if (location) query = query.ilike("location", `%${location}%`);
    if (minPrice) query = query.gte("price_per_year", Number(minPrice));
    if (maxPrice) query = query.lte("price_per_year", Number(maxPrice));
    if (facilities) query = query.contains("facilities", facilities.split(","));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/hostels:", err);
    return NextResponse.json({ error: "Failed to fetch hostels" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "LANDLORD" && profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Only landlords can create hostels" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CreateHostelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("hostels")
      .insert({
        ...parsed.data,
        landlord_id: user.id,
        status: "PENDING",
        available_rooms: parsed.data.total_rooms,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: "Hostel submitted for approval" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hostels:", err);
    return NextResponse.json({ error: "Failed to create hostel" }, { status: 500 });
  }
}
