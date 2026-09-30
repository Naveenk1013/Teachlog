"use client";

import { useState, useEffect } from "react";
import { CohortAttendanceOverviewResult } from "@/lib/data/attendance";
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Download,
  AlertTriangle,
  TrendingUp,
  Smartphone,
} from "lucide-react";

interface ShareAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview: CohortAttendanceOverviewResult;
  batchId: string;
  currentUserName?: string;
}

export function ShareAttendanceModal({
  isOpen,
  onClose,
  overview,
  batchId,
  currentUserName,
}: ShareAttendanceModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareMode, setShareMode] = useState<"summary" | "shortage">("summary");
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(!!navigator.share);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const eligibleCount = overview.students.filter((s) => s.percentage >= 75).length;
  const borderlineCount = overview.students.filter(
    (s) => s.percentage >= 65 && s.percentage < 75
  ).length;
  const criticalCount = overview.students.filter((s) => s.percentage < 65).length;
  const shortageStudents = overview.students
    .filter((s) => s.percentage < 75)
    .sort((a, b) => a.percentage - b.percentage);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const buildSummaryText = () => {
    const lines: string[] = [];
    lines.push(`📋 *IIHM Hyderabad – Attendance Update*`);
    lines.push(`🎓 Cohort: *${overview.batchName}*`);
    lines.push(`📅 As of: ${dateStr}`);
    lines.push(`👤 Shared by: ${currentUserName || "Class Representative"}`);
    lines.push(``);
    lines.push(`📊 *Attendance Summary*`);
    lines.push(`• Total Classes Held: ${overview.totalSessionsHeld}`);
    lines.push(`• Class Average: ${overview.averageAttendancePct}%`);
    lines.push(`• Total Students: ${overview.students.length}`);
    lines.push(`• ✅ Eligible (≥75%): ${eligibleCount}`);
    lines.push(`• ⚠️ Borderline (65–74%): ${borderlineCount}`);
    lines.push(`• ❌ Critical Shortage (<65%): ${criticalCount}`);
    if (shortageStudents.length > 0) {
      lines.push(``);
      lines.push(`⚠️ *Students with Attendance Shortage (<75%)*`);
      shortageStudents.forEach((s, i) => {
        const emoji = s.percentage < 65 ? "❌" : "⚠️";
        lines.push(
          `${i + 1}. ${emoji} ${s.fullName} (${s.rollNumber}) — ${s.percentage}% (${s.attendedClasses}/${s.totalClasses})`
        );
      });
    }
    lines.push(``);
    lines.push(`_This report was generated via IIHM TeachLog System._`);
    return lines.join("\n");
  };

  const buildShortageText = () => {
    const lines: string[] = [];
    lines.push(`⚠️ *IIHM Hyderabad – Attendance Shortage Alert*`);
    lines.push(`🎓 Cohort: *${overview.batchName}*`);
    lines.push(`📅 ${dateStr} | Shared by: ${currentUserName || "CR"}`);
    lines.push(``);
    if (shortageStudents.length === 0) {
      lines.push(`✅ Great news! All students have ≥75% attendance. No shortage alerts.`);
    } else {
      lines.push(
        `The following *${shortageStudents.length} students* have attendance below 75% and may be *barred from exams* if not improved:`
      );
      lines.push(``);
      shortageStudents.forEach((s, i) => {
        const emoji = s.percentage < 65 ? "❌" : "⚠️";
        const needed = Math.max(
          0,
          Math.ceil((0.75 * (s.totalClasses + 1) - s.attendedClasses) / 0.25)
        );
        lines.push(`${i + 1}. ${emoji} *${s.fullName}* (${s.rollNumber})`);
        lines.push(`   → ${s.percentage}% (${s.attendedClasses}/${s.totalClasses} classes)`);
        if (needed > 0) {
          lines.push(`   → Must attend next *${needed} consecutive classes* to reach 75%`);
        }
      });
    }
    lines.push(``);
    lines.push(`_IIHM TeachLog – Academic Monitoring System_`);
    return lines.join("\n");
  };

  const textToShare = shareMode === "summary" ? buildSummaryText() : buildShortageText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToShare);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = textToShare;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(textToShare)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(
      `IIHM Attendance Update – ${overview.batchName} – ${dateStr}`
    );
    window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(textToShare)}`, "_blank");
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `IIHM Attendance – ${overview.batchName}`,
        text: textToShare,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50">
              <Share2 className="w-4 h-4 text-indigo-600" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Share Attendance</h2>
              <p className="text-[11px] text-slate-500">{overview.batchName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100">
          <div className="text-center py-3">
            <p className="text-lg font-bold text-emerald-600">{eligibleCount}</p>
            <p className="text-[10px] text-slate-500 font-medium">✅ Eligible</p>
          </div>
          <div className="text-center py-3">
            <p className="text-lg font-bold text-amber-600">{borderlineCount}</p>
            <p className="text-[10px] text-slate-500 font-medium">⚠️ Borderline</p>
          </div>
          <div className="text-center py-3">
            <p className="text-lg font-bold text-red-600">{criticalCount}</p>
            <p className="text-[10px] text-slate-500 font-medium">❌ Critical</p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Mode Toggle */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Message Type
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShareMode("summary")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  shareMode === "summary"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Full Summary
              </button>
              <button
                type="button"
                onClick={() => setShareMode("shortage")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  shareMode === "shortage"
                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Shortage Alert
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Preview
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 max-h-36 overflow-y-auto">
              <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {textToShare}
              </pre>
            </div>
          </div>

          {/* Share Actions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Share Via
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-green-600 shrink-0" />
                <div className="text-left">
                  <span className="block font-bold">WhatsApp</span>
                  <span className="text-[10px] text-green-600 font-normal">Class group</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleEmail}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold transition-colors"
              >
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-left">
                  <span className="block font-bold">Email</span>
                  <span className="text-[10px] text-blue-600 font-normal">Send to students</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  copied
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <div className="text-left">
                  <span className="block font-bold">{copied ? "Copied!" : "Copy Text"}</span>
                  <span
                    className={`text-[10px] font-normal ${
                      copied ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {copied ? "Ready to paste" : "To clipboard"}
                  </span>
                </div>
              </button>

              {canNativeShare ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-semibold transition-colors"
                >
                  <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="text-left">
                    <span className="block font-bold">More Apps</span>
                    <span className="text-[10px] text-purple-600 font-normal">Share sheet</span>
                  </div>
                </button>
              ) : (
                <a
                  href={`/api/reports/attendance?batchId=${batchId}&format=csv`}
                  download
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="text-left">
                    <span className="block font-bold">Download CSV</span>
                    <span className="text-[10px] text-amber-600 font-normal">Full register</span>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1">
          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            Only names, roll numbers &amp; percentages are shared — no sensitive personal data.
          </p>
        </div>
      </div>
    </div>
  );
}
