import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentTeacherUser,
  getTeacherAssignments,
  getTeacherWeeklySessions,
  getWeeklySummary,
} from "@/lib/data/teacher";
import { getWeekStart, getTeachingWeekOfMonth } from "@/lib/dates";
import { format, parseISO } from "date-fns";
import { WeekBatchSelector } from "@/components/teacher/week-batch-selector";
import { WeeklySummaryForm } from "@/components/teacher/weekly-summary-form";
import { ChevronLeft, FileText, BookOpen } from "lucide-react";

interface TeacherSummariesPageProps {
  searchParams: Promise<{
    assignmentId?: string;
    weekStart?: string;
  }>;
}

export default async function TeacherSummariesPage({
  searchParams,
}: TeacherSummariesPageProps) {
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
          You currently have no active subject or batch teaching assignments allocated.
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

  // Fetch week's sessions and existing summary
  const [weeklySessions, existingSummary] = await Promise.all([
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

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard?assignmentId=${activeAssignment.id}&weekStart=${weekStartStr}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Teaching Dashboard</span>
        </Link>
      </div>

      {/* Week & Batch Switcher */}
      <WeekBatchSelector
        assignments={assignments}
        currentAssignmentId={activeAssignment.id}
        currentWeekStartStr={weekStartStr}
      />

      {/* 7-Section Summary Form */}
      <WeeklySummaryForm
        teacherId={teacher.id}
        batchId={activeAssignment.batchId}
        subjectId={activeAssignment.subjectId}
        weekStartStr={weekStartStr}
        existingSummary={existingSummary}
        weeklySessions={weeklySessions}
        subjectName={activeAssignment.subjectName}
        batchName={activeAssignment.batchName}
      />
    </div>
  );
}
