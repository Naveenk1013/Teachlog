"use client";

import { useState, useTransition } from "react";
import { verifyAllWeekSessionsAction } from "@/app/(teacher)/actions";
import { CheckCheck } from "lucide-react";

interface VerifyAllButtonProps {
  batchId: string;
  subjectId: string;
  weekStartStr: string;
  pendingCount: number;
}

export function VerifyAllButton({
  batchId,
  subjectId,
  weekStartStr,
  pendingCount,
}: VerifyAllButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (pendingCount === 0) {
    return null;
  }

  const handleVerifyAll = () => {
    if (!confirm(`Are you sure you want to verify all ${pendingCount} pending sessions for this week?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await verifyAllWeekSessionsAction(batchId, subjectId, weekStartStr);
      if (!res.success) {
        setError(res.error || "Failed to verify sessions");
      }
    });
  };

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleVerifyAll}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <CheckCheck className="w-4 h-4" />
        )}
        <span>Verify All Week ({pendingCount})</span>
      </button>
      {error && <span className="text-[10px] text-red-600 mt-1">{error}</span>}
    </div>
  );
}
