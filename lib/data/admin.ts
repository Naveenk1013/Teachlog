import { createAdminClient } from "@/lib/supabase/admin";

export interface CRAuthorisationItem {
  id: string;
  crId: string;
  crName: string;
  crEmail: string;
  batchId: string;
  batchName: string;
  currentSemester: number;
  academicYear: string;
  grantedAt: string;
  grantedByName: string;
  revokedAt: string | null;
  revokedByName: string | null;
  revokeReason: string | null;
  isActive: boolean;
}

export interface AccessLogItem {
  id: number;
  userId: string | null;
  userName: string | null;
  email: string | null;
  event: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: number;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldData: any;
  newData: any;
  createdAt: string;
}

export async function getAdminOverviewStats() {
  const adminClient = createAdminClient();

  const [
    { count: totalBatches },
    { count: totalSubjects },
    { count: totalTeachers },
    { count: activeCRs },
    { count: totalSessions },
  ] = await Promise.all([
    adminClient.from("batches").select("*", { count: "exact", head: true }),
    adminClient.from("subjects").select("*", { count: "exact", head: true }),
    adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
    adminClient.from("cr_authorisations").select("*", { count: "exact", head: true }).is("revoked_at", null),
    adminClient.from("class_sessions").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalBatches: totalBatches || 0,
    totalSubjects: totalSubjects || 0,
    totalTeachers: totalTeachers || 0,
    activeCRs: activeCRs || 0,
    totalSessions: totalSessions || 0,
  };
}

export async function getCRAuthorisationRegister(): Promise<CRAuthorisationItem[]> {
  const adminClient = createAdminClient();

  const [{ data, error }, { data: usersData }] = await Promise.all([
    adminClient
      .from("cr_authorisations")
      .select(`
        id,
        cr_id,
        batch_id,
        academic_year,
        granted_at,
        revoked_at,
        revoke_reason,
        cr:profiles!cr_authorisations_cr_id_fkey(full_name, id),
        batches(id, name, current_semester, academic_year),
        granted_by_user:profiles!cr_authorisations_granted_by_fkey(full_name),
        revoked_by_user:profiles!cr_authorisations_revoked_by_fkey(full_name)
      `)
      .order("granted_at", { ascending: false }),
    adminClient.auth.admin.listUsers({ perPage: 500 }),
  ]);

  if (error || !data) return [];

  const emailMap = new Map<string, string>();
  if (usersData?.users) {
    for (const u of usersData.users) {
      if (u.id && u.email) emailMap.set(u.id, u.email);
    }
  }

  return data.map((row: any) => ({
    id: row.id,
    crId: row.cr_id,
    crName: row.cr?.full_name || "CR Student",
    crEmail: emailMap.get(row.cr_id) || "student@iihmhyd.edu.in",
    batchId: row.batch_id,
    batchName: row.batches?.name || "Batch",
    currentSemester: row.batches?.current_semester || 1,
    academicYear: row.academic_year,
    grantedAt: row.granted_at,
    grantedByName: row.granted_by_user?.full_name || "Admin",
    revokedAt: row.revoked_at,
    revokedByName: row.revoked_by_user?.full_name || null,
    revokeReason: row.revoke_reason || null,
    isActive: !row.revoked_at,
  }));
}

export async function getAvailableStudentsAndBatches() {
  const adminClient = createAdminClient();

  const [{ data: students }, { data: batches }, { data: usersData }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, full_name")
      .eq("role", "cr")
      .eq("is_active", true),
    adminClient
      .from("batches")
      .select("id, name, academic_year, current_semester")
      .eq("is_active", true),
    adminClient.auth.admin.listUsers({ perPage: 500 }),
  ]);

  const emailMap = new Map<string, string>();
  if (usersData?.users) {
    for (const u of usersData.users) {
      if (u.id && u.email) emailMap.set(u.id, u.email);
    }
  }

  return {
    students: (students || []).map((s) => ({
      id: s.id,
      name: s.full_name,
      email: emailMap.get(s.id) || "",
    })),
    batches: (batches || []).map((b) => ({
      id: b.id,
      name: `${b.name} (Sem ${b.current_semester})`,
      academicYear: b.academic_year,
    })),
  };
}

export async function getAccessLogs(limit = 50): Promise<AccessLogItem[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("access_logs")
    .select(`
      id,
      user_id,
      email,
      event,
      ip,
      user_agent,
      created_at,
      profiles(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.full_name || null,
    email: row.email,
    event: row.event,
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}

export async function getAuditLogs(limit = 50): Promise<AuditLogItem[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("audit_logs")
    .select(`
      id,
      actor_id,
      action,
      entity,
      entity_id,
      old_data,
      new_data,
      created_at,
      profiles(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.profiles?.full_name || "System",
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    oldData: row.old_data,
    newData: row.new_data,
    createdAt: row.created_at,
  }));
}

export interface TeacherItem {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  assignmentCount: number;
}

export interface ProgrammeItem {
  id: string;
  code: string;
  name: string;
  durationYears: number;
  totalSemesters: number;
}

