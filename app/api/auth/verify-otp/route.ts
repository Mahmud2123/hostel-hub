import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;
    const admin = createAdminClient();

    // Fetch the stored OTP record for this email
    const { data: record, error: fetchErr } = await admin
      .from("otp_codes")
      .select("otp, expires_at, used")
      .eq("email", email)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json({ error: "No OTP found for this email. Request a new one." }, { status: 404 });
    }

    if (record.used) {
      return NextResponse.json({ error: "OTP has already been used. Request a new one." }, { status: 410 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: "OTP has expired. Request a new one." }, { status: 410 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 422 });
    }

    // Mark OTP as used
    await admin
      .from("otp_codes")
      .update({ used: true })
      .eq("email", email);

    // Confirm the user's email in Supabase Auth
    const { data: users } = await admin.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);
    if (user && !user.email_confirmed_at) {
      await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    }

    return NextResponse.json({ message: "Email verified successfully!" });
  } catch (err) {
    console.error("verify-otp:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
