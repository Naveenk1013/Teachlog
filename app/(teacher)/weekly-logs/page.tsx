import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getWeeklyLogsExplorerData } from "@/lib/data/admin";
import { WeeklyLogsClient } from "@/components/admin/weekly-logs-client";

export const metadata = {
  title: "Weekly Teaching Logs & Quick Editor | Faculty Portal",
  description: "Inspect Monday–Saturday syllabus delivery across your subjects and batches. Quickly update class topics, teaching methods, and student assignments.",
};

interface TeacherWeeklyLogsPageProps {
  searchParams: Promise<{
    teacherId?: string;
    batchId?: string;
    subjectId?: string;
    weekStart?: string;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <WeeklyLogsClient
        data={data}
        currentUserRole={user.role}
      />
    </div>
  );
}
