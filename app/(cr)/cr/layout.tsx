import { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/login/actions";
import { getCurrentCRUser, getCRBatchAndAssignments } from "@/lib/data/cr";
import { LogOut, GraduationCap, PenSquare, History, Users, Calendar, CalendarClock } from "lucide-react";

export default async function CRLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentCRUser();
  let batchName = "Authorized Cohort";
  let semester = 0;

  if (user) {
    const { batch } = await getCRBatchAndAssignments(user.id);
    if (batch) {
      batchName = batch.name;
      semester = batch.current_semester;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header - Mobile First */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-lg mx-auto flex items-center justify-between">
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
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                {user?.fullName || "Representative"} • {batchName}
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign Out"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sign Out</span>
            </button>
          </form>
        </div>

        {/* Tab Navigation (Log Class vs Weekly Logs vs History vs Calendar) */}
        <div className="max-w-4xl mx-auto mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-4 gap-1 sm:gap-2">
          <Link
            href="/cr/log"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all text-center"
          >
            <PenSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">Log Class</span>
          </Link>
          <Link
            href="/cr/logs"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50/70 border border-transparent hover:border-blue-100 transition-all text-center"
          >
            <CalendarClock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Weekly Logs</span>
          </Link>
          <Link
            href="/cr/history"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all text-center"
          >
            <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">My Entries</span>
          </Link>
          <Link
            href="/cr/calendar"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all text-center"
          >
            <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="truncate">Calendar</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full pb-16">{children}</main>
    </div>
  );
}
