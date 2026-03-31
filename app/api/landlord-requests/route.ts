import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  name:    z.string().min(2, "Name required"),
  phone:   z.string().min(7, "Valid phone number required"),
  message: z.string().min(5, "Message required").max(500),
  email:   z.string().email().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.from("landlord_requests").insert({
      name:    parsed.data.name,
      phone:   parsed.data.phone,
      email:   parsed.data.email || null,
      message: parsed.data.message,
      status:  "PENDING",
    });

    if (error) throw error;

    return NextResponse.json(
      { message: "Request submitted! We will contact you within 24 hours." },
      { status: 201 }
    );
  } catch (err) {
    console.error("landlord-requests:", err);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("landlord_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
