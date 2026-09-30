import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getAllBatches, getAllSubjects, getAllTeachers } from "@/lib/data/admin";
import { AttendanceHubClient } from "@/components/attendance/attendance-hub-client";

export const metadata = {
  title: "Attendance Register & Tracking | Faculty Portal",
  description: "Take, inspect, and update student attendance for Theory sections and Practical lab groups.",
};

export default async function TeacherAttendancePage() {
  const user = await getCurrentAppUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "cr") {
    redirect("/cr/attendance");
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <AttendanceHubClient
        batches={formattedBatches}
        subjects={formattedSubjects}
        teachers={formattedTeachers}
        currentUserRole={user.role as "admin" | "teacher"}
        currentUserName={user.fullName}
      />
    </div>
  );
}

