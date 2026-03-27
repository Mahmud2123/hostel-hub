"use client";

import { Hostel } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { HostelStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { MapPin, MoreHorizontal } from "lucide-react";

interface HostelsTableProps {
  hostels: Hostel[];
  loading?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showLandlord?: boolean;
  showActions?: boolean;
}

export function HostelsTable({
  hostels,
  loading,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  showLandlord = false,
  showActions = true,
}: HostelsTableProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Hostel
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Location
              </th>
              {showLandlord && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Landlord
                </th>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Price/Year
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Rooms
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Created
              </th>
              {showActions && (
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={showLandlord ? 8 : 7} />
              ))
            ) : hostels.length === 0 ? (
              <tr>
                <td
                  colSpan={showLandlord ? 8 : 7}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No hostels found
                </td>
              </tr>
            ) : (
              hostels.map((hostel) => (
                <tr
                  key={hostel.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200 max-w-[200px] truncate">
                      {hostel.name}
                    </p>
                    {hostel.address && (
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">
                        {hostel.address}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{hostel.location}</span>
                    </div>
                  </td>
                  {showLandlord && (
                    <td className="px-4 py-3">
                      <p className="text-slate-300">
                        {hostel.landlord?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {hostel.landlord?.email ?? ""}
                      </p>
                    </td>
                  )}
                  <td className="px-4 py-3 font-semibold text-emerald-400">
                    {formatCurrency(hostel.price_per_year)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <span className="text-slate-300">{hostel.available_rooms}</span>
                    <span className="text-slate-600">/</span>
                    <span>{hostel.total_rooms}</span>
                  </td>
                  <td className="px-4 py-3">
                    <HostelStatusBadge status={hostel.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {formatDate(hostel.created_at)}
                  </td>
                  {showActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {hostel.status === "PENDING" && onApprove && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => onApprove(hostel.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {hostel.status === "PENDING" && onReject && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onReject(hostel.id)}
                          >
                            Reject
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(hostel.id)}
                          >
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(hostel.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
