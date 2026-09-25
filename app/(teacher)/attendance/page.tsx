import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getAllBatches } from "@/lib/data/admin";
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

  const allBatches = await getAllBatches();

  const formattedBatches = allBatches.map((b) => ({
    id: b.id,
    name: b.name,
    currentSemester: b.currentSemester,
    academicYear: b.academicYear,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <AttendanceHubClient
        batches={formattedBatches}
        currentUserRole={user.role as "admin" | "teacher"}
        currentUserName={user.fullName}
      />
    </div>
  );
}
