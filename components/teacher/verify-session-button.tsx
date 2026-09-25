"use client";

import { useState, useTransition } from "react";
import { verifySessionAction } from "@/app/(teacher)/actions";
import { CheckCircle2 } from "lucide-react";

interface VerifySessionButtonProps {
  sessionId: string;
  isVerified: boolean;
  onSuccess?: () => void;
}

export function VerifySessionButton({
  sessionId,
  isVerified,
  onSuccess,
}: VerifySessionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Verified
      </span>
    );
  }

  const handleVerify = () => {
    setError(null);
    startTransition(async () => {
      const res = await verifySessionAction(sessionId);
      if (!res.success) {
        setError(res.error || "Failed to verify");
      } else {
        onSuccess?.();
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleVerify}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" />
        )}
        <span>Verify</span>
      </button>
      {error && <span className="text-[10px] text-red-600 mt-1">{error}</span>}
    </div>
  );
}
