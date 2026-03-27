import { cn } from "@/utils/cn";
import { BookingStatus, HostelStatus, PaymentStatus } from "@/types";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-700/60 text-slate-300 border-slate-600/50",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const dotStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-sky-400",
  purple: "bg-purple-400",
};

export function Badge({
  children,
  variant = "default",
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[variant])} />
      )}
      {children}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config: Record<BookingStatus, { label: string; variant: BadgeVariant }> = {
    PENDING_VERIFICATION: { label: "Pending Verification", variant: "warning" },
    CONFIRMED: { label: "Confirmed", variant: "success" },
    REJECTED: { label: "Rejected", variant: "danger" },
    CANCELLED: { label: "Cancelled", variant: "default" },
  };

  const { label, variant } = config[status] ?? { label: status, variant: "default" };
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function HostelStatusBadge({ status }: { status: HostelStatus }) {
  const config: Record<HostelStatus, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: "Pending Approval", variant: "warning" },
    APPROVED: { label: "Approved", variant: "success" },
    REJECTED: { label: "Rejected", variant: "danger" },
  };

  const { label, variant } = config[status] ?? { label: status, variant: "default" };
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: "Pending", variant: "warning" },
    VERIFIED: { label: "Verified", variant: "success" },
    REJECTED: { label: "Rejected", variant: "danger" },
  };

  const { label, variant } = config[status] ?? { label: status, variant: "default" };
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    ADMIN: { label: "Admin", variant: "purple" },
    LANDLORD: { label: "Landlord", variant: "info" },
    STUDENT: { label: "Student", variant: "success" },
  };

  const { label, variant } = config[role] ?? { label: role, variant: "default" };
  return <Badge variant={variant}>{label}</Badge>;
}
