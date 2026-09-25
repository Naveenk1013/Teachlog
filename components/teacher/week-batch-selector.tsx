"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TeacherAssignment } from "@/lib/data/teacher";
import { ChevronLeft, ChevronRight, Calendar, BookOpen, Layers } from "lucide-react";
import { addWeeks, subWeeks, format, parseISO } from "date-fns";
import { getWeekStart, getTeachingWeekOfMonth } from "@/lib/dates";

interface WeekBatchSelectorProps {
  assignments: TeacherAssignment[];
  currentAssignmentId: string;
  currentWeekStartStr: string;
}

export function WeekBatchSelector({
  assignments,
  currentAssignmentId,
  currentWeekStartStr,
}: WeekBatchSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentWeekStartDate = parseISO(currentWeekStartStr);
  const currentWeekSaturdayDate = parseISO(
    format(
      new Date(currentWeekStartDate.getTime() + 5 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    )
  );

  const weekOfMonth = getTeachingWeekOfMonth(currentWeekStartDate);
  const monthYearLabel = format(currentWeekStartDate, "MMMM yyyy");
  const rangeLabel = `${format(currentWeekStartDate, "dd MMM")} – ${format(
    currentWeekSaturdayDate,
    "dd MMM yyyy"
  )}`;

  const updateUrl = (assignmentId: string, weekStart: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("assignmentId", assignmentId);
    params.set("weekStart", weekStart);
    router.push(`?${params.toString()}`);
  };

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrl(e.target.value, currentWeekStartStr);
  };

  const handlePrevWeek = () => {
    const prev = subWeeks(currentWeekStartDate, 1);
    const prevMon = format(getWeekStart(prev), "yyyy-MM-dd");
    updateUrl(currentAssignmentId, prevMon);
  };

  const handleNextWeek = () => {
    const next = addWeeks(currentWeekStartDate, 1);
    const nextMon = format(getWeekStart(next), "yyyy-MM-dd");
    updateUrl(currentAssignmentId, nextMon);
  };

  const handleCurrentWeek = () => {
    const thisMon = format(getWeekStart(new Date()), "yyyy-MM-dd");
    updateUrl(currentAssignmentId, thisMon);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      {/* Subject & Batch Switcher */}
      <div className="flex-1 max-w-xl">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          Active Subject &amp; Batch
        </label>
        <div className="relative">
          <select
            value={currentAssignmentId}
            onChange={handleAssignmentChange}
            className="w-full text-sm font-semibold bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl px-3.5 py-2.5 pr-8 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.subjectName} ({a.subjectCode || `Sem ${a.semester}`}) • {a.batchName} ({a.programmeName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={handlePrevWeek}
            title="Previous Week"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 py-1 text-center min-w-[200px]">
            <span className="text-xs font-bold text-indigo-700 block leading-tight">
              Week {weekOfMonth} • {monthYearLabel}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              {rangeLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextWeek}
            title="Next Week"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleCurrentWeek}
          className="text-xs font-semibold px-3 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          This Week
        </button>
      </div>
    </div>
  );
}