export interface SubjectItem {
  id: string;
  programmeId: string;
  programmeName: string;
  semester: number;
  code: string | null;
  name: string;
  topicCount: number;
}

export interface BatchItem {
  id: string;
  programmeId: string;
  programmeName: string;
  name: string;
  intakeYear: number;
  currentSemester: number;
  academicYear: string;
  semesterStartDate: string;
  classStrength: number;
  isActive: boolean;
}

export interface TeachingAssignmentItem {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherDepartment: string | null;
  subjectId: string;
  subjectCode: string | null;
  subjectName: string;
  semester: number;
  batchId: string;
  batchName: string;
  academicYear: string;
}

export interface SyllabusTopicItem {
  id: string;
  subjectId: string;
  unitNo: number | null;
  seq: number;
  title: string;
}

export async function getAllTeachers(): Promise<TeacherItem[]> {
  const adminClient = createAdminClient();

  const [{ data: teachers, error: teachersError }, { data: usersData }, { data: assignments }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, full_name, department, is_active, created_at")
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
    adminClient.auth.admin.listUsers({ perPage: 200 }),
    adminClient.from("teaching_assignments").select("teacher_id"),
  ]);

  if (teachersError || !teachers) return [];

  const emailMap = new Map<string, string>();
  if (usersData?.users) {
    for (const u of usersData.users) {
      if (u.id && u.email) emailMap.set(u.id, u.email);
    }
  }

  const assignmentCountMap = new Map<string, number>();
  if (assignments) {
    for (const a of assignments) {
      assignmentCountMap.set(a.teacher_id, (assignmentCountMap.get(a.teacher_id) || 0) + 1);
    }
  }

  return teachers.map((t) => ({
    id: t.id,
    fullName: t.full_name,
    email: emailMap.get(t.id) || `${t.full_name.toLowerCase().replace(/\s+/g, ".")}@iihmhyd.edu.in`,
    department: t.department,
    isActive: t.is_active,
    createdAt: t.created_at,
    assignmentCount: assignmentCountMap.get(t.id) || 0,
  }));
}

export async function getAllProgrammes(): Promise<ProgrammeItem[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("programmes")
    .select("id, code, name, duration_years, total_semesters")
    .order("code", { ascending: true });

  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    durationYears: p.duration_years,
    totalSemesters: p.total_semesters,
  }));
}

export async function getAllSubjects(): Promise<SubjectItem[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("subjects")
    .select(`
      id,
      programme_id,
      semester,
      code,
      name,
      programmes(name),
      syllabus_topics(id)
    `)
    .order("semester", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    programmeId: row.programme_id,
    programmeName: row.programmes?.name || "General",
    semester: row.semester,
    code: row.code,
    name: row.name,
    topicCount: Array.isArray(row.syllabus_topics) ? row.syllabus_topics.length : 0,
  }));
}

export async function getAllBatches(): Promise<BatchItem[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("batches")
    .select(`
      id,
      programme_id,
      name,
      intake_year,
      current_semester,
      academic_year,
      semester_start_date,
      class_strength,
      is_active,
      programmes(name)
    `)
    .order("current_semester", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    programmeId: row.programme_id,
    programmeName: row.programmes?.name || "BHM",
    name: row.name,
    intakeYear: row.intake_year,
    currentSemester: row.current_semester,
    academicYear: row.academic_year,
    semesterStartDate: row.semester_start_date,
    classStrength: row.class_strength,
    isActive: row.is_active,
  }));
}

