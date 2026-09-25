import { createAdminClient } from "@/lib/supabase/admin";
import { format, addDays, parseISO } from "date-fns";
import { WeeklyReportData, ReportSessionData, ReportSummaryData } from "@/lib/reports/weekly-log";

export async function getWeeklyReportData(
  teacherId: string,
  subjectId: string,
  batchId: string,
  weekStartStr: string
): Promise<WeeklyReportData | null> {
  const adminClient = createAdminClient();
  const startDate = parseISO(weekStartStr);
  const endDate = addDays(startDate, 5); // Saturday
  const endStr = format(endDate, "yyyy-MM-dd");

  // 1. Fetch Teacher Profile
  const { data: teacher, error: teachErr } = await adminClient
    .from("profiles")
    .select("full_name, department")
    .eq("id", teacherId)
    .single();

  if (teachErr || !teacher) return null;

  // 2. Fetch Subject & Batch
  const { data: subject, error: subErr } = await adminClient
    .from("subjects")
    .select("name, code, semester")
    .eq("id", subjectId)
    .single();

  if (subErr || !subject) return null;

  const { data: batch, error: batchErr } = await adminClient
    .from("batches")
    .select("name, current_semester, academic_year, programmes(name)")
    .eq("id", batchId)
    .single();

  if (batchErr || !batch) return null;

  // 3. Fetch Sessions (Mon - Sat for this subject & batch)
  const { data: sessionsData, error: sessErr } = await adminClient
    .from("class_sessions")
    .select(`
      session_date,
      start_time,
      end_time,
      topic_planned,
      topic_covered,
      teaching_method,
      assignment_activity,
      status
    `)
    .eq("subject_id", subjectId)
    .eq("batch_id", batchId)
    .gte("session_date", weekStartStr)
    .lte("session_date", endStr)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  const sessions: ReportSessionData[] = (sessionsData || []).map((s: any) => ({
    sessionDate: s.session_date,
    dayName: format(parseISO(s.session_date), "EEEE"),
    startTime: s.start_time.slice(0, 5),
    endTime: s.end_time.slice(0, 5),
    topicPlanned: s.topic_planned || s.topic_covered || "—",
    topicCovered: s.topic_covered || s.topic_planned || "—",
    teachingMethod: s.teaching_method,
    assignmentActivity: s.assignment_activity,
    status: s.status,
  }));

  // 4. Fetch Weekly Summary for this batch/subject/week
  const { data: summaryData } = await adminClient
    .from("weekly_summaries")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("batch_id", batchId)
    .eq("week_start", weekStartStr)
    .maybeSingle();

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

  const programmeName = (batch.programmes as any)?.name || "B.Sc. in Hospitality & Hotel Administration";

  return {
    facultyName: teacher.full_name,
    department: teacher.department || "Hospitality Studies",
    subjectName: subject.name,
    subjectCode: subject.code,
    programmeName,
    batchName: batch.name,
    semester: subject.semester || batch.current_semester,
    academicYear: batch.academic_year,
    weekStart: weekStartStr,
    sessions,
    summary,
  };
}
