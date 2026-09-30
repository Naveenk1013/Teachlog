import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getWeeklyLogsExplorerData } from "@/lib/data/admin";
import { getWeeklySummary } from "@/lib/data/teacher";
import { UnifiedLogsHub } from "@/components/logs/unified-logs-hub";

export const metadata = {
  title: "Weekly Logs, Summary & Reports Hub | TeachLog Admin",
  description: "Unified administrative hub for class logs, 7-section summaries, and 1-click AI-powered official IIHM DOCX generation.",
};

interface AdminLogsPageProps {
  searchParams: Promise<{
    teacherId?: string;
    batchId?: string;
    subjectId?: string;
    weekStart?: string;
    tab?: "editor" | "summary" | "reports";
  }>;
}

export default async function AdminWeeklyLogsPage({ searchParams }: AdminLogsPageProps) {
  const user = await getCurrentAppUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "cr") {
    redirect("/cr/logs");
  }

  const resolvedParams = await searchParams;

  const data = await getWeeklyLogsExplorerData({
    teacherId: resolvedParams.teacherId,
    batchId: resolvedParams.batchId,
    subjectId: resolvedParams.subjectId,
    weekStart: resolvedParams.weekStart,
  });

  const activeBatchId = resolvedParams.batchId || data.batches[0]?.id || "";
  const activeSubjectId = resolvedParams.subjectId || data.subjects[0]?.id || "";
  const activeTeacherId = resolvedParams.teacherId || data.teachers[0]?.id || "";

  let existingSummary = null;
  if (activeTeacherId && activeBatchId && activeSubjectId) {
    try {
      existingSummary = await getWeeklySummary(
        activeTeacherId,
        activeBatchId,
        activeSubjectId,
        data.selectedWeekStart
      );
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <UnifiedLogsHub
        data={data}
        currentUserRole={user.role}
        currentUserId={user.id}
        initialTab={resolvedParams.tab || "editor"}
        existingSummary={existingSummary}
      />
    </div>
  );
}

