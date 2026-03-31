import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({ email: z.string().email() });

/** Generate a 6-digit OTP and store it with a 10-minute expiry */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const { email } = parsed.data;
    const admin = createAdminClient();

    // Ensure the user exists before sending OTP
    const { data: users } = await admin.auth.admin.listUsers();
    const userExists = users?.users?.some((u) => u.email === email);
    if (!userExists) {
      // Return success to avoid email enumeration attacks
      return NextResponse.json({ message: "OTP sent if account exists" });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Upsert OTP record (replace any existing for this email)
    const { error: upsertError } = await admin
      .from("otp_codes")
      .upsert(
        { email, otp, expires_at: expiresAt, used: false },
        { onConflict: "email" }
      );

    if (upsertError) throw upsertError;

    // Also trigger Supabase's built-in resend for the magic link
    // (keeping the link-based flow intact, adding OTP on top)
    await admin.auth.resend({ type: "signup", email });

    // In production: send a custom email with the OTP via your email provider.
    // For now the OTP is stored and can be retrieved during development via DB.
    // TODO: integrate Nodemailer / Resend / Sendgrid here to email the OTP code.
    console.log(`[DEV] OTP for ${email}: ${otp}`);

    return NextResponse.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("send-otp:", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
