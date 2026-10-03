"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PenSquare,
  Layers,
} from "lucide-react";
import { teacherCreateClassSessionAction } from "@/app/(teacher)/actions";

interface RecordClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Array<{
    id: string;
    name: string;
    currentSemester: number;
    academicYear: string;
    classStrength?: number;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    code?: string | null;
    semester?: number;
  }>;
  defaultDate?: string;
  defaultBatchId?: string;
  defaultSubjectId?: string;
  onSuccess?: () => void;
}

const TIME_PRESETS = [
  { label: "09:00 - 10:00 (Theory Period 1)", start: "09:00", end: "10:00" },
  { label: "10:00 - 12:00 (Practical Lab Block)", start: "10:00", end: "12:00" },
  { label: "11:15 - 12:15 (Theory Period 2)", start: "11:15", end: "12:15" },
  { label: "14:00 - 15:00 (Theory Period 3)", start: "14:00", end: "15:00" },
  { label: "15:00 - 16:00 (Theory Period 4)", start: "15:00", end: "16:00" },
];

const TEACHING_METHODS = [
  "Interactive Lecture with PPT & Visual Aids",
  "Demonstration & Guided Hands-on Practical Training",
  "Case Analysis & Interactive Discussion",
  "Lab Simulation & Practical Demonstration",
  "Role-Play & Simulation Table Drills",
  "Formative Assessment & Structured Review Session",
];

const ASSIGNMENT_PRESETS = [
  "Individual SOP drill & workstation cleanliness checklist",
  "Department workflow concept map & organizational chart",
  "Analysis worksheet of modern hotel guest touchpoints",
  "PMS terminal registration entry drill & guest folio setup",
  "Standard telephone reservation call script drill",
  "Weekly spot quiz, viva assessment & concept handouts",
];

export function RecordClassModal({
  isOpen,
  onClose,
  batches,
  subjects,
  defaultDate,
  defaultBatchId,
  defaultSubjectId,
  onSuccess,
}: RecordClassModalProps) {
  const [selectedBatchId, setSelectedBatchId] = useState(
    defaultBatchId || batches[0]?.id || ""
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    defaultSubjectId || subjects[0]?.id || ""
  );
  const [sessionDate, setSessionDate] = useState(
    defaultDate || format(new Date(), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [topicPlanned, setTopicPlanned] = useState("");
  const [topicCovered, setTopicCovered] = useState("");
  const [teachingMethod, setTeachingMethod] = useState(TEACHING_METHODS[0]);
  const [assignmentActivity, setAssignmentActivity] = useState("");

  const activeBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const defaultStrength = activeBatch?.classStrength || 40;
  const [studentsPresent, setStudentsPresent] = useState<number>(defaultStrength);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: (typeof TIME_PRESETS)[0]) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
  };

  const handleSyncTopics = () => {
    if (topicPlanned && !topicCovered) {
      setTopicCovered(topicPlanned);
    } else if (topicCovered && !topicPlanned) {
      setTopicPlanned(topicCovered);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedBatchId || !selectedSubjectId) {
      setErrorMsg("Please select both a batch and a subject.");
      return;
    }

    if (!topicPlanned.trim() && !topicCovered.trim()) {
      setErrorMsg("Please specify the Topic Planned or Topic Covered.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await teacherCreateClassSessionAction({
        batchId: selectedBatchId,
        subjectId: selectedSubjectId,
        sessionDate,
        startTime,
        endTime,
        topicPlanned: topicPlanned.trim() || topicCovered.trim(),
        topicCovered: topicCovered.trim() || topicPlanned.trim(),
        teachingMethod: teachingMethod.trim(),
        assignmentActivity: assignmentActivity.trim(),
        studentsPresent,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to record session.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg("Class session successfully recorded and verified!");
      setTimeout(() => {
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <PenSquare className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Class Session</h3>
              <p className="text-xs text-indigo-100">
                Direct faculty entry • Automatically verified in syllabus tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Date, Batch, Subject Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Session Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Batch / Section
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <select
                  required
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value);
                    const b = batches.find((x) => x.id === e.target.value);
                    if (b?.classStrength) setStudentsPresent(b.classStrength);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Sem {b.currentSemester})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <select
                  required
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `[${s.code}] ` : ""}
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Timing and Presets */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Class Timings
              </span>
              <span className="text-[10px] text-slate-500">Quick Period Presets:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TIME_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    startTime === p.start && endTime === p.end
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 3. Topics Planned & Covered */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Topic Planned (Lesson Plan)
                </label>
                <button
                  type="button"
                  onClick={handleSyncTopics}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Sync Planned &amp; Covered
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. Front Office Operations - Check-in Procedures & Key Card Encoding"
                value={topicPlanned}
                onChange={(e) => setTopicPlanned(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Topic Covered (Taught Today)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Front Office Operations - Check-in Procedures & Key Card Encoding"
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Teaching Method with Presets */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pedagogical Teaching Method
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {TEACHING_METHODS.slice(0, 4).map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTeachingMethod(m)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                    teachingMethod === m
                      ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={teachingMethod}
              onChange={(e) => setTeachingMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* 5. Assignment / Activity */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Student Activity / Assignment / Lab Task
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ASSIGNMENT_PRESETS.slice(0, 3).map((a, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAssignmentActivity(a)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                    assignmentActivity === a
                      ? "bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-800 dark:text-amber-300 font-bold"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="e.g. Individual SOP drill & workstation cleanliness checklist"
              value={assignmentActivity}
              onChange={(e) => setAssignmentActivity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* 6. Students Present & Verification Status */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Students Present
              </span>
              <span className="text-[10px] text-slate-500">
                Batch Capacity: {defaultStrength} students
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudentsPresent(Math.max(0, studentsPresent - 1))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                max={defaultStrength + 10}
                value={studentsPresent}
                onChange={(e) => setStudentsPresent(Number(e.target.value))}
                className="w-16 text-center font-bold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setStudentsPresent(studentsPresent + 1)}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setStudentsPresent(defaultStrength)}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
              >
                Full
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Marked as Verified by Faculty automatically</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Session...</span>
                </>
              ) : (
                <>
                  <PenSquare className="w-4 h-4" />
                  <span>Save &amp; Verify Class Session</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
