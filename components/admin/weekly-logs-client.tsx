"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, parseISO, addDays, subDays, startOfWeek } from "date-fns";
import {
  WeeklyLogsExplorerFilterData,
  WeeklyLogSessionItem,
} from "@/lib/data/admin";
import {
  quickUpdateSessionAction,
  quickToggleVerifyAction,
} from "@/app/(admin)/admin/actions";
import { SessionAttendanceModal } from "@/components/attendance/session-attendance-modal";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Edit3,
  FileDown,
  BookOpen,
  Users,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Save,
  X,
  Check,
  Search,
  ExternalLink,
} from "lucide-react";

const TEACHING_METHOD_PRESETS = [
  "Lecture & PPT Presentation",
  "Practical Demonstration",
  "Interactive Group Discussion",
  "Case Study Analysis",
  "Hands-on Kitchen/Lab Practical",
  "Role-Play & Simulation",
];

const ACTIVITY_PRESETS = [
  "Recipe Card & Costing Sheet",
  "Unit Assessment / Quiz",
  "Individual Practical Report",
  "Standard Operating Procedure (SOP) Drill",
  "Guest Service Simulation",
];

export function WeeklyLogsClient({
  data,
  currentUserRole = "admin",
}: {
  data: WeeklyLogsExplorerFilterData;
  currentUserRole?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [sessions, setSessions] = useState<WeeklyLogSessionItem[]>(data.sessions);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDayFilter, setActiveDayFilter] = useState<string>("all");

  // Filter selections
  const currentTeacherId = searchParams.get("teacherId") || "";
  const currentBatchId = searchParams.get("batchId") || "";
  const currentSubjectId = searchParams.get("subjectId") || "";
  const currentWeekStart = data.selectedWeekStart;

  // Editing state
  const [editingSession, setEditingSession] = useState<WeeklyLogSessionItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    topicCovered: string;
    topicPlanned: string;
    teachingMethod: string;
    assignmentActivity: string;
    studentsPresent: number;
    status: "submitted" | "verified";
  }>({
    topicCovered: "",
    topicPlanned: "",
    teachingMethod: "",
    assignmentActivity: "",
    studentsPresent: 0,
    status: "submitted",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // DOCX Modal state
  const [showDocxModal, setShowDocxModal] = useState(false);
  const [docxBatchId, setDocxBatchId] = useState(currentBatchId || data.batches[0]?.id || "");
  const [docxSubjectId, setDocxSubjectId] = useState(currentSubjectId || data.subjects[0]?.id || "");
  const [docxTeacherId, setDocxTeacherId] = useState(currentTeacherId || data.teachers[0]?.id || "");

  // Attendance Modal state
  const [attendanceModalSession, setAttendanceModalSession] = useState<WeeklyLogSessionItem | null>(null);

  // Week navigation
  const navigateWeek = (direction: "prev" | "next" | "current") => {
    let targetMonday: Date;
    if (direction === "current") {
      targetMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
    } else {
      const current = parseISO(currentWeekStart);
      targetMonday = direction === "prev" ? subDays(current, 7) : addDays(current, 7);
    }
    const mondayStr = format(targetMonday, "yyyy-MM-dd");
    updateFilters({ weekStart: mondayStr });
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const pickedDate = parseISO(e.target.value);
    const targetMonday = startOfWeek(pickedDate, { weekStartsOn: 1 });
    const mondayStr = format(targetMonday, "yyyy-MM-dd");
    updateFilters({ weekStart: mondayStr });
  };

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Open Edit Dialog
  const openEditModal = (session: WeeklyLogSessionItem) => {
    const commonTopic = session.topicCovered || session.topicPlanned || "";
    setEditingSession(session);
    setEditFormData({
      topicCovered: commonTopic,
      topicPlanned: commonTopic,
      teachingMethod: session.teachingMethod || "",
      assignmentActivity: session.assignmentActivity || "",
      studentsPresent: session.studentsPresent,
      status: session.status,
    });
    setEditError(null);
    setEditSuccess(null);
  };

  // Handle Save
  const handleSaveEdit = async () => {
    if (!editingSession) return;
    if (!editFormData.topicCovered.trim()) {
      setEditError("Topic covered cannot be empty.");
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const res = await quickUpdateSessionAction({
        sessionId: editingSession.id,
        topicCovered: editFormData.topicCovered,
        topicPlanned: editFormData.topicPlanned,
        teachingMethod: editFormData.teachingMethod,
        assignmentActivity: editFormData.assignmentActivity,
        studentsPresent: editFormData.studentsPresent,
        status: editFormData.status,
      });

      if (!res.success) {
        setEditError(res.error || "Failed to update class log.");
        setIsSaving(false);
        return;
      }

      // Update local state immediately with synchronized topic
      const syncedTopic = editFormData.topicCovered.trim();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSession.id
            ? {
                ...s,
                topicCovered: syncedTopic,
                topicPlanned: syncedTopic,
                teachingMethod: editFormData.teachingMethod.trim() || null,
                assignmentActivity: editFormData.assignmentActivity.trim() || null,
                studentsPresent: editFormData.studentsPresent,
                status: editFormData.status,
                verifiedAt: editFormData.status === "verified" ? new Date().toISOString() : null,
              }
            : s
        )
      );

      setEditSuccess("Class session updated successfully!");
      setTimeout(() => {
        setEditingSession(null);
        setEditSuccess(null);
      }, 700);
    } catch (err: any) {
      setEditError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Verify Toggle
  const handleToggleVerify = async (session: WeeklyLogSessionItem) => {
    const nextStatus = session.status === "verified" ? "submitted" : "verified";
    try {
      const res = await quickToggleVerifyAction(session.id, nextStatus);
      if (res.success) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === session.id
              ? {
                  ...s,
                  status: nextStatus,
                  verifiedAt: nextStatus === "verified" ? new Date().toISOString() : null,
                }
              : s
          )
        );
      }
    } catch {
      // Ignore error
    }
  };

  // Group sessions by day of week (Monday to Saturday)
  const mondayDate = parseISO(data.selectedWeekStart);
  const weekDays = [0, 1, 2, 3, 4, 5].map((offset) => {
    const d = addDays(mondayDate, offset);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayName = format(d, "EEEE");
    return {
      dateStr,
      dayName,
      formattedDate: format(d, "dd MMM yyyy"),
      shortDate: format(d, "EEE, dd MMM"),
    };
  });

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subjectCode && s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.topicCovered.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.topicPlanned && s.topicPlanned.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.batchName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDay = activeDayFilter === "all" || s.sessionDate === activeDayFilter;
    return matchesSearch && matchesDay;
  });

  // Calculate statistics
  const totalClasses = sessions.length;
  const verifiedClasses = sessions.filter((s) => s.status === "verified").length;
  const pendingClasses = totalClasses - verifiedClasses;
  const totalStudents = sessions.reduce((sum, s) => sum + s.studentsPresent, 0);
  const totalCapacity = sessions.reduce((sum, s) => sum + s.classStrength, 0);
  const attendanceRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  // Format week range banner
  const weekStartFormatted = format(parseISO(data.selectedWeekStart), "dd MMM yyyy");
  const weekEndFormatted = format(parseISO(data.selectedWeekEnd), "dd MMM yyyy");

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              {currentUserRole === "cr"
                ? "Student & CR Class Tracking"
                : currentUserRole === "teacher"
                ? "Faculty Teaching Log Hub"
                : "IIHM Academic Operations Hub"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Weekly Teaching Logs &amp; Quick Editor
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {currentUserRole === "cr"
                ? "Review weekly syllabus progress, check what was taught in each class, and quick-edit your cohort's topic entries and attendance."
                : currentUserRole === "teacher"
                ? "Inspect Monday–Saturday syllabus delivery across your subjects and batches. Quickly update class topics, teaching methods, and student assignments."
                : "Inspect Monday–Saturday syllabus delivery across faculty and batches. Make instant inline adjustments to topics, teaching methods, and student activities with full audit tracking."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowDocxModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              Download Official DOCX
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Week Sessions</div>
            <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-2">
              {totalClasses} <span className="text-xs text-slate-400 font-normal">classes</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </div>
            <div className="text-xl font-bold text-emerald-300 mt-1">
              {verifiedClasses}{" "}
              <span className="text-xs text-slate-400 font-normal">
                ({totalClasses > 0 ? Math.round((verifiedClasses / totalClasses) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending Review
            </div>
            <div className="text-xl font-bold text-amber-300 mt-1">{pendingClasses}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-xs text-blue-300 font-medium flex items-center gap-1">
              <Users className="w-3 h-3" /> Avg Attendance
            </div>
            <div className="text-xl font-bold text-blue-200 mt-1">{attendanceRate}%</div>
          </div>
        </div>
      </div>

      {/* Week Navigator & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Row 1: Week Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek("prev")}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2.5">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{weekStartFormatted}</span>
              <span className="text-slate-400 font-normal">to</span>
              <span>{weekEndFormatted}</span>
            </div>
            <button
              onClick={() => navigateWeek("next")}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigateWeek("current")}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 transition-colors"
            >
              Current Week
            </button>
            <div className="relative">
              <input
                type="date"
                onChange={handleDatePick}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                title="Select Specific Date"
              />
              <button className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
                <span>Jump Date</span>
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search topic, subject, faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Row 2: Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          {/* Teacher Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> Faculty Member
            </label>
            <select
              value={currentTeacherId}
              onChange={(e) => updateFilters({ teacherId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Faculty</option>
              {data.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.department ? `(${t.department})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Student Batch / Cohort
            </label>
            <select
              value={currentBatchId}
              onChange={(e) => updateFilters({ batchId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Batches</option>
              {data.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (Sem {b.currentSemester}, {b.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Subject / Curriculum
            </label>
            <select
              value={currentSubjectId}
              onChange={(e) => updateFilters({ subjectId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `[${s.code}] ` : ""}
                  {s.name} (Sem {s.semester})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Day of Week Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 text-xs">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Day:
          </span>
          <button
            onClick={() => setActiveDayFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeDayFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All Days ({totalClasses})
          </button>
          {weekDays.map((day) => {
            const dayCount = sessions.filter((s) => s.sessionDate === day.dateStr).length;
            return (
              <button
                key={day.dateStr}
                onClick={() => setActiveDayFilter(day.dateStr)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeDayFilter === day.dateStr
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>{day.dayName.substring(0, 3)}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeDayFilter === day.dateStr
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {dayCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Sessions Feed Grouped by Day */}
      <div className="space-y-6">
        {weekDays
          .filter((d) => activeDayFilter === "all" || activeDayFilter === d.dateStr)
          .map((day) => {
            const daySessions = filteredSessions.filter((s) => s.sessionDate === day.dateStr);

            return (
              <div
                key={day.dateStr}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                {/* Day Header */}
                <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {day.dayName}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {day.formattedDate}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {daySessions.length} {daySessions.length === 1 ? "Class" : "Classes"} scheduled
                  </span>
                </div>

                {/* Day Content */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {daySessions.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-400 dark:text-slate-500 text-sm">
                        No class logs recorded for {day.dayName}.
                      </p>
                    </div>
                  ) : (
                    daySessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          {/* Left Column: Metadata & Core Details */}
                          <div className="space-y-3 flex-1">
                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                {session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}
                              </span>

                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                {session.batchName} (Sem {session.semester})
                              </span>

                              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {session.teacherName}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  session.status === "verified"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
                                }`}
                              >
                                {session.status === "verified" ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Verified
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                    Pending Verification
                                  </>
                                )}
                              </span>

                              {/* Attendance */}
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-auto flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {session.studentsPresent}/{session.classStrength}
                                </span>{" "}
                                Present (
                                {session.classStrength > 0
                                  ? Math.round((session.studentsPresent / session.classStrength) * 100)
                                  : 0}
                                %)
                              </span>
                            </div>

                            {/* Subject Title */}
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {session.subjectCode ? `${session.subjectCode} - ` : ""}
                                {session.subjectName}
                              </h3>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-[10px] mb-1">
                                  Topic Covered (CR Log)
                                </span>
                                <p className="text-slate-800 dark:text-slate-200 font-medium">
                                  {session.topicCovered || session.topicPlanned}
                                </p>
                              </div>

                              <div>
                                <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-[10px] mb-1">
                                  Topic Planned (Syllabus Target)
                                </span>
                                <p className="text-slate-700 dark:text-slate-300">
                                  {session.topicCovered || session.topicPlanned || (
                                    <span className="text-slate-400 italic">Not specified</span>
                                  )}
                                </p>
                              </div>

                              <div>
                                <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-[10px] mb-1">
                                  Teaching Method
                                </span>
                                <p className="text-slate-700 dark:text-slate-300">
                                  {session.teachingMethod ? (
                                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100/60 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium">
                                      {session.teachingMethod}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Standard Lecture</span>
                                  )}
                                </p>
                              </div>

                              <div>
                                <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-[10px] mb-1">
                                  Assignment / Student Activity
                                </span>
                                <p className="text-slate-700 dark:text-slate-300">
                                  {session.assignmentActivity || (
                                    <span className="text-slate-400 italic">None logged</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Footer attribution */}
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>
                                Logged by: <strong className="text-slate-600 dark:text-slate-300">{session.enteredByName}</strong> ({session.enteredByRole})
                              </span>
                              {session.syllabusTopics && session.syllabusTopics.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-md">
                                    Units: {session.syllabusTopics.join(", ")}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Actions */}
                          <div className="flex lg:flex-col items-center gap-2 pt-2 lg:pt-0">
                            <button
                              type="button"
                              onClick={() => setAttendanceModalSession(session)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors"
                              title="View & Edit Student Attendance Roster"
                            >
                              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              Attendance
                            </button>

                            <button
                              onClick={() => openEditModal(session)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              Quick Edit
                            </button>

                            {currentUserRole !== "cr" && (
                              <button
                                onClick={() => handleToggleVerify(session)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                  session.status === "verified"
                                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                {session.status === "verified" ? "Unverify" : "Verify Class"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* QUICK EDIT MODAL */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-blue-200">
                  {editingSession.dayName}, {editingSession.sessionDate} • {editingSession.startTime.substring(0, 5)} - {editingSession.endTime.substring(0, 5)}
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Edit Class Log: {editingSession.subjectName}
                </h3>
                <div className="text-xs text-blue-200">
                  Batch: {editingSession.batchName} • Faculty: {editingSession.teacherName}
                </div>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              {editError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {/* Topic Covered & Topic Planned (Always Synchronized) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic Covered &amp; Topic Planned <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={editFormData.topicCovered}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditFormData((prev) => ({
                      ...prev,
                      topicCovered: val,
                      topicPlanned: val,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  placeholder="Detail the curriculum topic delivered in this session..."
                />
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Topic Planned and Topic Covered are identical and synchronized in both sections</span>
                </div>
              </div>

              {/* Teacher enrichment fields vs Student View */}
              {currentUserRole === "cr" ? (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Faculty Instructional Enrichment (View-Only)
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Topic Planned:</span>{" "}
                    {editingSession.topicPlanned || "Standard curriculum schedule"}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Teaching Method:</span>{" "}
                    {editingSession.teachingMethod || "Lecture & Discussion"}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Assignment / Activity:</span>{" "}
                    {editingSession.assignmentActivity || "None logged"}
                  </div>
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    * Enrichment fields and pedagogical methods are curated directly by course faculty.
                  </p>
                </div>
              ) : (
                <>
                  {/* Topic Planned (mirrored with Topic Covered) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Topic Planned (Curriculum Target)
                    </label>
                    <input
                      type="text"
                      value={editFormData.topicPlanned}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData((prev) => ({
                          ...prev,
                          topicCovered: val,
                          topicPlanned: val,
                        }));
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      placeholder="Course syllabus topic (mirrored automatically)"
                    />
                  </div>

                  {/* Teaching Method + Quick Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Teaching Method
                    </label>
                    <input
                      type="text"
                      value={editFormData.teachingMethod}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, teachingMethod: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      placeholder="e.g. Lecture & PPT Presentation, Practical Demo..."
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {TEACHING_METHOD_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setEditFormData((prev) => ({ ...prev, teachingMethod: preset }))
                          }
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assignment / Activity + Quick Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assignment / Student Activity
                    </label>
                    <input
                      type="text"
                      value={editFormData.assignmentActivity}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, assignmentActivity: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      placeholder="e.g. Recipe costing sheet, Unit quiz, Case brief..."
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {ACTIVITY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setEditFormData((prev) => ({ ...prev, assignmentActivity: preset }))
                          }
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Students Present & Verification Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Students Present (Total Batch: {editingSession.classStrength})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={editingSession.classStrength || 200}
                      value={editFormData.studentsPresent}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          studentsPresent: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="w-32 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold"
                    />
                    <span className="text-xs text-slate-500">
                      (
                      {editingSession.classStrength > 0
                        ? Math.round(
                            (editFormData.studentsPresent / editingSession.classStrength) * 100
                          )
                        : 0}
                      % attendance)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Verification Status
                  </label>
                  {currentUserRole === "cr" ? (
                    <div className="pt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          editingSession.status === "verified"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {editingSession.status === "verified" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified by Faculty
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Faculty Verification
                          </>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={editFormData.status === "verified"}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              status: e.target.checked ? "verified" : "submitted",
                            }))
                          }
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Mark this class session as Verified</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <>Saving Changes...</>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCX EXPORT MODAL */}
      {showDocxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-amber-200" />
                <h3 className="text-base font-bold text-white">Generate Official Weekly DOCX</h3>
              </div>
              <button
                onClick={() => setShowDocxModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official IIHM Weekly Log Word Documents (.docx) are compiled per Subject and Batch for compliance and auditing. Select the parameters below to download:
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Week Starting (Monday)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${weekStartFormatted} (${data.selectedWeekStart})`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Batch
                </label>
                <select
                  value={docxBatchId}
                  onChange={(e) => setDocxBatchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                >
                  {data.batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Sem {b.currentSemester}, {b.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Subject
                </label>
                <select
                  value={docxSubjectId}
                  onChange={(e) => setDocxSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                >
                  {data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `[${s.code}] ` : ""}
                      {s.name} (Sem {s.semester})
                    </option>
                  ))}
                </select>
              </div>

              {currentUserRole === "admin" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Faculty in Charge
                  </label>
                  <select
                    value={docxTeacherId}
                    onChange={(e) => setDocxTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  >
                    {data.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.department ? `(${t.department})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDocxModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <a
                href={`/api/reports/weekly-log?weekStart=${data.selectedWeekStart}&batchId=${docxBatchId}&subjectId=${docxSubjectId}${
                  docxTeacherId ? `&teacherId=${docxTeacherId}` : ""
                }`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowDocxModal(false)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md"
              >
                <FileDown className="w-4 h-4" />
                Download .DOCX Now
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SESSION ATTENDANCE MODAL */}
      {attendanceModalSession && (
        <SessionAttendanceModal
          isOpen={true}
          onClose={() => setAttendanceModalSession(null)}
          sessionId={attendanceModalSession.id}
          batchId={attendanceModalSession.batchId}
          batchName={attendanceModalSession.batchName}
          sessionTitle={attendanceModalSession.subjectName}
          sessionDate={attendanceModalSession.sessionDate}
          sessionTime={`${attendanceModalSession.startTime.slice(0, 5)} - ${attendanceModalSession.endTime.slice(0, 5)}`}
          onSaved={(newPresentCount) => {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === attendanceModalSession.id
                  ? { ...s, studentsPresent: newPresentCount }
                  : s
              )
            );
          }}
        />
      )}
    </div>
  );
}
