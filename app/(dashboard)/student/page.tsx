"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useBookings } from "@/hooks/useBookings";
import { useFavorites } from "@/hooks/useFavorites";
import { useHostels } from "@/hooks/useHostels";
import { StatsCard } from "@/components/ui/StatsCard";
import { BookingCard } from "@/components/features/BookingCard";
import { HostelCard } from "@/components/features/HostelCard";
import { Building2, BookOpen, Heart, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HostelCardSkeleton } from "@/components/ui/Skeleton";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const { data: favorites = [] } = useFavorites();
  const { data: hostels = [], isLoading: hostelsLoading } = useHostels({ status: "APPROVED" });

  const recentBookings = bookings.slice(0, 3);
  const recentHostels = hostels.slice(0, 3);
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pendingCount = bookings.filter((b) => b.status === "PENDING_VERIFICATION").length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            {greeting()}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Find and manage your hostel bookings</p>
        </div>
        <Link href="/student/hostels">
          <Button variant="primary" size="sm" leftIcon={<Search className="h-4 w-4" />}>
            Browse Hostels
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Bookings" value={bookings.length} icon={BookOpen} />
        <StatsCard
          title="Confirmed"
          value={confirmedCount}
          icon={Building2}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatsCard
          title="Pending"
          value={pendingCount}
          icon={BookOpen}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <StatsCard
          title="Favorites"
          value={favorites.length}
          icon={Heart}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
        />
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200">Recent Bookings</h2>
          <Link href="/student/bookings">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </div>
        {bookingsLoading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : recentBookings.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-center">
            <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No bookings yet</p>
            <Link href="/student/hostels">
              <Button variant="outline" size="sm" className="mt-3">Browse Hostels</Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>

      {/* Recommended Hostels */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200">Available Hostels</h2>
          <Link href="/student/hostels">
            <Button variant="ghost" size="sm">See all</Button>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostelsLoading
            ? Array.from({ length: 3 }).map((_, i) => <HostelCardSkeleton key={i} />)
            : recentHostels.map((hostel) => (
                <HostelCard
                  key={hostel.id}
                  hostel={hostel}
                  href={`/student/hostels/${hostel.id}`}
                  isFavorited={favorites.some((f) => f.hostel_id === hostel.id)}
                />
              ))}
        </div>
      </div>
    </div>
  );
}
