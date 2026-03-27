"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Building2 } from "lucide-react";
import { useHostels, useDeleteHostel } from "@/hooks/useHostels";
import { useUpdateHostel } from "@/hooks/useHostels";
import { Button } from "@/components/ui/Button";
import { HostelsTable } from "@/components/features/HostelsTable";
import { ConfirmModal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";

export default function LandlordHostelsPage() {
  const router = useRouter();
  const { data: hostels = [], isLoading } = useHostels({ status: undefined });
  const deleteHostel = useDeleteHostel();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const landlordHostels = hostels; // API already filters by landlord for LANDLORD role

  const handleDelete = async () => {
    if (!deleteId) return;
    deleteHostel.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Hostel deleted");
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Hostels</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your property listings
          </p>
        </div>
        <Link href="/landlord/hostels/new">
          <Button leftIcon={<PlusCircle className="h-4 w-4" />}>
            Add Hostel
          </Button>
        </Link>
      </div>

      {!isLoading && landlordHostels.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hostels listed yet"
          description="Start by adding your first hostel to attract students."
          action={{
            label: "Add Hostel",
            onClick: () => router.push("/landlord/hostels/new"),
          }}
        />
      ) : (
        <HostelsTable
          hostels={landlordHostels}
          loading={isLoading}
          onEdit={(id) => router.push(`/landlord/hostels/${id}/edit`)}
          onDelete={(id) => setDeleteId(id)}
          showActions
        />
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Hostel"
        description="Are you sure you want to delete this hostel? This action cannot be undone and will also remove all associated rooms and bookings."
        confirmLabel="Delete Hostel"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteHostel.isPending}
      />
    </div>
  );
}
