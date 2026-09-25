import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { format, addDays, parseISO } from "date-fns";

export interface TeacherAssignment {
  id: string;
  subjectId: string;
  subjectCode: string | null;
  subjectName: string;
  semester: number;
  batchId: string;
  batchName: string;
  intakeYear: number;
  currentSemester: number;
  academicYear: string;
  classStrength: number;
  programmeName: string;
}

export interface SyllabusTopicItem {
  id: string;
  subjectId: string;
  unitNo: number | null;
  seq: number;
  title: string;
}

export interface TeacherSessionItem {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  studentsPresent: number;
  topicCovered: string;
  topicPlanned: string | null;
  teachingMethod: string | null;
  assignmentActivity: string | null;
  status: "submitted" | "verified";
  verifiedAt: string | null;
  createdAt: string;
  crName: string;
  syllabusTopics: SyllabusTopicItem[];
}

export interface WeeklySummaryItem {
  id?: string;
  teacherId: string;
  subjectId: string;
  batchId: string;
  weekStart: string;
  syllabusCoverage: string;
  practicalConducted: string;
  assessmentConducted: string;
  slowLearners: string;
  remedialAction: string;
  aiDigitalTools: string;
  industryExamples: string;
  status: "submitted" | "verified";
  submittedOn: string | null;
}

export async function getCurrentTeacherUser() {
  // Dev session cookie — only in development, never in production
  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const devCookie = cookieStore.get("teachlog_dev_session");
    if (devCookie?.value) {
      try {
        const dev = JSON.parse(devCookie.value);
        if (dev.role === "teacher" || dev.role === "admin") {
          return {
            id: dev.id as string,
            email: dev.email as string,
            fullName: dev.name as string,
            role: dev.role as string,
          };
        }
      } catch {
        // Ignore
      }
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, department")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || "",
    fullName: profile.full_name,
    role: profile.role,
    department: profile.department,
  };
}

export async function getTeacherAssignments(teacherId: string): Promise<TeacherAssignment[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("teaching_assignments")
    .select(`
      id,
      academic_year,
      subjects(id, code, name, semester),
      batches(id, name, intake_year, current_semester, academic_year, class_strength, programmes(name))
    `)
    .eq("teacher_id", teacherId);

  if (error || !data) return [];

  return data.map((item: any) => ({
    id: item.id,
    subjectId: item.subjects.id,
    subjectCode: item.subjects.code,
    subjectName: item.subjects.name,
    semester: item.subjects.semester,
    batchId: item.batches.id,
    batchName: item.batches.name,
    intakeYear: item.batches.intake_year,
    currentSemester: item.batches.current_semester,
    academicYear: item.academic_year,
    classStrength: item.batches.class_strength,
    programmeName: item.batches.programmes?.name || "B.Sc. Hospitality",
  }));
}

export async function getSubjectSyllabusTopics(subjectId: string): Promise<SyllabusTopicItem[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("syllabus_topics")
    .select("id, subject_id, unit_no, seq, title")
    .eq("subject_id", subjectId)
    .order("seq", { ascending: true });

  if (error || !data) return [];

  return data.map((t: any) => ({
    id: t.id,
    subjectId: t.subject_id,
    unitNo: t.unit_no,
    seq: t.seq,
    title: t.title,
  }));
}

export async function getTeacherWeeklySessions(
  teacherId: string,
  batchId: string,
  subjectId: string,
  weekStartStr: string
): Promise<TeacherSessionItem[]> {
  const adminClient = createAdminClient();
  const startDate = parseISO(weekStartStr);
  const endDate = addDays(startDate, 5); // Saturday
  const endStr = format(endDate, "yyyy-MM-dd");

  const { data, error } = await adminClient
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      students_present,
      topic_covered,
      topic_planned,
      teaching_method,
      assignment_activity,
      status,
      verified_at,
      created_at,
      profiles!class_sessions_entered_by_fkey(full_name),
      session_syllabus_topics(
        syllabus_topics(id, subject_id, unit_no, seq, title)
      )
    `)
    .eq("batch_id", batchId)
    .eq("subject_id", subjectId)
    .gte("session_date", weekStartStr)
    .lte("session_date", endStr)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => {
    const topics: SyllabusTopicItem[] = (row.session_syllabus_topics || [])
      .map((st: any) => st.syllabus_topics)
      .filter(Boolean)
      .map((t: any) => ({
        id: t.id,
        subjectId: t.subject_id,
        unitNo: t.unit_no,
        seq: t.seq,
        title: t.title,
      }));

    return {
      id: row.id,
      sessionDate: row.session_date,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      studentsPresent: row.students_present,
      topicCovered: row.topic_covered,
      topicPlanned: row.topic_planned,
      teachingMethod: row.teaching_method,
      assignmentActivity: row.assignment_activity,
      status: row.status,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      crName: row.profiles?.full_name || "CR",
      syllabusTopics: topics,
    };
  });
}

export async function getWeeklySummary(
  teacherId: string,
  batchId: string,
  subjectId: string,
  weekStartStr: string
): Promise<WeeklySummaryItem | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("weekly_summaries")
    .select("*")
    .eq("teacher_id", teacherId)
    .eq("batch_id", batchId)
    .eq("subject_id", subjectId)
    .eq("week_start", weekStartStr)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    teacherId: data.teacher_id,
    subjectId: data.subject_id,
    batchId: data.batch_id,
    weekStart: data.week_start,
    syllabusCoverage: data.syllabus_coverage || "",
    practicalConducted: data.practical_conducted || "",
    assessmentConducted: data.assessment_conducted || "",
    slowLearners: data.slow_learners || "",
    remedialAction: data.remedial_action || "",
    aiDigitalTools: data.ai_digital_tools || "",
    industryExamples: data.industry_examples || "",
    status: data.status,
    submittedOn: data.submitted_on,
  };
}
