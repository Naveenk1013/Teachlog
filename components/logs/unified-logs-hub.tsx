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
import {
  aiEnrichWeekLogsAction,
  aiGenerateWeekSummaryAction,
  aiOneClickGenerateDocxAction,
} from "@/app/actions/ai-log-generator";
import { saveWeeklySummaryAction } from "@/app/(teacher)/actions";
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
  FileText,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  Send,
  Loader2,
  ArrowRight,
  Download,
  Info,
  Building,
  RotateCcw,
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

export function UnifiedLogsHub({
  data,
  currentUserRole = "teacher",
  currentUserId = "",
  initialTab = "editor",
  existingSummary = null,
}: {
  data: WeeklyLogsExplorerFilterData;
  currentUserRole?: string;
  currentUserId?: string;
  initialTab?: "editor" | "summary" | "reports";
  existingSummary?: any | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Active Tab: 'editor' | 'summary' | 'reports'
  const tabFromUrl = searchParams.get("tab") as "editor" | "summary" | "reports" | null;
  const [activeTab, setActiveTab] = useState<"editor" | "summary" | "reports">(
    tabFromUrl || initialTab || "editor"
  );

  const [sessions, setSessions] = useState<WeeklyLogSessionItem[]>(data.sessions);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDayFilter, setActiveDayFilter] = useState<string>("all");

  // Filter selections
  const currentTeacherId = searchParams.get("teacherId") || "";
  const currentBatchId = searchParams.get("batchId") || data.batches[0]?.id || "";
  const currentSubjectId = searchParams.get("subjectId") || data.subjects[0]?.id || "";
  const currentWeekStart = data.selectedWeekStart;

  // Selected batch & subject objects for display
  const selectedBatch = data.batches.find((b) => b.id === currentBatchId) || data.batches[0];
  const selectedSubject = data.subjects.find((s) => s.id === currentSubjectId) || data.subjects[0];

  // AI Loading states
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [isAiGeneratingDocx, setIsAiGeneratingDocx] = useState(false);
  const [hubMessage, setHubMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // 7-Section Summary State
  const [syllabusCoverage, setSyllabusCoverage] = useState(existingSummary?.syllabusCoverage || "");
  const [practicalConducted, setPracticalConducted] = useState(existingSummary?.practicalConducted || "");
  const [assessmentConducted, setAssessmentConducted] = useState(existingSummary?.assessmentConducted || "");
  const [slowLearners, setSlowLearners] = useState(existingSummary?.slowLearners || "");
  const [remedialAction, setRemedialAction] = useState(existingSummary?.remedialAction || "");
  const [aiDigitalTools, setAiDigitalTools] = useState(existingSummary?.aiDigitalTools || "");
  const [industryExamples, setIndustryExamples] = useState(existingSummary?.industryExamples || "");
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  // Editing state for Quick Editor
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

  // DOCX Export Modal state
  const [showDocxModal, setShowDocxModal] = useState(false);
  const [docxScope, setDocxScope] = useState<"semester" | "batch">("semester");
  const [docxSemester, setDocxSemester] = useState<number>(selectedBatch?.currentSemester || 1);
  const [docxBatchId, setDocxBatchId] = useState(currentBatchId || data.batches[0]?.id || "");
  const [docxSubjectId, setDocxSubjectId] = useState(currentSubjectId || "all");
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

  const updateFilters = (newFilters: {
    teacherId?: string;
    batchId?: string;
    subjectId?: string;
    weekStart?: string;
    tab?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFilters.teacherId !== undefined) {
      if (newFilters.teacherId) params.set("teacherId", newFilters.teacherId);
      else params.delete("teacherId");
    }
    if (newFilters.batchId !== undefined) {
      if (newFilters.batchId) params.set("batchId", newFilters.batchId);
      else params.delete("batchId");
    }
    if (newFilters.subjectId !== undefined) {
      if (newFilters.subjectId) params.set("subjectId", newFilters.subjectId);
      else params.delete("subjectId");
    }
    if (newFilters.weekStart !== undefined) {
      params.set("weekStart", newFilters.weekStart);
    }
    if (newFilters.tab !== undefined) {
      params.set("tab", newFilters.tab);
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleTabChange = (tab: "editor" | "summary" | "reports") => {
    setActiveTab(tab);
    updateFilters({ tab });
  };

  // Quick edit modal helpers
  const handleOpenEdit = (session: WeeklyLogSessionItem) => {
    setEditingSession(session);
    setEditFormData({
      topicCovered: session.topicCovered,
      topicPlanned: session.topicPlanned || session.topicCovered,
      teachingMethod: session.teachingMethod || "",
      assignmentActivity: session.assignmentActivity || "",
      studentsPresent: session.studentsPresent,
      status: session.status,
    });
    setEditError(null);
    setEditSuccess(null);
  };

  const handleCloseEdit = () => {
    setEditingSession(null);
    setEditError(null);
    setEditSuccess(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    setIsSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const res = await quickUpdateSessionAction({
        sessionId: editingSession.id,
        topicCovered: editFormData.topicCovered,
        topicPlanned: editFormData.topicCovered, // Synchronized
        teachingMethod: editFormData.teachingMethod || undefined,
        assignmentActivity: editFormData.assignmentActivity || undefined,
        studentsPresent: editFormData.studentsPresent,
        status: editFormData.status,
      });

      if (!res.success) {
        setEditError(res.error || "Failed to update session");
        setIsSaving(false);
        return;
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSession.id
            ? {
                ...s,
                topicCovered: editFormData.topicCovered,
                topicPlanned: editFormData.topicCovered,
                teachingMethod: editFormData.teachingMethod,
                assignmentActivity: editFormData.assignmentActivity,
                studentsPresent: editFormData.studentsPresent,
                status: editFormData.status,
              }
            : s
        )
      );

      setEditSuccess("Class session log updated successfully!");
      setTimeout(() => {
        handleCloseEdit();
      }, 800);
    } catch (err: any) {
      setEditError(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVerify = async (session: WeeklyLogSessionItem) => {
    const nextStatus = session.status === "verified" ? "submitted" : "verified";
    try {
      const res = await quickToggleVerifyAction(session.id, nextStatus);
      if (res.success) {
        setSessions((prev) =>
          prev.map((s) => (s.id === session.id ? { ...s, status: nextStatus } : s))
        );
      }
    } catch (err) {
      console.error("Failed to toggle verification", err);
    }
  };

  // 1-Click AI DOCX Generation
  const handleOneClickAiDocx = async () => {
    setIsAiGeneratingDocx(true);
    setHubMessage({ type: "info", text: "⚡ AI is professionalizing logs, compiling weekly summary, and preparing your official DOCX..." });

    try {
      const res = await aiOneClickGenerateDocxAction({
        weekStart: currentWeekStart,
        semester: selectedBatch?.currentSemester || 1,
        batchId: currentBatchId,
        subjectId: currentSubjectId,
        teacherId: currentTeacherId || (currentUserRole === "teacher" ? currentUserId : undefined),
      });

      if (!res.success || !res.downloadUrl) {
        setHubMessage({ type: "error", text: res.error || "Failed to generate AI weekly log DOCX." });
        setIsAiGeneratingDocx(false);
        return;
      }

      setHubMessage({ type: "success", text: "✅ Official IIHM Weekly Teaching Log (.docx) generated! Starting download..." });
      
      // Trigger download in browser
      const link = document.createElement("a");
      link.href = res.downloadUrl;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Refresh data
      router.refresh();
    } catch (err: any) {
      setHubMessage({ type: "error", text: err.message || "An unexpected error occurred during AI DOCX generation." });
    } finally {
      setIsAiGeneratingDocx(false);
    }
  };

  // AI Polish Logs Button
  const handleAiPolishLogs = async () => {
    setIsAiPolishing(true);
    setHubMessage({ type: "info", text: "✨ Running AI to enhance and professionalize topics, teaching methods, and student assignments..." });

    try {
      const res = await aiEnrichWeekLogsAction({
        weekStart: currentWeekStart,
        semester: selectedBatch?.currentSemester || 1,
        batchId: currentBatchId,
        subjectId: currentSubjectId,
        teacherId: currentTeacherId || (currentUserRole === "teacher" ? currentUserId : undefined),
      });

      if (!res.success) {
        setHubMessage({ type: "error", text: res.error || "Failed to enrich logs via AI." });
        setIsAiPolishing(false);
        return;
      }

      setHubMessage({ type: "success", text: `✅ ${res.message}` });
      router.refresh();
    } catch (err: any) {
      setHubMessage({ type: "error", text: err.message || "Error enriching logs with AI." });
    } finally {
      setIsAiPolishing(false);
    }
  };

  // AI Generate Weekly Summary (7 Sections)
  const handleAiGenerateSummary = async () => {
    setIsAiSummarizing(true);
    setHubMessage({ type: "info", text: "✨ AI is synthesizing all 7 weekly summary sections from your logged topics..." });

    try {
      const res = await aiGenerateWeekSummaryAction({
        weekStart: currentWeekStart,
        semester: selectedBatch?.currentSemester || 1,
        batchId: currentBatchId,
        subjectId: currentSubjectId,
        teacherId: currentTeacherId || (currentUserRole === "teacher" ? currentUserId : undefined),
      });

      if (!res.success || !res.summary) {
        setHubMessage({ type: "error", text: res.error || "Failed to generate weekly summary." });
        setIsAiSummarizing(false);
        return;
      }

      setSyllabusCoverage(res.summary.syllabusCoverage);
      setPracticalConducted(res.summary.practicalConducted);
      setAssessmentConducted(res.summary.assessmentConducted);
      setSlowLearners(res.summary.slowLearners);
      setRemedialAction(res.summary.remedialAction);
      setAiDigitalTools(res.summary.aiDigitalTools);
      setIndustryExamples(res.summary.industryExamples);

      setHubMessage({ type: "success", text: "✅ AI successfully synthesized the 7-section summary! You can review and adjust any field below." });
    } catch (err: any) {
      setHubMessage({ type: "error", text: err.message || "Error generating summary." });
    } finally {
      setIsAiSummarizing(false);
    }
  };

  // Save 7-Section Summary
  const handleSaveSummary = async (status: "submitted" | "verified") => {
    setIsSavingSummary(true);
    setHubMessage(null);

    if (!syllabusCoverage.trim()) {
      setHubMessage({ type: "error", text: "Section 1 (Syllabus Coverage This Week) is required." });
      setIsSavingSummary(false);
      return;
    }

    try {
      const res = await saveWeeklySummaryAction({
        teacherId: currentTeacherId || currentUserId,
        batchId: currentBatchId,
        subjectId: currentSubjectId,
        weekStart: currentWeekStart,
        syllabusCoverage,
        practicalConducted: practicalConducted || "None conducted.",
        assessmentConducted: assessmentConducted || "Formative evaluation conducted.",
        slowLearners: slowLearners || "None identified.",
        remedialAction: remedialAction || "None needed.",
        aiDigitalTools: aiDigitalTools || "None used.",
        industryExamples: industryExamples || "None discussed.",
        status: status,
      });

      if (!res.success) {
        setHubMessage({ type: "error", text: res.error || "Failed to save weekly summary." });
        setIsSavingSummary(false);
        return;
      }

      setHubMessage({ type: "success", text: `Weekly Summary successfully saved as ${status.toUpperCase()}!` });
      router.refresh();
    } catch (err: any) {
      setHubMessage({ type: "error", text: err.message || "An unexpected error occurred while saving." });
    } finally {
      setIsSavingSummary(false);
    }
  };

  // Filter sessions by search & day
  const filteredSessions = sessions.filter((s) => {
    if (activeDayFilter !== "all" && s.dayName.toLowerCase() !== activeDayFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTopic =
        (s.topicCovered && s.topicCovered.toLowerCase().includes(q)) ||
        (s.topicPlanned && s.topicPlanned.toLowerCase().includes(q));
      const matchSubject = s.subjectName.toLowerCase().includes(q) || (s.subjectCode && s.subjectCode.toLowerCase().includes(q));
      const matchBatch = s.batchName.toLowerCase().includes(q);
      const matchTeacher = s.teacherName.toLowerCase().includes(q);
      const matchMethod = s.teachingMethod && s.teachingMethod.toLowerCase().includes(q);
      const matchActivity = s.assignmentActivity && s.assignmentActivity.toLowerCase().includes(q);
      return matchTopic || matchSubject || matchBatch || matchTeacher || matchMethod || matchActivity;
    }
    return true;

  });

  // Verification metrics
  const totalWeekSessions = sessions.length;
  const verifiedCount = sessions.filter((s) => s.status === "verified").length;
  const pendingCount = sessions.filter((s) => s.status === "submitted").length;
  const verificationPercent = totalWeekSessions > 0 ? Math.round((verifiedCount / totalWeekSessions) * 100) : 0;

  const weekStartDate = parseISO(currentWeekStart);
  const weekStartFormatted = format(weekStartDate, "EEE, MMM d, yyyy");
  const weekEndFormatted = format(addDays(weekStartDate, 5), "EEE, MMM d, yyyy");

  const currentSem = selectedBatch?.currentSemester || 1;
  const officialDocxUrl = `/api/reports/weekly-log?weekStart=${currentWeekStart}&semester=${currentSem}${
    currentTeacherId ? `&teacherId=${currentTeacherId}` : ""
  }`;

  return (
    <div className="space-y-6">
      {/* 1. TOP PREMIUM HERO & AI 1-CLICK BAR */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                Unified Teaching & Compliance Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Sem {selectedBatch?.currentSemester || 1} • {selectedBatch?.name || "All Batches"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Weekly Logs, Summary & Reports
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              One single place for Monday–Saturday class tracking, 7-section weekly summaries, and instant AI-powered IIHM DOCX report generation.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOneClickAiDocx}
              disabled={isAiGeneratingDocx}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isAiGeneratingDocx ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>AI Compiling DOCX...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>⚡ 1-Click AI Generate & Download (.docx)</span>
                </>
              )}
            </button>

            <button
              onClick={handleAiPolishLogs}
              disabled={isAiPolishing || totalWeekSessions === 0}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 backdrop-blur-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isAiPolishing ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-300" />
              )}
              <span>AI Polish Logs</span>
            </button>

            <button
              onClick={() => setShowDocxModal(true)}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600/60 hover:bg-indigo-600 text-white font-semibold text-xs border border-indigo-400/30 transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-indigo-200" />
              <span>Export DOCX</span>
            </button>
          </div>
        </div>

        {/* Global notification banner */}
        {hubMessage && (
          <div
            className={`mt-4 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              hubMessage.type === "success"
                ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-200"
                : hubMessage.type === "error"
                ? "bg-rose-950/80 border border-rose-500/40 text-rose-200"
                : "bg-indigo-950/80 border border-indigo-500/40 text-indigo-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {hubMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : hubMessage.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              )}
              <span>{hubMessage.text}</span>
            </div>
            <button
              onClick={() => setHubMessage(null)}
              className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Week & Verification Status Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Current Week:</span>
            <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-lg border border-white/10">
              {weekStartFormatted} — {weekEndFormatted}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Total Classes:</span>
              <span className="font-bold text-white bg-indigo-500/30 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
                {totalWeekSessions}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Verified:</span>
              <span className="font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {verifiedCount} / {totalWeekSessions} ({verificationPercent}%)
              </span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-semibold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {pendingCount} Pending Sign-Off
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. UNIFIED NAVIGATION TABS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange("editor")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "editor"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>1. Log Register & Quick Editor</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "editor" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {totalWeekSessions} classes
            </span>
          </button>

          <button
            onClick={() => handleTabChange("summary")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "summary"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Weekly Summary (7 Sections)</span>
            {syllabusCoverage ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => handleTabChange("reports")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>3. Reports & Sign-Off Hub</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              DOCX
            </span>
          </button>
        </div>

        {/* Quick Week Prev / Next inside Tab Bar */}
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <button
            onClick={() => navigateWeek("prev")}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateWeek("current")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800"
          >
            Current
          </button>
          <button
            onClick={() => navigateWeek("next")}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. GLOBAL FILTERS BAR (Semester/Batch, Subject, Faculty, Date Picker) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Week Selector Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Teaching Week Starting
            </label>
            <div className="relative">
              <CalendarIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={currentWeekStart}
                onChange={handleDatePick}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Batch / Semester Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Semester & Batch
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <select
                value={currentBatchId}
                onChange={(e) => updateFilters({ batchId: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Batches</option>
                {data.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Sem {b.currentSemester}, {b.academicYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Curriculum Subject
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <select
                value={currentSubjectId}
                onChange={(e) => updateFilters({ subjectId: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

          {/* Faculty In Charge (Admin Filter) or Search */}
          {currentUserRole === "admin" ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Faculty Member
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <select
                  value={currentTeacherId}
                  onChange={(e) => updateFilters({ teacherId: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Faculty</option>
                  {data.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.department ? `(${t.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Quick Search Logs
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search topic, method, activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. TAB CONTENT 1: LOG REGISTER & QUICK EDITOR */}
      {activeTab === "editor" && (
        <div className="space-y-4">
          {/* Day of Week Filter Pills */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {["all", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDayFilter(day)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    activeDayFilter.toLowerCase() === day.toLowerCase()
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {day === "all" ? "All Days" : day.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredSessions.length}</span> session(s)
            </div>
          </div>

          {/* Sessions List / Table */}
          {filteredSessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
              <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Teaching Sessions Logged</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                No classes match the selected date range and filter criteria. Try choosing another week or clearing filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {session.dayName}, {format(parseISO(session.sessionDate), "dd MMM")} ({session.startTime} - {session.endTime})
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {session.subjectCode ? `[${session.subjectCode}] ` : ""}
                        {session.subjectName}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {session.batchName} (Sem {session.semester})
                      </span>

                      {session.teacherName && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          by <span className="font-semibold text-slate-700 dark:text-slate-300">{session.teacherName}</span>
                        </span>
                      )}
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleToggleVerify(session)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                          session.status === "verified"
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                            : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100"
                        }`}
                        title="Click to toggle verification"
                      >
                        {session.status === "verified" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Submitted</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setAttendanceModalSession(session)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{session.studentsPresent}/{session.classStrength} Present</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(session)}
                        className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors"
                        title="Quick Edit Session"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Topic Covered & Planned */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                          Topic Completed (Synchronized)
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                        {session.topicCovered || <span className="text-slate-400 italic">No topic recorded</span>}
                      </p>
                    </div>

                    {/* Teaching Method */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        Teaching Method
                      </span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {session.teachingMethod || (
                          <span className="text-amber-600 dark:text-amber-400 italic">
                            Missing (Click AI Polish or Edit)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Assignment / Activity */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        Assignment / Activity
                      </span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {session.assignmentActivity || (
                          <span className="text-amber-600 dark:text-amber-400 italic">
                            Missing (Click AI Polish or Edit)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT 2: WEEKLY SUMMARY (7 SECTIONS) */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Official IIHM Compliance Report
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Weekly Teaching Summary (7 Official Sections)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Required academic sign-off for <span className="font-bold text-slate-700 dark:text-slate-300">{selectedSubject?.name}</span> • {selectedBatch?.name} (Sem {selectedBatch?.currentSemester})
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAiGenerateSummary}
                  disabled={isAiSummarizing || totalWeekSessions === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {isAiSummarizing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                  <span>✨ AI Generate 7-Section Summary</span>
                </button>
              </div>
            </div>

            {/* The 7 Sections Grid */}
            <div className="space-y-5 text-xs">
              {/* Section 1 */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  1. Syllabus Coverage This Week <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={syllabusCoverage}
                  onChange={(e) => setSyllabusCoverage(e.target.value)}
                  placeholder="Summarize instructional syllabus topics and practical modules delivered this week..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Section 2 */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  2. Practical / Demonstration Conducted
                </label>
                <textarea
                  rows={2}
                  value={practicalConducted}
                  onChange={(e) => setPracticalConducted(e.target.value)}
                  placeholder="Details of laboratory, kitchen, or restaurant workstation demos conducted..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Section 3 */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  3. Assessment / Evaluation Conducted
                </label>
                <textarea
                  rows={2}
                  value={assessmentConducted}
                  onChange={(e) => setAssessmentConducted(e.target.value)}
                  placeholder="Details of quizzes, spot tests, viva, or worksheet evaluations..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Section 4 */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  4. Slow Learners Identified
                </label>
                <textarea
                  rows={2}
                  value={slowLearners}
                  onChange={(e) => setSlowLearners(e.target.value)}
                  placeholder="Observations on students needing additional guidance in concepts or practical drills..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Section 5 */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  5. Remedial Action Planned / Taken
                </label>
                <textarea
                  rows={2}
                  value={remedialAction}
                  onChange={(e) => setRemedialAction(e.target.value)}
                  placeholder="Corrective actions, extra tutorial sessions, revision worksheets, or peer-led mentoring..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Section 6 */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  6. AI / Digital Tools Used
                </label>
                <textarea
                  rows={2}
                  value={aiDigitalTools}
                  onChange={(e) => setAiDigitalTools(e.target.value)}
                  placeholder="Digital audio-visual presentations, interactive quizzes, LMS portals, culinary videos..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Section 7 */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  7. Industry Examples / Case Studies Discussed
                </label>
                <textarea
                  rows={2}
                  value={industryExamples}
                  onChange={(e) => setIndustryExamples(e.target.value)}
                  placeholder="5-star hotel operational protocols, guest handling situations, or hospitality industry scenarios..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                All 7 sections are compiled into the official Word .DOCX report upon export.
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveSummary("submitted")}
                  disabled={isSavingSummary}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSummary("verified")}
                  disabled={isSavingSummary}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  {isSavingSummary ? "Saving..." : "Submit & Finalize Summary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT 3: OFFICIAL REPORTS & SIGN-OFF HUB */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Official DOCX Export Card */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Official Document Generator
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    IIHM Weekly Teaching Log Sheet (.docx)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Strictly formatted according to official IIHM Hyderabad physical templates with signature blocks for Faculty, Program Leader, and Director.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl border border-amber-200 dark:border-amber-800">
                  <FileSpreadsheet className="w-8 h-8 text-amber-600" />
                </div>
              </div>

              {/* Key Specs Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Week Period</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{weekStartFormatted}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Semester / Batch</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Sem {selectedBatch?.currentSemester} • {selectedBatch?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Subject Code</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSubject?.code || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sign-Off Readiness</span>
                  <span
                    className={`font-bold ${
                      verificationPercent === 100 && syllabusCoverage
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {verificationPercent === 100 && syllabusCoverage ? "Ready for Signatures" : "Draft / Incomplete"}
                  </span>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={officialDocxUrl}
                  download
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Official IIHM .DOCX Report</span>
                </a>

                <button
                  onClick={handleOneClickAiDocx}
                  disabled={isAiGeneratingDocx}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>⚡ 1-Click AI Polish & Download</span>
                </button>
              </div>
            </div>

            {/* Right 1 Col: Compliance Checklist Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Pre-Flight Compliance Audit
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  {totalWeekSessions > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Class Sessions</span>
                    <span className="text-slate-500 text-[11px]">
                      {totalWeekSessions > 0 ? `${totalWeekSessions} classes recorded` : "No classes recorded yet"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  {verificationPercent === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Faculty Verification</span>
                    <span className="text-slate-500 text-[11px]">
                      {verifiedCount} of {totalWeekSessions} verified ({verificationPercent}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  {syllabusCoverage ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">7-Section Summary</span>
                    <span className="text-slate-500 text-[11px]">
                      {syllabusCoverage ? "Syllabus coverage completed" : "Summary not yet completed"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400">
                Official signature blocks for Program Leader and Director are appended at the bottom of the Word document automatically.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EDIT MODAL */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Quick Edit Class Session</h3>
                <p className="text-xs text-indigo-100">
                  {editingSession.dayName}, {editingSession.sessionDate} • {editingSession.subjectName}
                </p>
              </div>
              <button onClick={handleCloseEdit} className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                  {editSuccess}
                </div>
              )}

              {/* Topic Covered & Planned */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Topic Covered (Synchronized with Topic Planned)
                </label>
                <textarea
                  rows={2}
                  value={editFormData.topicCovered}
                  onChange={(e) => setEditFormData({ ...editFormData, topicCovered: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Teaching Method */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Teaching Method
                </label>
                <input
                  type="text"
                  value={editFormData.teachingMethod}
                  onChange={(e) => setEditFormData({ ...editFormData, teachingMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {TEACHING_METHOD_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, teachingMethod: m })}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-600 dark:text-slate-400"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignment / Activity */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment / Activity
                </label>
                <input
                  type="text"
                  value={editFormData.assignmentActivity}
                  onChange={(e) => setEditFormData({ ...editFormData, assignmentActivity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {ACTIVITY_PRESETS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, assignmentActivity: a })}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-600 dark:text-slate-400"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verification Status */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Verification Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="submitted">Submitted (Pending Verification)</option>
                  <option value="verified">Verified by Faculty</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                {isSaving ? "Saving..." : "Save Changes"}
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
                <h3 className="text-base font-bold text-white">Export Official IIHM DOCX</h3>
              </div>
              <button onClick={() => setShowDocxModal(false)} className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400">
                Official IIHM Weekly Teaching Log Word Documents (.docx) can be downloaded semester-wise (consolidating all sections A & B and practical groups P1/P2) or by specific section.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Week Starting (Monday)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${weekStartFormatted} (${data.selectedWeekStart})`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Download Format Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocxScope("semester")}
                    className={`px-3 py-2 rounded-xl font-bold border text-left transition-all ${
                      docxScope === "semester"
                        ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-xs font-bold">🏛️ Semester-Wise</div>
                    <div className="text-[10px] font-normal opacity-80">All sections & groups (IIHM Format)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocxScope("batch")}
                    className={`px-3 py-2 rounded-xl font-bold border text-left transition-all ${
                      docxScope === "batch"
                        ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-xs font-bold">📋 Specific Section</div>
                    <div className="text-[10px] font-normal opacity-80">Single section only</div>
                  </button>
                </div>
              </div>

              {docxScope === "semester" ? (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Semester
                  </label>
                  <select
                    value={docxSemester}
                    onChange={(e) => setDocxSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value={1}>Semester 1 (Batch 2026 - Sec A & B, P1-P4)</option>
                    <option value={3}>Semester 3 (Batch 2025 - Sec A & B)</option>
                    <option value={5}>Semester 5 (Batch 2024 - Sec A)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Section / Batch
                  </label>
                  <select
                    value={docxBatchId}
                    onChange={(e) => setDocxBatchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {data.batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Sem {b.currentSemester}, {b.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Subject
                </label>
                <select
                  value={docxSubjectId}
                  onChange={(e) => setDocxSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">🌟 All Subjects (Combined Faculty Teaching Log)</option>
                  {data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `[${s.code}] ` : ""}
                      {s.name} (Sem {s.semester})
                    </option>
                  ))}
                </select>
              </div>
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
                href={`/api/reports/weekly-log?weekStart=${data.selectedWeekStart}${
                  docxScope === "semester"
                    ? `&semester=${docxSemester}${docxSubjectId && docxSubjectId !== "all" ? `&subjectId=${docxSubjectId}` : ""}`
                    : `&batchId=${docxBatchId}${docxSubjectId && docxSubjectId !== "all" ? `&subjectId=${docxSubjectId}` : ""}`
                }${docxTeacherId ? `&teacherId=${docxTeacherId}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowDocxModal(false)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
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
