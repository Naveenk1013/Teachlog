"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { createClassSessionAction } from "@/app/(cr)/cr/actions";
import { getBatchRosterAction } from "@/app/actions/attendance";
import { CRBatchInfo, CRAssignment, CRSubjectInfo, CRTeacherInfo } from "@/lib/data/cr";
import {
  BookOpen,
  User,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Beaker,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { format, subDays } from "date-fns";

interface Props {
  batch: CRBatchInfo;
  assignments: CRAssignment[];
  subjects?: CRSubjectInfo[];
  teachers?: CRTeacherInfo[];
}

const COMMON_PERIODS = [
  { label: "09:00 - 10:00", start: "09:00", end: "10:00" },
  { label: "10:00 - 11:00", start: "10:00", end: "11:00" },
  { label: "11:15 - 12:15", start: "11:15", end: "12:15" },
  { label: "12:15 - 13:15", start: "12:15", end: "13:15" },
  { label: "14:00 - 15:00", start: "14:00", end: "15:00" },
  { label: "15:00 - 16:00", start: "15:00", end: "16:00" },
];

export function LogClassForm({ batch, assignments, subjects, teachers }: Props) {
  const [state, formAction, isPending] = useActionState(createClassSessionAction, null);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const minDateStr = format(subDays(new Date(), 2), "yyyy-MM-dd");

  // Determine available subjects for this cohort
  const availableSubjects = (subjects && subjects.length > 0)
    ? subjects
    : assignments.map((a) => ({
        id: a.subjectId,
        code: a.subjectCode,
        name: a.subjectName,
        semester: a.semester,
      }));

  // Determine available faculty members
  const availableTeachers = (teachers && teachers.length > 0)
    ? teachers
    : Array.from(
        new Map(
          assignments.map((a) => [
            a.teacherId,
            { id: a.teacherId, name: a.teacherName, department: a.teacherDepartment },
          ])
        ).values()
      );

  const [selectedSubjectId, setSelectedSubjectId] = useState(
    availableSubjects[0]?.id || assignments[0]?.subjectId || ""
  );

  const initialAssignment = assignments.find(
    (a) => a.subjectId === (availableSubjects[0]?.id || assignments[0]?.subjectId || "")
  );

  const [selectedTeacherId, setSelectedTeacherId] = useState(
    initialAssignment?.teacherId || availableTeachers[0]?.id || ""
  );

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [studentsPresent, setStudentsPresent] = useState<number | string>(batch.class_strength);
  const [topicCovered, setTopicCovered] = useState("");

  // Attendance Roster State
  const [roster, setRoster] = useState<{
    studentId: string;
    rollNumber: string;
    fullName: string;
    section: string;
    practicalGroup: string | null;
    status: "present" | "absent" | "late" | "od";
  }[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [rosterInfo, setRosterInfo] = useState<{
    isPractical: boolean;
    group: string | null;
    section: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    if (batch?.id) {
      setIsRosterLoading(true);
      getBatchRosterAction(batch.id).then((res) => {
        if (!mounted) return;
        setIsRosterLoading(false);
        if (res.success && res.roster) {
          setRosterInfo({
            isPractical: res.roster.isPractical,
            group: res.roster.group,
            section: res.roster.section,
          });
          if (res.roster.students.length > 0) {
            const initialList = res.roster.students.map((s) => ({
              studentId: s.id,
              rollNumber: s.rollNumber,
              fullName: s.fullName,
              section: s.section,
              practicalGroup: s.practicalGroup,
              status: "present" as const,
            }));
            setRoster(initialList);
            setStudentsPresent(initialList.length);
          }
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [batch?.id]);

  const toggleStudentStatus = (studentId: string, newStatus: "present" | "absent" | "late" | "od") => {
    setRoster((prev) => {
      const updated = prev.map((s) => (s.studentId === studentId ? { ...s, status: newStatus } : s));
      const presentCount = updated.filter((s) => s.status === "present" || s.status === "late").length;
      setStudentsPresent(presentCount);
      return updated;
    });
  };

  const handleMarkAllRoster = (status: "present" | "absent") => {
    setRoster((prev) => {
      const updated = prev.map((s) => ({ ...s, status }));
      setStudentsPresent(status === "present" ? updated.length : 0);
      return updated;
    });
  };

  const designatedAssignment = assignments.find((a) => a.subjectId === selectedSubjectId);
  const selectedTeacher = availableTeachers.find((t) => t.id === selectedTeacherId);
  const isSubstituteSelected = designatedAssignment && selectedTeacherId !== designatedAssignment.teacherId;

  const handleSubjectChange = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    // Auto-select designated teacher for this subject, while allowing student to switch anytime
    const assigned = assignments.find((a) => a.subjectId === newSubjectId);
    if (assigned) {
      setSelectedTeacherId(assigned.teacherId);
    }
  };

  const handlePeriodSelect = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  return (
    <div className="space-y-4">
      {/* Success Notification */}
      {state?.success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Class Log Saved Successfully!</span>
          </div>
          <p className="text-xs text-emerald-700">
            The session has been recorded. The teacher can now view, enrich, and verify it.
          </p>
          <div className="pt-1 flex gap-2">
            <Link
              href="/cr/history"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-100/80 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>View in My Entries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {state?.error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs shadow-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
          <span className="font-medium">{state.error}</span>
        </div>
      )}

      {/* Main Form */}
      <form action={formAction} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Hidden input for batch */}
        <input type="hidden" name="batchId" value={batch.id} />

        {/* Cohort Info Pill */}
        <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-slate-600">
          <span className="font-medium">Cohort: {batch.name}</span>
          <span className="text-indigo-600 font-semibold">Semester {batch.current_semester}</span>
        </div>

        {/* 1. Subject & Teacher Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subject Dropdown */}
          <div>
            <label htmlFor="subjectId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Subject ({availableSubjects.length} in Sem {batch.current_semester})</span>
              <span className="text-[10px] text-indigo-600 font-semibold lowercase">Select Subject</span>
            </label>
            <div className="relative">
              <select
                id="subjectId"
                name="subjectId"
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                required
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.code} - ` : ""}{s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teacher / Faculty Dropdown */}
          <div>
            <label htmlFor="teacherId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Faculty / Teacher</span>
              <span className="text-[10px] text-indigo-600 font-semibold lowercase">Select Teacher</span>
            </label>
            <div className="relative">
              <select
                id="teacherId"
                name="teacherId"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                required
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.department ? `(${t.department})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Assigned Faculty Indicator / Helper Strip */}
        <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
          isSubstituteSelected
            ? "bg-amber-50/80 border-amber-200 text-amber-900"
            : "bg-indigo-50/60 border-indigo-100 text-indigo-900"
        }`}>
          <div className="flex items-center gap-2">
            <User className={`w-4 h-4 flex-shrink-0 ${isSubstituteSelected ? "text-amber-600" : "text-indigo-600"}`} />
            <div>
              {designatedAssignment ? (
                <span>
                  <span className="text-slate-500">Designated Lead: </span>
                  <strong className="text-slate-900 font-semibold">{designatedAssignment.teacherName}</strong>
                  {designatedAssignment.teacherDepartment && (
                    <span className="text-slate-500 text-[11px]"> ({designatedAssignment.teacherDepartment})</span>
                  )}
                  {isSubstituteSelected && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-semibold text-[10px]">
                      Substitute / Co-Faculty Selected
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  <span className="text-slate-500">Selected Instructor: </span>
                  <strong className="text-slate-900 font-semibold">{selectedTeacher?.name || "Faculty Member"}</strong>
                </span>
              )}
            </div>
          </div>

          {isSubstituteSelected && designatedAssignment && (
            <button
              type="button"
              onClick={() => setSelectedTeacherId(designatedAssignment.teacherId)}
              className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline flex-shrink-0 ml-2"
            >
              Reset to Lead ({designatedAssignment.teacherName.split(" ")[0]})
            </button>
          )}
        </div>

        {/* 2. Date Picker (With 2-Day Backdating Guard) */}
        <div>
          <label htmlFor="sessionDate" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Date of Class
          </label>
          <input
            id="sessionDate"
            name="sessionDate"
            type="date"
            required
            defaultValue={todayStr}
            min={minDateStr}
            max={todayStr}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Entries can be backdated up to 2 days prior (from {minDateStr} to {todayStr}).
          </p>
        </div>

        {/* 3. Class Time Range */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Class Time
            </label>
            <span className="text-[11px] text-slate-400">Quick select period</span>
          </div>

          {/* Period quick chips */}
          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            {COMMON_PERIODS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePeriodSelect(p.start, p.end)}
                className={`py-1 px-1.5 rounded-lg text-[11px] font-medium border transition-all text-center ${
                  startTime === p.start && endTime === p.end
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] font-medium text-slate-500 mb-1">Start Time</span>
              <input
                name="startTime"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500 mb-1">End Time</span>
              <input
                name="endTime"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Students Present */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="studentsPresent" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Students Present
            </label>
            <button
              type="button"
              onClick={() => setStudentsPresent(batch.class_strength)}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 underline"
            >
              All Present ({batch.class_strength})
            </button>
          </div>
          <div className="relative">
            <input
              id="studentsPresent"
              name="studentsPresent"
              type="number"
              required
              min={0}
              max={batch.class_strength}
              value={studentsPresent}
              onChange={(e) => setStudentsPresent(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 pointer-events-none">
              / {batch.class_strength} students
            </span>
          </div>

          {/* Interactive Attendance Roll Section */}
          {roster.length > 0 && (
            <div className="mt-3 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div
                onClick={() => setIsRosterOpen(!isRosterOpen)}
                className="p-3 bg-slate-50/80 hover:bg-slate-100/70 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Take Class Attendance (Roll Call)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {rosterInfo?.isPractical ? (
                        <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                          <Beaker className="w-3 h-3" />
                          Practical Lab Group {rosterInfo.group} ({roster.length} students)
                        </span>
                      ) : (
                        <span className="text-cyan-700 font-semibold inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Theory {rosterInfo?.section || "Section"} ({roster.length} students)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {roster.filter((s) => s.status === "present" || s.status === "late").length} Present
                  </span>
                  {roster.filter((s) => s.status === "absent").length > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                      {roster.filter((s) => s.status === "absent").length} Absent
                    </span>
                  )}
                  {isRosterOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isRosterOpen && (
                <div className="p-3 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      Tap any student to mark as Absent or Late:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMarkAllRoster("present")}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md transition-colors"
                      >
                        All Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkAllRoster("absent")}
                        className="text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-md transition-colors"
                      >
                        All Absent
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200/60 bg-slate-50/30">
                    {roster.map((student) => (
                      <div
                        key={student.studentId}
                        className="p-2 flex items-center justify-between gap-2 hover:bg-white transition-colors"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {student.rollNumber}
                          </span>
                          <span className="text-xs font-medium text-slate-900 truncate">
                            {student.fullName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleStudentStatus(student.studentId, "present")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              student.status === "present"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-emerald-50"
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStudentStatus(student.studentId, "absent")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              student.status === "absent"
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-red-50"
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStudentStatus(student.studentId, "late")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              student.status === "late"
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-amber-50"
                            }`}
                          >
                            L
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden JSON input to submit attendance records */}
          <input
            type="hidden"
            name="attendanceData"
            value={roster.length > 0 ? JSON.stringify(roster) : ""}
          />
        </div>

        {/* 5. Topic Covered */}
        <div>
          <label htmlFor="topicCovered" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Topic Covered in Class
          </label>
          <textarea
            id="topicCovered"
            name="topicCovered"
            rows={3}
            required
            value={topicCovered}
            onChange={(e) => setTopicCovered(e.target.value)}
            placeholder="e.g. Mother Sauces - classification and preparation of Béchamel sauce..."
            className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-normal"
          />
          <span className="block text-[11px] text-slate-400 text-right mt-1">
            {topicCovered.length} characters
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span>Saving Class Session...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Class Log</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
