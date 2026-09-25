import { redirect } from "next/navigation";
import { getCurrentCRUser, getCRBatchAndAssignments } from "@/lib/data/cr";
import { LogClassForm } from "@/components/cr/log-class-form";
import { Calendar, AlertCircle } from "lucide-react";
import { formatDayAndDate } from "@/lib/dates";

export default async function CRLogPage() {
  const user = await getCurrentCRUser();
  if (!user) {
    redirect("/login");
  }

  const { batch, assignments, subjects, teachers } = await getCRBatchAndAssignments(user.id);
  const todayFormatted = formatDayAndDate(new Date());

  if (!batch) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>No Active Batch Authorisation</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          You are not currently registered as an active Class Representative for any batch. Please contact your faculty coordinator or institute administration.
        </p>
      </div>
    );
  }

  if (assignments.length === 0 && subjects.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>No Teaching Assignments Configured</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          No faculty members or subjects are currently assigned to {batch.name}. Please contact your institute administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 rounded-2xl shadow-xs">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
          Daily Log Entry
        </span>
        <h2 className="text-lg font-bold mt-0.5">Record Class Session</h2>
        <p className="text-xs text-indigo-100 mt-1 flex items-center gap-1.5 font-medium">
          <Calendar className="w-3.5 h-3.5 text-indigo-200" />
          {todayFormatted}
        </p>
      </div>

      {/* Interactive Form */}
      <LogClassForm
        batch={batch}
        assignments={assignments}
        subjects={subjects}
        teachers={teachers}
      />
    </div>
  );
}
