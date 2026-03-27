import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Fast-path: skip everything that never needs auth ─────────────────────
  // This exits before ANY Supabase code runs for static assets, API routes, etc.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/verify-email");

  const isProtected =
    pathname.startsWith("/student") ||
    pathname.startsWith("/landlord") ||
    pathname.startsWith("/admin");

  // Not an auth page and not protected → landing pages, etc. Just pass through.
  if (!isAuthPage && !isProtected) {
    return NextResponse.next();
  }

  // ── Cookie-only session check (zero network calls) ────────────────────────
  // getSession() reads the JWT from the cookie — no round-trip to Supabase.
  // We only use this for routing decisions, NOT for API security
  // (API routes do their own getUser() verification).
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() = reads cookie → NO network call
  // This is intentional for middleware performance on slow hardware.
  // Security is enforced per-route in API handlers via getUser().
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // ── Auth pages ────────────────────────────────────────────────────────────
  if (isAuthPage) {
    // No session → let them through immediately, no redirect
    if (!user) return response;

    // Has session → redirect to their dashboard.
    // Read role from JWT metadata — zero DB call.
    const role = (user.user_metadata?.role as string | undefined) ?? "STUDENT";
    const dest =
      role === "ADMIN"
        ? "/admin"
        : role === "LANDLORD"
        ? "/landlord"
        : "/student";

    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── Protected routes ──────────────────────────────────────────────────────
  if (isProtected) {
    if (!user) {
      // Not logged in → send to login, preserve intended destination
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // Logged in — let the page through.
    // Role-based access is validated on the page/component level, not here.
    // This keeps middleware latency minimal on slow hardware.
    return response;
  }

  return response;
}

export const config = {
  // Only run on routes that actually need the middleware
  matcher: [
    "/login",
    "/register",
    "/verify-email",
    "/verify-email/:path*",
    "/student/:path*",
    "/landlord/:path*",
    "/admin/:path*",
  ],
};
