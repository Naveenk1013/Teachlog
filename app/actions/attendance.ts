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

