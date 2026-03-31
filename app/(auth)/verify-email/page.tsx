"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MailCheck, RefreshCw, ArrowLeft, CheckCircle,
  AlertCircle, KeyRound, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";

// ── OTP input — 6 separate digit boxes ───────────────────────────────────────
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleChange = (idx: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[idx] = digit || " ";
    const next = arr.join("").trimEnd();
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      onChange(pasted.padEnd(6, " ").slice(0, 6).trimEnd());
      refs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i]?.trim() ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          disabled={disabled}
          className={cn(
            "h-12 w-11 rounded-xl border text-center text-lg font-bold transition-all",
            "bg-slate-800/50 text-slate-100 outline-none",
            "border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}

// ── Main verify content ───────────────────────────────────────────────────────
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";
  const role  = searchParams.get("role")  ?? "STUDENT";

  // Link-resend state
  const [resending, setResending]   = useState(false);
  const [resent, setResent]         = useState(false);
  const [countdown, setCountdown]   = useState(0);

  // OTP state
  const [otp, setOtp]               = useState("");
  const [otpSent, setOtpSent]       = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [otpError, setOtpError]     = useState("");
  const [otpCountdown, setOtpCd]    = useState(0);
  const [verified, setVerified]     = useState(false);

  // Countdown ticks
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  useEffect(() => {
    if (otpCountdown > 0) {
      const t = setTimeout(() => setOtpCd((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpCountdown]);

  // Auto-detect email confirmation (for link-based flow)
  useEffect(() => {
    if (!email || verified) return;
    const interval = setInterval(async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        clearInterval(interval);
        toast.success("Email confirmed! Taking you in...");
        router.push(role === "LANDLORD" ? "/landlord" : "/student");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [email, role, router, verified]);

  // Resend link
  const handleResendLink = async () => {
    if (!email || countdown > 0) return;
    setResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResent(true);
      setCountdown(60);
      toast.success("Verification email resent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!email || otpCountdown > 0) return;
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setOtpSent(true);
      setOtpCd(60);
      setOtp("");
      setOtpError("");
      toast.success("OTP sent to your email!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.replace(/\s/g, "").length < 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }
    setVerifying(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.replace(/\s/g, "") }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOtpError(json.error || "Verification failed");
        return;
      }
      setVerified(true);
      toast.success("Email verified! Signing you in...");
      // Refresh session then redirect
      const supabase = createClient();
      await supabase.auth.refreshSession();
      setTimeout(() => {
        router.push(role === "LANDLORD" ? "/landlord" : "/student");
      }, 1200);
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="w-full max-w-md text-center animate-slide-up">
        <div className="h-20 w-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">All verified!</h1>
        <p className="text-slate-400 text-sm">Taking you to your dashboard...</p>
        <Loader2 className="h-5 w-5 text-emerald-400 animate-spin mx-auto mt-4" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Header */}
      <div className="text-center mb-7">
        <div className="relative inline-flex mb-5">
          <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <MailCheck className="h-10 w-10 text-emerald-400" />
          </div>
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 border-2 border-slate-950 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Verify your email</h1>
        {email && (
          <p className="text-sm text-slate-400">
            We sent instructions to{" "}
            <span className="text-emerald-400 font-semibold">{email}</span>
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* ── METHOD 1: OTP ───────────────────────────────────────── */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-400" />
            <p className="text-sm font-semibold text-slate-200">
              Verify with OTP code
            </p>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Recommended
            </span>
          </div>

          <div className="p-5 space-y-4">
            {!otpSent ? (
              <>
                <p className="text-sm text-slate-400">
                  Get a 6-digit code sent to your email — no link clicking required.
                </p>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleSendOTP}
                  disabled={otpCountdown > 0}
                >
                  {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Send OTP Code"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400">
                  Enter the 6-digit code sent to your email:
                </p>
                <OtpInput value={otp} onChange={setOtp} disabled={verifying} />
                {otpError && (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {otpError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleSendOTP}
                    disabled={otpCountdown > 0}
                  >
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    loading={verifying}
                    disabled={otp.replace(/\s/g, "").length < 6}
                    onClick={handleVerifyOTP}
                  >
                    Verify Code
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── METHOD 2: Email link ─────────────────────────────────── */}
        <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-2">
            <MailCheck className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-400">Or verify via email link</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              {[
                { n: "1", t: "Open the email from HostelHub" },
                { n: "2", t: "Click the confirmation link" },
                { n: "3", t: "This page will auto-detect it" },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="h-5 w-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {s.n}
                  </div>
                  <span>{s.t}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Auto-checking every 3 seconds...</span>
            </div>

            {resent && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2 px-3">
                <CheckCircle className="h-4 w-4" />
                Email resent!
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-slate-400"
              loading={resending}
              onClick={handleResendLink}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `Resend link in ${countdown}s` : "Resend confirmation email"}
            </Button>
          </div>
        </div>

        {/* Spam note */}
        <div className="flex items-start gap-2.5 text-xs text-slate-500 px-1">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500 mt-0.5" />
          <span>
            Check your <strong className="text-slate-400">spam/junk folder</strong>{" "}
            if you don&apos;t see the email within 2 minutes.
          </span>
        </div>

        <Link href="/login">
          <Button variant="ghost" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to sign in
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md space-y-4 animate-pulse">
          <div className="h-20 w-20 bg-slate-800 rounded-2xl mx-auto" />
          <div className="h-8 bg-slate-800 rounded-lg w-3/4 mx-auto" />
          <div className="h-48 bg-slate-800 rounded-xl" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
