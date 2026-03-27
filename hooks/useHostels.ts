import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Hostel, HostelFilters } from "@/types";

async function fetchHostels(filters?: HostelFilters): Promise<Hostel[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.location) params.set("location", filters.location);
  if (filters?.min_price) params.set("min_price", String(filters.min_price));
  if (filters?.max_price) params.set("max_price", String(filters.max_price));
  if (filters?.status) params.set("status", filters.status);
  if (filters?.facilities?.length) params.set("facilities", filters.facilities.join(","));

  const res = await fetch(`/api/hostels?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch hostels");
  const json = await res.json();
  return json.data;
}

async function fetchHostel(id: string): Promise<Hostel> {
  const res = await fetch(`/api/hostels/${id}`);
  if (!res.ok) throw new Error("Failed to fetch hostel");
  const json = await res.json();
  return json.data;
}

export function useHostels(filters?: HostelFilters) {
  return useQuery({
    queryKey: ["hostels", filters],
    queryFn: () => fetchHostels(filters),
  });
}

export function useHostel(id: string) {
  return useQuery({
    queryKey: ["hostel", id],
    queryFn: () => fetchHostel(id),
    enabled: !!id,
  });
}

export function useCreateHostel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Hostel>) => {
      const res = await fetch("/api/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create hostel");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hostels"] });
    },
  });
}

export function useUpdateHostel(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Hostel>) => {
      const res = await fetch(`/api/hostels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update hostel");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hostels"] });
      qc.invalidateQueries({ queryKey: ["hostel", id] });
    },
  });
}

export function useDeleteHostel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hostels/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete hostel");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hostels"] });
    },
  });
}
