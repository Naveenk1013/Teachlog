import { redirect } from "next/navigation";
import { getCurrentCRUser, getCRBatchAndAssignments } from "@/lib/data/cr";
import { AttendanceHubClient } from "@/components/attendance/attendance-hub-client";
import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "Class Attendance Register | CR Portal",
  description: "View and take student attendance for your assigned cohort.",
};

export default async function CRAttendancePage() {
  const user = await getCurrentCRUser();
  if (!user) {
    redirect("/login");
  }

  const { batch } = await getCRBatchAndAssignments(user.id);

  if (!batch) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>No Active Cohort Authorisation</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          You are not currently registered as an active Class Representative for any cohort. Please contact administration.
        </p>
      </div>
    );
  }

  const batches = [
    {
      id: batch.id,
      name: batch.name,
      currentSemester: batch.current_semester,
      academicYear: batch.academic_year,
    },
  ];

  return (
    <div className="space-y-4">
      <AttendanceHubClient
        batches={batches}
        initialBatchId={batch.id}
        currentUserRole="cr"
        currentUserName={user.fullName}
      />
    </div>
  );
}
