import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/utils/cn";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  iconColor = "text-emerald-400",
  iconBg = "bg-emerald-500/10",
  className,
}: StatsCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        "rounded-xl bg-slate-800/60 border border-slate-700/50 p-5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              isPositive ? "text-emerald-400" : "text-red-400"
            )}
          >
            {isPositive ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
