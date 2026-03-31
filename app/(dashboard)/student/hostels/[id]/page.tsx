"use client";

import { memo, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Phone, MessageCircle, BedDouble, CreditCard,
  CheckCircle, ArrowLeft, Heart, Info, Users, XCircle,
} from "lucide-react";
import { useHostel } from "@/hooks/useHostels";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useCreateBooking } from "@/hooks/useBookings";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";
import toast from "react-hot-toast";

const ACADEMIC_YEARS = [
  { value: "2024/2025", label: "2024/2025" },
  { value: "2025/2026", label: "2025/2026" },
  { value: "2026/2027", label: "2026/2027" },
];

// ── Bed-space availability bar ────────────────────────────────────────────────
const AvailabilityBar = memo(function AvailabilityBar({
  available,
  total,
}: {
  available: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const color =
    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Bed spaces available</span>
        <span className={cn("font-semibold", pct > 50 ? "text-emerald-400" : pct > 20 ? "text-amber-400" : "text-red-400")}>
          {available} / {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

export default function HostelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: hostel, isLoading } = useHostel(id);
  const { data: favorites = [] }    = useFavorites();
  const toggleFavorite              = useToggleFavorite();
  const createBooking               = useCreateBooking();

  const [bookingModal, setBookingModal] = useState(false);
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [notes, setNotes]               = useState("");
  const [activeImage, setActiveImage]   = useState(0);

  const isFavorited = useMemo(
    () => favorites.some((f) => f.hostel_id === id),
    [favorites, id]
  );

  const defaultImage = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80";

  // ── Booking handler — no room_id needed, server assigns automatically ──────
  const handleBook = () => {
    if (!hostel) return;

    createBooking.mutate(
      {
        hostel_id:     hostel.id,
        academic_year: academicYear,
        notes:         notes.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          // res.data.assigned_room contains the auto-assigned room number
          const assignedRoom = res.data?.assigned_room ?? "a room";
          toast.success(`Booked! You've been assigned ${assignedRoom}. Upload your payment receipt.`);
          setBookingModal(false);
          setNotes("");
          router.push("/student/bookings");
        },
        onError: (err) => {
          toast.error(err.message || "Booking failed. Please try again.");
        },
      }
    );
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 max-w-4xl">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-80 rounded-xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="text-center py-20">
        <XCircle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Hostel not found</p>
        <Link href="/student/hostels">
          <Button variant="outline" size="sm" className="mt-3">Go back</Button>
        </Link>
      </div>
    );
  }

  const images      = hostel.images?.length ? hostel.images : [defaultImage];
  const isFull      = hostel.available_rooms <= 0;
  const totalRooms  = hostel.total_rooms || 0;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/student/hostels"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to hostels
      </Link>

      {/* Image gallery */}
      <div className="rounded-xl overflow-hidden bg-slate-800 relative">
        <div className="relative h-72 sm:h-96">
          <Image
            src={images[activeImage]}
            alt={hostel.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 896px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />

          {/* Favourite button */}
          <button
            onClick={() =>
              toggleFavorite.mutate(id, {
                onSuccess: (res) => toast.success(res.message),
              })
            }
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-900/70 backdrop-blur-sm flex items-center justify-center border border-slate-700/50 hover:bg-slate-800 transition-all"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                isFavorited ? "fill-red-400 text-red-400" : "text-slate-300"
              )}
            />
          </button>

          {/* Availability pill */}
          <div className="absolute bottom-3 left-3">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm",
                isFull
                  ? "bg-red-900/60 text-red-300 border-red-500/30"
                  : "bg-emerald-900/60 text-emerald-300 border-emerald-500/30"
              )}
            >
              {isFull
                ? "Fully Booked"
                : `${hostel.available_rooms} bed space${hostel.available_rooms !== 1 ? "s" : ""} available`}
            </span>
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "relative h-16 w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                  activeImage === i
                    ? "border-emerald-500"
                    : "border-transparent opacity-60 hover:opacity-80"
                )}
              >
                <Image src={img} alt="" fill className="object-cover" sizes="96px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{hostel.name}</h1>
            <div className="flex items-center gap-1.5 text-slate-400 mt-1.5">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{hostel.address}, {hostel.location}</span>
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">{hostel.description}</p>

          {/* Availability bar */}
          {totalRooms > 0 && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <AvailabilityBar
                available={hostel.available_rooms}
                total={totalRooms}
              />
            </div>
          )}

          {/* Facilities */}
          {hostel.facilities?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Facilities & Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {hostel.facilities.map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Capacity summary — replaces the room-by-room list */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Accommodation Capacity
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Bed Spaces", value: totalRooms, color: "text-slate-200" },
                { label: "Available Now",     value: hostel.available_rooms, color: isFull ? "text-red-400" : "text-emerald-400" },
                { label: "Currently Booked",  value: Math.max(0, totalRooms - hostel.available_rooms), color: "text-amber-400" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Room numbers are assigned automatically at the time of booking on a first-come, first-served basis.
              Your assigned room will be shown on your booking confirmation.
            </p>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Book card */}
          <Card variant="elevated">
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(hostel.price_per_year)}
                </p>
                <p className="text-xs text-slate-500">per academic year</p>
              </div>

              <AvailabilityBar
                available={hostel.available_rooms}
                total={totalRooms}
              />

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isFull}
                onClick={() => setBookingModal(true)}
              >
                {isFull ? "Hostel Full" : "Book a Bed Space"}
              </Button>

              {isFull && (
                <p className="text-xs text-center text-slate-500">
                  All bed spaces are currently occupied. Check back later.
                </p>
              )}
            </div>
          </Card>

          {/* Payment details */}
          <Card variant="bordered">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              Payment Details
            </h3>
            <div className="flex flex-col gap-2.5 text-sm">
              {[
                { label: "Bank",           value: hostel.bank_name },
                { label: "Account Number", value: hostel.account_number, mono: true },
                { label: "Account Name",   value: hostel.account_name },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className={cn("text-slate-200 font-medium", item.mono && "font-mono")}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Contact */}
          {hostel.landlord && (
            <Card variant="bordered">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Contact Landlord</h3>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-200">{hostel.landlord.name}</p>
                {hostel.landlord.phone && (
                  <a
                    href={`tel:${hostel.landlord.phone}`}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {hostel.landlord.phone}
                  </a>
                )}
                {hostel.whatsapp_number && (
                  <a
                    href={`https://wa.me/${hostel.whatsapp_number.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-green-400 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat on WhatsApp
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Booking Modal — no room selection, just confirm */}
      <Modal
        isOpen={bookingModal}
        onClose={() => { setBookingModal(false); setNotes(""); }}
        title="Confirm Booking"
        description={hostel.name}
        size="md"
      >
        <div className="flex flex-col gap-5">
          {/* Availability reminder */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">Bed Space Booking</span>
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                isFull
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}>
                {hostel.available_rooms} left
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              A specific room number will be automatically assigned to you upon confirmation.
              You will see your assigned room on the Bookings page.
            </p>
          </div>

          <Select
            label="Academic Year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            options={ACADEMIC_YEARS}
          />

          <Input
            label="Notes (optional)"
            placeholder="Any special requests or questions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Payment instructions */}
          <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300 space-y-1">
              <p className="font-semibold">Manual Bank Transfer Required</p>
              <p>
                Transfer to <strong>{hostel.bank_name}</strong> — account{" "}
                <strong className="font-mono">{hostel.account_number}</strong>{" "}
                ({hostel.account_name}), then upload your receipt on the Bookings page.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setBookingModal(false); setNotes(""); }}
              disabled={createBooking.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={createBooking.isPending}
              disabled={isFull}
              onClick={handleBook}
            >
              Confirm Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
