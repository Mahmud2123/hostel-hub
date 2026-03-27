"use client";

import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { HostelsTable } from "@/components/features/HostelsTable";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Hostel } from "@/types";
import toast from "react-hot-toast";

export default function AdminHostelsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const qc = useQueryClient();

  const { data: hostels = [], isLoading } = useQuery<Hostel[]>({
    queryKey: ["admin-hostels"],
    queryFn: async () => {
      const res = await fetch("/api/hostels");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const updateHostel = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/hostels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.status === "APPROVED" ? "Hostel approved!" : "Hostel rejected");
      qc.invalidateQueries({ queryKey: ["admin-hostels"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteHostel = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hostels/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    },
    onSuccess: () => {
      toast.success("Hostel deleted");
      qc.invalidateQueries({ queryKey: ["admin-hostels"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = hostels.filter((h) => {
    const matchSearch = !search || h.name?.toLowerCase().includes(search.toLowerCase()) || h.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Hostels</h1>
        <p className="text-sm text-slate-400 mt-1">Approve or reject hostel listings submitted by landlords</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search hostels..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            options={[
              { value: "", label: "All Statuses" },
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No hostels found" description="No hostels match your current filters." />
      ) : (
        <HostelsTable
          hostels={filtered}
          loading={isLoading}
          showLandlord
          showActions
          onApprove={(id) => updateHostel.mutate({ id, status: "APPROVED" })}
          onReject={(id) => updateHostel.mutate({ id, status: "REJECTED" })}
          onDelete={(id) => { if (confirm("Delete this hostel?")) deleteHostel.mutate(id); }}
        />
      )}
    </div>
  );
}
