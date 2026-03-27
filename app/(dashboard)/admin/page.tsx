"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Users, Building2, Clock, CheckCircle, AlertTriangle, ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HostelStatusBadge, RoleBadge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/format";
import type { User, Hostel, Booking } from "@/types";

export default function AdminDashboard() {
  const users = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const hostels = useQuery<Hostel[]>({
    queryKey: ["admin-hostels"],
    queryFn: async () => {
      const res = await fetch("/api/hostels");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const bookings = useQuery<Booking[]>({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const stats = useMemo(() => ({
    totalUsers: users.data?.length ?? 0,
    students: users.data?.filter((u) => u.role === "STUDENT").length ?? 0,
    landlords: users.data?.filter((u) => u.role === "LANDLORD").length ?? 0,
    totalHostels: hostels.data?.length ?? 0,
    pendingHostels: hostels.data?.filter((h) => h.status === "PENDING").length ?? 0,
    approvedHostels: hostels.data?.filter((h) => h.status === "APPROVED").length ?? 0,
    pendingBookings: bookings.data?.filter((b) => b.status === "PENDING_VERIFICATION").length ?? 0,
    confirmedBookings: bookings.data?.filter((b) => b.status === "CONFIRMED").length ?? 0,
  }), [users.data, hostels.data, bookings.data]);

  const recentUsers = (users.data ?? []).slice(0, 6);
  const pendingHostelsList = (hostels.data ?? []).filter((h) => h.status === "PENDING").slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Platform overview and management controls</p>
      </div>

      {stats.pendingHostels > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            <span className="font-semibold">{stats.pendingHostels} hostel{stats.pendingHostels !== 1 ? "s" : ""}</span> awaiting approval.
          </p>
          <Link href="/admin/hostels" className="ml-auto">
            <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              Review Now
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={stats.totalUsers} icon={Users} iconColor="text-sky-400" iconBg="bg-sky-500/10" />
        <StatsCard title="Total Hostels" value={stats.totalHostels} icon={Building2} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" />
        <StatsCard title="Pending Bookings" value={stats.pendingBookings} icon={Clock} iconColor="text-amber-400" iconBg="bg-amber-500/10" />
        <StatsCard title="Confirmed Bookings" value={stats.confirmedBookings} icon={CheckCircle} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Students", value: stats.students, color: "text-emerald-400" },
          { label: "Landlords", value: stats.landlords, color: "text-sky-400" },
          { label: "Approved Hostels", value: stats.approvedHostels, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Hostels */}
        <Card variant="bordered" padding="none">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
            <h3 className="text-base font-semibold text-slate-100">Pending Hostel Approvals</h3>
            <Link href="/admin/hostels">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>View all</Button>
            </Link>
          </div>
          {pendingHostelsList.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
              <p className="text-sm text-slate-500">All hostels reviewed</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {pendingHostelsList.map((hostel) => (
                <div key={hostel.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{hostel.name}</p>
                    <p className="text-xs text-slate-500">{hostel.location} · {formatDate(hostel.created_at)}</p>
                  </div>
                  <HostelStatusBadge status={hostel.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Users */}
        <Card variant="bordered" padding="none">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
            <h3 className="text-base font-semibold text-slate-100">Recent Users</h3>
            <Link href="/admin/users">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>View all</Button>
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-500">No users yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentUsers.map((user) => (
                <div key={user.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
