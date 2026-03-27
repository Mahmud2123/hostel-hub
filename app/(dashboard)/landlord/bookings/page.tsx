"use client";

import { useState } from "react";
import { ClipboardList, CheckCircle, XCircle, Eye, FileImage, MessageCircle } from "lucide-react";
import { useBookings, useUpdateBookingStatus, useVerifyPayment } from "@/hooks/useBookings";
import { Button } from "@/components/ui/Button";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/Badge";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Booking, BookingStatus } from "@/types";
import { formatCurrency, formatDate, formatRelative } from "@/utils/format";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING_VERIFICATION", label: "Pending Verification" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function LandlordBookingsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectModal, setRejectModal] = useState<{ bookingId: string; paymentId?: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;

  const { data: bookings = [], isLoading } = useBookings(params);
  const updateStatus = useUpdateBookingStatus();
  const verifyPayment = useVerifyPayment();

  const handleApprovePayment = (paymentId: string, bookingId: string) => {
    verifyPayment.mutate(
      { id: paymentId, status: "VERIFIED" },
      {
        onSuccess: () => {
          // Also confirm the booking
          updateStatus.mutate({ id: bookingId, status: "CONFIRMED" }, {
            onSuccess: () => {
              toast.success("Payment verified and booking confirmed!");
              setSelectedBooking(null);
            },
          });
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRejectPayment = () => {
    if (!rejectModal?.paymentId && !rejectModal) return;

    if (rejectModal?.paymentId) {
      verifyPayment.mutate(
        { id: rejectModal.paymentId, status: "REJECTED", rejection_reason: rejectionReason },
        {
          onSuccess: () => {
            updateStatus.mutate({ id: rejectModal.bookingId, status: "REJECTED" }, {
              onSuccess: () => {
                toast.success("Booking rejected.");
                setRejectModal(null);
                setSelectedBooking(null);
                setRejectionReason("");
              },
            });
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      updateStatus.mutate(
        { id: rejectModal!.bookingId, status: "REJECTED" },
        {
          onSuccess: () => {
            toast.success("Booking rejected.");
            setRejectModal(null);
            setSelectedBooking(null);
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Bookings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review payment proofs and manage booking status
          </p>
        </div>
        <div className="w-52">
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Filter by status"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No bookings found"
          description={statusFilter ? "No bookings match this filter." : "Students haven't made any bookings yet."}
        />
      ) : (
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {["Student", "Hostel / Room", "Academic Year", "Payment", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{booking.student?.name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{booking.student?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-300 truncate max-w-[160px]">{booking.hostel?.name ?? "—"}</p>
                    <p className="text-xs text-slate-500">Room {booking.room?.room_number}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{booking.academic_year}</td>
                  <td className="px-4 py-3">
                    {booking.payment_proof ? (
                      <PaymentStatusBadge status={booking.payment_proof.status} />
                    ) : (
                      <span className="text-xs text-slate-600">Not submitted</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(booking.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        Review
                      </Button>
                      {booking.status === "PENDING_VERIFICATION" && booking.payment_proof && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleApprovePayment(booking.payment_proof!.id, booking.id)}
                            loading={verifyPayment.isPending || updateStatus.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setRejectModal({ bookingId: booking.id, paymentId: booking.payment_proof?.id })}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking Detail Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-5">
            {/* Student */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                {selectedBooking.student?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-100">{selectedBooking.student?.name}</p>
                <p className="text-sm text-slate-400">{selectedBooking.student?.email}</p>
                {selectedBooking.student?.phone && (
                  <p className="text-xs text-slate-500">{selectedBooking.student.phone}</p>
                )}
              </div>
            </div>

            {/* Booking Info */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Hostel", value: selectedBooking.hostel?.name },
                { label: "Room", value: `Room ${selectedBooking.room?.room_number}` },
                { label: "Academic Year", value: selectedBooking.academic_year },
                { label: "Booking Status", value: <BookingStatusBadge status={selectedBooking.status} /> },
                { label: "Room Price", value: selectedBooking.room?.price ? formatCurrency(selectedBooking.room.price) : "—" },
                { label: "Booked On", value: formatDate(selectedBooking.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <div className="text-sm text-slate-200">{value}</div>
                </div>
              ))}
            </div>

            {selectedBooking.notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Student Notes</p>
                <p className="text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3">
                  {selectedBooking.notes}
                </p>
              </div>
            )}

            {/* Payment Proof */}
            {selectedBooking.payment_proof ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">Payment Proof</p>
                  <PaymentStatusBadge status={selectedBooking.payment_proof.status} />
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Amount Paid</span>
                    <span className="text-sm font-semibold text-emerald-400">
                      {formatCurrency(selectedBooking.payment_proof.amount)}
                    </span>
                  </div>
                  {selectedBooking.payment_proof.note && (
                    <div>
                      <span className="text-xs text-slate-400">Note:</span>
                      <p className="text-sm text-slate-300 mt-0.5">{selectedBooking.payment_proof.note}</p>
                    </div>
                  )}
                  {selectedBooking.payment_proof.image_url && (
                    <a
                      href={selectedBooking.payment_proof.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                    >
                      <FileImage className="h-4 w-4" />
                      View Receipt Image
                    </a>
                  )}
                  {selectedBooking.payment_proof.whatsapp_proof && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <MessageCircle className="h-4 w-4 text-green-400" />
                      {selectedBooking.payment_proof.whatsapp_proof}
                    </div>
                  )}
                  {selectedBooking.payment_proof.rejection_reason && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400">Rejection reason: {selectedBooking.payment_proof.rejection_reason}</p>
                    </div>
                  )}
                </div>
                {selectedBooking.status === "PENDING_VERIFICATION" && selectedBooking.payment_proof.status === "PENDING" && (
                  <div className="flex gap-3">
                    <Button
                      variant="success"
                      className="flex-1"
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                      loading={verifyPayment.isPending || updateStatus.isPending}
                      onClick={() => handleApprovePayment(selectedBooking.payment_proof!.id, selectedBooking.id)}
                    >
                      Verify & Confirm Booking
                    </Button>
                    <Button
                      variant="danger"
                      leftIcon={<XCircle className="h-4 w-4" />}
                      onClick={() => setRejectModal({ bookingId: selectedBooking.id, paymentId: selectedBooking.payment_proof?.id })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl">
                <FileImage className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No payment proof submitted yet</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectionReason(""); }}
        title="Reject Booking"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Please provide a reason for rejection. This will be shown to the student.
          </p>
          <Input
            label="Reason (optional)"
            placeholder="e.g., Payment amount doesn't match, unclear receipt..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setRejectModal(null); setRejectionReason(""); }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleRejectPayment}
              loading={verifyPayment.isPending || updateStatus.isPending}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
