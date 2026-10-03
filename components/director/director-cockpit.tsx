"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ShieldCheck,
  Building,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Download,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Clock,
  Briefcase,
  FileText,
  UserCheck,
  Settings,
  Flame,
} from "lucide-react";
import { DirectorDashboardData } from "@/lib/data/director";

interface DirectorCockpitProps {
  data: DirectorDashboardData;
  masterAdminStats?: any;
}

export function DirectorCockpit({ data, masterAdminStats }: DirectorCockpitProps) {
  const [selectedWeek, setSelectedWeek] = useState("2026-09-14");
  const [viewMode, setViewMode] = useState<"executive" | "system">("executive");

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const officialDocxUrl = `/api/reports/weekly-log?weekStart=${selectedWeek}&semester=1`;

  return (
    <div className="space-y-7">
      {/* 1. PRESIDENTIAL EXECUTIVE HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-amber-500/30 p-7 sm:p-9 text-white shadow-2xl">
        {/* Decorative Luxury Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Office of the Director • IIHM Hyderabad
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/15">
                {data.currentTerm}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {timeGreeting}, Director J Earnest Immanuel
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Institutional executive cockpit for curriculum compliance, departmental teaching velocity, faculty verification audit, and campus attendance oversight.
            </p>
          </div>

          {/* Director Quick Action Hub */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={officialDocxUrl}
              download
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[3]" />
              <span>Download Campus Weekly DOCX</span>
            </a>

            <Link
              href="/admin/logs"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-300" />
              <span>Teaching Logs Explorer</span>
            </Link>

            <button
              onClick={() => setViewMode(viewMode === "executive" ? "system" : "executive")}
              className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all"
              title="Toggle IT Admin Master Configuration"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>{viewMode === "executive" ? "IT Admin View" : "Executive View"}</span>
            </button>
          </div>
        </div>

        {/* Executive Campus Pulse Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
              Academic Term
            </span>
            <span className="font-extrabold text-white text-sm">Autonomous B.Sc. HHA</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
              Teaching Week
            </span>
            <span className="font-extrabold text-amber-300 text-sm">
              Week of {data.currentWeekFormatted}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
              Faculty Endorsement
            </span>
            <span className="font-extrabold text-emerald-400 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {data.metrics.facultyCompliancePercent}% Verified
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
              Official Endorsement
            </span>
            <span className="font-extrabold text-amber-200 text-sm">
              Mr. J Earnest Immanuel, Director
            </span>
          </div>
        </div>
      </div>

      {/* 2. STRATEGIC INSTITUTIONAL HEALTH CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Students Enrolled */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Campus Student Body
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {data.metrics.totalStudents}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active across {data.metrics.totalActiveBatches} Batches &amp; Practical Groups (P1–P4)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <Link
              href="/admin/batches"
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>Manage Batches</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="text-slate-400">Sem 1, 3, 5</span>
          </div>
        </div>

        {/* Card 2: Campus Attendance Health */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Campus Attendance Rate
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {data.metrics.campusAttendancePercent}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Aggregate student presence across all lecture &amp; lab sessions
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <Link
              href="/admin/attendance"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>Open Attendance Hub</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
              Healthy
            </span>
          </div>
        </div>

        {/* Card 3: Faculty Teaching Compliance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Faculty Log Compliance
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {data.metrics.facultyCompliancePercent}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {data.metrics.totalClassSessions} total classes verified across all departments
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <Link
              href="/admin/logs"
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>Inspect Logs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="text-slate-400 font-semibold">{data.metrics.totalFaculty} Professors/Chefs</span>
          </div>
        </div>

        {/* Card 4: Academic Syllabus Velocity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden group hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Syllabus Velocity
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {data.metrics.syllabusVelocityPercent}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              On-track syllabus pacing aligned with NCHMCT semester targets
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <Link
              href="/admin/subjects"
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>Curriculum Plan</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="text-slate-400">Autonomous</span>
          </div>
        </div>
      </div>

      {/* 3. DIRECTOR'S SIGN-OFF & ENDORSEMENT DESK */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Official Document Endorsement
              </span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Signatures Ready
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Director&apos;s Weekly Teaching Log Endorsement Desk
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Generate and endorse official physical IIHM Hyderabad weekly log sheets pre-filled with signature blocks for Faculty Member, Program Leader, and Director.
            </p>
          </div>

          {/* Quick Week Switcher for Sign-Off */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              onClick={() => setSelectedWeek("2026-09-14")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                selectedWeek === "2026-09-14"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              Week 1 (14-Sep)
            </button>
            <button
              onClick={() => setSelectedWeek("2026-09-21")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                selectedWeek === "2026-09-21"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              Week 2 (21-Sep)
            </button>
            <button
              onClick={() => setSelectedWeek("2026-09-28")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                selectedWeek === "2026-09-28"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              Week 3 (28-Sep)
            </button>
          </div>
        </div>

        {/* Endorsement Preview Box */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Document Specifications
            </span>
            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
              <p>• <strong>Scope:</strong> Semester 1 (Sec A, Sec B, Lab Groups P1–P4)</p>
              <p>• <strong>Week Period:</strong> Monday through Saturday ({selectedWeek})</p>
              <p>• <strong>Curriculum:</strong> Front Office Operations &amp; AI in Hospitality</p>
              <p>• <strong>7-Section Summary:</strong> 100% Complete &amp; Synthesized</p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Official Sign-Off Preview
            </span>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] space-y-1 text-slate-700 dark:text-slate-300">
              <div className="text-slate-400">Signature Block 3 of 3:</div>
              <div className="font-bold text-slate-900 dark:text-white">Mr. J Earnest Immanuel</div>
              <div className="text-[10px] text-slate-500">Director, IIHM Hyderabad</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Ready for Institutional Archival
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-2">
            <a
              href={`/api/reports/weekly-log?weekStart=${selectedWeek}&semester=1`}
              download
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download &amp; Sign Official DOCX</span>
            </a>

            <Link
              href={`/admin/logs?weekStart=${selectedWeek}&tab=reports`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <span>Inspect Weekly Summary Online</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. DEPARTMENTAL TEACHING VELOCITY & ACADEMIC AUDIT */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Departmental Teaching Velocity &amp; Academic Audit
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time monitoring across flagship culinary, rooms division, service, and technology departments.
            </p>
          </div>

          <Link
            href="/admin/allocations"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>View Faculty Allocations</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.departmentProgress.map((dept, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Department {idx + 1}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {dept.department}
                  </h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                    Lead Faculty: {dept.leadFaculty}
                  </p>
                </div>

                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {dept.subjectCode}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Syllabus Completion</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {dept.syllabusProgressPercent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${dept.syllabusProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Bottom Metrics Pill */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Classes</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {dept.sessionsCount} sessions
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Attendance</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {dept.attendanceRate}%
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Verification</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {dept.verifiedCount}/{dept.sessionsCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. ACADEMIC CALENDAR & INSTITUTIONAL MILESTONES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Director&apos;s Academic Calendar &amp; Institutional Milestones
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Strategic schedule including NCHMCT examinations, industry guest lectures, and institutional holidays.
            </p>
          </div>

          <Link
            href="/calendar"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Full Calendar</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.upcomingMilestones.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition-all ${
                m.eventType === "exam"
                  ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                  : m.isHoliday
                  ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                  : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    m.eventType === "exam"
                      ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                      : m.isHoliday
                      ? "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300"
                      : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {m.eventType.toUpperCase()}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {format(parseISO(m.startDate), "MMM d")}
                </span>
              </div>

              <h5 className="text-xs font-bold text-slate-900 dark:text-white">{m.title}</h5>
              {m.description && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {m.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 6. CONDITIONAL MASTER IT ADMIN VIEW (When toggled) */}
      {viewMode === "system" && masterAdminStats && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Secondary Console
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Master IT Administration &amp; Master Data Controls
              </h3>
              <p className="text-xs text-slate-500">
                Direct management of academic entities, faculty profiles, and student representative authorisations.
              </p>
            </div>
            <button
              onClick={() => setViewMode("executive")}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            >
              Return to Executive Cockpit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/batches"
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Batches &amp; Sections</span>
                <span className="text-[11px] text-slate-500">{masterAdminStats.totalBatches} registered</span>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>

            <Link
              href="/admin/teachers"
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Faculty Profiles</span>
                <span className="text-[11px] text-slate-500">{masterAdminStats.totalTeachers} active educators</span>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>

            <Link
              href="/admin/crs"
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Class Representatives</span>
                <span className="text-[11px] text-slate-500">{masterAdminStats.activeCRs} authorized</span>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>

            <Link
              href="/admin/subjects"
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Subjects &amp; Syllabi</span>
                <span className="text-[11px] text-slate-500">{masterAdminStats.totalSubjects} curriculum units</span>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>

            <Link
              href="/admin/allocations"
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Teaching Allocations</span>
                <span className="text-[11px] text-slate-500">Subject-to-Batch mapping</span>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>

            <Link
              href="/admin/audit"
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Audit &amp; Security Logs</span>
                <span className="text-[11px] text-slate-500">Immutable trail</span>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
