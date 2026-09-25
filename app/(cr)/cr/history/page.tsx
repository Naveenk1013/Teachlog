import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCRUser, getCRBatchAndAssignments, getCRRecentSessions } from "@/lib/data/cr";
import { SessionHistoryList } from "@/components/cr/session-history-list";
import { PlusCircle, History, AlertCircle } from "lucide-react";

export default async function CRHistoryPage() {
  const user = await getCurrentCRUser();
  if (!user) {
    redirect("/login");
  }

  const { batch } = await getCRBatchAndAssignments(user.id);

  if (!batch) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>No Active Cohort</span>
        </div>
        <p className="text-xs text-amber-700">
          You are not currently authorized as a Class Representative for an active batch.
        </p>
      </div>
    );
  }

  const sessions = await getCRRecentSessions(batch.id);

  return (
    <div className="space-y-4">
      {/* Header Banner with Add button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
            {batch.name}
          </span>
          <h2 className="text-base font-bold text-slate-900 leading-tight">My Class Entries</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {sessions.length} sessions logged recently
          </p>
        </div>

        <Link
          href="/cr/log"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Class</span>
        </Link>
      </div>

      {/* History List */}
      <SessionHistoryList sessions={sessions} />
    </div>
  );
}
