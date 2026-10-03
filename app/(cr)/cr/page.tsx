import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCRUser, getCRBatchAndAssignments, getCRDashboardStats } from "@/lib/data/cr";
import {
  PenSquare,
  CalendarClock,
  History,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  BookOpen,
  TrendingUp,
  FileText,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "CR Dashboard | TeachLog",
  description: "Class Representative dashboard — view today's classes, weekly stats, and quick actions.",
};

export default async function CRDashboardPage() {
  const user = await getCurrentCRUser();
  if (!user) {
    redirect("/login");
  }

  const { batch } = await getCRBatchAndAssignments(user.id);

  if (!batch) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-900 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>No Active Batch Authorization</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          You are not currently registered as an active Class Representative for any batch.
          Please contact your faculty coordinator or institute administration.
        </p>
      </div>
    );
  }

  const stats = await getCRDashboardStats(batch.id);

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
        <div className="relative">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
            Class Representative Portal
          </span>
          <h1 className="text-xl font-bold mt-1">
            {greeting}, {user.fullName.split(" ")[0]}! 👋
          </h1>
          <p className="text-xs text-indigo-100 mt-1 font-medium">
            {batch.name} • Semester {batch.current_semester} • {batch.academic_year}
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{stats.totalSessionsThisWeek}</p>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">This Week</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600">{stats.verifiedThisWeek}</p>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verified</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-600">{stats.pendingThisWeek}</p>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-purple-600">{stats.totalSessionsAllTime}</p>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All Time</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/cr/log"
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all group flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
            <PenSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold">Log Today&apos;s Class</h3>
            <p className="text-[11px] text-indigo-100 mt-0.5">Record a new session with attendance</p>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Link>

        <Link
          href="/cr/attendance"
          className="bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all group flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Take Attendance</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Mark student attendance for a session</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>

      {/* Two Column Layout: Today's Classes + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Today's Classes — 3 cols */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900">Today&apos;s Classes</h2>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </span>
          </div>

          {stats.todaySessions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-600">No classes logged today</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Start by logging your first class for today
              </p>
              <Link
                href="/cr/log"
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
              >
                <PenSquare className="w-3.5 h-3.5" />
                Log Class
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.todaySessions.map((session) => (
                <div key={session.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {session.subjectCode ? `${session.subjectCode} — ` : ""}{session.subjectName}
                      </p>
                      {session.status === "verified" ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-700 shrink-0">Verified</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-700 shrink-0">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {session.startTime} – {session.endTime} • {session.teacherName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <Link
            href="/cr/history"
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <History className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-slate-900">My Submitted Entries</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">View and edit recent logs within 24h</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0" />
          </Link>

          <Link
            href="/cr/calendar"
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-purple-300 hover:shadow-sm transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-slate-900">Academic Calendar</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Holidays, sessions, and schedule view</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 shrink-0" />
          </Link>

          {/* Recent Activity Mini Feed */}
          {stats.recentSessions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recent Activity</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {stats.recentSessions.map((s) => (
                  <div key={s.id} className="px-4 py-2.5 flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === "verified" ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 truncate">{s.subjectName}</p>
                      <p className="text-[10px] text-slate-400">{s.sessionDate} • {s.teacherName}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      s.status === "verified"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {s.status === "verified" ? "✓" : "⏳"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
