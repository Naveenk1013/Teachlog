"use client";

import { DayCalendarData, AcademicEvent, CalendarSession } from "@/lib/data/calendar";
import { format } from "date-fns";
import {
  X,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Sparkles,
  ClipboardList,
  AlertCircle,
  Plus,
  Tag,
} from "lucide-react";

interface DayInspectorModalProps {
  dayData: DayCalendarData;
  canManageEvents?: boolean;
  onClose: () => void;
  onAddEvent?: (dateStr: string) => void;
}

export function DayInspectorModal({
  dayData,
  canManageEvents = false,
  onClose,
  onAddEvent,
}: DayInspectorModalProps) {
  const formattedDay = format(dayData.date, "EEEE, dd MMMM yyyy");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">{formattedDay}</h2>
              <p className="text-xs text-slate-400">
                {dayData.events.length} event(s) • {dayData.sessions.length} class session(s) recorded
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Section: Academic Events / Holidays */}
          {dayData.events.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Academic Events &amp; Holidays
              </span>
              <div className="space-y-2">
                {dayData.events.map((event) => {
                  let badgeColor = "bg-slate-100 text-slate-800 border-slate-200";
                  if (event.eventType === "holiday") {
                    badgeColor = "bg-red-50 text-red-800 border-red-200";
                  } else if (event.eventType === "vacation") {
                    badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                  } else if (event.eventType === "exam") {
                    badgeColor = "bg-purple-50 text-purple-800 border-purple-200";
                  } else if (event.eventType === "event") {
                    badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                  } else if (event.eventType === "academic_note") {
                    badgeColor = "bg-indigo-50 text-indigo-800 border-indigo-200";
                  }

                  return (
                    <div
                      key={event.id}
                      className={`p-3.5 rounded-xl border ${badgeColor} flex items-start justify-between gap-3`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{event.title}</span>
                          {event.isHoliday && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white uppercase tracking-wider">
                              Holiday
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs mt-1 opacity-90">{event.description}</p>
                        )}
                        <span className="text-[10px] opacity-75 mt-1 block">
                          Dates: {event.startDate} to {event.endDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Class Sessions Taught */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Classes Conducted &amp; Teaching Details
            </span>

            {dayData.sessions.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No classes logged for this day</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {dayData.isSunday
                    ? "Sunday - College non-instructional day"
                    : dayData.isHoliday
                    ? "Holiday / Vacation - Instruction suspended"
                    : "Classes can be logged by Class Representatives"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayData.sessions.map((session, idx) => {
                  const isVerified = session.status === "verified";
                  const attendancePct = Math.round(
                    (session.studentsPresent / session.classStrength) * 100
                  );

                  return (
                    <div
                      key={session.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3"
                    >
                      {/* Top Bar: Subject & Time */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-2.5">
                        <div>
                          <span className="text-xs font-bold text-slate-900">
                            {session.subjectName}{" "}
                            {session.subjectCode && (
                              <span className="text-slate-400 font-normal">
                                ({session.subjectCode})
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {session.batchName} • Faculty: {session.teacherName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {session.startTime} – {session.endTime}
                          </span>
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attendance Strip */}
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {session.studentsPresent} / {session.classStrength} Present
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({attendancePct}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          <span>Logged by {session.crName}</span>
                        </div>
                      </div>

                      {/* Topics Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                            CR Logged Topic (Actual)
                          </span>
                          <p className="text-slate-800 font-medium">{session.topicCovered}</p>
                        </div>

                        <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">
                            Teacher Planned Topic
                          </span>
                          <p className="text-indigo-950 font-medium">
                            {session.topicPlanned || (
                              <span className="text-slate-400 italic font-normal">
                                Not enriched yet
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Method & Assignment */}
                      {(session.teachingMethod || session.assignmentActivity) && (
                        <div className="flex flex-wrap gap-1.5 text-[11px] pt-1 border-t border-slate-100">
                          {session.teachingMethod && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                              Method: {session.teachingMethod}
                            </span>
                          )}
                          {session.assignmentActivity && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              Activity: {session.assignmentActivity}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Syllabus Topics */}
                      {session.syllabusTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {session.syllabusTopics.map((title, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-medium"
                            >
                              Syllabus: {title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {canManageEvents && onAddEvent ? (
            <button
              type="button"
              onClick={() => {
                onAddEvent(dayData.dateString);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday / Event for this Date</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
