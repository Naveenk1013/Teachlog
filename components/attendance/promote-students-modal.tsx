"use client";

import { useState, useEffect } from "react";
import {
  previewPromotionAction,
  promoteStudentsAction,
} from "@/app/actions/attendance";
import {
  GraduationCap,
  X,
  AlertTriangle,
  CheckCircle2,
  Users,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

interface PromoteStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: { id: string; name: string; currentSemester: number; academicYear: string }[];
  defaultBatchId?: string;
  onPromotionSuccess?: () => void;
}

export function PromoteStudentsModal({
  isOpen,
  onClose,
  batches,
  defaultBatchId,
  onPromotionSuccess,
}: PromoteStudentsModalProps) {
  const [mode, setMode] = useState<"semester" | "batch">("semester");
  const [sourceSemester, setSourceSemester] = useState<number>(1);
  const [sourceBatchId, setSourceBatchId] = useState<string>(defaultBatchId || batches[0]?.id || "");
  const [targetSemester, setTargetSemester] = useState<number>(2);
  const [isGraduating, setIsGraduating] = useState<boolean>(false);
  const [academicYear, setAcademicYear] = useState<string>("2027-28");
  const [advanceBatch, setAdvanceBatch] = useState<boolean>(true);

  // Preview State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    count: number;
    sectionCounts?: Record<string, number>;
    groupCounts?: Record<string, number>;
    students?: { id: string; rollNumber: string; fullName: string; section: string; practicalGroup: string | null }[];
    batchName?: string;
  } | null>(null);

  // Execution State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Automatically update target semester when source changes
  useEffect(() => {
    if (mode === "semester") {
      if (sourceSemester >= 6) {
        setIsGraduating(true);
        setTargetSemester(6);
      } else {
        setIsGraduating(false);
        setTargetSemester(sourceSemester + 1);
      }
    } else {
      const b = batches.find((x) => x.id === sourceBatchId);
      if (b) {
        if (b.currentSemester >= 6) {
          setIsGraduating(true);
          setTargetSemester(6);
        } else {
          setIsGraduating(false);
          setTargetSemester(b.currentSemester + 1);
        }
      }
    }
  }, [mode, sourceSemester, sourceBatchId, batches]);

  // Fetch Preview whenever inputs change
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setPreviewLoading(true);

    previewPromotionAction({
      mode,
      sourceSemester: mode === "semester" ? sourceSemester : undefined,
      sourceBatchId: mode === "batch" ? sourceBatchId : undefined,
    }).then((res) => {
      if (!mounted) return;
      setPreviewLoading(false);
      if (res.success) {
        setPreviewData({
          count: res.count || 0,
          sectionCounts: res.sectionCounts,
          groupCounts: res.groupCounts,
          students: res.students,
          batchName: res.batchName,
        });
      } else {
        setPreviewData(null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen, mode, sourceSemester, sourceBatchId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResultMessage(null);

    const res = await promoteStudentsAction({
      mode,
      sourceSemester: mode === "semester" ? sourceSemester : undefined,
      sourceBatchId: mode === "batch" ? sourceBatchId : undefined,
      targetSemester: isGraduating ? 7 : targetSemester,
      isGraduating,
      newAcademicYear: academicYear,
      advanceBatch,
    });

    setIsSubmitting(false);

    if (res.success) {
      setResultMessage({ success: true, text: res.message || "Promotion executed successfully!" });
      setTimeout(() => {
        onPromotionSuccess?.();
        onClose();
      }, 1500);
    } else {
      setResultMessage({ success: false, text: res.error || "Failed to promote students." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md text-amber-300">
              <GraduationCap className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Automated Student Semester Promotion
                <span className="text-[10px] bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
                  Admin Only
                </span>
              </h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Bulk promote an entire semester or batch into the next term without manual entry.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Promotion Scope
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("semester")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  mode === "semester"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Entire Semester Roster</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("batch")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  mode === "batch"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Specific Batch / Cohort</span>
              </button>
            </div>
          </div>

          {/* Promotion Source & Target Config */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source Select */}
              {mode === "semester" ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Current Semester (Source)
                  </label>
                  <select
                    value={sourceSemester}
                    onChange={(e) => setSourceSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Source Batch
                  </label>
                  <select
                    value={sourceBatchId}
                    onChange={(e) => setSourceBatchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Sem {b.currentSemester})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Semester */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Destination
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={isGraduating ? "graduated" : targetSemester}
                    onChange={(e) => {
                      if (e.target.value === "graduated") {
                        setIsGraduating(true);
                      } else {
                        setIsGraduating(false);
                        setTargetSemester(Number(e.target.value));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={2}>Semester 2</option>
                    <option value={3}>Semester 3</option>
                    <option value={4}>Semester 4</option>
                    <option value={5}>Semester 5</option>
                    <option value={6}>Semester 6</option>
                    <option value="graduated">🎓 Graduated (Alumni Status)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Academic Year & Advance Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  New Academic Year
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2027-28"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={advanceBatch}
                    onChange={(e) => setAdvanceBatch(e.target.checked)}
                    className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Also update batch cycle / semester</span>
                </label>
              </div>
            </div>
          </div>

          {/* Real-time Preview Banner */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Promotion Impact Preview
              </span>
              {previewLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching roster...
                </span>
              )}
            </div>

            {!previewLoading && previewData && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-white border border-indigo-200 text-indigo-950 font-bold px-3 py-1 rounded-xl text-xs shadow-xs">
                    {previewData.count} Students Eligible
                  </span>
                  <span className="text-xs text-indigo-700 flex items-center gap-1 font-medium">
                    from {mode === "semester" ? `Semester ${sourceSemester}` : previewData.batchName}
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className="font-bold text-indigo-900">
                      {isGraduating ? "Graduated / Alumni" : `Semester ${targetSemester}`}
                    </span>
                  </span>
                </div>

                {/* Section & Group breakdown badges */}
                {previewData.sectionCounts && Object.keys(previewData.sectionCounts).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                    <span className="text-slate-500 font-medium">Rosters:</span>
                    {Object.entries(previewData.sectionCounts).map(([sec, count]) => (
                      <span key={sec} className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700 font-semibold">
                        {sec}: {count}
                      </span>
                    ))}
                    {previewData.groupCounts &&
                      Object.entries(previewData.groupCounts).map(([grp, count]) => (
                        <span key={grp} className="bg-amber-100/70 px-2 py-0.5 rounded-lg border border-amber-200 text-amber-900 font-semibold">
                          Lab {grp}: {count}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            {!previewLoading && (!previewData || previewData.count === 0) && (
              <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                No active students found in the selected semester / batch to promote.
              </p>
            )}
          </div>

          {/* Status Message */}
          {resultMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                resultMessage.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {resultMessage.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{resultMessage.text}</span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !previewData || previewData.count === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Promotion...</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  <span>
                    Confirm &amp; Promote {previewData?.count ? `(${previewData.count} Students)` : ""}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
