"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MailCheck, RefreshCw, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import toast from "react-hot-toast";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";
  const role = searchParams.get("role") ?? "STUDENT";

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown before allow resend
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Poll: if user has confirmed, auto-redirect
  useEffect(() => {
    if (!email) return;
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
  }, [email, role, router]);

  const handleResend = async () => {
    if (!email || countdown > 0) return;
    setResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
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

  return (
    <div className="w-full max-w-md animate-slide-up text-center">
      {/* Icon */}
      <div className="relative inline-flex mb-6">
        <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <MailCheck className="h-10 w-10 text-emerald-400" />
        </div>
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 border-2 border-slate-950 animate-pulse" />
      </div>

      <h1 className="text-2xl font-bold text-slate-100 mb-2">Check your inbox</h1>
      <p className="text-slate-400 text-sm leading-relaxed mb-1">
        We sent a verification link to:
      </p>
      {email && (
        <p className="text-emerald-400 font-semibold text-sm mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2 inline-block">
          {email}
        </p>
      )}

      <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-5 mb-6 text-left space-y-3">
        {[
          { step: "1", text: "Open the email from HostelHub" },
          { step: "2", text: 'Click the "Confirm your email" button' },
          { step: "3", text: "You\'ll be automatically logged in and redirected" },
        ].map((item) => (
          <div key={item.step} className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {item.step}
            </div>
            <p className="text-sm text-slate-300">{item.text}</p>
          </div>
        ))}
      </div>

      {/* Auto-detection indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-6">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Checking for confirmation automatically...</span>
      </div>

      <div className="space-y-3">
        {resent && (
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2.5 px-4">
            <CheckCircle className="h-4 w-4" />
            Email resent! Check your inbox again.
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          loading={resending}
          onClick={handleResend}
          disabled={countdown > 0}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {countdown > 0
            ? `Resend in ${countdown}s`
            : "Resend verification email"}
        </Button>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/40 rounded-lg p-3 border border-slate-700/40">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          <span>
            Check your <strong className="text-slate-400">spam/junk folder</strong> if you don&apos;t see the email within 2 minutes.
          </span>
        </div>

        <Link href="/login" className="block">
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
          <div className="h-32 bg-slate-800 rounded-xl" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
