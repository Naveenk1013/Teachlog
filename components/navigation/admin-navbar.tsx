"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/login/actions";
import {
  LayoutDashboard,
  CalendarClock,
  UserCheck,
  Users,
  BookOpen,
  GraduationCap,
  Layers,
  Activity,
  Calendar,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const adminNavItems = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    color: "text-slate-400",
  },
  {
    href: "/admin/logs",
    label: "Weekly Logs & Reports Hub",
    icon: CalendarClock,
    color: "text-indigo-400",
    badge: "AI Powered",
    badgeColor: "bg-indigo-900/60 text-indigo-300 border border-indigo-700/50",
  },
  {
    href: "/admin/attendance",
    label: "Attendance System",
    icon: UserCheck,
    color: "text-emerald-400",
    badge: "New",
    badgeColor: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50",
  },
  {
    href: "/admin/teachers",
    label: "Teachers",
    icon: Users,
    color: "text-emerald-400",
  },
  {
    href: "/admin/subjects",
    label: "Subjects",
    icon: BookOpen,
    color: "text-amber-400",
  },
  {
    href: "/admin/allocations",
    label: "Allocations",
    icon: GraduationCap,
    color: "text-indigo-400",
  },
  {
    href: "/admin/batches",
    label: "Batches",
    icon: Layers,
    color: "text-cyan-400",
  },
  {
    href: "/admin/crs",
    label: "Class Representatives",
    icon: UserCheck,
    color: "text-cyan-400",
  },
  {
    href: "/admin/audit",
    label: "Audit Logs",
    icon: Activity,
    color: "text-purple-400",
  },
  {
    href: "/calendar",
    label: "Academic Calendar",
    icon: Calendar,
    color: "text-slate-400",
  },
];


export function AdminNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-700 p-0.5 flex items-center justify-center shadow-xs shrink-0">
              <img src="/iihm_logo.png" alt="IIHM Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white tracking-tight text-base leading-tight block">
                  TeachLog
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                IIHM Hyderabad Administration
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white font-bold ring-1 ring-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : item.color}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Sign Out & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Sign Out */}
          <form action={logoutAction} className="hidden lg:block">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Admin Navigation"
            className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer & Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-in Menu Panel */}
          <div className="relative w-4/5 max-w-xs bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-800 text-white animate-in slide-in-from-right duration-300">
            {/* Drawer Top Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-700 p-0.5 flex items-center justify-center shadow-xs">
                  <img src="/iihm_logo.png" alt="IIHM Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white leading-tight">TeachLog Admin</h2>
                  <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
                    Control Center
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Badge Banner */}
            <div className="mx-3 my-2 p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center gap-2.5">
              <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Administrator Access</span>
                <span className="text-[10px] text-slate-400 block">Full system configuration &amp; records</span>
              </div>
            </div>

            {/* Mobile Navigation Links */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Admin Modules
              </span>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : item.color}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && !isActive && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}

                    {isActive && <ChevronRight className="w-4 h-4 text-slate-950" />}
                  </Link>
                );
              })}
            </div>

            {/* Drawer Bottom Actions: Sign Out */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Admin Portal</span>
                </button>
              </form>
              <div className="text-center text-[10px] text-slate-500 font-medium">
                IIHM Hyderabad • Administration
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
