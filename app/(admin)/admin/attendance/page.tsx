import { redirect } from "next/navigation";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { getAllBatches, getAllSubjects, getAllTeachers } from "@/lib/data/admin";
import { AttendanceHubClient } from "@/components/attendance/attendance-hub-client";

export const metadata = {
  title: "Attendance Tracking & Registers | TeachLog Admin",
  description: "Monitor institute-wide student attendance, theory and practical rosters, and eligibility alerts.",
};

export default async function AdminAttendancePage() {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    redirect("/dashboard");
  }

  const [allBatches, allSubjects, allTeachers] = await Promise.all([
    getAllBatches(),
    getAllSubjects(),
    getAllTeachers(),
  ]);

  const formattedBatches = allBatches.map((b) => ({
    id: b.id,
    name: b.name,
    currentSemester: b.currentSemester,
    academicYear: b.academicYear,
    intakeYear: b.intakeYear,
  }));

  const formattedSubjects = allSubjects.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    semester: s.semester,
  }));

  const formattedTeachers = allTeachers.map((t) => ({
    id: t.id,
    name: t.fullName,
    department: t.department,
  }));

  return (
    <div className="space-y-6">
      <AttendanceHubClient
        batches={formattedBatches}
        subjects={formattedSubjects}
        teachers={formattedTeachers}
        currentUserRole="admin"
        currentUserName={admin.fullName}
      />
    </div>
  );
}

