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

  // Verify ownership
  const { data: session, error: fetchErr } = await adminClient
    .from("class_sessions")
    .select("id, teacher_id, status")
    .eq("id", sessionId)
    .single();

  if (fetchErr || !session) {
    return { success: false, error: "Session not found." };
  }

  if (teacher.role !== "admin" && session.teacher_id !== teacher.id) {
    return { success: false, error: "You can only verify your own sessions." };
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
  revalidatePath("/cr/history");
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

  const query = adminClient
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

  if (teacher.role !== "admin") {
    query.eq("teacher_id", teacher.id);
  }

  const { error } = await query;
  if (error) {
    return { success: false, error: "Failed to verify week's sessions: " + error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/cr/history");
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
