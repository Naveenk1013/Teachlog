import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentTeacherUser,
  getTeacherAssignments,
  getTeacherWeeklySessions,
  getSubjectSyllabusTopics,
  getWeeklySummary,
} from "@/lib/data/teacher";
import { getWeekStart, getTeachingWeekOfMonth, formatDayAndDate } from "@/lib/dates";
import { format, parseISO } from "date-fns";
import { WeekBatchSelector } from "@/components/teacher/week-batch-selector";
import { SessionTable } from "@/components/teacher/session-table";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  BookOpen,
  ArrowRight,
  Sparkles,
  Download,
} from "lucide-react";

interface TeacherDashboardPageProps {
  searchParams: Promise<{
    assignmentId?: string;
    weekStart?: string;
  }>;
}

export default async function TeacherDashboardPage({
  searchParams,
}: TeacherDashboardPageProps) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const assignments = await getTeacherAssignments(teacher.id);

  if (assignments.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">No Teaching Assignments Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          You currently have no active subject or batch teaching assignments allocated in the system for this academic year. Please contact the administrator.
        </p>
      </div>
    );
  }

  // Active Assignment
  const activeAssignment =
    assignments.find((a) => a.id === resolvedParams.assignmentId) || assignments[0];

  // Active Week Start (Monday)
  const defaultMondayStr = format(getWeekStart(new Date()), "yyyy-MM-dd");
  const weekStartStr = resolvedParams.weekStart || defaultMondayStr;
  const weekStartDate = parseISO(weekStartStr);
  const currentWeekOfMonth = getTeachingWeekOfMonth(weekStartDate);

  // Fetch week's sessions, syllabus topics, and weekly summary
  const [sessions, syllabusTopics, weeklySummary] = await Promise.all([
    getTeacherWeeklySessions(
      teacher.id,
      activeAssignment.batchId,
      activeAssignment.subjectId,
      weekStartStr
    ),
    getSubjectSyllabusTopics(activeAssignment.subjectId),
    getWeeklySummary(
      teacher.id,
      activeAssignment.batchId,
      activeAssignment.subjectId,
      weekStartStr
    ),
  ]);

  const pendingCount = sessions.filter((s) => s.status === "submitted").length;
  const verifiedCount = sessions.filter((s) => s.status === "verified").length;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Context Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Faculty Teaching Log &amp; Verification
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Welcome, {teacher.fullName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            {formatDayAndDate(new Date())} • <strong className="text-indigo-600">Week {currentWeekOfMonth}</strong> of {format(weekStartDate, "MMMM yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/reports/weekly-log?subjectId=${activeAssignment.subjectId}&batchId=${activeAssignment.batchId}&weekStart=${weekStartStr}`}
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Weekly Log (.docx)</span>
          </a>

          <Link
            href={`/summaries?assignmentId=${activeAssignment.id}&weekStart=${weekStartStr}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Open Weekly Summary (7 Sec)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Week & Batch Switcher */}
      <WeekBatchSelector
        assignments={assignments}
        currentAssignmentId={activeAssignment.id}
        currentWeekStartStr={weekStartStr}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Classes This Week
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{sessions.length}</p>
          <p className="text-xs text-slate-500 mt-1">
            {activeAssignment.batchName} ({activeAssignment.subjectCode || "Core"})
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Review
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting your verification</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Verified Sessions
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{verifiedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Locked against CR edits</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Weekly Summary
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-3 flex items-center gap-1.5">
            {weeklySummary?.status === "verified" ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verified Final
              </span>
            ) : weeklySummary ? (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <Clock className="w-4 h-4 text-amber-600" /> Draft Saved
              </span>
            ) : (
              <span className="text-slate-500 font-semibold">Not Started</span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">7 IIHM report sections</p>
        </div>
      </div>

      {/* Class Sessions Table */}
      <SessionTable
        sessions={sessions}
        availableSyllabusTopics={syllabusTopics}
        batchId={activeAssignment.batchId}
        subjectId={activeAssignment.subjectId}
        weekStartStr={weekStartStr}
        classStrength={activeAssignment.classStrength}
      />
    </div>
  );
}
