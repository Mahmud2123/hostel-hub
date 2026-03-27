"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Building2,
  BookOpen,
  Heart,
  Users,
  CheckSquare,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Bell,
  Settings,
  ShieldCheck,
  ClipboardList,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { RoleBadge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Browse Hostels", href: "/student/hostels", icon: Building2 },
  { label: "My Bookings", href: "/student/bookings", icon: BookOpen },
  { label: "Favorites", href: "/student/favorites", icon: Heart },
];

const landlordNav: NavItem[] = [
  { label: "Dashboard", href: "/landlord", icon: LayoutDashboard },
  { label: "My Hostels", href: "/landlord/hostels", icon: Building2 },
  { label: "Add Hostel", href: "/landlord/hostels/new", icon: PlusCircle },
  { label: "Bookings", href: "/landlord/bookings", icon: ClipboardList },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Hostels", href: "/admin/hostels", icon: Building2 },
  { label: "Landlords", href: "/admin/landlords", icon: ShieldCheck },
];

function getNav(role?: string): NavItem[] {
  if (role === "STUDENT") return studentNav;
  if (role === "LANDLORD") return landlordNav;
  if (role === "ADMIN") return adminNav;
  return [];
}

const accentColors: Record<string, { active: string; dot: string; ring: string }> = {
  STUDENT: {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
  },
  LANDLORD: {
    active: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
    ring: "ring-sky-500/30",
  },
  ADMIN: {
    active: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
    ring: "ring-purple-500/30",
  },
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const nav = getNav(user?.role);
  const colors = accentColors[user?.role ?? "STUDENT"];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-slate-100 tracking-tight">
          Hostel<span className="text-emerald-400">Hub</span>
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const isActive =
            item.href === `/${user?.role?.toLowerCase()}`
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group border",
                isActive
                  ? `${colors.active} border`
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "" : "group-hover:text-slate-300"
                )}
              />
              {item.label}
              {isActive && (
                <ChevronRight className="ml-auto h-3 w-3 opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg ring-1", colors.ring, "bg-slate-800/50")}>
          <div className="relative flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900", colors.dot)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
            <RoleBadge role={user?.role ?? ""} />
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-slate-900 border-r border-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-slate-800 bg-slate-900/70 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-slate-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="p-4 lg:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
