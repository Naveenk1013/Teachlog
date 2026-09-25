import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getCRBatchAndAssignments } from "@/lib/data/cr";
import { getWeeklyLogsExplorerData } from "@/lib/data/admin";
import { WeeklyLogsClient } from "@/components/admin/weekly-logs-client";

export const metadata = {
  title: "Weekly Class Logs & Quick Editor | Student & CR Portal",
  description: "Inspect weekly class logs, monitor syllabus progress, and quick-edit your cohort's class entries.",
};

interface CRWeeklyLogsPageProps {
  searchParams: Promise<{
    teacherId?: string;
    batchId?: string;
    subjectId?: string;
    weekStart?: string;
  }>;
}

export default async function CRWeeklyLogsPage({ searchParams }: CRWeeklyLogsPageProps) {
  const user = await getCurrentAppUser();
  if (!user || user.role !== "cr") {
    redirect("/login");
  }

  const resolvedParams = await searchParams;

  // For CR, default to their authorized batch if not explicitly selecting another
  let defaultBatchId = resolvedParams.batchId;
  if (!defaultBatchId) {
    const { batch } = await getCRBatchAndAssignments(user.id);
    if (batch?.id) {
      defaultBatchId = batch.id;
    }
  }

  const data = await getWeeklyLogsExplorerData({
    teacherId: resolvedParams.teacherId,
    batchId: defaultBatchId,
    subjectId: resolvedParams.subjectId,
    weekStart: resolvedParams.weekStart,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <WeeklyLogsClient
        data={data}
        currentUserRole="cr"
      />
    </div>
  );
}
