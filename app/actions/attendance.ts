"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAppUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentsForBatch, getSessionAttendance, getCohortAttendanceOverview } from "@/lib/data/attendance";
import { AttendanceStatus } from "@/lib/types/database";

export interface AttendanceEntryInput {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

/**
 * Save or update attendance records for a specific class session
 */
export async function saveSessionAttendanceAction(
  sessionId: string,
  records: AttendanceEntryInput[]
) {
  const user = await getCurrentAppUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  if (!sessionId) {
    return { success: false, error: "Session ID is required." };
  }

  if (!records || records.length === 0) {
    return { success: false, error: "No attendance records provided." };
  }

  const adminClient = createAdminClient();

  // 1. Fetch session to verify permissions & batch link
  const { data: session, error: sessionErr } = await adminClient
    .from("class_sessions")
    .select("id, batch_id, teacher_id, entered_by, students_present")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    return { success: false, error: "Class session not found." };
  }

  // Permission check
  const isAdmin = user.role === "admin";
  const isTeacher = user.role === "teacher";
  const isCR = user.role === "cr";

  if (isCR) {
    // Check if CR is authorized for this batch
    const { data: crAuth } = await adminClient
      .from("cr_authorisations")
      .select("id")
      .eq("cr_id", user.id)
      .eq("batch_id", session.batch_id)
      .is("revoked_at", null)
      .maybeSingle();

    if (!crAuth && session.entered_by !== user.id) {
      return { success: false, error: "Unauthorized. You can only mark attendance for your assigned cohort." };
    }
  } else if (!isAdmin && !isTeacher) {
    return { success: false, error: "Unauthorized. Faculty or administrator privileges required." };
  }

  // 2. Prepare payload for upsert
  const now = new Date().toISOString();
  const upsertRows = records.map((r) => ({
    session_id: sessionId,
    student_id: r.studentId,
    status: r.status,
    remarks: r.remarks?.trim() || null,
    marked_by: user.id,
    marked_at: now,
    updated_by: user.id,
    updated_at: now,
  }));

  const { error: upsertErr } = await adminClient
    .from("session_attendance")
    .upsert(upsertRows, { onConflict: "session_id,student_id" });

  if (upsertErr) {
    return { success: false, error: "Failed to save attendance: " + upsertErr.message };
  }

  // 3. Automatically calculate and synchronize students_present in class_sessions
  const presentCount = records.filter(
    (r) => r.status === "present" || r.status === "late"
  ).length;

  await adminClient
    .from("class_sessions")
    .update({
      students_present: presentCount,
      updated_at: now,
    })
    .eq("id", sessionId);

  // 4. Log in audit_logs
  try {
    await adminClient.from("audit_logs").insert({
      actor_id: user.id,
      action: user.role === "cr" ? "CR_ATTENDANCE_MARKED" : "ATTENDANCE_EDITED",
      entity: "session_attendance",
      entity_id: sessionId,
      new_data: {
        total_students: records.length,
        students_present: presentCount,
        absent_count: records.length - presentCount,
      },
    });
  } catch {
    // Ignore audit log error
  }

  revalidatePath("/cr/log");
  revalidatePath("/cr/history");
  revalidatePath("/cr/logs");
  revalidatePath("/weekly-logs");
  revalidatePath("/admin/logs");
  revalidatePath("/attendance");

  return { success: true, presentCount };
}

/**
 * Fetch roster for a given batch
 */
export async function getBatchRosterAction(batchId: string) {
  const user = await getCurrentAppUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const roster = await getStudentsForBatch(batchId);
  return { success: true, roster };
}

/**
 * Fetch recorded attendance for a session
 */
export async function getSessionAttendanceAction(sessionId: string) {
  const user = await getCurrentAppUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const attendance = await getSessionAttendance(sessionId);
  return { success: true, attendance };
}

/**
 * Fetch cohort attendance overview and student statistics
 */
