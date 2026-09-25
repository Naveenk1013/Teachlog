import { redirect } from "next/navigation";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { getAllSubjects, getAllProgrammes } from "@/lib/data/admin";
import { SubjectsClient } from "@/components/admin/subjects-client";

export const metadata = {
  title: "Curriculum & Subjects | TeachLog Admin",
};

export default async function AdminSubjectsPage() {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    redirect("/login");
  }

  const [subjects, programmes] = await Promise.all([
    getAllSubjects(),
    getAllProgrammes(),
  ]);

  return <SubjectsClient initialSubjects={subjects} programmes={programmes} />;
}
