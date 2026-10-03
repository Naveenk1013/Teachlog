"use client";

import { useState, useActionState } from "react";
import { CRSessionItem } from "@/lib/data/cr";
import { updateClassSessionAction } from "@/app/(cr)/cr/actions";
import { formatDateDisplay } from "@/lib/dates";
import {
  Calendar,
  Clock,
  Users,
  Edit2,
  CheckCircle2,
  Lock,
  User,
  X,
  AlertCircle,
  Save,
  Search,
} from "lucide-react";

interface Props {
  sessions: CRSessionItem[];
}

export function SessionHistoryList({ sessions }: Props) {
  const [editingSession, setEditingSession] = useState<CRSessionItem | null>(null);
  const [updateState, updateAction, isUpdating] = useActionState(updateClassSessionAction, null);
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "verified">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleEditOpen = (session: CRSessionItem) => {
    setEditingSession(session);
  };

  const handleEditClose = () => {
    setEditingSession(null);
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No Sessions Logged Yet</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Classes recorded for your batch will appear here with verification status and a 24-hour correction window.
        </p>
      </div>
    );
  }

  const filteredSessions = sessions.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = s.subjectName.toLowerCase().includes(q) || (s.subjectCode && s.subjectCode.toLowerCase().includes(q));
      const matchTeacher = s.teacherName.toLowerCase().includes(q);
      const matchTopic = s.topicCovered.toLowerCase().includes(q);
      if (!matchSubject && !matchTeacher && !matchTopic) return false;
    }
    return true;
  });

  const verifiedCount = sessions.filter((s) => s.status === "verified").length;
  const pendingCount = sessions.length - verifiedCount;

  return (
    <div className="space-y-3">
      {/* Search & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by topic, subject, or faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({sessions.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("submitted")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "submitted"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-amber-700"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("verified")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "verified"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Verified ({verifiedCount})
            </button>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="text-[11px] text-slate-500 px-1 flex items-center justify-between">
          <span>
            Showing <strong>{filteredSessions.length}</strong> of {sessions.length} entries
          </span>
          {(statusFilter !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Update feedback banner */}
      {updateState?.error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs shadow-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>{updateState.error}</span>
        </div>
      )}

      {/* Empty Filtered Results State */}
      {filteredSessions.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs text-xs text-slate-500">
          No class entries match your current filter.
        </div>
      )}

      {/* Sessions List */}
      {filteredSessions.map((session) => {
        const isCurrentlyEditing = editingSession?.id === session.id;

        return (
          <div
            key={session.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 transition-all"
          >
            {/* Top row: Subject & Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {session.subjectCode ? `${session.subjectCode} - ` : ""}
                  {session.subjectName}
                </h3>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{session.teacherName}</span>
                </p>
              </div>

              {/* Status Badge */}
              {session.status === "verified" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Submitted</span>
                </span>
              )}
            </div>

            {/* Middle: Details pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDateDisplay(session.sessionDate)}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{session.startTime} - {session.endTime}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{session.studentsPresent} Present</span>
              </span>
            </div>

            {/* Topic Covered */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-xs text-slate-800 leading-relaxed font-normal">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Topic Covered
              </span>
              <p className="whitespace-pre-wrap">{session.topicCovered}</p>
            </div>

            {/* Bottom Actions / Lock info */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[11px]">
              {session.isEditable ? (
                <button
                  type="button"
                  onClick={() => handleEditOpen(session)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Entry (24h Window)</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                  <Lock className="w-3 h-3" />
                  <span>{session.lockReason}</span>
                </span>
              )}
            </div>

            {/* Inline Edit Form Modal / Box */}
            {isCurrentlyEditing && (
              <div className="mt-3 pt-3 border-t border-indigo-100 bg-indigo-50/40 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">
                    Correct Class Entry
                  </span>
                  <button
                    type="button"
                    onClick={handleEditClose}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  action={async (formData) => {
                    await updateAction(formData);
                    handleEditClose();
                  }}
                  className="space-y-3"
                >
                  <input type="hidden" name="sessionId" value={session.id} />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                        Start Time
                      </span>
                      <input
                        name="startTime"
                        type="time"
                        required
                        defaultValue={session.startTime}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                        End Time
                      </span>
                      <input
                        name="endTime"
                        type="time"
                        required
                        defaultValue={session.endTime}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                      Students Present
                    </span>
                    <input
                      name="studentsPresent"
                      type="number"
                      required
                      min={0}
                      defaultValue={session.studentsPresent}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <span className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                      Topic Covered
                    </span>
                    <textarea
                      name="topicCovered"
                      rows={3}
                      required
                      defaultValue={session.topicCovered}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isUpdating ? "Saving..." : "Update Log"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleEditClose}
                      className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
