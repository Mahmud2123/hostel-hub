"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Users, Wifi, Star, Heart, BedDouble } from "lucide-react";
import { Hostel } from "@/types";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import { HostelStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface HostelCardProps {
  hostel: Hostel;
  href?: string;
  showStatus?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (hostelId: string) => void;
  actions?: React.ReactNode;
}

export function HostelCard({
  hostel,
  href,
  showStatus = false,
  isFavorited = false,
  onToggleFavorite,
  actions,
}: HostelCardProps) {
  const defaultImage = `https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80`;
  const imageUrl = hostel.images?.[0] || defaultImage;

  return (
    <div className="group rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-slate-800">
        <Image
          src={imageUrl}
          alt={hostel.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(hostel.id);
            }}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-900/70 backdrop-blur-sm flex items-center justify-center border border-slate-700/50 hover:bg-slate-800 transition-all"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                isFavorited ? "fill-red-400 text-red-400" : "text-slate-300"
              )}
            />
          </button>
        )}

        {/* Availability badge */}
        <div className="absolute bottom-3 left-3">
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              hostel.available_rooms > 0
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            )}
          >
            {hostel.available_rooms > 0
              ? `${hostel.available_rooms} rooms available`
              : "Fully booked"}
          </span>
        </div>

        {showStatus && (
          <div className="absolute top-3 left-3">
            <HostelStatusBadge status={hostel.status} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2">
          <h3 className="font-semibold text-slate-100 text-sm leading-snug line-clamp-1 group-hover:text-emerald-400 transition-colors">
            {hostel.name}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-slate-400">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs truncate">{hostel.location}</span>
          </div>
        </div>

        {/* Facilities */}
        {hostel.facilities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {hostel.facilities.slice(0, 3).map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/40 text-xs text-slate-400"
              >
                {f}
              </span>
            ))}
            {hostel.facilities.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/40 text-xs text-slate-400">
                +{hostel.facilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <div>
            <p className="text-base font-bold text-emerald-400">
              {formatCurrency(hostel.price_per_year)}
            </p>
            <p className="text-xs text-slate-500">per academic year</p>
          </div>
          {actions || (
            href && (
              <Link href={href}>
                <Button size="sm" variant="primary">
                  View Details
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