export async function getCohortAttendanceOverviewAction(batchId: string) {
  const user = await getCurrentAppUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const overview = await getCohortAttendanceOverview(batchId);
  return { success: true, overview };
}

export interface PromotionPreviewInput {
  mode: "semester" | "batch";
  sourceSemester?: number;
  sourceBatchId?: string;
}

export interface PromoteStudentsInput {
  mode: "semester" | "batch";
  sourceSemester?: number;
  sourceBatchId?: string;
  targetSemester: number;
  isGraduating?: boolean;
  newAcademicYear?: string;
  advanceBatch?: boolean;
  targetBatchId?: string;
}

/**
 * Preview how many students and groups will be affected by a promotion
 */
export async function previewPromotionAction(input: PromotionPreviewInput) {
  const user = await getCurrentAppUser();
  if (!user || user.role !== "admin") {
    return { success: false, error: "Administrator authorization required." };
  }

  const adminClient = createAdminClient();

  if (input.mode === "batch" && input.sourceBatchId) {
    const { data: batch } = await adminClient
      .from("batches")
      .select("id, name, current_semester, academic_year")
      .eq("id", input.sourceBatchId)
      .single();

    if (!batch) {
      return { success: false, error: "Selected batch not found." };
    }

    const roster = await getStudentsForBatch(batch.id);
    const students = roster?.students || [];

    return {
      success: true,
      count: students.length,
      batchName: batch.name,
      currentSemester: batch.current_semester,
      academicYear: batch.academic_year,
      students: students.slice(0, 10).map((s) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        fullName: s.fullName,
        section: s.section,
        practicalGroup: s.practicalGroup,
      })),
    };
  }

  // Mode: Semester
  const sourceSem = input.sourceSemester || 1;
  const { data: students, error } = await adminClient
    .from("students")
    .select("id, roll_number, full_name, section, practical_group, semester, academic_year")
    .eq("semester", sourceSem)
    .eq("is_active", true)
    .order("roll_number", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  const studentList = students || [];
  const sectionCounts: Record<string, number> = {};
  const groupCounts: Record<string, number> = {};

  studentList.forEach((s) => {
    sectionCounts[s.section] = (sectionCounts[s.section] || 0) + 1;
    if (s.practical_group) {
      groupCounts[s.practical_group] = (groupCounts[s.practical_group] || 0) + 1;
    }
  });

  return {
    success: true,
    count: studentList.length,
    currentSemester: sourceSem,
    sectionCounts,
    groupCounts,
    students: studentList.slice(0, 10).map((s) => ({
      id: s.id,
      rollNumber: s.roll_number,
      fullName: s.full_name,
      section: s.section,
      practicalGroup: s.practical_group,
    })),
  };
}

/**
 * Promote students from one semester to the next, update batches and academic year
 */
