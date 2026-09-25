import { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/login/actions";
import { ShieldCheck, Users, BookOpen, UserCheck, Activity, LogOut, GraduationCap, CalendarClock } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-700 p-0.5 flex items-center justify-center shadow-xs shrink-0">
                <img src="/iihm_logo.png" alt="IIHM Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-bold text-white tracking-tight text-base leading-tight block">
                  TeachLog Admin
                </span>
                <span className="text-[11px] text-slate-400 font-medium block">
                  IIHM Hyderabad Administration
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1 text-sm">
              <Link
                href="/admin"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/admin/logs"
                className="px-2.5 py-1.5 rounded-lg font-medium text-blue-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <CalendarClock className="w-4 h-4 text-blue-400" />
                Weekly Logs
              </Link>
              <Link
                href="/admin/attendance"
                className="px-2.5 py-1.5 rounded-lg font-medium text-emerald-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Attendance
              </Link>
              <Link
                href="/admin/teachers"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                Teachers
              </Link>
              <Link
                href="/admin/subjects"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                Subjects
              </Link>
              <Link
                href="/admin/allocations"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                Allocations
              </Link>
              <Link
                href="/admin/batches"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                Batches
              </Link>
              <Link
                href="/admin/crs"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-cyan-400" />
                CRs
              </Link>
              <Link
                href="/admin/audit"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <Activity className="w-4 h-4 text-purple-400" />
                Audit
              </Link>
              <Link
                href="/calendar"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Calendar
              </Link>
              <Link
                href="/reports"
                className="px-2.5 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                .docx
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
