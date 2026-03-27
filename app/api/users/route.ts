import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "LANDLORD", "STUDENT"]),
  phone: z.string().optional(),
});

/** Verify caller is admin using the cookie client (cheaper than admin client for auth check) */
async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: "Unauthorized" };

  // Use admin client to bypass RLS for the profile lookup
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") return { user: null, error: "Forbidden" };
  return { user, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyAdmin();
    if (!user) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    // Use admin client — bypasses RLS so all users are visible
    const admin = createAdminClient();
    let query = admin
      .from("users")
      .select("id, email, name, role, phone, avatar_url, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (role) query = query.eq("role", role);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/users:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await verifyAdmin();
    if (!user) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Create auth user via admin API — no email confirmation, no self-registration flow
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true, // auto-confirm — no verification email sent
      user_metadata: {
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone ?? null,
      },
    });

    if (authError) {
      console.error("auth.admin.createUser error:", authError);
      throw new Error(authError.message);
    }

    // Upsert profile row (the DB trigger may have fired already)
    const { data: profileData, error: profileError } = await admin
      .from("users")
      .upsert({
        id: authData.user.id,
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone ?? null,
      })
      .select("id, email, name, role, phone, created_at")
      .single();

    if (profileError) {
      console.error("profile upsert error:", profileError);
      throw new Error(profileError.message);
    }

    return NextResponse.json(
      { data: profileData, message: `${parsed.data.role} created successfully` },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/users:", err);
    const message = err instanceof Error ? err.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await verifyAdmin();
    if (!user) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("id");
    if (!targetId) return NextResponse.json({ error: "User ID required" }, { status: 400 });
    if (targetId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
