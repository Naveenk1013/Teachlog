import { createAdminClient } from "@/lib/supabase/admin";
import { Student, SessionAttendance, StudentAttendanceRecord, AttendanceStatus } from "@/lib/types/database";

export interface BatchRosterInfo {
  batchId: string;
  batchName: string;
  semester: number;
  academicYear: string;
  isPractical: boolean;
  group: string | null;
  section: string | null;
  students: {
    id: string;
    rollNumber: string;
    fullName: string;
    section: string;
    practicalGroup: string | null;
  }[];
}

/**
 * Parses batch title to determine if it is a Practical Group (P1, P2, P3, P4) or Theory Section (Sec A, Sec B)
 */
export function parseBatchRosterDetails(batchName: string) {
  const groupMatch = batchName.match(/\[(P\d+)\]/i) || batchName.match(/\b(P[1-9]\d*)\b/i);
  const practicalGroup = groupMatch ? groupMatch[1].toUpperCase() : null;

  const secMatch = batchName.match(/Sec(?:tion)?\s+([A-Za-z0-9]+)/i);
  const section = secMatch ? `Sec ${secMatch[1].toUpperCase()}` : null;

  const isPractical = !!practicalGroup;

  return {
    isPractical,
    practicalGroup,
    section,
  };
}

/**
 * Retrieve the exact student roster for a batch based on Theory vs Practical assignment
 */
export async function getStudentsForBatch(batchId: string): Promise<BatchRosterInfo | null> {
  const adminClient = createAdminClient();

  // 1. Get batch details
  const { data: batch, error: batchErr } = await adminClient
    .from("batches")
    .select("id, name, current_semester, academic_year, class_strength")
    .eq("id", batchId)
    .single();

  if (batchErr || !batch) {
    return null;
  }

  const { isPractical, practicalGroup, section } = parseBatchRosterDetails(batch.name);

  // 2. Query students table
  let query = adminClient
    .from("students")
    .select("id, roll_number, full_name, section, practical_group, semester")
    .eq("is_active", true);

  if (isPractical && practicalGroup) {
    // Practical Lab: only students belonging to this specific practical lab group
    query = query.eq("practical_group", practicalGroup);
  } else if (section) {
    // Theory Section: all students in this section (e.g. Sec A includes P1 & P2)
    query = query.eq("section", section);
    if (batch.current_semester) {
      query = query.eq("semester", batch.current_semester);
    }
  } else if (batch.current_semester === 4) {
    // Semester 4 cohort
    query = query.eq("semester", 4);
  } else if (batch.current_semester === 5) {
    // Semester 5 cohort
    query = query.eq("semester", 5);
  } else {
    // Fallback: match by semester
    query = query.eq("semester", batch.current_semester);
  }

  const { data: students, error: studentErr } = await query.order("roll_number", { ascending: true });

  if (studentErr || !students || students.length === 0) {
    // If no direct student records found in table yet, return empty list gracefully
    return {
      batchId: batch.id,
      batchName: batch.name,
      semester: batch.current_semester,
      academicYear: batch.academic_year,
      isPractical,
      group: practicalGroup,
      section,
      students: [],
    };
  }

  return {
    batchId: batch.id,
    batchName: batch.name,
    semester: batch.current_semester,
    academicYear: batch.academic_year,
    isPractical,
    group: practicalGroup,
    section,
    students: students.map((s) => ({
      id: s.id,
      rollNumber: s.roll_number,
      fullName: s.full_name,
      section: s.section,
      practicalGroup: s.practical_group,
    })),
  };
}

/**
 * Fetch recorded attendance for a specific class session
 */
export async function getSessionAttendance(sessionId: string): Promise<StudentAttendanceRecord[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("session_attendance")
    .select(`
      id,
      status,
      remarks,
      student:students (
        id,
        roll_number,
        full_name,
        section,
        practical_group
      )
    `)
    .eq("session_id", sessionId);

  if (error || !data) {
    return [];
  }

  return data
    .filter((row: any) => row.student)
    .map((row: any) => ({
      studentId: row.student.id,
      rollNumber: row.student.roll_number,
      fullName: row.student.full_name,
      section: row.student.section,
      practicalGroup: row.student.practical_group,
      status: row.status as AttendanceStatus,
      remarks: row.remarks,
    }))
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
}

