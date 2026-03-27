import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("favorites")
      .select("*, hostel:hostels(*)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { hostel_id } = await request.json();
    if (!hostel_id) return NextResponse.json({ error: "hostel_id required" }, { status: 400 });

    // Check if already favorited → toggle
    const { data: existing } = await supabase
      .from("favorites")
      .select("student_id")
      .eq("student_id", user.id)
      .eq("hostel_id", hostel_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("favorites")
        .delete()
        .eq("student_id", user.id)
        .eq("hostel_id", hostel_id);
      return NextResponse.json({ data: null, message: "Removed from favorites" });
    }

    const { data, error } = await supabase
      .from("favorites")
      .insert({ student_id: user.id, hostel_id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, message: "Added to favorites" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to toggle favorite" }, { status: 500 });
  }
}
