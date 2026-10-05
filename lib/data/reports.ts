import { createAdminClient } from "@/lib/supabase/admin";
import { format, addDays, parseISO, parse } from "date-fns";
import { WeeklyReportData, ReportSessionData, ReportSummaryData } from "@/lib/reports/weekly-log";
import {
  generateAcademicSessionEnrichment,
  generateAcademicSummary,
  SessionToEnrich,
} from "@/lib/ai/gemini-log-service";

export interface GetWeeklyReportParams {
  teacherId: string;
  semester?: number | string;
  batchId?: string;
  subjectId?: string;
  weekStartStr: string;
}

function formatTimeToAMPM(timeStr: string): string {
  if (!timeStr) return "";
  const clean = timeStr.slice(0, 5);
  try {
    const d = parse(clean, "HH:mm", new Date());
    return format(d, "hh:mm a");
  } catch {
    return clean;
  }
}

/**
 * Fetch report data supporting both Semester-Wise and Batch-Specific downloads.
 * If semester is provided (or batchId is omitted), fetches all sessions taught by the faculty
 * across all sections (Sec A, Sec B) and practical groups (P1, P2, P3, P4) for that semester.
 */
export async function getWeeklyReportData(
  teacherIdOrParams: string | GetWeeklyReportParams,
  legacySubjectId?: string,
  legacyBatchId?: string,
  legacyWeekStartStr?: string
): Promise<WeeklyReportData | null> {
  const params: GetWeeklyReportParams =
    typeof teacherIdOrParams === "object"
      ? teacherIdOrParams
      : {
          teacherId: teacherIdOrParams,
          subjectId: legacySubjectId,
          batchId: legacyBatchId,
          weekStartStr: legacyWeekStartStr || format(new Date(), "yyyy-MM-dd"),
        };

  const adminClient = createAdminClient();
  const startDate = parseISO(params.weekStartStr);
  const endDate = addDays(startDate, 5); // Saturday
  const endStr = format(endDate, "yyyy-MM-dd");

  // 1. Fetch Teacher Profile
  const { data: teacher, error: teachErr } = await adminClient
    .from("profiles")
    .select("full_name, department, role")
    .eq("id", params.teacherId)
    .single();

  if (teachErr || !teacher) return null;

  // 2. Resolve Semester & Batches
  let semesterNum: number = params.semester ? Number(params.semester) : 1;
  let batchNameDisplay = `Semester ${semesterNum} (Sec A, Sec B, P1–P4)`;
  let academicYearDisplay = "2026-27";
  let programmeNameDisplay = "B.Sc. in Hospitality & Hotel Administration";

  if (params.batchId && params.batchId !== "all") {
    const { data: batch } = await adminClient
      .from("batches")
      .select("name, current_semester, academic_year, programmes(name)")
      .eq("id", params.batchId)
      .maybeSingle();

    if (batch) {
      semesterNum = batch.current_semester || semesterNum;
      academicYearDisplay = batch.academic_year || academicYearDisplay;
      batchNameDisplay = `Semester ${semesterNum} (${batch.name})`;
      programmeNameDisplay = (batch.programmes as any)?.name || programmeNameDisplay;
    }
  } else {
    // Semester-wise: align batch name with intake year
    if (semesterNum === 1) batchNameDisplay = "Semester 1 (Sec A, Sec B, P1–P4)";
    else if (semesterNum === 3 || semesterNum === 4) batchNameDisplay = `Semester ${semesterNum} (Batch 2025)`;
    else if (semesterNum === 5 || semesterNum === 6) batchNameDisplay = `Semester ${semesterNum} (Batch 2024)`;
  }

  // 3. Query Sessions for the Teacher in this Week
  let query = adminClient
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      topic_planned,
      topic_covered,
      teaching_method,
      assignment_activity,
      status,
      semester,
      subjects(name, code, semester),
      batches(name, current_semester, academic_year)
    `)
    .eq("teacher_id", params.teacherId)
    .gte("session_date", params.weekStartStr)
    .lte("session_date", endStr)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (params.semester) {
    query = query.eq("semester", semesterNum);
  } else if (params.batchId && params.batchId !== "all") {
    query = query.eq("batch_id", params.batchId);
  }

  let { data: rawSessions } = await query;

  // Fallback: If no sessions found for this specific teacher (e.g. Admin/Director viewing report, or teacherId was default),
  // query for sessions in this batch/semester so the pre-filled table is NOT empty!
  if (!rawSessions || rawSessions.length === 0) {
    let fallbackQuery = adminClient
      .from("class_sessions")
      .select(`
        id,
        session_date,
        start_time,
        end_time,
        topic_planned,
        topic_covered,
        teaching_method,
        assignment_activity,
        status,
        semester,
        teacher_id,
        profiles:teacher_id(full_name, department),
        subjects(name, code, semester),
        batches(name, current_semester, academic_year)
      `)
      .gte("session_date", params.weekStartStr)
      .lte("session_date", endStr)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (params.semester) {
      fallbackQuery = fallbackQuery.eq("semester", semesterNum);
    } else if (params.batchId && params.batchId !== "all") {
      fallbackQuery = fallbackQuery.eq("batch_id", params.batchId);
    }

    if (params.subjectId && params.subjectId !== "all") {
      fallbackQuery = fallbackQuery.eq("subject_id", params.subjectId);
    }

    const { data: fallbackSessions } = await fallbackQuery;
    if (fallbackSessions && fallbackSessions.length > 0) {
      rawSessions = fallbackSessions;
      // If original teacher was admin, update faculty display to actual teacher who took classes
      const actualTeacher = (fallbackSessions[0] as any)?.profiles;
      if (actualTeacher?.full_name && (teacher as any).role === "admin") {
        teacher.full_name = actualTeacher.full_name;
        if (actualTeacher.department) teacher.department = actualTeacher.department;
      }
    }
  }

  // 4. Map Sessions with Section / Practical Group tags and AI Heuristic Enrichment
  const subjectNamesSet = new Set<string>();
  const subjectCodesSet = new Set<string>();

  const sessionsToEnrichList: SessionToEnrich[] = (rawSessions || []).map((s: any) => ({
    id: s.id,
    sessionDate: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    topicCovered: s.topic_covered || "",
    topicPlanned: s.topic_planned || s.topic_covered || "",
    teachingMethod: s.teaching_method,
    assignmentActivity: s.assignment_activity,
    subjectName: s.subjects?.name || "Subject",
    subjectCode: s.subjects?.code,
    batchName: s.batches?.name || "",
    semester: s.semester || semesterNum,
  }));

  const sessions: ReportSessionData[] = (rawSessions || []).map((s: any, idx: number) => {
    const subName = s.subjects?.name || "Subject";
    const subCode = s.subjects?.code;
    const batchName = s.batches?.name || "";

    if (subName) subjectNamesSet.add(subName);
    if (subCode) subjectCodesSet.add(subCode);

    // Auto-enrich teaching method and activity if null/empty using domain heuristics
    const heuristic = generateAcademicSessionEnrichment(sessionsToEnrichList[idx]);

    // Extract Section & Practical Group (e.g. Sec A, Sec B, P1, P2, P3, P4)
    let groupTag = "";
    if (batchName.includes("Sec A") && batchName.includes("Sec B")) groupTag = "(Sec A & B)";
    else if (batchName.includes("Sec A")) {
      if (batchName.includes("P1")) groupTag = "(Sec A, P1)";
      else if (batchName.includes("P2")) groupTag = "(Sec A, P2)";
      else groupTag = "(Sec A)";
    } else if (batchName.includes("Sec B")) {
      if (batchName.includes("P3")) groupTag = "(Sec B, P3)";
      else if (batchName.includes("P4")) groupTag = "(Sec B, P4)";
      else groupTag = "(Sec B)";
    } else if (batchName.includes("P1")) groupTag = "(Group P1)";
    else if (batchName.includes("P2")) groupTag = "(Group P2)";
    else if (batchName.includes("P3")) groupTag = "(Group P3)";
    else if (batchName.includes("P4")) groupTag = "(Group P4)";

    let topicPlan = s.topic_planned || s.topic_covered || heuristic.topicPlanned;
    let topicComp = s.topic_covered || s.topic_planned || heuristic.topicCovered;

    // Append group tag if not already mentioned in the topic text
    const hasGroupAlready =
      topicPlan.includes("Sec") ||
      topicPlan.includes("P1") ||
      topicPlan.includes("P2") ||
      topicPlan.includes("P3") ||
      topicPlan.includes("P4");

    if (groupTag && !hasGroupAlready) {
      topicPlan = `${topicPlan} ${groupTag}`;
      topicComp = `${topicComp} ${groupTag}`;
    }

    const timeStartFormatted = formatTimeToAMPM(s.start_time);
    const timeEndFormatted = formatTimeToAMPM(s.end_time);

    // Final teaching method and assignment activity: never null, never empty, never generic "—"
    const finalMethod =
      s.teaching_method && s.teaching_method.trim() !== "" && s.teaching_method !== "null"
        ? s.teaching_method
        : heuristic.teachingMethod;

    const finalActivity =
      s.assignment_activity && s.assignment_activity.trim() !== "" && s.assignment_activity !== "null" && s.assignment_activity !== "—"
        ? s.assignment_activity
        : heuristic.assignmentActivity;

    return {
      sessionDate: s.session_date,
      dayName: format(parseISO(s.session_date), "EEEE"),
      startTime: timeStartFormatted || s.start_time.slice(0, 5),
      endTime: timeEndFormatted || s.end_time.slice(0, 5),
      topicPlanned: topicPlan,
      topicCovered: topicComp,
      teachingMethod: finalMethod,
      assignmentActivity: finalActivity,
      status: s.status,
    };
  });

  const subjectsCombined =
    subjectNamesSet.size > 0
      ? Array.from(subjectNamesSet).join("; ")
      : "Front Office Operations & AI in Hospitality";

  const codesCombined =
    subjectCodesSet.size > 0
      ? Array.from(subjectCodesSet).join(", ")
      : null;

  // 5. Fetch or Auto-Synthesize Weekly Summary (100% filled, no blanks)
  let summaryQuery = adminClient
    .from("weekly_summaries")
    .select("*")
    .eq("teacher_id", params.teacherId)
    .eq("week_start", params.weekStartStr);

  if (params.subjectId && params.subjectId !== "all") {
    summaryQuery = summaryQuery.eq("subject_id", params.subjectId);
  }

  const { data: summaryRows } = await summaryQuery.order("created_at", { ascending: false }).limit(1);
  const summaryData = summaryRows?.[0] || null;

  // Generate complete heuristic summary if missing or incomplete
  const aiFallbackSummary = generateAcademicSummary(
    subjectsCombined,
    batchNameDisplay,
    semesterNum,
    sessionsToEnrichList
  );

  let summary: ReportSummaryData = {
    syllabusCoverage: summaryData?.syllabus_coverage || aiFallbackSummary.syllabusCoverage,
    practicalConducted: summaryData?.practical_conducted || aiFallbackSummary.practicalConducted,
    assessmentConducted: summaryData?.assessment_conducted || aiFallbackSummary.assessmentConducted,
    slowLearners: summaryData?.slow_learners || aiFallbackSummary.slowLearners,
    remedialAction: summaryData?.remedial_action || aiFallbackSummary.remedialAction,
    aiDigitalTools: summaryData?.ai_digital_tools || aiFallbackSummary.aiDigitalTools,
    industryExamples: summaryData?.industry_examples || aiFallbackSummary.industryExamples,
    submittedOn: summaryData?.submitted_on || format(new Date(), "yyyy-MM-dd"),
    status: summaryData?.status || "submitted",
  };


  return {
    facultyName: teacher.full_name,
    department: teacher.department || "Front Office Operations",
    subjectName: subjectsCombined,
    subjectCode: codesCombined,
    programmeName: programmeNameDisplay,
    batchName: batchNameDisplay,
    semester: semesterNum,
    academicYear: academicYearDisplay,
    weekStart: params.weekStartStr,
    sessions,
    summary,
  };
}
