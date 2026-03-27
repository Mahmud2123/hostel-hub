"use client";

import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { HostelCard } from "@/components/features/HostelCard";
import { HostelCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heart } from "lucide-react";
import toast from "react-hot-toast";

export default function FavoritesPage() {
  const { data: favorites = [], isLoading } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const handleToggle = (hostelId: string) => {
    toggleFavorite.mutate(hostelId, {
      onSuccess: () => toast.success("Removed from favorites"),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Favorites</h1>
        <p className="text-sm text-slate-400 mt-0.5">{favorites.length} saved hostel{favorites.length !== 1 ? "s" : ""}</p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <HostelCardSkeleton key={i} />)}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Browse hostels and tap the heart icon to save them here"
          action={{ label: "Browse Hostels", onClick: () => window.location.href = "/student/hostels" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) =>
            fav.hostel ? (
              <HostelCard
                key={fav.hostel_id}
                hostel={fav.hostel}
                href={`/student/hostels/${fav.hostel_id}`}
                isFavorited
                onToggleFavorite={handleToggle}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
