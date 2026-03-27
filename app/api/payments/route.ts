import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreatePaymentProofSchema = z.object({
  booking_id: z.string().uuid(),
  image_url: z.string().url().optional(),
  whatsapp_proof: z.string().optional(),
  note: z.string().optional(),
  amount: z.number().positive(),
}).refine((d) => d.image_url || d.whatsapp_proof, {
  message: "Either image_url or whatsapp_proof is required",
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");

    let query = supabase
      .from("payment_proofs")
      .select("*, booking:bookings(*)")
      .order("created_at", { ascending: false });

    if (bookingId) query = query.eq("booking_id", bookingId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreatePaymentProofSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    // Verify student owns this booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("student_id, status")
      .eq("id", parsed.data.booking_id)
      .single();

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.student_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Check no existing proof
    const { data: existing } = await supabase
      .from("payment_proofs")
      .select("id")
      .eq("booking_id", parsed.data.booking_id)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("payment_proofs")
        .update({ ...parsed.data, status: "PENDING" })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: "Payment proof updated" });
    }

    const { data, error } = await supabase
      .from("payment_proofs")
      .insert({ ...parsed.data, status: "PENDING" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: "Payment proof submitted successfully" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit payment proof" }, { status: 500 });
  }
}
