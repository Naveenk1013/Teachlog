"use client";

import { useState, useTransition } from "react";
import { WeeklySummaryItem, TeacherSessionItem } from "@/lib/data/teacher";
import { saveWeeklySummaryAction } from "@/app/(teacher)/actions";
import {
  FileText,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  GraduationCap,
  FlaskConical,
  ClipboardCheck,
  UserX,
  LifeBuoy,
  Cpu,
  Building2,
  Info,
} from "lucide-react";

interface WeeklySummaryFormProps {
  teacherId: string;
  batchId: string;
  subjectId: string;
  weekStartStr: string;
  existingSummary: WeeklySummaryItem | null;
  weeklySessions: TeacherSessionItem[];
  subjectName: string;
  batchName: string;
}

export function WeeklySummaryForm({
  teacherId,
  batchId,
  subjectId,
  weekStartStr,
  existingSummary,
  weeklySessions,
  subjectName,
  batchName,
}: WeeklySummaryFormProps) {
  const [syllabusCoverage, setSyllabusCoverage] = useState(
    existingSummary?.syllabusCoverage || ""
  );
  const [practicalConducted, setPracticalConducted] = useState(
    existingSummary?.practicalConducted || ""
  );
  const [assessmentConducted, setAssessmentConducted] = useState(
    existingSummary?.assessmentConducted || ""
  );
  const [slowLearners, setSlowLearners] = useState(
    existingSummary?.slowLearners || ""
  );
  const [remedialAction, setRemedialAction] = useState(
    existingSummary?.remedialAction || ""
  );
  const [aiDigitalTools, setAiDigitalTools] = useState(
    existingSummary?.aiDigitalTools || ""
  );
  const [industryExamples, setIndustryExamples] = useState(
    existingSummary?.industryExamples || ""
  );

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Auto-fill syllabus coverage from week's sessions
  const handleAutoFillCoverage = () => {
    if (weeklySessions.length === 0) {
      alert("No classes have been logged for this week yet to auto-fill from.");
      return;
    }

    const topicsList = weeklySessions
      .map((s, idx) => {
        const topic = s.topicPlanned || s.topicCovered;
        const method = s.teachingMethod ? ` (${s.teachingMethod})` : "";
        return `• Class ${idx + 1} [${s.sessionDate}]: ${topic}${method}`;
      })
      .join("\n");

    const prefill = syllabusCoverage.trim()
      ? `${syllabusCoverage.trim()}\n\n--- Auto-Generated from Logged Sessions ---\n${topicsList}`
      : topicsList;

    setSyllabusCoverage(prefill);
  };

  const handleSave = (targetStatus: "submitted" | "verified") => {
    setStatusMessage(null);

    if (!syllabusCoverage.trim()) {
      setStatusMessage({
        type: "error",
        text: "Section 1 (Syllabus Coverage This Week) is required.",
      });
      return;
    }

    startTransition(async () => {
      const res = await saveWeeklySummaryAction({
        teacherId,
        batchId,
        subjectId,
        weekStart: weekStartStr,
        syllabusCoverage: syllabusCoverage.trim(),
        practicalConducted: practicalConducted.trim(),
        assessmentConducted: assessmentConducted.trim(),
        slowLearners: slowLearners.trim(),
        remedialAction: remedialAction.trim(),
        aiDigitalTools: aiDigitalTools.trim(),
        industryExamples: industryExamples.trim(),
        status: targetStatus,
      });

      if (!res.success) {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to save weekly summary",
        });
      } else {
        setStatusMessage({
          type: "success",
          text:
            targetStatus === "verified"
              ? "Weekly summary verified and finalized successfully!"
              : "Weekly summary saved successfully!",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner / Instructions */}
      <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            Official IIHM Academic Summary
          </span>
          <h2 className="text-xl font-bold tracking-tight mt-1">
            Weekly Teaching Summary Report
          </h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            {subjectName} • {batchName} • Week starting Monday, {weekStartStr}. This 7-section report is compiled directly into the official institute teaching log.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {existingSummary?.status === "verified" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
              Verified Summary
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-indigo-200 border border-white/15">
              Draft / Editable
            </span>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 text-xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* 7-Section Form Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* Section 1 */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
                1
              </span>
              Syllabus Coverage This Week *
            </label>
            <button
              type="button"
              onClick={handleAutoFillCoverage}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Fill from Week&apos;s Classes ({weeklySessions.length})
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Detail the core topics, theory modules, and syllabus units addressed in this week&apos;s lectures and practicals.
          </p>
          <textarea
            rows={4}
            value={syllabusCoverage}
            onChange={(e) => setSyllabusCoverage(e.target.value)}
            placeholder="e.g. Unit 3: Standard recipe formulation, meat yield percentages, portion costing principles..."
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-900"
          />
        </div>

        {/* Section 2 */}
        <div className="space-y-2 pt-6 border-t border-slate-200">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
              2
            </span>
            <FlaskConical className="w-4 h-4 text-slate-500" />
            Practical / Lab Work Conducted
          </label>
          <p className="text-xs text-slate-500">
            Hands-on culinary labs, front office mock simulations, F&amp;B service setups, or housekeeping demonstrations.
          </p>
          <textarea
            rows={3}
            value={practicalConducted}
            onChange={(e) => setPracticalConducted(e.target.value)}
            placeholder="e.g. Conducted butchery lab on chicken cuts (supreme, drumstick, winglet); mise-en-place test..."
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-900"
          />
        </div>

        {/* Section 3 */}
        <div className="space-y-2 pt-6 border-t border-slate-200">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
              3
            </span>
            <ClipboardCheck className="w-4 h-4 text-slate-500" />
            Assessment / Evaluation Conducted
          </label>
          <p className="text-xs text-slate-500">
            Quizzes, continuous assessment tests, viva voce, recipe cards evaluation, or practical sensory scoring.
          </p>
          <textarea
            rows={3}
            value={assessmentConducted}
            onChange={(e) => setAssessmentConducted(e.target.value)}
            placeholder="e.g. 15-minute formative quiz on kitchen hygiene guidelines; evaluated sensory taste profile of sauce velouté..."
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-900"
          />
        </div>

        {/* Section 4 */}
        <div className="space-y-2 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 font-bold text-xs flex items-center justify-center">
                4
              </span>
              <UserX className="w-4 h-4 text-amber-600" />
              Slow Learners Identified
            </label>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-600" /> Data Privacy Policy
            </span>
          </div>
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Confidentiality requirement:</strong> To safeguard student privacy, identify students by <strong>roll numbers or initials only</strong> (e.g. Roll #14, #29; initials A.P., S.K.). Never record sensitive personal health details.
            </span>
          </div>
          <textarea
            rows={2}
            value={slowLearners}
            onChange={(e) => setSlowLearners(e.target.value)}
            placeholder="e.g. Roll #12, #27 require additional reinforcement in recipe yield conversion arithmetic."
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-900"
          />
        </div>

        {/* Section 5 */}
        <div className="space-y-2 pt-6 border-t border-slate-200">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
              5
            </span>
            <LifeBuoy className="w-4 h-4 text-slate-500" />
            Remedial Action Taken
          </label>
          <p className="text-xs text-slate-500">
            Actions taken to support students who need assistance (peer mentoring, extra lab practice, simplified reference sheets).
          </p>
          <textarea
            rows={3}
            value={remedialAction}
            onChange={(e) => setRemedialAction(e.target.value)}
            placeholder="e.g. Conducted a 20-minute post-class doubt clearing session on butcher's yield calculation; paired students with senior peer mentors."
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-900"
          />
        </div>

        {/* Section 6 */}
        <div className="space-y-2 pt-6 border-t border-slate-200">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
              6
            </span>
            <Cpu className="w-4 h-4 text-slate-500" />
            AI &amp; Digital Tools Utilized
          </label>
          <p className="text-xs text-slate-500">
            Digital aids, LMS portals, GenAI prompts for culinary trends, PMS simulation software, interactive media, or digital quizzes.
          </p>
          <textarea
            rows={2}
            value={aiDigitalTools}
            onChange={(e) => setAiDigitalTools(e.target.value)}
            placeholder="e.g. Demonstrated ChatGPT prompt engineering for seasonal menu ingredient substitution; used Google Forms for instant exit ticket."
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-900"
          />
        </div>

        {/* Section 7 */}
        <div className="space-y-2 pt-6 border-t border-slate-200">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
              7
            </span>
            <Building2 className="w-4 h-4 text-slate-500" />
            Industry Examples / Case Studies Shared
          </label>
          <p className="text-xs text-slate-500">
            Practical hospitality industry scenarios, hotel SOP insights, luxury brand standards, or real-life banquet operations.
          </p>
          <textarea
            rows={3}
            value={industryExamples}
            onChange={(e) => setIndustryExamples(e.target.value)}
            placeholder="e.g. Shared Taj Krishna banqueting kitchen SOP for 500-cover wedding catering; discussed food wastage minimization at Marriott."
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-900"
          />
        </div>

        {/* Actions Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {existingSummary?.submittedOn
              ? `Last saved: ${existingSummary.submittedOn}`
              : "Not yet submitted for this week"}
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSave("submitted")}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Save Draft
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSave("verified")}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Finalize &amp; Verify Summary
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
