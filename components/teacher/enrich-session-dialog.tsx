"use client";

import { useState, useTransition } from "react";
import { TeacherSessionItem, SyllabusTopicItem } from "@/lib/data/teacher";
import { enrichClassSessionAction } from "@/app/(teacher)/actions";
import {
  X,
  BookOpen,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  Users,
  GraduationCap,
  ClipboardList,
} from "lucide-react";

interface EnrichSessionDialogProps {
  session: TeacherSessionItem;
  availableSyllabusTopics: SyllabusTopicItem[];
  onClose: () => void;
  onSuccess?: () => void;
}

const COMMON_METHODS = [
  "Lecture & Demonstration",
  "Practical Lab",
  "Interactive PPT Presentation",
  "Group Discussion",
  "Case Study & Analysis",
  "Mise-en-place Exercise",
  "Tasting & Sensory Evaluation",
  "Quiz & Formative Review",
];

export function EnrichSessionDialog({
  session,
  availableSyllabusTopics,
  onClose,
  onSuccess,
}: EnrichSessionDialogProps) {
  const [topicPlanned, setTopicPlanned] = useState(
    session.topicPlanned || session.topicCovered || ""
  );
  const [teachingMethod, setTeachingMethod] = useState(
    session.teachingMethod || "Lecture & Demonstration"
  );
  const [assignmentActivity, setAssignmentActivity] = useState(
    session.assignmentActivity || ""
  );
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    session.syllabusTopics.map((t) => t.id)
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggleTopic = (id: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    setError(null);
    if (!topicPlanned.trim()) {
      setError("Please specify the Topic Planned.");
      return;
    }
    if (!teachingMethod.trim()) {
      setError("Please specify the Teaching Method.");
      return;
    }

    startTransition(async () => {
      const res = await enrichClassSessionAction({
        sessionId: session.id,
        topicPlanned: topicPlanned.trim(),
        teachingMethod: teachingMethod.trim(),
        assignmentActivity: assignmentActivity.trim(),
        syllabusTopicIds: selectedTopicIds,
      });

      if (!res.success) {
        setError(res.error || "Failed to update session");
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Enrich Teaching Session
              </h2>
              <p className="text-xs text-indigo-200">
                Align planned curriculum, methodology, and student activities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Session Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {session.sessionDate} • {session.startTime} - {session.endTime}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{session.studentsPresent} students present</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 col-span-2 sm:col-span-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>Logged by {session.crName}</span>
            </div>
          </div>

          {/* CR Logged Topic (Read-Only) */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
              Topic Logged by Class Representative (Actual Coverage)
            </span>
            <p className="text-sm font-medium text-amber-950">
              {session.topicCovered}
            </p>
          </div>

          {/* 1. Topic Planned */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                1. Topic Planned (Official Scheme of Work) *
              </label>
              <button
                type="button"
                onClick={() => setTopicPlanned(session.topicCovered)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
              >
                Copy from CR Log
              </button>
            </div>
            <textarea
              rows={2}
              value={topicPlanned}
              onChange={(e) => setTopicPlanned(e.target.value)}
              placeholder="e.g. Standard Recipe Formulation & Yield Tests..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* 2. Teaching Method */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 block">
              2. Teaching Method *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_METHODS.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setTeachingMethod(m)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    teachingMethod === m
                      ? "bg-indigo-600 text-white border-indigo-600 font-medium shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
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
              placeholder="Custom method if not in chips..."
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* 3. Assignment / Activity */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              3. Assignment / Activity Given (Optional)
            </label>
            <input
              type="text"
              value={assignmentActivity}
              onChange={(e) => setAssignmentActivity(e.target.value)}
              placeholder="e.g. Recipe costing sheet calculation, knife skills evaluation, quiz..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* 4. Syllabus Mapping */}
          {availableSyllabusTopics.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  Link to Subject Syllabus Curriculum Topics
                </label>
                <span className="text-[11px] text-slate-500">
                  {selectedTopicIds.length} selected
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50">
                {availableSyllabusTopics.map((topic) => {
                  const isChecked = selectedTopicIds.includes(topic.id);
                  return (
                    <div
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? "bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium"
                          : "bg-white border border-slate-200/60 text-slate-700 hover:bg-slate-100/70"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-sm flex items-center justify-center mt-0.5 border ${
                          isChecked
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-400 font-mono text-[10px] mr-1.5">
                          {topic.unitNo ? `Unit ${topic.unitNo}` : `Seq ${topic.seq}`}
                        </span>
                        {topic.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ClipboardList className="w-4 h-4" />
                Save Enrichment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
