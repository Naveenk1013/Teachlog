import { CohortAttendanceOverviewResult } from "@/lib/data/attendance";

function escapeXml(unsafe: any): string {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates structured, compliant XML attendance and examination eligibility report
 */
export function buildAttendanceReportXml(
  data: CohortAttendanceOverviewResult,
  generatedByName?: string
): string {
  const generatedAt = new Date().toISOString();
  const eligibleCount = data.students.filter((s) => s.percentage >= 75).length;
  const shortageCount = data.students.filter((s) => s.percentage < 75).length;

  const sessionElements = (data.sessions || [])
    .map((sess) => {
      const totalRoster = sess.totalRosterCount || 1;
      const pct = Math.round((sess.studentsPresent / totalRoster) * 100);
      return `    <Session id="${escapeXml(sess.id)}" date="${escapeXml(sess.sessionDate)}" startTime="${escapeXml(sess.startTime)}" endTime="${escapeXml(sess.endTime)}" subject="${escapeXml(sess.subjectName)}" faculty="${escapeXml(sess.teacherName)}" studentsPresent="${sess.studentsPresent}" totalRoster="${totalRoster}" attendancePct="${pct}%" status="${escapeXml(sess.status)}" />`;
    })
    .join("\n");

  const studentElements = (data.students || [])
    .map((st) => {
      const eligibility = st.percentage >= 75 ? "ELIGIBLE" : "SHORTAGE";
      return `    <Student rollNumber="${escapeXml(st.rollNumber)}" fullName="${escapeXml(st.fullName)}" section="${escapeXml(st.section)}" practicalGroup="${escapeXml(st.practicalGroup || "None")}" totalClassesHeld="${st.totalClasses}" attendedClasses="${st.attendedClasses}" absentClasses="${st.absentClasses}" lateClasses="${st.lateClasses || 0}" attendancePercentage="${st.percentage}%" examEligibility="${eligibility}" />`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<AttendanceReport generatedAt="${generatedAt}" institution="International Institute of Hotel Management" campus="Hyderabad Campus">
  <Metadata>
    <BatchId>${escapeXml(data.batchId)}</BatchId>
    <BatchName>${escapeXml(data.batchName)}</BatchName>
    <CohortType>${data.isPractical ? "Practical Lab" : "Theory Section"}</CohortType>
    <PracticalGroup>${escapeXml(data.group || "N/A")}</PracticalGroup>
    <Section>${escapeXml(data.section || "N/A")}</Section>
    <TotalSessionsHeld>${data.totalSessionsHeld}</TotalSessionsHeld>
    <TotalStudentsEnrolled>${data.students.length}</TotalStudentsEnrolled>
    <AverageAttendanceRate>${data.averageAttendancePct}%</AverageAttendanceRate>
    <EligibleStudentsCount>${eligibleCount}</EligibleStudentsCount>
    <ShortageAlertsCount>${shortageCount}</ShortageAlertsCount>
    <ExportedBy>${escapeXml(generatedByName || "Academic Office")}</ExportedBy>
  </Metadata>
  <SessionRegister totalSessions="${data.sessions.length}">
${sessionElements}
  </SessionRegister>
  <StudentRoster totalStudents="${data.students.length}">
${studentElements}
  </StudentRoster>
</AttendanceReport>
`;
}
