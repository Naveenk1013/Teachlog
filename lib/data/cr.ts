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
