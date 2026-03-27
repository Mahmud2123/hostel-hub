"use client";

import { useState } from "react";
import { useBookings, useUpdateBookingStatus, useSubmitPaymentProof } from "@/hooks/useBookings";
import { BookingCard } from "@/components/features/BookingCard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileUpload } from "@/components/features/FileUpload";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { BookOpen, Upload, X, AlertTriangle } from "lucide-react";
import { Booking } from "@/types";
import { formatCurrency } from "@/utils/format";
import toast from "react-hot-toast";

export default function StudentBookingsPage() {
  const { data: bookings = [], isLoading } = useBookings();
  const updateStatus = useUpdateBookingStatus();
  const submitProof = useSubmitPaymentProof();

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [proofModal, setProofModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);

  const [proofUrl, setProofUrl] = useState("");
  const [whatsappProof, setWhatsappProof] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [amount, setAmount] = useState("");

  const openProofModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setProofUrl("");
    setWhatsappProof("");
    setProofNote("");
    setAmount(String(booking.room?.price ?? ""));
    setProofModal(true);
  };

  const openCancelModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelModal(true);
  };

  const handleSubmitProof = () => {
    if (!selectedBooking) return;
    if (!proofUrl && !whatsappProof) {
      toast.error("Please upload a receipt or enter WhatsApp proof");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    submitProof.mutate(
      {
        booking_id: selectedBooking.id,
        image_url: proofUrl || undefined,
        whatsapp_proof: whatsappProof || undefined,
        note: proofNote || undefined,
        amount: Number(amount),
      },
      {
        onSuccess: () => {
          toast.success("Payment proof submitted!");
          setProofModal(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleCancel = () => {
    if (!selectedBooking) return;
    updateStatus.mutate(
      { id: selectedBooking.id, status: "CANCELLED" },
      {
        onSuccess: () => {
          toast.success("Booking cancelled");
          setCancelModal(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">My Bookings</h1>
        <p className="text-sm text-slate-400 mt-0.5">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No bookings yet"
          description="Browse available hostels and book your first room"
          action={{ label: "Browse Hostels", onClick: () => window.location.href = "/student/hostels" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              actions={
                <div className="flex gap-2 w-full">
                  {booking.status === "PENDING_VERIFICATION" && !booking.payment_proof && (
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<Upload className="h-3.5 w-3.5" />}
                      className="flex-1"
                      onClick={() => openProofModal(booking)}
                    >
                      Upload Receipt
                    </Button>
                  )}
                  {booking.status === "PENDING_VERIFICATION" && booking.payment_proof?.status === "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Upload className="h-3.5 w-3.5" />}
                      className="flex-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => openProofModal(booking)}
                    >
                      Re-upload Proof
                    </Button>
                  )}
                  {booking.status === "PENDING_VERIFICATION" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<X className="h-3.5 w-3.5" />}
                      onClick={() => openCancelModal(booking)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* Payment Proof Modal */}
      <Modal
        isOpen={proofModal}
        onClose={() => setProofModal(false)}
        title="Upload Payment Proof"
        description={`For booking at ${selectedBooking?.hostel?.name}`}
        size="md"
      >
        <div className="flex flex-col gap-5">
          {selectedBooking?.hostel && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-sm">
              <p className="text-slate-400 mb-2">Transfer to:</p>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <span className="text-slate-500">Bank</span>
                <span className="text-slate-200 font-medium">{selectedBooking.hostel.bank_name}</span>
                <span className="text-slate-500">Account No.</span>
                <span className="text-slate-200 font-mono">{selectedBooking.hostel.account_number}</span>
                <span className="text-slate-500">Account Name</span>
                <span className="text-slate-200">{selectedBooking.hostel.account_name}</span>
              </div>
            </div>
          )}

          <FileUpload
            label="Upload Receipt (image)"
            hint="JPG, PNG, WEBP up to 5MB"
            value={proofUrl}
            onUpload={setProofUrl}
            onRemove={() => setProofUrl("")}
            bucket="payment-proofs"
          />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <Input
            label="WhatsApp Proof Link / Reference"
            placeholder="WhatsApp screenshot link or transfer reference..."
            value={whatsappProof}
            onChange={(e) => setWhatsappProof(e.target.value)}
          />

          <Input
            label="Amount Transferred (₦)"
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Input
            label="Note (optional)"
            placeholder="Any additional notes for the landlord..."
            value={proofNote}
            onChange={(e) => setProofNote(e.target.value)}
          />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setProofModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={submitProof.isPending}
              onClick={handleSubmitProof}
            >
              Submit Proof
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Cancel Booking"
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCancelModal(false)}>
              Keep Booking
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={updateStatus.isPending}
              onClick={handleCancel}
            >
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