export interface StudentAttendanceSummary {
  studentId: string;
  rollNumber: string;
  fullName: string;
  section: string;
  practicalGroup: string | null;
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  lateClasses: number;
  odClasses: number;
  percentage: number;
}

export interface CohortAttendanceOverviewResult {
  batchId: string;
  batchName: string;
  isPractical: boolean;
  group: string | null;
  section: string | null;
  totalSessionsHeld: number;
  averageAttendancePct: number;
  students: StudentAttendanceSummary[];
  sessions: {
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    subjectName: string;
    teacherName: string;
    studentsPresent: number;
    totalRosterCount: number;
    status: string;
  }[];
}

/**
 * Compute student attendance statistics for a batch
 */
export async function getCohortAttendanceOverview(
  batchId: string
): Promise<CohortAttendanceOverviewResult | null> {
  const adminClient = createAdminClient();

  // 1. Get Roster
  const rosterInfo = await getStudentsForBatch(batchId);
  if (!rosterInfo) return null;

  // 2. Get all sessions for this batch
  const { data: sessionRows } = await adminClient
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      students_present,
      status,
      subjects(name),
      profiles!class_sessions_teacher_id_fkey(full_name)
    `)
    .eq("batch_id", batchId)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  const sessions = (sessionRows || []).map((s: any) => ({
    id: s.id,
    sessionDate: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    subjectName: s.subjects?.name || "General Subject",
    teacherName: s.profiles?.full_name || "Faculty",
    studentsPresent: s.students_present,
    totalRosterCount: rosterInfo.students.length,
    status: s.status,
  }));

  const sessionIds = sessions.map((s) => s.id);

  // 3. Get attendance records for these sessions
  let attendanceMap = new Map<string, { present: number; absent: number; late: number; od: number }>();

  if (sessionIds.length > 0) {
    const { data: attendanceRows } = await adminClient
      .from("session_attendance")
      .select("student_id, status")
      .in("session_id", sessionIds);

    if (attendanceRows) {
      for (const row of attendanceRows) {
        const current = attendanceMap.get(row.student_id) || { present: 0, absent: 0, late: 0, od: 0 };
        if (row.status === "present") current.present += 1;
        else if (row.status === "absent") current.absent += 1;
        else if (row.status === "late") current.late += 1;
        else if (row.status === "od") current.od += 1;
        attendanceMap.set(row.student_id, current);
      }
    }
  }

  const totalSessionsHeld = sessions.length;

  const studentSummaries: StudentAttendanceSummary[] = rosterInfo.students.map((student) => {
    const stats = attendanceMap.get(student.id) || { present: 0, absent: 0, late: 0, od: 0 };
    // If attendance was logged for sessions, use logged count; otherwise if sessions exist without individual records, fallback
    const attended = stats.present + stats.late + stats.od;
    const absent = stats.absent;
    const totalRecorded = attended + absent;
    const effectiveTotal = totalRecorded > 0 ? totalRecorded : totalSessionsHeld;
    const pct = effectiveTotal > 0 ? Math.round((attended / effectiveTotal) * 100) : 100;

    return {
      studentId: student.id,
      rollNumber: student.rollNumber,
      fullName: student.fullName,
      section: student.section,
      practicalGroup: student.practicalGroup,
      totalClasses: effectiveTotal,
      attendedClasses: attended,
      absentClasses: absent,
      lateClasses: stats.late,
      odClasses: stats.od,
      percentage: pct,
    };
  });

  const totalPctSum = studentSummaries.reduce((acc, curr) => acc + curr.percentage, 0);
  const averageAttendancePct = studentSummaries.length > 0
    ? Math.round(totalPctSum / studentSummaries.length)
    : 100;

  return {
    batchId: rosterInfo.batchId,
    batchName: rosterInfo.batchName,
    isPractical: rosterInfo.isPractical,
    group: rosterInfo.group,
    section: rosterInfo.section,
    totalSessionsHeld,
    averageAttendancePct,
    students: studentSummaries,
    sessions,
  };
}

