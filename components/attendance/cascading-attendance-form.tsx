"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Beaker,
  Sparkles,
  Save,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Share2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { getBatchRosterAction, createClassAttendanceSessionAction } from "@/app/actions/attendance";
import { AttendanceStatus } from "@/lib/types/database";
import { format } from "date-fns";

export interface BatchOption {
  id: string;
  name: string;
  currentSemester: number;
  academicYear: string;
  intakeYear?: number;
}

export interface SubjectOption {
  id: string;
  code: string | null;
  name: string;
  semester: number;
}

export interface TeacherOption {
  id: string;
  name: string;
  department: string | null;
}

interface CascadingAttendanceFormProps {
  batches: BatchOption[];
  subjects?: SubjectOption[];
  teachers?: TeacherOption[];
  currentUserName?: string;
  currentUserRole?: "admin" | "teacher" | "cr";
  onCohortSelected?: (batchId: string) => void;
  onSessionCreated?: (sessionId: string) => void;
}

const COMMON_PERIODS = [
  { label: "09:00 - 10:00", start: "09:00", end: "10:00" },
  { label: "10:00 - 11:00", start: "10:00", end: "11:00" },
  { label: "11:15 - 12:15", start: "11:15", end: "12:15" },
  { label: "12:15 - 13:15", start: "12:15", end: "13:15" },
  { label: "14:00 - 15:00", start: "14:00", end: "15:00" },
  { label: "15:00 - 16:00", start: "15:00", end: "16:00" },
];

