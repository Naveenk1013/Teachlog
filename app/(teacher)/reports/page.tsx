import { redirect } from "next/navigation";

export default async function TeacherReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    assignmentId?: string;
    batchId?: string;
    subjectId?: string;
    weekStart?: string;
  }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  q.set("tab", "reports");
  if (params.batchId) q.set("batchId", params.batchId);
  if (params.subjectId) q.set("subjectId", params.subjectId);
  if (params.weekStart) q.set("weekStart", params.weekStart);
  redirect(`/weekly-logs?${q.toString()}`);
}
