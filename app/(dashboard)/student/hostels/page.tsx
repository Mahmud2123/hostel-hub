"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useHostels } from "@/hooks/useHostels";
import { useFavorites } from "@/hooks/useFavorites";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { HostelCard } from "@/components/features/HostelCard";
import { HostelCardSkeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CheckboxGroup } from "@/components/ui/Checkbox";
import { RangeSlider } from "@/components/ui/Slider";
import { EmptyState } from "@/components/ui/EmptyState";
import { HostelFilters } from "@/types";
import { FACILITIES_OPTIONS, LOCATIONS, formatCurrency } from "@/utils/format";
import toast from "react-hot-toast";

export default function BrowseHostelsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  const filters: HostelFilters = useMemo(() => ({
    status: "APPROVED",
    search: search || undefined,
    location: location || undefined,
    min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
    max_price: priceRange[1] < 500000 ? priceRange[1] : undefined,
    facilities: selectedFacilities.length ? selectedFacilities : undefined,
  }), [search, location, priceRange, selectedFacilities]);

  const { data: hostels = [], isLoading } = useHostels(filters);
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const favoritedIds = new Set(favorites.map((f) => f.hostel_id));

  const handleToggleFavorite = (hostelId: string) => {
    toggleFavorite.mutate(hostelId, {
      onSuccess: (res) => toast.success(res.message || "Updated"),
      onError: (err) => toast.error(err.message),
    });
  };

  const clearFilters = () => {
    setSearch("");
    setLocation("");
    setPriceRange([0, 500000]);
    setSelectedFacilities([]);
  };

  const hasActiveFilters = search || location || selectedFacilities.length > 0 || priceRange[0] > 0 || priceRange[1] < 500000;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Browse Hostels</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isLoading ? "Loading..." : `${hostels.length} hostel${hostels.length !== 1 ? "s" : ""} available`}
          </p>
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
          {hasActiveFilters && (
            <span className="ml-1 h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">
              {[search, location, ...selectedFacilities].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by name, location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="h-4 w-4" />}
        rightIcon={
          search ? (
            <button onClick={() => setSearch("")}>
              <X className="h-4 w-4 hover:text-slate-200" />
            </button>
          ) : undefined
        }
      />

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5 flex flex-col gap-5 animate-slide-up">
          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              options={LOCATIONS.map((l) => ({ value: l, label: l }))}
              placeholder="All locations"
            />
            <RangeSlider
              label="Price Range (₦/year)"
              min={0}
              max={500000}
              step={10000}
              value={priceRange}
              onChange={setPriceRange}
              formatValue={(v) => formatCurrency(v)}
            />
          </div>
          <CheckboxGroup
            label="Facilities"
            options={FACILITIES_OPTIONS}
            selected={selectedFacilities}
            onChange={setSelectedFacilities}
            columns={3}
          />
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="h-4 w-4" />}>
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <HostelCardSkeleton key={i} />)}
        </div>
      ) : hostels.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No hostels found"
          description="Try adjusting your search or filters"
          action={{ label: "Clear filters", onClick: clearFilters }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((hostel) => (
            <HostelCard
              key={hostel.id}
              hostel={hostel}
              href={`/student/hostels/${hostel.id}`}
              isFavorited={favoritedIds.has(hostel.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