export function CascadingAttendanceForm({
  batches,
  subjects = [],
  teachers = [],
  currentUserName = "Naveen Kumar",
  currentUserRole = "teacher",
  onCohortSelected,
  onSessionCreated,
}: CascadingAttendanceFormProps) {
  // 1. Cascading Form State
  const [selectedBatchYear, setSelectedBatchYear] = useState<"2026" | "2025" | "2024">("2026");
  const [selectedSection, setSelectedSection] = useState<"A" | "B">("A");
  const [classType, setClassType] = useState<"Theory" | "Practical">("Theory");
  const [practicalGroup, setPracticalGroup] = useState<"P1" | "P2" | "P3" | "P4" | "">("");

  // 2. Secondary Fields
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [isCustomSubject, setIsCustomSubject] = useState<boolean>(false);
  const [customSubjectName, setCustomSubjectName] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [date, setDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [topicCovered, setTopicCovered] = useState<string>("");

  // 3. Roster & Session State
  const [resolvedBatchId, setResolvedBatchId] = useState<string>("");
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [roster, setRoster] = useState<{
    studentId: string;
    rollNumber: string;
    fullName: string;
    section: string;
    practicalGroup: string | null;
    status: AttendanceStatus;
  }[]>([]);

  // Find current teacher or default to first
  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacherId) {
      const match = teachers.find(
        (t) =>
          t.name.toLowerCase().includes(currentUserName.toLowerCase()) ||
          currentUserName.toLowerCase().includes(t.name.toLowerCase())
      );
      setSelectedTeacherId(match ? match.id : teachers[0].id);
    }
  }, [teachers, currentUserName, selectedTeacherId]);

  // Handle cascading section locks
  useEffect(() => {
    if (selectedBatchYear === "2024") {
      // 2024 is Section A only
      setSelectedSection("A");
      setPracticalGroup("");
    } else if (selectedBatchYear === "2025") {
      // 2025 has no practical groups
      setPracticalGroup("");
    } else if (selectedBatchYear === "2026") {
      if (classType === "Theory") {
        setPracticalGroup("");
      } else if (classType === "Practical") {
        // Default practical group based on Section
        if (selectedSection === "A" && practicalGroup !== "P1" && practicalGroup !== "P2") {
          setPracticalGroup("P1");
        } else if (selectedSection === "B" && practicalGroup !== "P3" && practicalGroup !== "P4") {
          setPracticalGroup("P3");
        }
      }
    }
  }, [selectedBatchYear, selectedSection, classType]);

  // Target semester for selected batch year
  const targetSemester = useMemo(() => {
    if (selectedBatchYear === "2026") return 1;
    if (selectedBatchYear === "2025") return 4;
    return 5;
  }, [selectedBatchYear]);

  // Filter subjects by selected semester
  const filteredSubjects = useMemo(() => {
    const list = subjects.filter((s) => s.semester === targetSemester);
    return list.length > 0 ? list : subjects;
  }, [subjects, targetSemester]);

  // Auto-select first subject when batch year changes
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      setSelectedSubjectId(filteredSubjects[0].id);
    }
  }, [filteredSubjects]);

  // Resolve matching batch ID in DB
  const resolveTargetBatch = useMemo(() => {
    if (selectedBatchYear === "2026") {
      if (classType === "Practical") {
        if (selectedSection === "A") {
          const pg = practicalGroup === "P2" ? "P2" : "P1";
          return batches.find((b) => b.name.includes(`Sec A`) && b.name.includes(`[${pg}]`)) || null;
        } else {
          const pg = practicalGroup === "P4" ? "P4" : "P3";
          return batches.find((b) => b.name.includes(`Sec B`) && b.name.includes(`[${pg}]`)) || null;
        }
      } else {
        // Theory: Whole Section
        if (selectedSection === "A") {
          return (
            batches.find((b) => b.name === "(Sem 1) - Sec A") ||
            batches.find((b) => b.name.includes(`Sec A [P1]`)) ||
            null
          );
        } else {
          return (
            batches.find((b) => b.name === "(Sem 1) - Sec B") ||
            batches.find((b) => b.name.includes(`Sec B [P3]`)) ||
            null
          );
        }
      }
    } else if (selectedBatchYear === "2025") {
      if (selectedSection === "A") {
        return batches.find((b) => b.name.includes("Sem 4") && b.name.includes("Sec A")) || null;
      } else {
        return batches.find((b) => b.name.includes("Sem 4") && b.name.includes("Sec B")) || null;
      }
    } else {
      // 2024 -> Sem 5
      return (
        batches.find((b) => b.name.includes("Sem 5") || b.currentSemester === 5) ||
        batches.find((b) => b.intakeYear === 2024) ||
        null
      );
    }
  }, [batches, selectedBatchYear, selectedSection, classType, practicalGroup]);

  // Handle "Generate Attendance Sheet" click
  const handleGenerateSheet = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetBatch = resolveTargetBatch;
    if (!targetBatch) {
      setErrorMessage("No matching batch found in the system for this configuration.");
      return;
    }

    setResolvedBatchId(targetBatch.id);
    if (onCohortSelected) {
      onCohortSelected(targetBatch.id);
    }

    setIsLoadingRoster(true);
    setIsGenerated(true);

    try {
      const res = await getBatchRosterAction(targetBatch.id);
      if (res.success && res.roster) {
        const studentList = res.roster.students.map((s) => ({
          studentId: s.id,
          rollNumber: s.rollNumber,
          fullName: s.fullName,
          section: s.section,
          practicalGroup: s.practicalGroup,
          status: "present" as AttendanceStatus, // Default all present for rapid marking
        }));
        setRoster(studentList);
      } else {
        setRoster([]);
        setErrorMessage("No students found registered for this specific semester / batch.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load student roster.");
    } finally {
      setIsLoadingRoster(false);
    }
  };

  // Toggle single student status
  const handleToggleStatus = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  // Bulk set all students
  const handleMarkAll = (status: AttendanceStatus) => {
    setRoster((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Save Session & Attendance
  const handleSaveAttendance = async () => {
    if (!resolvedBatchId) {
      setErrorMessage("Please click 'Generate Attendance Sheet' first.");
      return;
    }
    if (!topicCovered || topicCovered.trim().length < 3) {
      setErrorMessage("Please enter at least 3 characters describing the topic covered today.");
      return;
    }
    if (!selectedSubjectId) {
      setErrorMessage("Please select a subject.");
      return;
    }
    if (selectedSubjectId === "__custom__" && (!customSubjectName || customSubjectName.trim().length < 2)) {
      setErrorMessage("Please enter at least 2 characters for the custom subject name.");
      return;
    }
    if (!selectedTeacherId) {
      setErrorMessage("Please select a faculty member.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await createClassAttendanceSessionAction({
        batchId: resolvedBatchId,
        subjectId: selectedSubjectId,
        customSubjectName: isCustomSubject ? customSubjectName.trim() : undefined,
        teacherId: selectedTeacherId,
        sessionDate: date,
        startTime,
        endTime,
        classType,
        topicCovered,
        attendanceRecords: roster.map((s) => ({
          studentId: s.studentId,
          status: s.status,
        })),
      });

      if (res.success) {
        setSuccessMessage(
          `Attendance sheet saved! ${res.presentCount} of ${roster.length} students marked present.`
        );
        if (onSessionCreated && res.sessionId) {
          onSessionCreated(res.sessionId);
        }
        setTimeout(() => setSuccessMessage(null), 6000);
      } else {
        setErrorMessage(res.error || "Failed to save attendance sheet.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = roster.filter((r) => r.status === "present" || r.status === "late").length;
  const absentCount = roster.filter((r) => r.status === "absent").length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden mb-6">
      {/* ── Top Header Banner (Inspired by user's reference) ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-900/50">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block">
            Academic Operations
          </span>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            WELCOME <span className="text-indigo-400 font-extrabold">{currentUserName}</span> : ATTENDANCE FOR STUDENTS
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Interactive Sheet Generator</span>
          </span>
        </div>
      </div>

      {/* ── Main Cascading Form ── */}
      <div className="p-6 space-y-5">
        {/* ROW 1: Batch, Section, Practical Group */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Batch Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Batch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedBatchYear}
                onChange={(e) => setSelectedBatchYear(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="2026">2026 (1st Year, Sem 1)</option>
                <option value="2025">2025 (2nd Year, Sem 4)</option>
                <option value="2024">2024 (3rd Year, Sem 5)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Semester {targetSemester} Academic Batch
            </p>
          </div>

          {/* Section Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Section <span className="text-red-500">*</span></span>
              {selectedBatchYear === "2024" && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  A only
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value as any)}
                disabled={selectedBatchYear === "2024"}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer ${
                  selectedBatchYear === "2024" ? "opacity-75 bg-slate-100 cursor-not-allowed" : ""
                }`}
              >
                <option value="A">Section A</option>
                {selectedBatchYear !== "2024" && <option value="B">Section B</option>}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {selectedBatchYear === "2024"
                ? "3rd Year combines into Section A"
                : "Select Section A or Section B"}
            </p>
          </div>

          {/* Practical Group Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Practical Group</span>
              {selectedBatchYear === "2026" && classType === "Practical" ? (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Required
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">N/A</span>
              )}
            </label>
            <div className="relative">
              <select
                value={practicalGroup}
                onChange={(e) => setPracticalGroup(e.target.value as any)}
                disabled={selectedBatchYear !== "2026" || classType !== "Practical"}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                  selectedBatchYear !== "2026" || classType !== "Practical"
                    ? "opacity-60 bg-slate-100 cursor-not-allowed text-slate-400"
                    : "cursor-pointer"
                }`}
              >
                {selectedBatchYear === "2026" && classType === "Practical" ? (
                  selectedSection === "A" ? (
                    <>
                      <option value="P1">P1 (Group 1 - Sec A)</option>
                      <option value="P2">P2 (Group 2 - Sec A)</option>
                    </>
                  ) : (
                    <>
                      <option value="P3">P3 (Group 3 - Sec B)</option>
                      <option value="P4">P4 (Group 4 - Sec B)</option>
                    </>
                  )
                ) : (
                  <option value="">
                    {classType === "Theory" ? "— Not Applicable (Theory) —" : "— No Practical Subgroups —"}
                  </option>
                )}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {selectedBatchYear === "2026" && classType === "Practical"
                ? `Filtered for Section ${selectedSection}`
                : "Applies only to 2026 Practical classes"}
            </p>
          </div>
        </div>

        {/* ROW 2: Subject & Faculty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Subject Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Subject <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-indigo-600 font-semibold lowercase">
                {filteredSubjects.length} in Sem {targetSemester}
              </span>
            </label>
            <div className="relative">
              <select
                value={isCustomSubject ? "__custom__" : selectedSubjectId}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setIsCustomSubject(true);
                    setSelectedSubjectId("__custom__");
                  } else {
                    setIsCustomSubject(false);
                    setSelectedSubjectId(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {filteredSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `[${s.code}] ` : ""}{s.name}
                  </option>
                ))}
                <option value="__custom__">➕ Custom Subject (Enter Manually)...</option>
              </select>
            </div>

            {/* Manual Custom Subject Text Input */}
            {isCustomSubject && (
              <div className="mt-2 animate-in fade-in">
                <input
                  type="text"
                  required
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  placeholder="Type custom subject name (e.g. Guest Lecture, Special Seminar)..."
                  className="w-full bg-indigo-50/70 border border-indigo-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
                />
              </div>
            )}
          </div>

          {/* Faculty Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Faculty / Teacher <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400">Pre-filled with logged-in user</span>
            </label>
            <div className="relative">
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.department ? `(${t.department})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ROW 3: Date, Class Type, Time From, Time To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Class Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Class Type <span className="text-red-500">*</span>
            </label>
            <select
              value={classType}
              onChange={(e) => setClassType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Theory">Theory (Full Section)</option>
              <option value="Practical">Practical (Lab Group)</option>
            </select>
          </div>

          {/* Time From */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Time From <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Time To */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Time To <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Quick Period Selection Strip */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Periods:</span>
          {COMMON_PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setStartTime(p.start);
                setEndTime(p.end);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                startTime === p.start && endTime === p.end
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ROW 4: Topic Covered */}
        <div className="pt-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Topic Covered <span className="text-red-500">*</span></span>
            <span className="text-[11px] text-slate-400">write all the topics covered today</span>
          </label>
          <textarea
            rows={2}
            value={topicCovered}
            onChange={(e) => setTopicCovered(e.target.value)}
            placeholder="e.g. Classification of Mother Sauces, Béchamel & Velouté preparation techniques..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
          />
        </div>

        {/* Action Button: Generate Attendance Sheet */}
        <div className="pt-2 flex items-center justify-between gap-4 flex-wrap border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Target Semester / Batch:</span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              {resolveTargetBatch ? resolveTargetBatch.name : "Select valid batch & section"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerateSheet}
            disabled={isLoadingRoster}
            className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoadingRoster ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Roster...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Generate Attendance Sheet</span>
              </>
            )}
          </button>
        </div>

        {/* Success / Error Messages */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* ── Generated Interactive Attendance Sheet Grid ── */}
      {isGenerated && (
        <div className="border-t border-slate-200 bg-slate-50/50 p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Live Attendance Register: {resolveTargetBatch?.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark attendance below. All students default to Present. Tap any student to mark Absent or Late.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {presentCount} Present
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                {absentCount} Absent
              </span>
              <div className="h-4 w-px bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={() => handleMarkAll("present")}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll("absent")}
                className="text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                All Absent
              </button>
            </div>
          </div>

          {/* Roster Cards Grid */}
          {roster.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              No students enrolled in this semester / batch yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
              {roster.map((student) => (
                <div
                  key={student.studentId}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                    student.status === "present"
                      ? "bg-white border-emerald-200/80 shadow-xs"
                      : student.status === "absent"
                      ? "bg-red-50/50 border-red-200 shadow-xs"
                      : "bg-amber-50/50 border-amber-200 shadow-xs"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 block w-fit mb-0.5">
                      {student.rollNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate block">
                      {student.fullName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {student.section} {student.practicalGroup ? `• [${student.practicalGroup}]` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(student.studentId, "present")}
                      title="Present"
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        student.status === "present"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white text-slate-400 border border-slate-200 hover:bg-emerald-50"
                      }`}
                    >
                      P
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(student.studentId, "absent")}
                      title="Absent"
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        student.status === "absent"
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-white text-slate-400 border border-slate-200 hover:bg-red-50"
                      }`}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(student.studentId, "late")}
                      title="Late"
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        student.status === "late"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-white text-slate-400 border border-slate-200 hover:bg-amber-50"
                      }`}
                    >
                      L
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Save CTA Bar */}
          <div className="pt-2 flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="text-xs text-slate-600 font-medium">
              Ready to record attendance for <strong className="text-slate-900">{presentCount}</strong> students on{" "}
              <strong className="text-slate-900">{date}</strong>.
            </div>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={isSaving || roster.length === 0}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Sheet...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Attendance Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
