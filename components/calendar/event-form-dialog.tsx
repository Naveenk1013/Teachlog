"use client";

import { useState, useTransition } from "react";
import { createAcademicEventAction } from "@/app/(teacher)/calendar/actions";
import { EventType } from "@/lib/data/calendar";
import {
  X,
  Calendar,
  Sparkles,
  AlertCircle,
  Save,
  Tag,
  Clock,
  Layers,
} from "lucide-react";

interface EventFormDialogProps {
  initialDate?: string;
  batches?: { id: string; name: string }[];
  onClose: () => void;
  onSuccess?: () => void;
}

const EVENT_TYPES: { type: EventType; label: string; desc: string; color: string }[] = [
  {
    type: "holiday",
    label: "Public / State Holiday",
    desc: "National or Telangana state festival holiday",
    color: "text-red-700 bg-red-50 border-red-200",
  },
  {
    type: "vacation",
    label: "Vacation / Term Break",
    desc: "Multi-day seasonal or semester vacation",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    type: "exam",
    label: "Examination / Evaluation",
    desc: "Practical or theory examination period",
    color: "text-purple-700 bg-purple-50 border-purple-200",
  },
  {
    type: "event",
    label: "Academic / College Event",
    desc: "Exhibition, workshop, guest lecture, competition",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    type: "academic_note",
    label: "Teacher Academic Note",
    desc: "Curriculum milestone or department notice",
    color: "text-indigo-700 bg-indigo-50 border-indigo-200",
  },
];

export function EventFormDialog({
  initialDate,
  batches = [],
  onClose,
  onSuccess,
}: EventFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("holiday");
  const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [isHoliday, setIsHoliday] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleEventTypeChange = (type: EventType) => {
    setEventType(type);
    if (type === "holiday" || type === "vacation") {
      setIsHoliday(true);
    } else {
      setIsHoliday(false);
    }
  };

  const handleSave = () => {
    setError(null);
    if (!title.trim()) {
      setError("Please provide an event or holiday title.");
      return;
    }
    if (endDate < startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    startTransition(async () => {
      const res = await createAcademicEventAction({
        title: title.trim(),
        description: description.trim(),
        eventType,
        startDate,
        endDate,
        isHoliday,
        batchId: selectedBatchId || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to create event");
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Add Academic Event or Holiday</h2>
              <p className="text-xs text-indigo-200">
                Mark holidays, state festivals, vacations, or exams
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

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Event Type Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Event Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.type}
                  onClick={() => handleEventTypeChange(t.type)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    eventType === t.type
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {t.label}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bathukamma / Dussehra Break, Mid-term Theory Exams..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Holiday Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Instruction Suspended (Holiday)
              </span>
              <span className="text-[11px] text-slate-500 block">
                Marking this flags the day as non-teaching in log reports
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isHoliday}
                onChange={(e) => setIsHoliday(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details, circular reference, or faculty instructions..."
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* Cohort Scope */}
          {batches.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Applies To Cohort
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-slate-800 bg-white"
              >
                <option value="">Institute-Wide (All Batches &amp; Faculty)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
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
                <Save className="w-4 h-4" />
                Save Event
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
