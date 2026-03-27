"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2, BookOpen, Clock, CheckCircle, XCircle,
  PlusCircle, ArrowRight, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHostels } from "@/hooks/useHostels";
import { useBookings } from "@/hooks/useBookings";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/utils/format";

export default function LandlordDashboard() {
  const { user } = useAuth();

  const { data: hostels = [] } = useHostels({ status: undefined });
  const { data: bookings = [] } = useBookings();

  const stats = useMemo(() => ({
    totalHostels: hostels.length,
    approvedHostels: hostels.filter((h) => h.status === "APPROVED").length,
    pendingBookings: bookings.filter((b) => b.status === "PENDING_VERIFICATION").length,
    confirmedBookings: bookings.filter((b) => b.status === "CONFIRMED").length,
  }), [hostels, bookings]);

  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here's an overview of your properties and bookings.
          </p>
        </div>
        <Link href="/landlord/hostels/new">
          <Button leftIcon={<PlusCircle className="h-4 w-4" />}>
            Add Hostel
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Hostels"
          value={stats.totalHostels}
          icon={Building2}
          iconColor="text-sky-400"
          iconBg="bg-sky-500/10"
        />
        <StatsCard
          title="Approved"
          value={stats.approvedHostels}
          icon={CheckCircle}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatsCard
          title="Pending Payments"
          value={stats.pendingBookings}
          icon={Clock}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <StatsCard
          title="Confirmed Bookings"
          value={stats.confirmedBookings}
          icon={TrendingUp}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <Card variant="bordered" className="lg:col-span-2" padding="none">
          <CardHeader className="px-5 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Bookings</CardTitle>
              <Link href="/landlord/bookings">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="px-5 pb-5 text-center py-10">
                <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No bookings yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {booking.student?.name ?? "Student"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {booking.hostel?.name} · Room {booking.room?.room_number}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Hostels quick view */}
        <Card variant="bordered" padding="none">
          <CardHeader className="px-5 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle>My Hostels</CardTitle>
              <Link href="/landlord/hostels">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Manage
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {hostels.length === 0 ? (
              <div className="px-5 pb-5 text-center py-10">
                <Building2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-3">No hostels yet</p>
                <Link href="/landlord/hostels/new">
                  <Button size="sm">Add your first hostel</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {hostels.slice(0, 5).map((hostel) => (
                  <div key={hostel.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-200 truncate max-w-[140px]">
                        {hostel.name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        hostel.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : hostel.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {hostel.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hostel.available_rooms}/{hostel.total_rooms} rooms available
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
