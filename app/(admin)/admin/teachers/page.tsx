import { redirect } from "next/navigation";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { getAllTeachers } from "@/lib/data/admin";
import { TeachersClient } from "@/components/admin/teachers-client";

export const metadata = {
  title: "Faculty & Teacher Management | TeachLog Admin",
};

export default async function AdminTeachersPage() {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    redirect("/login");
  }

  const teachers = await getAllTeachers();

  return <TeachersClient initialTeachers={teachers} />;
}
