"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import {
  enrichSessionSchema,
  weeklySummarySchema,
  EnrichSessionInput,
  WeeklySummaryInput,
} from "@/lib/validation/teacher";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, format, parseISO } from "date-fns";

export async function enrichClassSessionAction(input: EnrichSessionInput) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return { success: false, error: "Unauthorized. Please sign in as faculty." };
  }

  const validation = enrichSessionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const { sessionId, topicPlanned, teachingMethod, assignmentActivity, syllabusTopicIds } =
    validation.data;
  const adminClient = createAdminClient();

  // Verify that the session belongs to this teacher (or user is admin)
  const { data: session, error: fetchErr } = await adminClient
    .from("class_sessions")
    .select("id, teacher_id")
    .eq("id", sessionId)
    .single();

  if (fetchErr || !session) {
    return { success: false, error: "Session not found." };
  }

  if (teacher.role !== "admin" && session.teacher_id !== teacher.id) {
    return { success: false, error: "You can only enrich sessions assigned to you." };
  }

  // 1. Update class_sessions
  const { error: updateErr } = await adminClient
    .from("class_sessions")
    .update({
      topic_planned: topicPlanned,
      topic_covered: topicPlanned, // Topic Planned and Covered topic must be identical
      teaching_method: teachingMethod,
      assignment_activity: assignmentActivity || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateErr) {
    return { success: false, error: "Failed to update session details: " + updateErr.message };
  }

  // 2. Sync syllabus topics
  // Remove existing
  await adminClient.from("session_syllabus_topics").delete().eq("session_id", sessionId);

  // Insert newly selected
  if (syllabusTopicIds && syllabusTopicIds.length > 0) {
    const rows = syllabusTopicIds.map((topicId) => ({
      session_id: sessionId,
      syllabus_topic_id: topicId,
    }));
    const { error: linkErr } = await adminClient.from("session_syllabus_topics").insert(rows);
    if (linkErr) {
      return { success: false, error: "Session saved, but failed to link syllabus topics: " + linkErr.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/summaries");
  return { success: true };
}

export async function verifySessionAction(sessionId: string) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return { success: false, error: "Unauthorized. Please sign in as faculty." };
  }

  const adminClient = createAdminClient();

  // Verify session exists
  const { data: session, error: fetchErr } = await adminClient
    .from("class_sessions")
    .select("id, teacher_id, status")
    .eq("id", sessionId)
    .single();

  if (fetchErr || !session) {
    return { success: false, error: "Session not found." };
  }

  const { error: updateErr } = await adminClient
    .from("class_sessions")
    .update({
      status: "verified",
      verified_by: teacher.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateErr) {
    return { success: false, error: "Failed to verify session: " + updateErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/weekly-logs");
  revalidatePath("/reports");
  revalidatePath("/summaries");
  revalidatePath("/calendar");
  revalidatePath("/cr/history");
  revalidatePath("/cr/logs");
  return { success: true };
}

export async function verifyAllWeekSessionsAction(batchId: string, subjectId: string, weekStartStr: string) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return { success: false, error: "Unauthorized. Please sign in as faculty." };
  }

  const adminClient = createAdminClient();
  const startDate = parseISO(weekStartStr);
  const endDate = addDays(startDate, 5); // Saturday
  const endStr = format(endDate, "yyyy-MM-dd");

  const { error } = await adminClient
    .from("class_sessions")
    .update({
      status: "verified",
      verified_by: teacher.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("batch_id", batchId)
    .eq("subject_id", subjectId)
    .gte("session_date", weekStartStr)
    .lte("session_date", endStr)
    .eq("status", "submitted");

  if (error) {
    return { success: false, error: "Failed to verify week's sessions: " + error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/weekly-logs");
  revalidatePath("/reports");
  revalidatePath("/summaries");
  revalidatePath("/calendar");
  revalidatePath("/cr/history");
  revalidatePath("/cr/logs");
  return { success: true };
}

export async function saveWeeklySummaryAction(input: WeeklySummaryInput) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return { success: false, error: "Unauthorized. Please sign in as faculty." };
  }

  const validation = weeklySummarySchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const data = validation.data;
  const adminClient = createAdminClient();

  // Enforce faculty ownership: non-admin teachers can only save their own summaries
  if (teacher.role !== "admin" && data.teacherId !== teacher.id) {
    return { success: false, error: "You can only save your own weekly summary." };
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { error } = await adminClient
    .from("weekly_summaries")
    .upsert(
      {
        teacher_id: data.teacherId,
        subject_id: data.subjectId,
        batch_id: data.batchId,
        week_start: data.weekStart,
        syllabus_coverage: data.syllabusCoverage,
        practical_conducted: data.practicalConducted || null,
        assessment_conducted: data.assessmentConducted || null,
        slow_learners: data.slowLearners || null,
        remedial_action: data.remedialAction || null,
        ai_digital_tools: data.aiDigitalTools || null,
        industry_examples: data.industryExamples || null,
        status: data.status,
        submitted_on: todayStr,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "teacher_id,subject_id,batch_id,week_start",
      }
    );

  if (error) {
    return { success: false, error: "Failed to save weekly summary: " + error.message };
  }

  revalidatePath("/summaries");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function teacherCreateClassSessionAction(params: {
  batchId: string;
  subjectId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topicPlanned: string;
  topicCovered?: string;
  teachingMethod?: string;
  assignmentActivity?: string;
  studentsPresent: number;
  teacherId?: string;
}) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return { success: false, error: "Unauthorized. Please sign in as faculty." };
  }

  const targetTeacherId =
    teacher.role === "admin" && params.teacherId ? params.teacherId : teacher.id;

  if (!params.batchId || !params.subjectId || !params.sessionDate || !params.startTime || !params.endTime) {
    return { success: false, error: "Please fill in all required class session fields." };
  }

  const topicText = params.topicCovered?.trim() || params.topicPlanned?.trim();
  if (!topicText) {
    return { success: false, error: "Topic title is required." };
  }

  const adminClient = createAdminClient();

  // 1. Fetch batch details
  const { data: batch, error: batchErr } = await adminClient
    .from("batches")
    .select("current_semester, academic_year, class_strength, name")
    .eq("id", params.batchId)
    .single();

  if (batchErr || !batch) {
    return { success: false, error: "Selected batch not found." };
  }

  // 2. Insert into class_sessions
  const startTimeFormatted = params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime;
  const endTimeFormatted = params.endTime.length === 5 ? `${params.endTime}:00` : params.endTime;

  const { data: insertedSession, error: insertErr } = await adminClient
    .from("class_sessions")
    .insert({
      batch_id: params.batchId,
      subject_id: params.subjectId,
      teacher_id: targetTeacherId,
      session_date: params.sessionDate,
      start_time: startTimeFormatted,
      end_time: endTimeFormatted,
      topic_planned: params.topicPlanned?.trim() || topicText,
      topic_covered: topicText,
      teaching_method: params.teachingMethod?.trim() || "Interactive Lecture with PPT & Visual Aids",
      assignment_activity: params.assignmentActivity?.trim() || null,
      students_present: params.studentsPresent ?? batch.class_strength,
      status: "verified",
      verified_at: new Date().toISOString(),
      semester: batch.current_semester || 1,
      academic_year: batch.academic_year || "2026-27",
      entered_by: teacher.id,
    })
    .select("id")
    .single();

  if (insertErr || !insertedSession) {
    return { success: false, error: "Failed to record session: " + insertErr?.message };
  }

  // 3. Optional: Sync default student attendance for this session if students exist
  try {
    const { data: students } = await adminClient
      .from("students")
      .select("id")
      .eq("batch_id", params.batchId);

    if (students && students.length > 0) {
      const attendanceRows = students.map((st) => ({
        session_id: insertedSession.id,
        student_id: st.id,
        status: "present",
      }));
      await adminClient.from("attendance_records").insert(attendanceRows);
    }
  } catch {
    // Non-blocking
  }

  revalidatePath("/weekly-logs");
  revalidatePath("/dashboard");
  revalidatePath("/admin/logs");
  revalidatePath("/cr/history");
  revalidatePath("/attendance");

  return {
    success: true,
    sessionId: insertedSession.id,
    message: "Class session successfully recorded and verified by faculty!",
  };
}

