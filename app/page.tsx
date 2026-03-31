"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Shield, Clock, Search, Star, ArrowRight,
  CheckCircle, Users, MapPin, MessageCircle, Home, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import toast from "react-hot-toast";

export default function LandingPage() {
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const WHATSAPP_NUMBER = "2348000000000"; // TODO: replace with your admin WhatsApp

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone || !contactForm.message) {
      toast.error("Please fill in name, phone, and message.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/landlord-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit");
      toast.success(json.message);
      setContactForm({ name: "", phone: "", email: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Hostel<span className="text-emerald-400">Hub</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-900/20 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Nigeria&apos;s #1 Student Accommodation Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Find Your Perfect{" "}
            <span className="relative">
              <span className="text-emerald-400">Student Hostel</span>
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Browse verified hostels near your university. Secure your accommodation with ease — simple bank transfer payments, no hassle.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Find a Hostel
              </Button>
            </Link>
            <Link href="/register?role=LANDLORD">
              <Button size="lg" variant="outline">
                List Your Property
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-14">
            {[
              { value: "500+", label: "Hostels Listed" },
              { value: "2,000+", label: "Students Housed" },
              { value: "98%", label: "Satisfaction Rate" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 border-t border-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-slate-400 max-w-md mx-auto">Get settled in your new hostel in just a few simple steps</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Search,
                title: "Browse & Filter",
                description: "Search hostels by location, price range, and facilities. Save your favorites.",
              },
              {
                step: "02",
                icon: Building2,
                title: "Choose & Book",
                description: "Select your preferred room, get the landlord's bank details, and transfer payment.",
              },
              {
                step: "03",
                icon: CheckCircle,
                title: "Upload & Confirm",
                description: "Upload your payment receipt. Landlord verifies and confirms your booking.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-3xl font-bold text-slate-700">{item.step}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-slate-900/30 border-t border-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Why HostelHub?</h2>
            <p className="text-slate-400">Built specifically for Nigerian students and landlords</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: "Verified Listings", desc: "Every hostel is reviewed and approved before going live.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { icon: MapPin, title: "Local Locations", desc: "Hostels near major universities across Nigeria.", color: "text-sky-400", bg: "bg-sky-500/10" },
              { icon: Clock, title: "Fast Booking", desc: "Book in minutes with our streamlined process.", color: "text-amber-400", bg: "bg-amber-500/10" },
              { icon: Users, title: "Role-Based Access", desc: "Separate portals for students, landlords, and admins.", color: "text-purple-400", bg: "bg-purple-500/10" },
              { icon: CheckCircle, title: "Manual Payments", desc: "Simple bank transfers — no hidden fees or online charges.", color: "text-rose-400", bg: "bg-rose-500/10" },
              { icon: Star, title: "Favorites", desc: "Save and compare multiple hostels before deciding.", color: "text-teal-400", bg: "bg-teal-500/10" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-5 hover:border-slate-600 transition-colors">
                <div className={`h-9 w-9 rounded-lg ${f.bg} flex items-center justify-center mb-3`}>
                  <f.icon className={`h-4.5 w-4.5 ${f.color}`} style={{ height: 18, width: 18 }} />
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Landlord CTA */}
      <section className="py-20 px-4 sm:px-6 border-t border-slate-800/50 bg-slate-900/40">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium mb-5">
                <Home className="h-3 w-3" />
                For Landlords
              </div>
              <h2 className="text-3xl font-bold mb-4">
                List Your Property on HostelHub
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Reach thousands of verified students every semester. HostelHub handles the booking flow — you focus on managing your property.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Admin-verified — your listing is trusted by students",
                  "Full payment receipt trail — no more he-said-she-said disputes",
                  "Dashboard to approve or reject bookings at a glance",
                  "Free to join during the launch period",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* WhatsApp deep link */}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi HostelHub, I want to list my property as a landlord.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-colors font-medium text-sm"
              >
                <MessageCircle className="h-5 w-5" />
                Chat us on WhatsApp — fastest response
              </a>
            </div>

            {/* Right form */}
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-6">
              <h3 className="text-base font-semibold text-slate-100 mb-5">
                Request a Landlord Account
              </h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="Your full name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                />
                <Input
                  label="Email (optional)"
                  type="email"
                  placeholder="you@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                />
                <Textarea
                  label="Tell us about your property"
                  placeholder="Number of rooms, location, any questions..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                  rows={3}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={submitting}
                  leftIcon={submitting ? undefined : <ArrowRight className="h-4 w-4" />}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  We respond within 24 hours. Your details are kept private.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 border-t border-slate-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Hostel?</h2>
          <p className="text-slate-400 mb-8">Join thousands of students who have found their perfect accommodation through HostelHub.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Create Free Account
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-600 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">Hostel<span className="text-emerald-400">Hub</span></span>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} HostelHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
