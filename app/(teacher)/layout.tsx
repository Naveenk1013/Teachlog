import { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/login/actions";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import {
  GraduationCap,
  LayoutDashboard,
  Calendar,
  CalendarClock,
  FileText,
  FileSpreadsheet,
  LogOut,
  User,
  UserCheck,
} from "lucide-react";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const teacher = await getCurrentTeacherUser();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Teacher Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs shrink-0">
                <img src="/iihm_logo.png" alt="IIHM Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-base leading-tight block">
                  TeachLog
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Faculty Portal • IIHM Hyderabad
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Teaching Dashboard
              </Link>
              <Link
                href="/weekly-logs"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50/70 flex items-center gap-1.5 transition-colors"
              >
                <CalendarClock className="w-4 h-4 text-blue-600" />
                Weekly Logs &amp; Quick Editor
              </Link>
              <Link
                href="/attendance"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/70 flex items-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Attendance
              </Link>
              <Link
                href="/calendar"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Academic Calendar
              </Link>
              <Link
                href="/summaries"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Weekly Summary (7 Sec)
              </Link>
              <Link
                href="/reports"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Reports (.docx)
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
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

            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
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
