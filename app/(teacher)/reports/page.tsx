import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentTeacherUser,
  getTeacherAssignments,
  getTeacherWeeklySessions,
  getWeeklySummary,
} from "@/lib/data/teacher";
import { getWeekStart, getTeachingWeekOfMonth } from "@/lib/dates";
import { format, parseISO, addDays } from "date-fns";
import { WeekBatchSelector } from "@/components/teacher/week-batch-selector";
import { VerifyAllButton } from "@/components/teacher/verify-all-button";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Building,
  ShieldCheck,
} from "lucide-react";

interface TeacherReportsPageProps {
  searchParams: Promise<{
    assignmentId?: string;
    weekStart?: string;
  }>;
}

export default async function TeacherReportsPage({
  searchParams,
}: TeacherReportsPageProps) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const assignments = await getTeacherAssignments(teacher.id);

  if (assignments.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <h2 className="text-base font-bold text-slate-900">No Teaching Assignments Found</h2>
      </div>
    );
  }

  const activeAssignment =
    assignments.find((a) => a.id === resolvedParams.assignmentId) || assignments[0];

  const defaultMondayStr = format(getWeekStart(new Date()), "yyyy-MM-dd");
  const weekStartStr = resolvedParams.weekStart || defaultMondayStr;
  const weekStartDate = parseISO(weekStartStr);
  const weekEndDate = addDays(weekStartDate, 5);
  const currentWeekOfMonth = getTeachingWeekOfMonth(weekStartDate);

  // Fetch week's sessions and summary status
  const [sessions, weeklySummary] = await Promise.all([
    getTeacherWeeklySessions(
      teacher.id,
      activeAssignment.batchId,
      activeAssignment.subjectId,
      weekStartStr
    ),
    getWeeklySummary(
      teacher.id,
      activeAssignment.batchId,
      activeAssignment.subjectId,
      weekStartStr
    ),
  ]);

  const verifiedSessions = sessions.filter((s) => s.status === "verified").length;
  const pendingSessions = sessions.filter((s) => s.status === "submitted").length;

  const downloadUrl = `/api/reports/weekly-log?subjectId=${activeAssignment.subjectId}&batchId=${activeAssignment.batchId}&weekStart=${weekStartStr}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Official Document Exports
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Weekly Teaching Log Reports (.docx)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export official reports formatted according to IIHM Hyderabad physical templates with signature blocks.
          </p>
        </div>

        <a
          href={downloadUrl}
          download
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Download Document (.docx)</span>
        </a>
      </div>

      {/* Week & Batch Switcher */}
      <WeekBatchSelector
        assignments={assignments}
        currentAssignmentId={activeAssignment.id}
        currentWeekStartStr={weekStartStr}
      />

      {/* Report Preview & Metadata Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Document Specifications
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Weekly Teaching Log Sheet &amp; Summary
            </h2>
            <p className="text-xs text-slate-500">
              Format: Microsoft Word (.docx) • Standard US Letter / A4 Portrait • Times New Roman
            </p>
          </div>

          <div className="flex items-center gap-2">
            {verifiedSessions === sessions.length && sessions.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                All Sessions Verified
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {pendingSessions} Unverified Session(s)
                </span>
                <VerifyAllButton
                  batchId={activeAssignment.batchId}
                  subjectId={activeAssignment.subjectId}
                  weekStartStr={weekStartStr}
                  pendingCount={pendingSessions}
                />
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Teaching Week
            </span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              Week {currentWeekOfMonth} of {format(weekStartDate, "MMMM yyyy")}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {format(weekStartDate, "dd MMM")} – {format(weekEndDate, "dd MMM yyyy")}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Classes Logged
            </span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {sessions.length} class session(s)
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mon to Sat coverage rows
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Subject &amp; Cohort
            </span>
            <p className="text-sm font-bold text-slate-900 mt-1 truncate">
              {activeAssignment.subjectName}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {activeAssignment.batchName}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Weekly Summary (7 Sec)
            </span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {weeklySummary ? "Completed" : "Incomplete"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {weeklySummary?.status === "verified" ? "Verified Final" : "Draft / Blank lines"}
            </p>
          </div>
        </div>

        {/* Download Call to Action */}
        <div className="p-6 rounded-2xl bg-linear-to-r from-indigo-900 to-indigo-800 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold">Ready to generate official log?</h3>
            <p className="text-xs text-indigo-200 max-w-lg">
              Download the finalized document for wet signatures by the Faculty, Program Leader, and Campus Director.
            </p>
          </div>

          <a
            href={downloadUrl}
            download
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 text-xs font-bold shadow-sm transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Download .docx File</span>
          </a>
        </div>
      </div>
    </div>
  );
}