export async function getAllTeachingAssignments(): Promise<TeachingAssignmentItem[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("teaching_assignments")
    .select(`
      id,
      teacher_id,
      subject_id,
      batch_id,
      academic_year,
      teacher:profiles!teaching_assignments_teacher_id_fkey(full_name, department),
      subjects(code, name, semester),
      batches(name)
    `)
    .order("academic_year", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher?.full_name || "Unknown Faculty",
    teacherDepartment: row.teacher?.department || null,
    subjectId: row.subject_id,
    subjectCode: row.subjects?.code || null,
    subjectName: row.subjects?.name || "Unknown Subject",
    semester: row.subjects?.semester || 1,
    batchId: row.batch_id,
    batchName: row.batches?.name || "Unknown Batch",
    academicYear: row.academic_year,
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

  return data.map((row) => ({
    id: row.id,
    subjectId: row.subject_id,
    unitNo: row.unit_no,
    seq: row.seq,
    title: row.title,
  }));
}

export interface WeeklyLogSessionItem {
  id: string;
  sessionDate: string;
  dayName: string;
  startTime: string;
  endTime: string;
  topicCovered: string;
  topicPlanned: string | null;
  teachingMethod: string | null;
  assignmentActivity: string | null;
  studentsPresent: number;
  classStrength: number;
  status: "submitted" | "verified";
  verifiedAt: string | null;
  teacherId: string;
  teacherName: string;
  teacherDepartment: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  semester: number;
  batchId: string;
  batchName: string;
  academicYear: string;
  enteredByName: string;
  enteredByRole: string;
  syllabusTopics: string[];
}

export interface WeeklyLogsExplorerFilterData {
  teachers: { id: string; name: string; department: string | null }[];
  batches: { id: string; name: string; currentSemester: number; academicYear: string }[];
  subjects: { id: string; name: string; code: string | null; semester: number }[];
  sessions: WeeklyLogSessionItem[];
  selectedWeekStart: string;
  selectedWeekEnd: string;
}

export async function getWeeklyLogsExplorerData(params: {
  teacherId?: string;
  batchId?: string;
  subjectId?: string;
  weekStart?: string;
}): Promise<WeeklyLogsExplorerFilterData> {
  const adminClient = createAdminClient();

  // 1. Calculate Monday to Saturday date range
  const now = new Date();
  const defaultMonday = new Date(now);
  const day = defaultMonday.getDay();
  const diff = defaultMonday.getDate() - day + (day === 0 ? -6 : 1);
  defaultMonday.setDate(diff);
  const defaultMondayStr = defaultMonday.toISOString().split("T")[0];

  const weekStartStr = params.weekStart || defaultMondayStr;
  const mondayDate = new Date(weekStartStr);
  const saturdayDate = new Date(mondayDate);
  saturdayDate.setDate(mondayDate.getDate() + 5);
  const weekEndStr = saturdayDate.toISOString().split("T")[0];

  // 2. Fetch filters: Teachers, Batches, Subjects in parallel
  const [
    { data: teachersData },
    { data: batchesData },
    { data: subjectsData },
  ] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, full_name, department")
      .eq("role", "teacher")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    adminClient
      .from("batches")
      .select("id, name, current_semester, academic_year")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    adminClient
      .from("subjects")
      .select("id, name, code, semester")
      .order("name", { ascending: true }),
  ]);

  // 3. Build Query for Sessions
  let sessionsQuery = adminClient
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
      students_present,
      status,
      verified_at,
      teacher_id,
      subject_id,
      batch_id,
      semester,
      academic_year,
      teacher:profiles!class_sessions_teacher_id_fkey(full_name, department),
      subjects(id, name, code, semester),
      batches(id, name, class_strength),
      entered_by_user:profiles!class_sessions_entered_by_fkey(full_name, role),
      session_syllabus_topics(
        syllabus_topics(id, title)
      )
    `)
    .gte("session_date", weekStartStr)
    .lte("session_date", weekEndStr)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (params.teacherId) {
    sessionsQuery = sessionsQuery.eq("teacher_id", params.teacherId);
  }
  if (params.batchId) {
    sessionsQuery = sessionsQuery.eq("batch_id", params.batchId);
  }
  if (params.subjectId) {
    sessionsQuery = sessionsQuery.eq("subject_id", params.subjectId);
  }

  const { data: rawSessions, error: sessErr } = await sessionsQuery;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const sessions: WeeklyLogSessionItem[] = (rawSessions || []).map((row: any) => {
    const sDate = new Date(row.session_date);
    const dayName = dayNames[sDate.getDay()] || "Weekday";
    const topics: string[] = [];
    if (row.session_syllabus_topics) {
      for (const st of row.session_syllabus_topics) {
        if (st.syllabus_topics?.title) topics.push(st.syllabus_topics.title);
      }
    }

    return {
      id: row.id,
      sessionDate: row.session_date,
      dayName,
      startTime: row.start_time ? row.start_time.slice(0, 5) : "09:00",
      endTime: row.end_time ? row.end_time.slice(0, 5) : "10:00",
      topicCovered: row.topic_covered || "",
      topicPlanned: row.topic_planned || "",
      teachingMethod: row.teaching_method || "",
      assignmentActivity: row.assignment_activity || "",
      studentsPresent: row.students_present || 0,
      classStrength: row.batches?.class_strength || 50,
      status: row.status,
      verifiedAt: row.verified_at,
      teacherId: row.teacher_id,
      teacherName: row.teacher?.full_name || "Faculty",
      teacherDepartment: row.teacher?.department || null,
      subjectId: row.subject_id,
      subjectName: row.subjects?.name || "Subject",
      subjectCode: row.subjects?.code || null,
      semester: row.semester || row.subjects?.semester || 1,
      batchId: row.batch_id,
      batchName: row.batches?.name || "Batch",
      academicYear: row.academic_year || "2026-27",
      enteredByName: row.entered_by_user?.full_name || "CR Student",
      enteredByRole: row.entered_by_user?.role || "cr",
      syllabusTopics: topics,
    };
  });

  return {
    teachers: (teachersData || []).map((t) => ({ id: t.id, name: t.full_name, department: t.department })),
    batches: (batchesData || []).map((b) => ({ id: b.id, name: b.name, currentSemester: b.current_semester, academicYear: b.academic_year })),
    subjects: (subjectsData || []).map((s) => ({ id: s.id, name: s.name, code: s.code, semester: s.semester })),
    sessions,
    selectedWeekStart: weekStartStr,
    selectedWeekEnd: weekEndStr,
  };
}


