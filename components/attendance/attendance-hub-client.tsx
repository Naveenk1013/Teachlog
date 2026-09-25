"use client";

import { useState, useEffect, useRef } from "react";
import { BatchItem } from "@/lib/data/admin";
import { CohortAttendanceOverviewResult } from "@/lib/data/attendance";
import { getCohortAttendanceOverviewAction } from "@/app/actions/attendance";
import { SessionAttendanceModal } from "@/components/attendance/session-attendance-modal";
import { PromoteStudentsModal } from "@/components/attendance/promote-students-modal";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Clock,
  BookOpen,
  Beaker,
  Filter,
  GraduationCap,
  Loader2,
  Edit3,
  ArrowUpDown,
  Download,
  FileText,
  Code,
  ChevronDown,
} from "lucide-react";

interface AttendanceHubClientProps {
  batches: { id: string; name: string; currentSemester: number; academicYear: string }[];
  initialBatchId?: string;
  currentUserRole?: "admin" | "teacher" | "cr";
  currentUserName?: string;
}

export function AttendanceHubClient({
  batches,
  initialBatchId,
  currentUserRole = "teacher",
  currentUserName,
}: AttendanceHubClientProps) {
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId || batches[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"register" | "students">("register");
  const [overview, setOverview] = useState<CohortAttendanceOverviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [onlyShortage, setOnlyShortage] = useState(false);

  // Export & Promote State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modal State
  const [activeSession, setActiveSession] = useState<{
    id: string;
    batchId: string;
    batchName: string;
    subjectName: string;
    sessionDate: string;
    sessionTime: string;
  } | null>(null);

  const fetchCohortOverview = (batchId: string) => {
    if (!batchId) return;
    setIsLoading(true);
    getCohortAttendanceOverviewAction(batchId).then((res) => {
      setIsLoading(false);
      if (res.success && res.overview) {
        setOverview(res.overview);
      } else {
        setOverview(null);
      }
    });
  };

  useEffect(() => {
    fetchCohortOverview(selectedBatchId);
  }, [selectedBatchId]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  // Filter students
  const filteredStudents = (overview?.students || []).filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesShortage = !onlyShortage || s.percentage < 75;
    return matchesSearch && matchesShortage;
  });

  const shortageStudentsCount = (overview?.students || []).filter((s) => s.percentage < 75).length;

  // Export CSV fallback (client-side)
  const handleExportCSV = () => {
    if (!overview || overview.students.length === 0) return;

    const headers = ["Roll Number", "Student Name", "Section", "Practical Group", "Total Classes", "Attended", "Absent", "Attendance %", "Status"];
    const rows = overview.students.map((s) => [
      s.rollNumber,
      `"${s.fullName.replace(/"/g, '""')}"`,
      s.section,
      s.practicalGroup || "None",
      s.totalClasses,
      s.attendedClasses,
      s.absentClasses,
      `${s.percentage}%`,
      s.percentage >= 75 ? "Eligible" : "Shortage Warning",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Register_${overview.batchName.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Attendance Tracking System
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Classwise Theory &amp; Practical attendance rolls, individual student registers, and eligibility analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Promote Semester Modal Button (Admin only) */}
          {currentUserRole === "admin" && (
            <button
              type="button"
              onClick={() => setIsPromoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-xs"
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Promote Semester</span>
            </button>
          )}

          {/* Multi-Format Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={!overview || overview.students.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Report</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 py-2 divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Download Formats
                </div>

                <div className="py-1">
                  {/* DOCX Word */}
                  <a
                    href={`/api/reports/attendance?batchId=${selectedBatchId}&format=docx`}
                    download
                    onClick={() => setIsExportMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-semibold block">Word Document (.docx)</span>
                      <span className="text-[10px] text-slate-400">Official IIHM letterhead &amp; signatures</span>
                    </div>
                  </a>

                  {/* Excel / CSV */}
                  <a
                    href={`/api/reports/attendance?batchId=${selectedBatchId}&format=csv`}
                    download
                    onClick={() => setIsExportMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold block">Excel / CSV (.csv)</span>
                      <span className="text-[10px] text-slate-400">Full roster with percentages</span>
                    </div>
                  </a>

                  {/* XML */}
                  <a
                    href={`/api/reports/attendance?batchId=${selectedBatchId}&format=xml`}
                    download
                    onClick={() => setIsExportMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                  >
                    <Code className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-semibold block">XML Data (.xml)</span>
                      <span className="text-[10px] text-slate-400">Structured data interchange format</span>
                    </div>
                  </a>
                </div>

                <div className="pt-1">
                  {/* Print */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handlePrint();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-semibold block">Print / PDF Document</span>
                      <span className="text-[10px] text-slate-400">Browser print &amp; PDF preview</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Cohort Selector & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Cohort / Group:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (Sem {b.currentSemester})
              </option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "register"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Session Registers ({overview?.sessions.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "students"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Student Roster ({overview?.students.length || 0})
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Enrolled Students</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {overview?.students.length || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            {overview?.isPractical ? (
              <span className="text-amber-700 flex items-center gap-1">
                <Beaker className="w-3 h-3" /> Lab Group {overview.group}
              </span>
            ) : (
              <span className="text-cyan-700 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Theory Section
              </span>
            )}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Sessions Conducted</span>
          <span className="text-2xl font-bold text-indigo-600 mt-1 block">
            {overview?.totalSessionsHeld || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium">Logged academic sessions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Average Attendance</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">
            {overview?.averageAttendancePct || 100}%
          </span>
          <span className="text-[10px] text-emerald-700 mt-1 block font-medium">Cohort overall average</span>
        </div>

        <div
          onClick={() => {
            setActiveTab("students");
            setOnlyShortage(!onlyShortage);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            onlyShortage
              ? "bg-red-50 border-red-300 ring-2 ring-red-400"
              : "bg-white border-slate-200/80 shadow-xs hover:border-red-200"
          }`}
        >
          <span className="text-[11px] font-semibold text-red-600 block uppercase">Shortage Alerts (&lt;75%)</span>
          <span className="text-2xl font-bold text-red-600 mt-1 block">
            {shortageStudentsCount}
          </span>
          <span className="text-[10px] text-red-500 mt-1 block font-medium">
            {onlyShortage ? "Filtering alerts (click to reset)" : "Click to view detained/shortage"}
          </span>
        </div>
      </div>

      {/* Main Content Areas */}
      {isLoading ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold">Loading cohort attendance register...</span>
        </div>
      ) : activeTab === "register" ? (
        /* Tab 1: Session Register */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Class Session Attendance Log</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Each session conducted for this cohort with attendance headcount and roster editing access.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4 text-center">Students Present</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!overview || overview.sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No class sessions recorded for this cohort yet.
                    </td>
                  </tr>
                ) : (
                  overview.sessions.map((sess) => {
                    const totalRoster = sess.totalRosterCount || 1;
                    const pct = Math.round((sess.studentsPresent / totalRoster) * 100);

                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">{sess.sessionDate}</span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">
                            {sess.startTime.slice(0, 5)} - {sess.endTime.slice(0, 5)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {sess.subjectName}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          {sess.teacherName}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[11px]">
                            {sess.studentsPresent} / {totalRoster}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              pct >= 75
                                ? "bg-emerald-50 text-emerald-700"
                                : pct >= 65
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {sess.status === "verified" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              Submitted
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSession({
                                id: sess.id,
                                batchId: overview.batchId,
                                batchName: overview.batchName,
                                subjectName: sess.subjectName,
                                sessionDate: sess.sessionDate,
                                sessionTime: `${sess.startTime.slice(0, 5)} - ${sess.endTime.slice(0, 5)}`,
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-600" />
                            <span>Edit Roster</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 2: Student Roster & Percentage Analytics */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Student Attendance Register</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Attendance rate, classes attended vs missed, and exam eligibility standing.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roll no or student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Cohort / Group</th>
                  <th className="py-3 px-4 text-center">Total Held</th>
                  <th className="py-3 px-4 text-center">Attended</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-center">Attendance Rate</th>
                  <th className="py-3 px-4 text-center">Eligibility Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.studentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {st.rollNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {st.fullName}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                            {st.section}
                          </span>
                          {st.practicalGroup && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Lab {st.practicalGroup}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                        {st.totalClasses}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700 font-mono">
                        {st.attendedClasses}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-red-600 font-mono">
                        {st.absentClasses}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span
                              className={
                                st.percentage >= 75
                                  ? "text-emerald-700"
                                  : st.percentage >= 65
                                  ? "text-amber-700"
                                  : "text-red-600"
                              }
                            >
                              {st.percentage}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                st.percentage >= 75
                                  ? "bg-emerald-500"
                                  : st.percentage >= 65
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(st.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {st.percentage >= 75 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Eligible
                          </span>
                        ) : st.percentage >= 65 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Borderline Warning
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3 text-red-600" />
                            Critical Shortage
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Session Attendance Edit Modal */}
      {activeSession && (
        <SessionAttendanceModal
          isOpen={true}
          onClose={() => setActiveSession(null)}
          sessionId={activeSession.id}
          batchId={activeSession.batchId}
          batchName={activeSession.batchName}
          sessionTitle={activeSession.subjectName}
          sessionDate={activeSession.sessionDate}
          sessionTime={activeSession.sessionTime}
          onSaved={() => {
            // Refresh overview after save
            if (selectedBatchId) {
              getCohortAttendanceOverviewAction(selectedBatchId).then((res) => {
                if (res.success && res.overview) {
                  setOverview(res.overview);
                }
              });
            }
          }}
        />
      )}

      {/* Student Semester Promotion Modal */}
      <PromoteStudentsModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        batches={batches}
        defaultBatchId={selectedBatchId}
        onPromotionSuccess={() => {
          fetchCohortOverview(selectedBatchId);
        }}
      />
    </div>
  );
}
