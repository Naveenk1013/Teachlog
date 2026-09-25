import { redirect } from "next/navigation";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { getAllBatches } from "@/lib/data/admin";
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

  const allBatches = await getAllBatches();

  const formattedBatches = allBatches.map((b) => ({
    id: b.id,
    name: b.name,
    currentSemester: b.currentSemester,
    academicYear: b.academicYear,
  }));

  return (
    <div className="space-y-6">
      <AttendanceHubClient
        batches={formattedBatches}
        currentUserRole="admin"
        currentUserName={admin.fullName}
      />
    </div>
  );
}
