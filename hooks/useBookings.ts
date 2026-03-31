import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Booking, BookingStatus } from "@/types";

async function fetchBookings(params?: Record<string, string>): Promise<Booking[]> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`/api/bookings?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch bookings");
  const json = await res.json();
  return json.data as Booking[];
}

export function useBookings(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["bookings", params ?? null],
    queryFn:  () => fetchBookings(params),
    staleTime: 30_000,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch booking");
      const json = await res.json();
      return json.data as Booking;
    },
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      hostel_id:     string;   // ← room_id removed; server auto-assigns
      academic_year: string;
      notes?:        string;
    }) => {
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create booking");
      }
      return res.json() as Promise<{
        data: Booking & { assigned_room: string };
        message: string;
      }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["hostels"] });
      qc.invalidateQueries({ queryKey: ["hostel"] }); // refresh detail page availability
    },
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update booking");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["hostels"] });
    },
  });
}

export function useSubmitPaymentProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      booking_id:      string;
      image_url?:      string;
      whatsapp_proof?: string;
      note?:           string;
      amount:          number;
    }) => {
      const res = await fetch("/api/payments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit payment proof");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, status, rejection_reason,
    }: {
      id:               string;
      status:           "VERIFIED" | "REJECTED";
      rejection_reason?: string;
    }) => {
      const res = await fetch(`/api/payments/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status, rejection_reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to verify payment");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["hostels"] });
    },
  });
}
