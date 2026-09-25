import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getWeeklyLogsExplorerData } from "@/lib/data/admin";
import { WeeklyLogsClient } from "@/components/admin/weekly-logs-client";

export const metadata = {
  title: "Weekly Class Logs & Quick Editor | TeachLog Admin",
  description: "View and edit weekly teaching logs, verify CR entries, and export official reports.",
};

interface AdminLogsPageProps {
  searchParams: Promise<{
    teacherId?: string;
    batchId?: string;
    subjectId?: string;
    weekStart?: string;
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

  return (
    <WeeklyLogsClient
      data={data}
      currentUserRole={user.role}
    />
  );
}
