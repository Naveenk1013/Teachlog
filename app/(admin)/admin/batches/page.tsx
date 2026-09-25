import { redirect } from "next/navigation";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { getAllBatches, getAllProgrammes } from "@/lib/data/admin";
import { BatchesClient } from "@/components/admin/batches-client";

export const metadata = {
  title: "Student Batches & Cohorts | TeachLog Admin",
};

export default async function AdminBatchesPage() {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    redirect("/login");
  }

  const [batches, programmes] = await Promise.all([
    getAllBatches(),
    getAllProgrammes(),
  ]);

  return <BatchesClient initialBatches={batches} programmes={programmes} />;
}
