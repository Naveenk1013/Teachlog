"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/login/actions";
import {
  LayoutDashboard,
  Calendar,
  CalendarClock,
  FileText,
  FileSpreadsheet,
  LogOut,
  UserCheck,
  Menu,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface TeacherNavbarProps {
  teacher: {
    id: string;
    fullName: string;
    department?: string | null;
  } | null;
}

const navItems = [
  {
    href: "/dashboard",
    label: "Teaching Dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    href: "/weekly-logs",
    label: "Weekly Logs & Quick Editor",
    icon: CalendarClock,
    badge: "Active",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    href: "/attendance",
    label: "Attendance System",
    icon: UserCheck,
    badge: "New",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    href: "/calendar",
    label: "Academic Calendar",
    icon: Calendar,
    badge: null,
  },
  {
    href: "/summaries",
    label: "Weekly Summary (7 Sec)",
    icon: FileText,
    badge: null,
  },
  {
    href: "/reports",
    label: "Reports (.docx)",
    icon: FileSpreadsheet,
    badge: null,
  },
];

export function TeacherNavbar({ teacher }: TeacherNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on path change or escape key
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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs shrink-0">
              <img src="/iihm_logo.png" alt="IIHM Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base leading-tight block">
                TeachLog
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Faculty Portal • IIHM Hyderabad
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-bold shadow-xs border border-indigo-100"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User Info & Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {teacher && (
            <div className="hidden sm:flex items-center gap-2 text-right pr-2 border-r border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                {teacher.fullName.charAt(0)}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {teacher.fullName}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {teacher.department || "Faculty"}
                </span>
              </div>
            </div>
          )}

          {/* Desktop Sign Out */}
          <form action={logoutAction} className="hidden md:block">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer & Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-in Menu Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Drawer Top Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs">
                  <img src="/iihm_logo.png" alt="IIHM Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">TeachLog</h2>
                  <span className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wider block">
                    Faculty Menu
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Teacher Profile Card */}
            {teacher && (
              <div className="p-4 mx-3 my-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {teacher.fullName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      {teacher.fullName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {teacher.department || "Faculty Member"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Active Session
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Navigation
              </span>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && !isActive && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}

                    {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
                  </Link>
                );
              })}
            </div>

            {/* Drawer Bottom Actions: Sign Out */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Faculty Portal</span>
                </button>
              </form>
              <div className="text-center text-[10px] text-slate-400 font-medium">
                IIHM Hyderabad • Academic Portal
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
