import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWithinCREditWindow } from "@/lib/dates";

export interface CRBatchInfo {
  id: string;
  name: string;
  intake_year: number;
  current_semester: number;
  academic_year: string;
  class_strength: number;
}

export interface CRAssignment {
  subjectId: string;
  subjectCode: string | null;
  subjectName: string;
  semester: number;
  teacherId: string;
  teacherName: string;
  teacherDepartment: string | null;
}

export interface CRSessionItem {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  studentsPresent: number;
  topicCovered: string;
  subjectName: string;
  subjectCode: string | null;
  teacherName: string;
  status: "submitted" | "verified";
  createdAt: string;
  isEditable: boolean;
  lockReason: string | null;
}

export async function getCurrentCRUser() {
  // Dev session cookie — only in development, never in production
  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const devCookie = cookieStore.get("teachlog_dev_session");
    if (devCookie?.value) {
      try {
        const dev = JSON.parse(devCookie.value);
        if (dev.role === "cr") {
          return {
            id: dev.id as string,
            email: dev.email as string,
            fullName: dev.name as string,
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
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "cr") return null;

  return {
    id: user.id,
    email: user.email || "",
    fullName: profile.full_name,
  };
}

export interface CRSubjectInfo {
  id: string;
  code: string | null;
  name: string;
  semester: number;
}

export interface CRTeacherInfo {
  id: string;
  name: string;
  department: string | null;
}

export interface CRBatchAssignmentsResult {
  batch: CRBatchInfo | null;
  assignments: CRAssignment[];
  subjects: CRSubjectInfo[];
  teachers: CRTeacherInfo[];
}

export async function getCRBatchAndAssignments(userId: string): Promise<CRBatchAssignmentsResult> {
  const adminClient = createAdminClient();

  // 1. Get active batch authorisation
  const { data: authRow, error: authErr } = await adminClient
    .from("cr_authorisations")
    .select("batch_id, academic_year, batches(id, name, intake_year, current_semester, academic_year, class_strength)")
    .eq("cr_id", userId)
    .is("revoked_at", null)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (authErr || !authRow || !authRow.batches) {
    return { batch: null, assignments: [], subjects: [], teachers: [] };
  }

  const batch = authRow.batches as unknown as CRBatchInfo;

  // 2. Get teaching assignments for this batch
  const { data: assignmentsData } = await adminClient
    .from("teaching_assignments")
    .select(`
      subject_id,
      teacher_id,
      subjects(id, code, name, semester),
      profiles(id, full_name, department)
    `)
    .eq("batch_id", batch.id);

  const assignments: CRAssignment[] = (assignmentsData || []).map((item: any) => ({
    subjectId: item.subjects.id,
    subjectCode: item.subjects.code,
    subjectName: item.subjects.name,
    semester: item.subjects.semester,
    teacherId: item.profiles.id,
    teacherName: item.profiles.full_name,
    teacherDepartment: item.profiles.department,
  }));

  // 3. Get all subjects for this semester (to ensure all 6+ subjects are available)
  const { data: semesterSubjects } = await adminClient
    .from("subjects")
    .select("id, code, name, semester")
    .eq("semester", batch.current_semester)
    .order("code", { ascending: true });

  const subjects: CRSubjectInfo[] = (semesterSubjects || []).map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    semester: s.semester,
  }));

  // 4. Get all active faculty members
  const { data: teacherProfiles } = await adminClient
    .from("profiles")
    .select("id, full_name, department")
    .eq("role", "teacher")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  const teachers: CRTeacherInfo[] = (teacherProfiles || []).map((t: any) => ({
    id: t.id,
    name: t.full_name,
    department: t.department,
  }));

  return { batch, assignments, subjects, teachers };
}

export async function getCRRecentSessions(batchId: string): Promise<CRSessionItem[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      students_present,
      topic_covered,
      status,
      created_at,
      subjects(name, code),
      profiles!class_sessions_teacher_id_fkey(full_name)
    `)
    .eq("batch_id", batchId)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((row: any) => {
    const isUnder24Hours = isWithinCREditWindow(row.created_at);
    const isVerified = row.status === "verified";
    const isEditable = !isVerified && isUnder24Hours;

    let lockReason = null;
    if (isVerified) {
      lockReason = "Locked: Verified by Faculty";
    } else if (!isUnder24Hours) {
      lockReason = "Locked: 24h correction window expired";
    }

    return {
      id: row.id,
      sessionDate: row.session_date,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      studentsPresent: row.students_present,
      topicCovered: row.topic_covered,
      subjectName: row.subjects?.name || "Unknown Subject",
      subjectCode: row.subjects?.code || null,
      teacherName: row.profiles?.full_name || "Faculty",
      status: row.status,
      createdAt: row.created_at,
      isEditable,
      lockReason,
    };
  });
}

export interface CRDashboardStats {
  totalSessionsThisWeek: number;
  verifiedThisWeek: number;
  pendingThisWeek: number;
  totalSessionsAllTime: number;
  todaySessions: {
    id: string;
    subjectName: string;
    subjectCode: string | null;
    teacherName: string;
    startTime: string;
    endTime: string;
    topicCovered: string;
    status: "submitted" | "verified";
  }[];
  recentSessions: {
    id: string;
    sessionDate: string;
    subjectName: string;
    teacherName: string;
    status: "submitted" | "verified";
  }[];
}

export async function getCRDashboardStats(batchId: string): Promise<CRDashboardStats> {
  const adminClient = createAdminClient();

  // Get start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekStart = monday.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  // Fetch this week's sessions
  const { data: weekSessions } = await adminClient
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      topic_covered,
      status,
      subjects(name, code),
      profiles!class_sessions_teacher_id_fkey(full_name)
    `)
    .eq("batch_id", batchId)
    .gte("session_date", weekStart)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: true });

  const sessions = weekSessions || [];

  const totalSessionsThisWeek = sessions.length;
  const verifiedThisWeek = sessions.filter((s: any) => s.status === "verified").length;
  const pendingThisWeek = totalSessionsThisWeek - verifiedThisWeek;

  // Today's sessions
  const todaySessions = sessions
    .filter((s: any) => s.session_date === todayStr)
    .map((s: any) => ({
      id: s.id,
      subjectName: s.subjects?.name || "Unknown",
      subjectCode: s.subjects?.code || null,
      teacherName: s.profiles?.full_name || "Faculty",
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      topicCovered: s.topic_covered || "",
      status: s.status as "submitted" | "verified",
    }));

  // Total all-time count
  const { count: totalCount } = await adminClient
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  // Recent 5 sessions for quick preview
  const recentSessions = sessions.slice(0, 5).map((s: any) => ({
    id: s.id,
    sessionDate: s.session_date,
    subjectName: s.subjects?.name || "Unknown",
    teacherName: s.profiles?.full_name || "Faculty",
    status: s.status as "submitted" | "verified",
  }));

  return {
    totalSessionsThisWeek,
    verifiedThisWeek,
    pendingThisWeek,
    totalSessionsAllTime: totalCount || 0,
    todaySessions,
    recentSessions,
  };
}