export async function promoteStudentsAction(input: PromoteStudentsInput) {
  const user = await getCurrentAppUser();
  if (!user || user.role !== "admin") {
    return { success: false, error: "Administrator authorization required." };
  }

  const adminClient = createAdminClient();
  const isGraduating = input.isGraduating || input.targetSemester > 6;
  const targetSem = isGraduating ? 6 : Math.min(6, Math.max(1, input.targetSemester));
  const newAcademicYear = input.newAcademicYear?.trim();

  let affectedStudentIds: string[] = [];
  let sourceLabel = "";

  if (input.mode === "batch" && input.sourceBatchId) {
    const { data: batch } = await adminClient
      .from("batches")
      .select("id, name, current_semester, academic_year")
      .eq("id", input.sourceBatchId)
      .single();

    if (!batch) {
      return { success: false, error: "Batch not found." };
    }

    sourceLabel = batch.name;
    const roster = await getStudentsForBatch(batch.id);
    affectedStudentIds = (roster?.students || []).map((s) => s.id);

    if (affectedStudentIds.length === 0) {
      return { success: false, error: "No active students found in this batch to promote." };
    }

    // 1. Update Students
    const studentUpdatePayload: any = {
      semester: targetSem,
      is_active: !isGraduating,
    };
    if (newAcademicYear) {
      studentUpdatePayload.academic_year = newAcademicYear;
    }
    if (input.targetBatchId) {
      studentUpdatePayload.batch_id = input.targetBatchId;
    }

    const { error: studentErr } = await adminClient
      .from("students")
      .update(studentUpdatePayload)
      .in("id", affectedStudentIds);

    if (studentErr) {
      return { success: false, error: "Failed to update students: " + studentErr.message };
    }

    // 2. Advance the batch if requested
    if (input.advanceBatch) {
      const batchUpdatePayload: any = {
        is_active: !isGraduating,
      };
      if (!isGraduating) {
        batchUpdatePayload.current_semester = targetSem;
      }
      if (newAcademicYear) {
        batchUpdatePayload.academic_year = newAcademicYear;
      }

      await adminClient
        .from("batches")
        .update(batchUpdatePayload)
        .eq("id", batch.id);
    }
  } else {
    // Mode: Entire Semester
    const sourceSem = input.sourceSemester || 1;
    sourceLabel = `Semester ${sourceSem}`;

    const { data: students, error: fetchErr } = await adminClient
      .from("students")
      .select("id")
      .eq("semester", sourceSem)
      .eq("is_active", true);

    if (fetchErr || !students || students.length === 0) {
      return { success: false, error: `No active students found in Semester ${sourceSem} to promote.` };
    }

    affectedStudentIds = students.map((s) => s.id);

    // 1. Update students
    const studentUpdatePayload: any = {
      semester: targetSem,
      is_active: !isGraduating,
    };
    if (newAcademicYear) {
      studentUpdatePayload.academic_year = newAcademicYear;
    }
    if (input.targetBatchId) {
      studentUpdatePayload.batch_id = input.targetBatchId;
    }

    const { error: studentErr } = await adminClient
      .from("students")
      .update(studentUpdatePayload)
      .in("id", affectedStudentIds);

    if (studentErr) {
      return { success: false, error: "Failed to update students: " + studentErr.message };
    }

    // 2. Advance any matching batches if requested
    if (input.advanceBatch) {
      const batchUpdatePayload: any = {
        is_active: !isGraduating,
      };
      if (!isGraduating) {
        batchUpdatePayload.current_semester = targetSem;
      }
      if (newAcademicYear) {
        batchUpdatePayload.academic_year = newAcademicYear;
      }

      await adminClient
        .from("batches")
        .update(batchUpdatePayload)
        .eq("current_semester", sourceSem)
        .eq("is_active", true);
    }
  }

  // 3. Record in audit_logs
  try {
    await adminClient.from("audit_logs").insert({
      actor_id: user.id,
      action: isGraduating ? "STUDENTS_GRADUATED" : "STUDENTS_PROMOTED",
      entity: "students",
      entity_id: user.id,
      new_data: {
        mode: input.mode,
        sourceLabel,
        targetSemester: isGraduating ? "Graduated / Alumni" : targetSem,
        studentsCount: affectedStudentIds.length,
        academicYear: newAcademicYear || "Unchanged",
        advanceBatch: !!input.advanceBatch,
      },
    });
  } catch {
    // Ignore audit log error
  }

  revalidatePath("/attendance");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/batches");
  revalidatePath("/cr/attendance");

  const successMessage = isGraduating
    ? `Successfully graduated ${affectedStudentIds.length} students from ${sourceLabel}. Marked as alumni.`
    : `Successfully promoted ${affectedStudentIds.length} students from ${sourceLabel} to Semester ${targetSem}${newAcademicYear ? ` (${newAcademicYear})` : ""}.`;

  return {
    success: true,
    count: affectedStudentIds.length,
    message: successMessage,
  };
}

