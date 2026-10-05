import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enrichSessionsWithAI,
  generateWeeklySummaryWithAI,
  SessionToEnrich,
} from "@/lib/ai/gemini-log-service";
import { addDays, parseISO, format } from "date-fns";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in as faculty or admin." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, weekStart, semester, batchId, subjectId, teacherId } = body;

    if (!weekStart) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: weekStart" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const startDate = parseISO(weekStart);
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
        teacher_id,
        batch_id,
        subject_id,
        semester,
        subjects(name, code, semester),
        batches(name)
      `)
      .gte("session_date", weekStart)
      .lte("session_date", endStr);

    if (batchId && batchId !== "all") {
      query = query.eq("batch_id", batchId);
    } else if (semester) {
      query = query.eq("semester", Number(semester));
    }

    if (subjectId && subjectId !== "all") {
      query = query.eq("subject_id", subjectId);
    }

    // Only filter by teacher_id if explicitly specified or if non-admin teacher
    if (teacherId && teacherId !== "all") {
      query = query.eq("teacher_id", teacherId);
    } else if (user.role === "teacher") {
      query = query.eq("teacher_id", user.id);
    }

    const { data: rawSessions, error } = await query;
    if (error || !rawSessions || rawSessions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No class sessions found for the selected week. Please record or log classes first.",
        },
        { status: 404 }
      );
    }

    const subjectName = (rawSessions[0] as any)?.subjects?.name || "Hospitality Operations";
    const batchName = (rawSessions[0] as any)?.batches?.name || `Semester ${semester || 1}`;
    const resolvedSemester = (rawSessions[0] as any)?.subjects?.semester || semester || 1;
    const resolvedBatchId = batchId && batchId !== "all" ? batchId : (rawSessions[0] as any)?.batch_id;
    const resolvedSubjectId = subjectId && subjectId !== "all" ? subjectId : (rawSessions[0] as any)?.subject_id;
    const targetTeacherId = teacherId || (rawSessions[0] as any)?.teacher_id || user.id;

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
      semester: s.subjects?.semester || resolvedSemester,
    }));

    // ─── ACTION 1: ENRICH LOGS ───────────────────────────────────────────
    if (action === "enrich-logs" || action === "one-click-docx") {
      const enriched = await enrichSessionsWithAI(sessionsToEnrich, subjectName, batchName);

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

      if (action === "enrich-logs") {
        revalidatePath("/weekly-logs");
        revalidatePath("/dashboard");
        return NextResponse.json({
          success: true,
          message: `Successfully enhanced and professionalized ${enriched.length} session logs!`,
        });
      }
    }

    // ─── ACTION 2: GENERATE 7-SECTION SUMMARY ────────────────────────────
    if (action === "generate-summary" || action === "one-click-docx") {
      const summary = await generateWeeklySummaryWithAI(
        subjectName,
        batchName,
        Number(resolvedSemester),
        sessionsToEnrich
      );

      // Check if weekly summary row already exists
      let checkExistingQuery = adminClient
        .from("weekly_summaries")
        .select("id")
        .eq("teacher_id", targetTeacherId)
        .eq("week_start", weekStart);

      if (resolvedBatchId) checkExistingQuery = checkExistingQuery.eq("batch_id", resolvedBatchId);
      if (resolvedSubjectId) checkExistingQuery = checkExistingQuery.eq("subject_id", resolvedSubjectId);

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
          week_start: weekStart,
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

      if (action === "generate-summary") {
        revalidatePath("/weekly-logs");
        revalidatePath("/summaries");
        return NextResponse.json({
          success: true,
          summary,
          message: "AI successfully generated and saved the 7-section weekly teaching summary.",
        });
      }
    }

    // ─── ACTION 3: 1-CLICK DOCX DOWNLOAD URL ─────────────────────────────
    if (action === "one-click-docx") {
      const semParam = semester ? `&semester=${semester}` : "";
      const batchParam = batchId && batchId !== "all" ? `&batchId=${batchId}` : "";
      const subParam = subjectId && subjectId !== "all" ? `&subjectId=${subjectId}` : "";
      const teacherParam = targetTeacherId ? `&teacherId=${targetTeacherId}` : "";

      const downloadUrl = `/api/reports/weekly-log?weekStart=${weekStart}${semParam}${batchParam}${subParam}${teacherParam}`;

      revalidatePath("/weekly-logs");
      revalidatePath("/summaries");
      revalidatePath("/reports");

      return NextResponse.json({
        success: true,
        downloadUrl,
        message: "Weekly Log Sheet and Summary successfully generated via AI! Downloading DOCX...",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action specified." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
