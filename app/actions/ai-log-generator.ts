"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enrichSessionsWithAI,
  generateWeeklySummaryWithAI,
  SessionToEnrich,
} from "@/lib/ai/gemini-log-service";
import { addDays, parseISO, format } from "date-fns";

export async function aiEnrichWeekLogsAction(params: {
  weekStart: string;
  semester?: number | string;
  batchId?: string;
  subjectId?: string;
  teacherId?: string;
}) {
  const currentUser = await getCurrentTeacherUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const targetTeacherId =
    currentUser.role === "admin" && params.teacherId ? params.teacherId : currentUser.id;

  const adminClient = createAdminClient();
  const startDate = parseISO(params.weekStart);
  const endDate = addDays(startDate, 5); // Saturday
  const endStr = format(endDate, "yyyy-MM-dd");

  // Query sessions for this week
  let query = adminClient
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      topic_covered,
      topic_planned,
      teaching_method,
      assignment_activity,
      subjects(name, code, semester),
      batches(name)
    `)
    .gte("session_date", params.weekStart)
    .lte("session_date", endStr);

  if (params.semester) {
    query = query.eq("semester", Number(params.semester));
  } else if (params.batchId && params.batchId !== "all") {
    query = query.eq("batch_id", params.batchId);
  }

  if (params.subjectId && params.subjectId !== "all") {
    query = query.eq("subject_id", params.subjectId);
  }

  if (params.teacherId) {
    query = query.eq("teacher_id", params.teacherId);
  } else if (currentUser.role === "teacher") {
    query = query.eq("teacher_id", currentUser.id);
  }

  const { data: rawSessions, error } = await query;
  if (error || !rawSessions || rawSessions.length === 0) {
    return {
      success: false,
      error: "No class sessions found for the selected week and criteria.",
    };
  }

  const subjectName = (rawSessions[0] as any)?.subjects?.name || "Subject";
  const batchName = (rawSessions[0] as any)?.batches?.name || "Batch";
  const semester = (rawSessions[0] as any)?.subjects?.semester || 1;

  const sessionsToEnrich: SessionToEnrich[] = rawSessions.map((s: any) => ({
    id: s.id,
    sessionDate: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    topicCovered: s.topic_covered,
    topicPlanned: s.topic_planned,
    teachingMethod: s.teaching_method,
    assignmentActivity: s.assignment_activity,
    subjectName: s.subjects?.name || subjectName,
    batchName: s.batches?.name || batchName,
    semester: s.subjects?.semester || semester,
  }));

  // Run AI enrichment
  const enriched = await enrichSessionsWithAI(sessionsToEnrich, subjectName, batchName);

  // Update in database
  for (const item of enriched) {
    await adminClient
      .from("class_sessions")
      .update({
        topic_planned: item.topicPlanned,
        topic_covered: item.topicCovered,
        teaching_method: item.teachingMethod,
        assignment_activity: item.assignmentActivity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
  }

  revalidatePath("/weekly-logs");
  revalidatePath("/summaries");
  revalidatePath("/reports");
  revalidatePath("/dashboard");

  return {
    success: true,
    count: enriched.length,
    message: `Successfully enriched ${enriched.length} session(s) with professional teaching methods and assignments.`,
  };
}

export async function aiGenerateWeekSummaryAction(params: {
  weekStart: string;
  semester?: number | string;
  batchId?: string;
  subjectId?: string;
  teacherId?: string;
}) {
  const currentUser = await getCurrentTeacherUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const targetTeacherId =
    currentUser.role === "admin" && params.teacherId ? params.teacherId : currentUser.id;

  const adminClient = createAdminClient();
  const startDate = parseISO(params.weekStart);
  const endDate = addDays(startDate, 5);
  const endStr = format(endDate, "yyyy-MM-dd");

  let query = adminClient
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      topic_covered,
      topic_planned,
      teaching_method,
      assignment_activity,
      batch_id,
      subject_id,
      subjects(name, code, semester),
      batches(name)
    `)
    .gte("session_date", params.weekStart)
    .lte("session_date", endStr);

  if (params.semester) {
    query = query.eq("semester", Number(params.semester));
  } else if (params.batchId && params.batchId !== "all") {
    query = query.eq("batch_id", params.batchId);
  }

  if (params.subjectId && params.subjectId !== "all") {
    query = query.eq("subject_id", params.subjectId);
  }

  if (params.teacherId) {
    query = query.eq("teacher_id", params.teacherId);
  } else if (currentUser.role === "teacher") {
    query = query.eq("teacher_id", currentUser.id);
  }

  const { data: rawSessions, error } = await query;

  if (error || !rawSessions || rawSessions.length === 0) {
    return {
      success: false,
      error: "No class sessions found to synthesize weekly summary from.",
    };
  }

  const resolvedBatchId =
    params.batchId && params.batchId !== "all"
      ? params.batchId
      : (rawSessions[0] as any)?.batch_id;
  const resolvedSubjectId =
    params.subjectId && params.subjectId !== "all"
      ? params.subjectId
      : (rawSessions[0] as any)?.subject_id;

  const subjectName = (rawSessions[0] as any)?.subjects?.name || "Subject";
  const batchName = (rawSessions[0] as any)?.batches?.name || "Batch";
  const semester = (rawSessions[0] as any)?.subjects?.semester || 1;

  const sessionsToEnrich: SessionToEnrich[] = rawSessions.map((s: any) => ({
    id: s.id,
    sessionDate: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    topicCovered: s.topic_covered,
    topicPlanned: s.topic_planned,
    teachingMethod: s.teaching_method,
    assignmentActivity: s.assignment_activity,
    subjectName: s.subjects?.name || subjectName,
    batchName: s.batches?.name || batchName,
    semester: s.subjects?.semester || semester,
  }));

  const summary = await generateWeeklySummaryWithAI(
    subjectName,
    batchName,
    semester,
    sessionsToEnrich
  );

  // Check if summary row already exists
  let checkExistingQuery = adminClient
    .from("weekly_summaries")
    .select("id")
    .eq("teacher_id", targetTeacherId)
    .eq("week_start", params.weekStart);

  if (resolvedBatchId) {
    checkExistingQuery = checkExistingQuery.eq("batch_id", resolvedBatchId);
  }
  if (resolvedSubjectId) {
    checkExistingQuery = checkExistingQuery.eq("subject_id", resolvedSubjectId);
  }

  const { data: existing } = await checkExistingQuery.maybeSingle();

  if (existing) {
    await adminClient
      .from("weekly_summaries")
      .update({
        syllabus_coverage: summary.syllabusCoverage,
        practical_conducted: summary.practicalConducted,
        assessment_conducted: summary.assessmentConducted,
        slow_learners: summary.slowLearners,
        remedial_action: summary.remedialAction,
        ai_digital_tools: summary.aiDigitalTools,
        industry_examples: summary.industryExamples,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await adminClient.from("weekly_summaries").insert({
      teacher_id: targetTeacherId,
      batch_id: resolvedBatchId,
      subject_id: resolvedSubjectId,
      week_start: params.weekStart,
      syllabus_coverage: summary.syllabusCoverage,
      practical_conducted: summary.practicalConducted,
      assessment_conducted: summary.assessmentConducted,
      slow_learners: summary.slowLearners,
      remedial_action: summary.remedialAction,
      ai_digital_tools: summary.aiDigitalTools,
      industry_examples: summary.industryExamples,
      status: "submitted",
      submitted_on: format(new Date(), "yyyy-MM-dd"),
    });
  }

  revalidatePath("/weekly-logs");
  revalidatePath("/summaries");
  revalidatePath("/reports");

  return {
    success: true,
    summary,
    message: "AI successfully generated and saved the 7-section weekly teaching summary.",
  };
}

/**
 * 1-Click AI Generate & Prepare DOCX
 * Does the entire workflow in one single button press:
 * 1. AI polishes all weekly sessions (aligning topic planned/covered, professionalizing teaching method & activity).
 * 2. AI synthesizes and saves the 7-Section summary if missing or incomplete.
 * 3. Returns the direct URL to stream the official IIHM .docx file.
 */
export async function aiOneClickGenerateDocxAction(params: {
  weekStart: string;
  semester?: number | string;
  batchId?: string;
  subjectId?: string;
  teacherId?: string;
}) {
  const currentUser = await getCurrentTeacherUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const targetTeacherId =
    currentUser.role === "admin" && params.teacherId ? params.teacherId : currentUser.id;

  // Step 1: Polish logs
  await aiEnrichWeekLogsAction({
    weekStart: params.weekStart,
    semester: params.semester,
    batchId: params.batchId,
    subjectId: params.subjectId,
    teacherId: targetTeacherId,
  });

  // Step 2: Ensure 7-section summary is filled
  await aiGenerateWeekSummaryAction({
    weekStart: params.weekStart,
    semester: params.semester,
    batchId: params.batchId,
    subjectId: params.subjectId,
    teacherId: targetTeacherId,
  });

  // Step 3: Return download URL
  const semParam = params.semester ? `&semester=${params.semester}` : "";
  const batchParam =
    params.batchId && params.batchId !== "all" ? `&batchId=${params.batchId}` : "";
  const subParam =
    params.subjectId && params.subjectId !== "all" ? `&subjectId=${params.subjectId}` : "";
  const teacherParam = targetTeacherId ? `&teacherId=${targetTeacherId}` : "";

  const downloadUrl = `/api/reports/weekly-log?weekStart=${params.weekStart}${semParam}${batchParam}${subParam}${teacherParam}`;

  return {
    success: true,
    downloadUrl,
    message: "Weekly Log Sheet and Summary successfully generated via AI! Downloading DOCX...",
  };
}
