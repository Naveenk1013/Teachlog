import { createAdminClient } from "@/lib/supabase/admin";
import { format, addDays, parseISO, parse } from "date-fns";
import { WeeklyReportData, ReportSessionData, ReportSummaryData } from "@/lib/reports/weekly-log";

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
    .select("full_name, department")
    .eq("id", params.teacherId)
    .single();

  if (teachErr || !teacher) return null;

  // 2. Resolve Semester & Batches
  let semesterNum: number = params.semester ? Number(params.semester) : 1;
  let batchNameDisplay = `Semester ${semesterNum}`;
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
    if (semesterNum === 1) batchNameDisplay = "Semester 1 (Batch 2026)";
    else if (semesterNum === 3 || semesterNum === 4) batchNameDisplay = `Semester ${semesterNum} (Batch 2025)`;
    else if (semesterNum === 5 || semesterNum === 6) batchNameDisplay = `Semester ${semesterNum} (Batch 2024)`;
  }

  // 3. Query Sessions for the Teacher in this Week
  let query = adminClient
    .from("class_sessions")
    .select(`
      session_date,
      start_time,
      end_time,
      topic_planned,
      topic_covered,
      teaching_method,
      assignment_activity,
      status,
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

  if (params.subjectId && params.subjectId !== "all") {
    query = query.eq("subject_id", params.subjectId);
  }

  const { data: rawSessions } = await query;

  // 4. Map Sessions with Section / Practical Group tags
  const subjectNamesSet = new Set<string>();
  const subjectCodesSet = new Set<string>();

  const sessions: ReportSessionData[] = (rawSessions || []).map((s: any) => {
    const subName = s.subjects?.name || "Subject";
    const subCode = s.subjects?.code;
    const batchName = s.batches?.name || "";

    if (subName) subjectNamesSet.add(subName);
    if (subCode) subjectCodesSet.add(subCode);

    // Extract Section & Practical Group (e.g. Sec A, Sec B, P1, P2)
    let groupTag = "";
    if (batchName.includes("Sec A") && batchName.includes("Sec B")) groupTag = "(Sec A & B)";
    else if (batchName.includes("Sec A")) groupTag = batchName.includes("P1") ? "(Sec A, P1)" : batchName.includes("P2") ? "(Sec A, P2)" : "(Sec A)";
    else if (batchName.includes("Sec B")) groupTag = batchName.includes("P3") ? "(Sec B, P3)" : batchName.includes("P4") ? "(Sec B, P4)" : "(Sec B)";
    else if (batchName.includes("P1")) groupTag = "(Group P1)";
    else if (batchName.includes("P2")) groupTag = "(Group P2)";
    else if (batchName.includes("P3")) groupTag = "(Group P3)";
    else if (batchName.includes("P4")) groupTag = "(Group P4)";

    let topicPlan = s.topic_planned || s.topic_covered || "Curriculum Session";
    let topicComp = s.topic_covered || s.topic_planned || "Curriculum Session";

    // Append group tag if not already mentioned in the topic text
    if (groupTag && !topicPlan.includes("Sec") && !topicPlan.includes("P1") && !topicPlan.includes("P2")) {
      topicPlan = `${topicPlan} ${groupTag}`;
    }
    if (groupTag && !topicComp.includes("Sec") && !topicComp.includes("P1") && !topicComp.includes("P2")) {
      topicComp = `${topicComp} ${groupTag}`;
    }

    const timeStartFormatted = formatTimeToAMPM(s.start_time);
    const timeEndFormatted = formatTimeToAMPM(s.end_time);

    return {
      sessionDate: s.session_date,
      dayName: format(parseISO(s.session_date), "EEEE"),
      startTime: timeStartFormatted || s.start_time.slice(0, 5),
      endTime: timeEndFormatted || s.end_time.slice(0, 5),
      topicPlanned: topicPlan,
      topicCovered: topicComp,
      teachingMethod: s.teaching_method || "Lecture / Theory / Presentation",
      assignmentActivity: s.assignment_activity || "Review questions & concept notes",
      status: s.status,
    };
  });

  // 5. Fetch Weekly Summary
  let summaryQuery = adminClient
    .from("weekly_summaries")
    .select("*")
    .eq("teacher_id", params.teacherId)
    .eq("week_start", params.weekStartStr);

  if (params.subjectId && params.subjectId !== "all") {
    summaryQuery = summaryQuery.eq("subject_id", params.subjectId);
  }

  const { data: summaryData } = await summaryQuery.maybeSingle();

  let summary: ReportSummaryData | null = null;
  if (summaryData) {
    summary = {
      syllabusCoverage: summaryData.syllabus_coverage || "",
      practicalConducted: summaryData.practical_conducted || "",
      assessmentConducted: summaryData.assessment_conducted || "",
      slowLearners: summaryData.slow_learners || "",
      remedialAction: summaryData.remedial_action || "",
      aiDigitalTools: summaryData.ai_digital_tools || "",
      industryExamples: summaryData.industry_examples || "",
      submittedOn: summaryData.submitted_on,
      status: summaryData.status,
    };
  }

  const subjectsCombined =
    subjectNamesSet.size > 0
      ? Array.from(subjectNamesSet).join("; ")
      : "Front Office Operations & Core Curriculum";

  const codesCombined =
    subjectCodesSet.size > 0
      ? Array.from(subjectCodesSet).join(", ")
      : null;

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
