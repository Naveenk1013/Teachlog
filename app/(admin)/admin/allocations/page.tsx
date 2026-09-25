import { redirect } from "next/navigation";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import {
  getAllTeachingAssignments,
  getAllTeachers,
  getAllSubjects,
  getAllBatches,
} from "@/lib/data/admin";
import { AllocationsClient } from "@/components/admin/allocations-client";

export const metadata = {
  title: "Faculty Teaching Allocations | TeachLog Admin",
};

export default async function AdminAllocationsPage() {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    redirect("/login");
  }

  const [assignments, teachers, subjects, batches] = await Promise.all([
    getAllTeachingAssignments(),
    getAllTeachers(),
    getAllSubjects(),
    getAllBatches(),
  ]);

  return (
    <AllocationsClient
      initialAssignments={assignments}
      teachers={teachers.filter((t) => t.isActive)}
      subjects={subjects}
      batches={batches.filter((b) => b.isActive)}
    />
  );
}
