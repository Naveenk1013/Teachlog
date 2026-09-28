"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/login/actions";
import {
  PenSquare,
  CalendarClock,
  History,
  Users,
  Calendar,
  LogOut,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

interface CRNavbarProps {
  user: {
    id: string;
    fullName: string;
  } | null;
  batchName: string;
}

const crNavItems = [
  {
    href: "/cr/log",
    label: "Log Class Session",
    shortLabel: "Log Class",
    icon: PenSquare,
    color: "text-indigo-600",
  },
  {
    href: "/cr/logs",
    label: "Weekly Logs & Topics",
    shortLabel: "Weekly Logs",
    icon: CalendarClock,
    color: "text-blue-600",
  },
  {
    href: "/cr/history",
    label: "My Submitted Entries",
    shortLabel: "History",
    icon: History,
    color: "text-slate-600",
  },
  {
    href: "/cr/attendance",
    label: "Cohort Attendance",
    shortLabel: "Attendance",
    icon: Users,
    color: "text-emerald-600",
    badge: "New",
  },
  {
    href: "/cr/calendar",
    label: "Academic Calendar",
    shortLabel: "Calendar",
    icon: Calendar,
    color: "text-purple-600",
  },
];

export function CRNavbar({ user, batchName }: CRNavbarProps) {
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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs shrink-0">
            <img src="/iihm_logo.png" alt="IIHM Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-slate-900 leading-tight">TeachLog</h1>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                CR Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
              {user?.fullName || "Representative"} • {batchName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Sign Out */}
          <form action={logoutAction} className="hidden sm:block">
            <button
              type="submit"
              title="Sign Out"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle CR Navigation"
            className="sm:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop/Tablet Horizontal Navigation Bar */}
      <div className="max-w-5xl mx-auto px-4 pb-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
        <div className="flex sm:grid sm:grid-cols-5 gap-1 pt-2 min-w-max sm:min-w-0">
          {crNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap text-center ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:text-indigo-600 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : item.color}`} />
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex justify-end">
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
                    CR Portal
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

            {/* CR Info Card */}
            <div className="p-4 mx-3 my-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {user?.fullName?.charAt(0) || "C"}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {user?.fullName || "Class Representative"}
                  </span>
                  <span className="text-[11px] text-indigo-700 font-semibold block">
                    {batchName}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Authorized Representative
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Navigation Links */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Representative Actions
              </span>
              {crNavItems.map((item) => {
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
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : item.color}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && !isActive && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-700">
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
                  <span>Sign Out of CR Portal</span>
                </button>
              </form>
              <div className="text-center text-[10px] text-slate-400 font-medium">
                IIHM Hyderabad • Class Representative
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
