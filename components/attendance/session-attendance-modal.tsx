"use client";

import { useState, useEffect, useTransition } from "react";
import { AttendanceStatus } from "@/lib/types/database";
import {
  getSessionAttendanceAction,
  getBatchRosterAction,
  saveSessionAttendanceAction,
} from "@/app/actions/attendance";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Search,
  Check,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  Save,
  Beaker,
  BookOpen,
} from "lucide-react";

interface StudentRosterItem {
  studentId: string;
  rollNumber: string;
  fullName: string;
  section: string;
  practicalGroup: string | null;
  status: AttendanceStatus;
  remarks?: string;
}

interface SessionAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  batchId: string;
  batchName: string;
  sessionTitle?: string;
  sessionDate?: string;
  sessionTime?: string;
  onSaved?: (newPresentCount: number) => void;
}

export function SessionAttendanceModal({
  isOpen,
  onClose,
  sessionId,
  batchId,
  batchName,
  sessionTitle,
  sessionDate,
  sessionTime,
  onSaved,
}: SessionAttendanceModalProps) {
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPractical, setIsPractical] = useState(false);
  const [groupName, setGroupName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    async function loadData() {
      try {
        // 1. Check if attendance was already recorded for this session
        const existingRes = await getSessionAttendanceAction(sessionId);
        if (!isMounted) return;

        if (existingRes.success && existingRes.attendance && existingRes.attendance.length > 0) {
          setRoster(
            existingRes.attendance.map((a) => ({
              studentId: a.studentId,
              rollNumber: a.rollNumber,
              fullName: a.fullName,
              section: a.section,
              practicalGroup: a.practicalGroup,
              status: a.status,
              remarks: a.remarks || "",
            }))
          );
          setIsLoading(false);
          return;
        }

        // 2. If no attendance recorded yet, load the cohort roster for this batch
        if (batchId) {
          const rosterRes = await getBatchRosterAction(batchId);
          if (!isMounted) return;

          if (rosterRes.success && rosterRes.roster) {
            setIsPractical(rosterRes.roster.isPractical);
            setGroupName(rosterRes.roster.group);

            if (rosterRes.roster.students.length > 0) {
              setRoster(
                rosterRes.roster.students.map((s) => ({
                  studentId: s.id,
                  rollNumber: s.rollNumber,
                  fullName: s.fullName,
                  section: s.section,
                  practicalGroup: s.practicalGroup,
                  status: "present" as AttendanceStatus, // Default all to present for rapid attendance
                  remarks: "",
                }))
              );
            } else {
              setRoster([]);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || "Failed to load student roster.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sessionId, batchId]);

  if (!isOpen) return null;

  const totalCount = roster.length;
  const presentCount = roster.filter((r) => r.status === "present").length;
  const absentCount = roster.filter((r) => r.status === "absent").length;
  const lateCount = roster.filter((r) => r.status === "late").length;
  const odCount = roster.filter((r) => r.status === "od").length;

  const filteredRoster = roster.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setRoster((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (roster.length === 0) {
      setErrorMessage("No students found in roster to save attendance.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const records = roster.map((s) => ({
      studentId: s.studentId,
      status: s.status,
      remarks: s.remarks,
    }));

    const res = await saveSessionAttendanceAction(sessionId, records);
    setIsSaving(false);

    if (res.success) {
      setSuccessMessage(`Attendance saved successfully! (${res.presentCount} students marked present/late)`);
      if (onSaved && res.presentCount !== undefined) {
        onSaved(res.presentCount);
      }
      setTimeout(() => {
        onClose();
      }, 900);
    } else {
      setErrorMessage(res.error || "Failed to save attendance.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Class Attendance Roster
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{batchName}</span>
                  {isPractical ? (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Beaker className="w-3 h-3" />
                      Practical Group {groupName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <BookOpen className="w-3 h-3" />
                      Theory Section
                    </span>
                  )}
                </div>
              </div>
            </div>
            {(sessionDate || sessionTime || sessionTitle) && (
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {sessionTitle && <span className="text-slate-800 font-semibold">{sessionTitle} • </span>}
                {sessionDate} {sessionTime && `(${sessionTime})`}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Summary Stats & Batch Actions Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-white border border-slate-200/80 rounded-xl p-2">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Total</span>
              <span className="text-base font-bold text-slate-900">{totalCount}</span>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2">
              <span className="text-[10px] font-semibold text-emerald-700 block uppercase">Present</span>
              <span className="text-base font-bold text-emerald-800">{presentCount}</span>
            </div>
            <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-2">
              <span className="text-[10px] font-semibold text-red-700 block uppercase">Absent</span>
              <span className="text-base font-bold text-red-800">{absentCount}</span>
            </div>
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2">
              <span className="text-[10px] font-semibold text-amber-700 block uppercase">Late / OD</span>
              <span className="text-base font-bold text-amber-800">{lateCount + odCount}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roll no or student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleMarkAll("present")}
                className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll("absent")}
                className="text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Mark All Absent
              </button>
            </div>
          </div>
        </div>

        {/* Student Roster List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Loading student cohort roster...</span>
            </div>
          ) : roster.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs space-y-2">
              <AlertCircle className="w-6 h-6 text-slate-300 mx-auto" />
              <p>No student records found for this cohort in the database.</p>
              <p className="text-[11px] text-slate-400">
                Run migration <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">0006_attendance_system.sql</code> to load student data.
              </p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No students match your search filter.
            </div>
          ) : (
            filteredRoster.map((student, idx) => (
              <div
                key={student.studentId}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {student.rollNumber}
                    </span>
                    <span className="font-medium text-xs text-slate-900 truncate">
                      {student.fullName}
                    </span>
                    {student.practicalGroup && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        {student.practicalGroup}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Toggle Group */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetStatus(student.studentId, "present")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      student.status === "present"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetStatus(student.studentId, "absent")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      student.status === "absent"
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-700"
                    }`}
                  >
                    Absent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetStatus(student.studentId, "late")}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all border ${
                      student.status === "late"
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700"
                    }`}
                  >
                    Late
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetStatus(student.studentId, "od")}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all border ${
                      student.status === "od"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                    title="On Duty"
                  >
                    OD
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white rounded-b-2xl">
          <div className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{presentCount + lateCount}</span> of{" "}
            <span className="font-bold text-slate-800">{totalCount}</span> attending
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || roster.length === 0}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
