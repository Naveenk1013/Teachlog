"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DayCalendarData,
  AcademicEvent,
  CalendarSession,
} from "@/lib/data/calendar";
import { DayInspectorModal } from "./day-inspector-modal";
import { EventFormDialog } from "./event-form-dialog";
import { AcademicPlanView } from "./academic-plan-view";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  BookOpen,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { addMonths, subMonths, format } from "date-fns";

interface AcademicCalendarProps {
  days: DayCalendarData[];
  events: AcademicEvent[];
  sessions: CalendarSession[];
  monthLabel: string;
  currentYear: number;
  currentMonth: number;
  batches?: { id: string; name: string }[];
  subjects?: { id: string; name: string }[];
  canManageEvents?: boolean;
  userRole?: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AcademicCalendar({
  days,
  events,
  sessions,
  monthLabel,
  currentYear,
  currentMonth,
  batches = [],
  subjects = [],
  canManageEvents = false,
  userRole = "teacher",
}: AcademicCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<"calendar" | "plan">("calendar");
  const [selectedDay, setSelectedDay] = useState<DayCalendarData | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventInitialDate, setEventInitialDate] = useState<string | undefined>();

  const updateUrl = (year: number, month: number, batchId?: string, subjectId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year.toString());
    params.set("month", month.toString());
    if (batchId !== undefined) {
      if (batchId) params.set("batchId", batchId);
      else params.delete("batchId");
    }
    if (subjectId !== undefined) {
      if (subjectId) params.set("subjectId", subjectId);
      else params.delete("subjectId");
    }
    router.push(`?${params.toString()}`);
  };

  const handlePrevMonth = () => {
    let newYear = currentYear;
    let newMonth = currentMonth - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    updateUrl(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newYear = currentYear;
    let newMonth = currentMonth + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    updateUrl(newYear, newMonth);
  };

  const handleToday = () => {
    const now = new Date();
    updateUrl(now.getFullYear(), now.getMonth() + 1);
  };

  const handleBatchFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrl(currentYear, currentMonth, e.target.value, searchParams.get("subjectId") || undefined);
  };

  const handleSubjectFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrl(currentYear, currentMonth, searchParams.get("batchId") || undefined, e.target.value);
  };

  const handleOpenAddEvent = (dateStr?: string) => {
    setEventInitialDate(dateStr);
    setIsEventModalOpen(true);
  };

  const totalSessionsInMonth = sessions.length;
  const verifiedSessionsCount = sessions.filter((s) => s.status === "verified").length;

  return (
    <div className="space-y-4">
      {/* Top View Mode Switcher */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === "calendar"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-indigo-400" />
            <span>Monthly Teaching Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("plan")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === "plan"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
            <span>Academic Plan &amp; Leave SOPs</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-400 text-slate-950 font-black">
              AY 26-27
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-3">
          <img src="/iihm_logo.png" alt="IIHM Logo" className="w-7 h-7 object-contain" />
          <span className="text-xs font-semibold text-slate-700">IIHM Hyderabad</span>
        </div>
      </div>

      {viewMode === "plan" ? (
        <AcademicPlanView
          events={events}
          canManageEvents={canManageEvents}
          onOpenAddEvent={() => handleOpenAddEvent()}
        />
      ) : (
        <>
          {/* Calendar Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous Month"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 py-1 text-sm font-bold text-slate-900 min-w-[160px] text-center">
              {monthLabel}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="text-xs font-semibold px-3 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {batches.length > 0 && (
            <select
              value={searchParams.get("batchId") || ""}
              onChange={handleBatchFilter}
              className="text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {subjects.length > 0 && (
            <select
              value={searchParams.get("subjectId") || ""}
              onChange={handleSubjectFilter}
              className="text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {canManageEvents && (
            <button
              type="button"
              onClick={() => handleOpenAddEvent()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday / Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend & Stats Strip */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
            Legend:
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-700">Holiday / Festival</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700">Vacation Break</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-700">Exam / Evaluation</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span className="text-slate-700">Class Session</span>
          </span>
        </div>

        <div className="flex items-center gap-3 font-medium text-slate-600">
          <span>{totalSessionsInMonth} Classes in {monthLabel}</span>
          <span>•</span>
          <span className="text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {verifiedSessionsCount} Verified
          </span>
        </div>
      </div>

      {/* Calendar Month Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 uppercase tracking-wider py-2.5">
          {WEEKDAYS.map((w, idx) => (
            <div key={w} className={idx === 6 ? "text-slate-400" : ""}>
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
          {days.map((day) => {
            const hasHoliday = day.events.some((e) => e.eventType === "holiday");
            const hasVacation = day.events.some((e) => e.eventType === "vacation");
            const hasExam = day.events.some((e) => e.eventType === "exam");
            const hasAcademicNote = day.events.some((e) => e.eventType === "academic_note");
            const hasEvent = day.events.some((e) => e.eventType === "event");

            const isDimmed = !day.isCurrentMonth;
            const sessionCount = day.sessions.length;
            const allVerified = sessionCount > 0 && day.sessions.every((s) => s.status === "verified");

            // Cell Background Styling
            let cellBg = "bg-white hover:bg-slate-50/80";
            if (isDimmed) {
              cellBg = "bg-slate-50/40 text-slate-400";
            } else if (hasHoliday) {
              cellBg = "bg-red-50/30 hover:bg-red-50/60";
            } else if (hasVacation) {
              cellBg = "bg-amber-50/30 hover:bg-amber-50/60";
            } else if (day.isSunday) {
              cellBg = "bg-slate-50/60 hover:bg-slate-100/50";
            }

            return (
              <div
                key={day.dateString}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[105px] p-2 flex flex-col justify-between cursor-pointer transition-colors relative group ${cellBg}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      day.isToday
                        ? "bg-indigo-600 text-white shadow-xs"
                        : isDimmed
                        ? "text-slate-300"
                        : day.isSunday
                        ? "text-slate-400"
                        : "text-slate-800"
                    }`}
                  >
                    {day.dayOfMonth}
                  </span>

                  {sessionCount > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                        allVerified
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}
                      title={`${sessionCount} classes logged`}
                    >
                      {allVerified && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
                      {sessionCount} {sessionCount === 1 ? "class" : "classes"}
                    </span>
                  )}
                </div>

                {/* Event / Holiday Pills */}
                <div className="space-y-1 my-1">
                  {day.events.slice(0, 2).map((event) => {
                    let pillStyle = "bg-slate-100 text-slate-700 border-slate-200";
                    if (event.eventType === "holiday") {
                      pillStyle = "bg-red-100 text-red-800 border-red-200";
                    } else if (event.eventType === "vacation") {
                      pillStyle = "bg-amber-100 text-amber-800 border-amber-200";
                    } else if (event.eventType === "exam") {
                      pillStyle = "bg-purple-100 text-purple-800 border-purple-200";
                    } else if (event.eventType === "event") {
                      pillStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    } else if (event.eventType === "academic_note") {
                      pillStyle = "bg-indigo-100 text-indigo-800 border-indigo-200";
                    }

                    return (
                      <div
                        key={event.id}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate border ${pillStyle}`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    );
                  })}

                  {day.events.length > 2 && (
                    <span className="text-[9px] text-slate-400 font-medium block">
                      +{day.events.length - 2} more events
                    </span>
                  )}
                </div>

                {/* Session Summary Snippet */}
                {sessionCount > 0 ? (
                  <div className="space-y-0.5">
                    {day.sessions.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className="text-[10px] text-slate-700 font-medium truncate flex items-center gap-1"
                        title={`${s.subjectName} (${s.startTime} - ${s.endTime}): ${s.topicPlanned || s.topicCovered}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span className="truncate">{s.subjectCode || s.subjectName}</span>
                      </div>
                    ))}
                    {sessionCount > 2 && (
                      <span className="text-[9px] text-slate-400 font-medium">
                        +{sessionCount - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* Day Inspector Modal */}
      {selectedDay && (
        <DayInspectorModal
          dayData={selectedDay}
          canManageEvents={canManageEvents}
          onClose={() => setSelectedDay(null)}
          onAddEvent={(dateStr) => handleOpenAddEvent(dateStr)}
        />
      )}

      {/* Add Holiday / Event Form Dialog */}
      {isEventModalOpen && (
        <EventFormDialog
          initialDate={eventInitialDate}
          batches={batches}
          onClose={() => setIsEventModalOpen(false)}
          onSuccess={() => {
            // refresh data
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
