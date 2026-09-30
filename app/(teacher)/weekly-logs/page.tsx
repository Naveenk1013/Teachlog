import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getWeeklyLogsExplorerData } from "@/lib/data/admin";
import { getWeeklySummary } from "@/lib/data/teacher";
import { UnifiedLogsHub } from "@/components/logs/unified-logs-hub";

export const metadata = {
  title: "Weekly Logs, Summary & Reports Hub | Faculty Portal",
  description: "Unified hub for Monday–Saturday teaching logs, 7-section summaries, and 1-click AI-powered official IIHM DOCX generation.",
};

interface TeacherWeeklyLogsPageProps {
  searchParams: Promise<{
    teacherId?: string;
    batchId?: string;
    subjectId?: string;
    weekStart?: string;
    tab?: "editor" | "summary" | "reports";
  }>;
}

export default async function TeacherWeeklyLogsPage({ searchParams }: TeacherWeeklyLogsPageProps) {
  const user = await getCurrentAppUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "cr") {
    redirect("/cr/logs");
  }

  const resolvedParams = await searchParams;

  // For faculty, default to their own teacherId if not explicitly browsing others or "all"
  const defaultTeacherId = resolvedParams.teacherId !== undefined ? resolvedParams.teacherId : (user.role === "teacher" ? user.id : undefined);

  const data = await getWeeklyLogsExplorerData({
    teacherId: defaultTeacherId,
    batchId: resolvedParams.batchId,
    subjectId: resolvedParams.subjectId,
    weekStart: resolvedParams.weekStart,
  });

  const activeBatchId = resolvedParams.batchId || data.batches[0]?.id || "";
  const activeSubjectId = resolvedParams.subjectId || data.subjects[0]?.id || "";

  let existingSummary = null;
  if (defaultTeacherId && activeBatchId && activeSubjectId) {
    try {
      existingSummary = await getWeeklySummary(
        defaultTeacherId,
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

