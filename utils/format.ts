import { format, formatDistanceToNow } from "date-fns";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDatetime(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatRole(role: string): string {
  const roles: Record<string, string> = {
    ADMIN: "Administrator",
    LANDLORD: "Landlord",
    STUDENT: "Student",
  };
  return roles[role] || role;
}

export function formatBookingStatus(status: string): string {
  const statuses: Record<string, string> = {
    PENDING_VERIFICATION: "Pending Verification",
    CONFIRMED: "Confirmed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
  };
  return statuses[status] || status;
}

export function formatHostelStatus(status: string): string {
  const statuses: Record<string, string> = {
    PENDING: "Pending Approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return statuses[status] || status;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const FACILITIES_OPTIONS = [
  "WiFi",
  "Security",
  "Water Supply",
  "Electricity (NEPA)",
  "Generator Backup",
  "Parking Space",
  "Kitchen",
  "Laundry",
  "CCTV",
  "Furnished Rooms",
  "Air Conditioning",
  "Study Area",
  "Common Room",
  "24/7 Access",
];

export const LOCATIONS = [
  "Bauchi",
  "Kaduna",
  "Kano",
  "Abuja (FCT)",
  "Lagos",
  "Port Harcourt",
  "Ibadan",
  "Enugu",
  "Jos",
  "Maiduguri",
];
