export type UserRole = "admin" | "teacher" | "cr";
export type RecordStatus = "submitted" | "verified";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Programme {
  id: string;
  code: string;
  name: string;
  duration_years: number;
  total_semesters: number;
}

export interface Batch {
  id: string;
  programme_id: string;
  name: string;
  intake_year: number;
  current_semester: number;
  academic_year: string;
  semester_start_date: string;
  class_strength: number;
  is_active: boolean;
}

export interface Subject {
  id: string;
  programme_id: string;
  semester: number;
  code: string | null;
  name: string;
}

export interface SyllabusTopic {
  id: string;
  subject_id: string;
  unit_no: number | null;
  seq: number;
  title: string;
}

export interface TeachingAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  batch_id: string;
  academic_year: string;
}

export interface CRAuthorisation {
  id: string;
  cr_id: string;
  batch_id: string;
  academic_year: string;
  granted_by: string;
  granted_at: string;
  revoked_by: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
}

export interface ClassSession {
  id: string;
  batch_id: string;
  subject_id: string;
  teacher_id: string;
  semester: number;
  academic_year: string;
  session_date: string;
  start_time: string;
  end_time: string;
  students_present: number;
  topic_covered: string;
  topic_planned: string | null;
  teaching_method: string | null;
  assignment_activity: string | null;
  status: RecordStatus;
  verified_by: string | null;
  verified_at: string | null;
  entered_by: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklySummary {
  id: string;
  teacher_id: string;
  subject_id: string;
  batch_id: string;
  week_start: string;
  syllabus_coverage: string | null;
  practical_conducted: string | null;
  assessment_conducted: string | null;
  slow_learners: string | null;
  remedial_action: string | null;
  ai_digital_tools: string | null;
  industry_examples: string | null;
  status: RecordStatus;
  submitted_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessLog {
  id: number;
  user_id: string | null;
  email: string | null;
  event: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT" | "ACCESS_DENIED";
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "od";

export interface Student {
  id: string;
  roll_number: string;
  full_name: string;
  academic_year: string;
  semester: number;
  section: string;
  practical_group: string | null;
  batch_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  remarks: string | null;
  marked_by: string;
  marked_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface StudentAttendanceRecord {
  studentId: string;
  rollNumber: string;
  fullName: string;
  section: string;
  practicalGroup: string | null;
  status: AttendanceStatus;
  remarks?: string | null;
}

