"use client";

/**
 * Login page — optimised for slow hardware / slow networks.
 *
 * Key decisions:
 * - No useEffect / no router.push / no router.refresh()
 *   All of those trigger RSC payload fetches that time out on 2011 MBP.
 * - window.location.href for redirect (full page load, middleware handles session)
 * - Role read from JWT metadata — zero extra network call after signIn
 * - Supabase client created ONCE, stored in a ref — not recreated per render
 * - e.preventDefault() is literally the first line of the submit handler
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogIn, Building2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";

export default function LoginPage() {
  // Stable client ref — not recreated on re-render
  const supabase = useRef(createClient()).current;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Invalid email address";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    // MUST be first — prevents any default form submission / page reload
    e.preventDefault();
    e.stopPropagation();

    if (loading) return; // Prevent double-submit
    if (!validate()) return;

    setLoading(true);
    setShowResend(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          setShowResend(true);
          toast.error("Please verify your email first.");
          setLoading(false);
          return;
        }
        if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
          toast.error("Incorrect email or password.");
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!data.user) {
        toast.error("Login failed — no user returned.");
        setLoading(false);
        return;
      }

      // Read role from JWT metadata — already in the token, no DB round-trip
      const role =
        (data.user.user_metadata?.role as string | undefined) ?? "STUDENT";

      toast.success("Welcome back!");

      // Hard navigation keeps the button in loading state during redirect.
      // Avoids router.push + router.refresh() which trigger RSC fetches
      // that time out on slow hardware (2011 MBP).
      const dest =
        role === "ADMIN"
          ? "/admin"
          : role === "LANDLORD"
          ? "/landlord"
          : "/student";

      window.location.href = dest;
      // Do NOT call setLoading(false) — page is navigating away
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error("Enter your email address first.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      toast.success("Verification email sent!");
      window.location.href = `/verify-email?email=${encodeURIComponent(email)}&role=STUDENT`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-900/40 mb-4">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Welcome back</h1>
        <p className="text-sm text-slate-400 mt-1.5">
          Sign in to your HostelHub account
        </p>
      </div>

      <Card variant="elevated" padding="lg">
        {/*
          noValidate: disable browser validation so our custom logic runs.
          onSubmit on the <form> tag — NOT on the button — is the correct pattern.
        */}
        <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setShowResend(false);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            autoComplete="email"
            autoFocus
            disabled={loading}
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            autoComplete="current-password"
            disabled={loading}
            rightIcon={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />

          {/* Email-not-confirmed banner */}
          {showResend && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-3">
              <MailCheck className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-300 mb-0.5">
                  Email not verified
                </p>
                <p className="text-xs text-amber-400/80">
                  Confirm your email before signing in.
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend verification email →"}
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            leftIcon={<LogIn className="h-4 w-4" />}
            className="mt-1 w-full"
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-slate-500 mt-5">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
