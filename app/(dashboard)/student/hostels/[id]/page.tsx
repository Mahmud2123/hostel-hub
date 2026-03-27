"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Phone, MessageCircle, BedDouble, CreditCard,
  CheckCircle, ArrowLeft, Heart, Building2, Info,
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
import { Room } from "@/types";
import toast from "react-hot-toast";

const ACADEMIC_YEARS = [
  { value: "2024/2025", label: "2024/2025" },
  { value: "2025/2026", label: "2025/2026" },
  { value: "2026/2027", label: "2026/2027" },
];

export default function HostelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: hostel, isLoading } = useHostel(id);
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const createBooking = useCreateBooking();

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [academicYear, setAcademicYear] = useState("2024/2025");
  const [notes, setNotes] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  const isFavorited = favorites.some((f) => f.hostel_id === id);
  const defaultImage = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80";

  const handleBook = async () => {
    if (!selectedRoom || !hostel) return;
    createBooking.mutate(
      { room_id: selectedRoom.id, hostel_id: hostel.id, academic_year: academicYear, notes },
      {
        onSuccess: (res) => {
          toast.success("Booking created! Upload your payment proof.");
          setBookingModal(false);
          router.push("/student/bookings");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Hostel not found</p>
        <Link href="/student/hostels">
          <Button variant="outline" size="sm" className="mt-3">Go back</Button>
        </Link>
      </div>
    );
  }

  const images = hostel.images?.length ? hostel.images : [defaultImage];
  const rooms = (hostel as unknown as { rooms?: Room[] }).rooms ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Back */}
      <Link href="/student/hostels" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" />
        Back to hostels
      </Link>

      {/* Images */}
      <div className="rounded-xl overflow-hidden bg-slate-800 relative">
        <div className="relative h-72 sm:h-96">
          <Image
            src={images[activeImage]}
            alt={hostel.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 896px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
          <button
            onClick={() => toggleFavorite.mutate(id, {
              onSuccess: (res) => toast.success(res.message),
            })}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-900/70 backdrop-blur-sm flex items-center justify-center border border-slate-700/50 hover:bg-slate-800 transition-all"
          >
            <Heart className={cn("h-4 w-4", isFavorited ? "fill-red-400 text-red-400" : "text-slate-300")} />
          </button>
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "relative h-16 w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                  activeImage === i ? "border-emerald-500" : "border-transparent opacity-60 hover:opacity-80"
                )}
              >
                <Image src={img} alt="" fill className="object-cover" sizes="96px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{hostel.name}</h1>
            <div className="flex items-center gap-1.5 text-slate-400 mt-1.5">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{hostel.address}, {hostel.location}</span>
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">{hostel.description}</p>

          {hostel.facilities?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Facilities</h3>
              <div className="flex flex-wrap gap-2">
                {hostel.facilities.map((f) => (
                  <span key={f} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                    <CheckCircle className="h-3 w-3" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rooms */}
          {rooms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Available Rooms</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {rooms.map((room: Room) => (
                  <div
                    key={room.id}
                    onClick={() => { if (room.is_available) { setSelectedRoom(room); setBookingModal(true); } }}
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      room.is_available
                        ? "bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 cursor-pointer"
                        : "bg-slate-800/20 border-slate-800 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-200">Room {room.room_number}</span>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        room.is_available ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-700/50 text-slate-500 border-slate-700"
                      )}>
                        {room.is_available ? "Available" : "Taken"}
                      </span>
                    </div>
                    <p className="text-base font-bold text-emerald-400">{formatCurrency(room.price)}</p>
                    {room.description && <p className="text-xs text-slate-500 mt-1">{room.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <Card variant="elevated">
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(hostel.price_per_year)}</p>
                <p className="text-xs text-slate-500">per academic year</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Available Rooms</span>
                <span className="text-slate-200 font-medium">{hostel.available_rooms} / {hostel.total_rooms}</span>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={hostel.available_rooms === 0}
                onClick={() => setBookingModal(true)}
              >
                {hostel.available_rooms === 0 ? "Fully Booked" : "Book Now"}
              </Button>
            </div>
          </Card>

          <Card variant="bordered">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              Payment Details
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Bank</p>
                <p className="text-slate-200 font-medium">{hostel.bank_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Account Number</p>
                <p className="text-slate-200 font-mono font-medium">{hostel.account_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Account Name</p>
                <p className="text-slate-200 font-medium">{hostel.account_name}</p>
              </div>
            </div>
          </Card>

          {hostel.landlord && (
            <Card variant="bordered">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Contact Landlord</h3>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-200">{hostel.landlord.name}</p>
                {hostel.landlord.phone && (
                  <a href={`tel:${hostel.landlord.phone}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
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
                    WhatsApp
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={bookingModal}
        onClose={() => setBookingModal(false)}
        title="Book a Room"
        description={`Booking at ${hostel.name}`}
        size="md"
      >
        <div className="flex flex-col gap-5">
          {/* Room selection */}
          {rooms.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Select Room</p>
              <div className="grid grid-cols-2 gap-2">
                {rooms.filter((r: Room) => r.is_available).map((room: Room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      selectedRoom?.id === room.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-200">Room {room.room_number}</p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatCurrency(room.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Select
            label="Academic Year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            options={ACADEMIC_YEARS}
          />

          <Input
            label="Notes (optional)"
            placeholder="Any special requests or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Payment notice */}
          <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              <p className="font-semibold mb-1">Manual Payment Required</p>
              <p>After booking, transfer to: <strong>{hostel.bank_name}</strong> — <strong>{hostel.account_number}</strong> ({hostel.account_name}). Then upload your receipt.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBookingModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={createBooking.isPending}
              disabled={rooms.length > 0 && !selectedRoom}
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
