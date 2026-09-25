"use client";

import { useState } from "react";
import { TeacherSessionItem, SyllabusTopicItem } from "@/lib/data/teacher";
import { EnrichSessionDialog } from "./enrich-session-dialog";
import { VerifySessionButton } from "./verify-session-button";
import { VerifyAllButton } from "./verify-all-button";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Users,
  BookOpen,
  Calendar,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface SessionTableProps {
  sessions: TeacherSessionItem[];
  availableSyllabusTopics: SyllabusTopicItem[];
  batchId: string;
  subjectId: string;
  weekStartStr: string;
  classStrength: number;
}

export function SessionTable({
  sessions,
  availableSyllabusTopics,
  batchId,
  subjectId,
  weekStartStr,
  classStrength,
}: SessionTableProps) {
  const [activeEnrichSession, setActiveEnrichSession] =
    useState<TeacherSessionItem | null>(null);

  const pendingCount = sessions.filter((s) => s.status === "submitted").length;
  const verifiedCount = sessions.filter((s) => s.status === "verified").length;

  return (
    <div className="space-y-4">
      {/* Table Header / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            Weekly Class Sessions Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {sessions.length} total classes logged • {pendingCount} awaiting review • {verifiedCount} verified
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <VerifyAllButton
            batchId={batchId}
            subjectId={subjectId}
            weekStartStr={weekStartStr}
            pendingCount={pendingCount}
          />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No classes logged for this week yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Once Class Representatives log sessions for this subject and batch, they will appear here for your review, enrichment, and verification.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Actual Topic (CR Log)</th>
                  <th className="py-3 px-4">Planned Topic &amp; Method</th>
                  <th className="py-3 px-4">Syllabus Tags</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {sessions.map((session) => {
                  const dateObj = parseISO(session.sessionDate);
                  const formattedDate = format(dateObj, "dd MMM (EEE)");
                  const isVerified = session.status === "verified";
                  const attendancePct = Math.round(
                    (session.studentsPresent / classStrength) * 100
                  );

                  return (
                    <tr
                      key={session.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isVerified ? "bg-white" : "bg-amber-50/20"
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">
                          {formattedDate}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {session.startTime} – {session.endTime}
                        </span>
                      </td>

                      {/* Attendance */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {session.studentsPresent} / {classStrength}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {attendancePct}% present
                        </span>
                      </td>

                      {/* Actual Topic Covered (CR) */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-900 font-medium line-clamp-2">
                          {session.topicCovered}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Logged by {session.crName}
                        </span>
                      </td>

                      {/* Planned Topic & Method (Teacher Enriched) */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {session.topicPlanned ? (
                          <div className="space-y-1">
                            <p className="text-indigo-950 font-medium line-clamp-1">
                              {session.topicPlanned}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              {session.teachingMethod && (
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                                  {session.teachingMethod}
                                </span>
                              )}
                              {session.assignmentActivity && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 truncate max-w-[140px]" title={session.assignmentActivity}>
                                  Act: {session.assignmentActivity}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-600 italic text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Not enriched yet
                          </span>
                        )}
                      </td>

                      {/* Syllabus Tags */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        {session.syllabusTopics.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {session.syllabusTopics.map((t) => (
                              <span
                                key={t.id}
                                className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-medium truncate max-w-[160px]"
                                title={t.title}
                              >
                                {t.unitNo ? `U${t.unitNo}: ` : ""}{t.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <VerifySessionButton
                          sessionId={session.id}
                          isVerified={isVerified}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActiveEnrichSession(session)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{session.topicPlanned ? "Edit" : "Enrich"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-200">
            {sessions.map((session) => {
              const dateObj = parseISO(session.sessionDate);
              const formattedDate = format(dateObj, "EEE, dd MMM yyyy");
              const isVerified = session.status === "verified";

              return (
                <div key={session.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {formattedDate}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {session.startTime} – {session.endTime} • {session.studentsPresent}/{classStrength} present
                      </span>
                    </div>
                    <VerifySessionButton
                      sessionId={session.id}
                      isVerified={isVerified}
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      CR Logged Topic
                    </span>
                    <p className="text-slate-800 font-medium">
                      {session.topicCovered}
                    </p>
                  </div>

                  {session.topicPlanned && (
                    <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                        Enrichment
                      </span>
                      <p className="text-indigo-950 font-medium">
                        {session.topicPlanned}
                      </p>
                      <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                        {session.teachingMethod && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                            {session.teachingMethod}
                          </span>
                        )}
                        {session.assignmentActivity && (
                          <span className="px-1.5 py-0.5 rounded-md bg-white border border-indigo-200 text-slate-700">
                            Act: {session.assignmentActivity}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveEnrichSession(session)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{session.topicPlanned ? "Edit Details" : "Enrich Session"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enrich Session Modal */}
      {activeEnrichSession && (
        <EnrichSessionDialog
          session={activeEnrichSession}
          availableSyllabusTopics={availableSyllabusTopics}
          onClose={() => setActiveEnrichSession(null)}
        />
      )}
    </div>
  );
}
