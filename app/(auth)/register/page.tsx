"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, UserPlus, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";

function RegisterForm() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required";
    if (!email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Invalid email address";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: "STUDENT", phone },
          emailRedirectTo: `${window.location.origin}/student`,
        },
      });

      if (error) throw error;

      // If email confirmation is disabled in Supabase, the session is live immediately
      if (data.session) {
        // Auto-confirmed — upsert profile and redirect straight to dashboard
        if (data.user) {
          await supabase.from("users").upsert({
            id: data.user.id,
            email,
            name,
            role: "STUDENT",
            phone: phone || null,
          });
        }
        toast.success("Account created! Welcome to HostelHub 🎉");
        window.location.href = "/student";
        return;
      }

      // Email confirmation is ON — redirect to verification interstitial
      if (data.user && !data.session) {
        // Pre-create profile row so it's ready when they confirm
        await supabase.from("users").upsert({
          id: data.user.id,
          email,
          name,
          role: "STUDENT",
          phone: phone || null,
        });
        window.location.href = `/verify-email?email=${encodeURIComponent(email)}&role=STUDENT`;
        return;
      }

      toast.error("Something unexpected happened. Please try again.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      // Friendly message for already-registered emails
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        toast.error("This email is already registered. Try signing in instead.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-900/40 mb-4">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Create student account</h1>
        <p className="text-sm text-slate-400 mt-1.5">
          Browse and book hostels near your university
        </p>
      </div>

      <Card variant="elevated" padding="lg">
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="e.g. Hassan Mahmud"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoComplete="name"
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="you@university.edu.ng"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+234 800 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            hint="Optional — used for landlord contact"
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint="Minimum 8 characters"
            autoComplete="new-password"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <Input
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            leftIcon={<UserPlus className="h-4 w-4" />}
            className="mt-1 w-full"
          >
            Create Account
          </Button>
        </form>
      </Card>

      <div className="mt-5 space-y-3">
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-slate-600">
          Are you a landlord?{" "}
          <Link href="/login" className="text-slate-500 hover:text-slate-400 underline underline-offset-2">
            Contact an admin to get an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md animate-pulse space-y-4">
          <div className="h-12 w-12 bg-slate-800 rounded-2xl mx-auto" />
          <div className="h-8 bg-slate-800 rounded-lg w-3/4 mx-auto" />
          <div className="h-80 bg-slate-800 rounded-xl" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
