"use client";

import { Booking } from "@/types";
import { formatCurrency, formatDate, formatRelative } from "@/utils/format";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Building2, MapPin, BedDouble, Calendar, Clock } from "lucide-react";

interface BookingCardProps {
  booking: Booking;
  actions?: React.ReactNode;
  showStudentInfo?: boolean;
}

export function BookingCard({
  booking,
  actions,
  showStudentInfo = false,
}: BookingCardProps) {
  return (
    <Card variant="bordered" className="hover:border-slate-600 transition-colors">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-sm">
                {booking.hostel?.name ?? "Hostel"}
              </p>
              <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{booking.hostel?.location}</span>
              </div>
            </div>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <BedDouble className="h-3.5 w-3.5" />
            <span>Room {booking.room?.room_number ?? "-"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>{booking.academic_year}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatRelative(booking.created_at)}</span>
          </div>
          {booking.room?.price && (
            <div className="text-emerald-400 font-semibold">
              {formatCurrency(booking.room.price)}
            </div>
          )}
        </div>

        {showStudentInfo && booking.student && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/30 border border-slate-700/50">
            <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              {booking.student.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">{booking.student.name}</p>
              <p className="text-xs text-slate-500">{booking.student.email}</p>
            </div>
          </div>
        )}

        {/* Payment proof */}
        {booking.payment_proof && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/20 border border-slate-700/40">
            <div>
              <p className="text-xs text-slate-400 mb-1">Payment Proof</p>
              <PaymentStatusBadge status={booking.payment_proof.status} />
            </div>
            {booking.payment_proof.amount > 0 && (
              <span className="text-sm font-semibold text-slate-300">
                {formatCurrency(booking.payment_proof.amount)}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {actions && <div className="flex items-center gap-2 pt-1">{actions}</div>}
      </div>
    </Card>
  );
}
