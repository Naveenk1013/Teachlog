import { createAdminClient } from "@/lib/supabase/admin";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday as checkIsToday,
  getDay,
  parseISO,
} from "date-fns";

export type EventType = "holiday" | "vacation" | "exam" | "event" | "academic_note";

export interface AcademicEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: EventType;
  startDate: string;
  endDate: string;
  isHoliday: boolean;
  batchId: string | null;
  teacherId: string | null;
  createdByName?: string;
}

export interface CalendarSession {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string | null;
  batchName: string;
  teacherName: string;
  studentsPresent: number;
  classStrength: number;
  topicCovered: string;
  topicPlanned: string | null;
  teachingMethod: string | null;
  assignmentActivity: string | null;
  status: "submitted" | "verified";
  crName: string;
  syllabusTopics: string[];
}

export interface DayCalendarData {
  date: Date;
  dateString: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSunday: boolean;
  events: AcademicEvent[];
  sessions: CalendarSession[];
  isHoliday: boolean;
}

// Built-in standard institutional holidays fallback (Telangana state & national)
export const DEFAULT_ACADEMIC_EVENTS: AcademicEvent[] = [
  {
    id: "def-0",
    title: "Academic Session Commencement & Orientation",
    description: "Orientation ceremony for new intake cohorts and commencement of odd semester lectures",
    eventType: "event",
    startDate: "2026-07-15",
    endDate: "2026-07-16",
    isHoliday: false,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-1",
    title: "Independence Day",
    description: "National Holiday - Flag hoisting ceremony at Hyderabad campus",
    eventType: "holiday",
    startDate: "2026-08-15",
    endDate: "2026-08-15",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-1b",
    title: "Raksha Bandhan",
    description: "Institutional festival holiday",
    eventType: "holiday",
    startDate: "2026-08-28",
    endDate: "2026-08-28",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-2",
    title: "Sri Krishna Janmashtami",
    description: "Gazetted Festival Holiday",
    eventType: "holiday",
    startDate: "2026-09-04",
    endDate: "2026-09-04",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-3",
    title: "Eid Milad-un-Nabi",
    description: "State Public Holiday",
    eventType: "holiday",
    startDate: "2026-09-14",
    endDate: "2026-09-14",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-4",
    title: "Bathukamma & Dussehra Vacation",
    description: "Telangana State Festival & Mid-Term Autumn Break (No scheduled classes)",
    eventType: "vacation",
    startDate: "2026-09-28",
    endDate: "2026-10-03",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-5",
    title: "Mahatma Gandhi Jayanti",
    description: "National Holiday - Observance of Swachh Bharat principles",
    eventType: "holiday",
    startDate: "2026-10-02",
    endDate: "2026-10-02",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-6",
    title: "Deepavali Holidays",
    description: "Festival of Lights - Campus closed",
    eventType: "holiday",
    startDate: "2026-10-19",
    endDate: "2026-10-20",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-7",
    title: "Annual Hospitality Expo & Culinary Salon",
    description: "Inter-college culinary competition, salon culinaire & industry partner symposium",
    eventType: "event",
    startDate: "2026-11-14",
    endDate: "2026-11-15",
    isHoliday: false,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-7b",
    title: "Mid-Term Assessment & Practical Review Week",
    description: "Continuous internal evaluation (CIE) and hospitality practical demo assessments",
    eventType: "exam",
    startDate: "2026-11-23",
    endDate: "2026-11-28",
    isHoliday: false,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-7c",
    title: "Odd Semester Final University Examinations",
    description: "NCHMCT / University end-term theoretical and practical examinations",
    eventType: "exam",
    startDate: "2026-12-14",
    endDate: "2026-12-23",
    isHoliday: false,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-8",
    title: "Winter Vacation & Christmas Break",
    description: "Institutional Winter Term Break & New Year Closure",
    eventType: "vacation",
    startDate: "2026-12-24",
    endDate: "2027-01-02",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-9",
    title: "Even Semester Teaching Commencement",
    description: "Classes resume for all BHM batches across hospitality core departments",
    eventType: "event",
    startDate: "2027-01-04",
    endDate: "2027-01-04",
    isHoliday: false,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-10",
    title: "Makara Sankranti / Pongal Holidays",
    description: "Harvest Festival State Holidays",
    eventType: "holiday",
    startDate: "2027-01-14",
    endDate: "2027-01-16",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-11",
    title: "Republic Day",
    description: "National Holiday - Institutional Parade",
    eventType: "holiday",
    startDate: "2027-01-26",
    endDate: "2027-01-26",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-12",
    title: "Maha Shivaratri",
    description: "Gazetted Festival Holiday",
    eventType: "holiday",
    startDate: "2027-02-17",
    endDate: "2027-02-17",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-13",
    title: "Holi Celebrations",
    description: "Festival of Colors - Institutional Holiday",
    eventType: "holiday",
    startDate: "2027-03-13",
    endDate: "2027-03-13",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-14",
    title: "Ugadi (Telugu New Year)",
    description: "Telangana State Gazetted Holiday",
    eventType: "holiday",
    startDate: "2027-03-22",
    endDate: "2027-03-22",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-15",
    title: "Eid-ul-Fitr (Ramzan)",
    description: "Public Festival Holiday",
    eventType: "holiday",
    startDate: "2027-03-30",
    endDate: "2027-03-30",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-16",
    title: "Dr. B.R. Ambedkar Jayanti",
    description: "National Holiday",
    eventType: "holiday",
    startDate: "2027-04-14",
    endDate: "2027-04-14",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-17",
    title: "Good Friday",
    description: "Public Holiday",
    eventType: "holiday",
    startDate: "2027-04-16",
    endDate: "2027-04-16",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-18",
    title: "Even Semester Final Examinations",
    description: "Annual end-term examinations & viva voce",
    eventType: "exam",
    startDate: "2027-05-03",
    endDate: "2027-05-15",
    isHoliday: false,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-19",
    title: "Telangana Formation Day",
    description: "State Holiday celebrating the formation of Telangana State",
    eventType: "holiday",
    startDate: "2027-06-02",
    endDate: "2027-06-02",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
  {
    id: "def-20",
    title: "Annual Summer Vacation",
    description: "Faculty research, industry internships, and student summer break",
    eventType: "vacation",
    startDate: "2027-06-03",
    endDate: "2027-07-10",
    isHoliday: true,
    batchId: null,
    teacherId: null,
  },
];

export interface AcademicSOP {
  id: string;
  category: "Faculty" | "Student & CR" | "Daily Teaching Log" | "Examinations";
  title: string;
  summary: string;
  guidelines: string[];
}

export const INSTITUTIONAL_ACADEMIC_SOPS: AcademicSOP[] = [
  {
    id: "sop-faculty-leave",
    category: "Faculty",
    title: "Faculty Leave Application & Class Rescheduling Protocol",
    summary: "Standard procedure for planned and unplanned faculty absence to safeguard syllabus continuity.",
    guidelines: [
      "Prior Notice Requirement: Planned leaves must be submitted through the ERP portal at least 48 hours in advance for Dean/HOD approval.",
      "Substitute Arrangement: Before proceeding on leave, the faculty member must designate a departmental colleague to cover or swap lecture slots, or prepare an asynchronous guided learning assignment.",
      "Compensatory Lecture Requirement: If classes cannot be substituted, missed curriculum hours must be made up during the designated zero-period or Saturday afternoon slots and entered into the teaching log with a 'Compensatory Class' tag.",
      "Emergency Leaves: In case of unexpected medical urgency, notify the Program Leader by 08:00 AM so the Class Representative and students can be reassigned immediately.",
    ],
  },
  {
    id: "sop-student-leave",
    category: "Student & CR",
    title: "Student Attendance & Class Representative (CR) Leave SOP",
    summary: "Mandatory attendance criteria, CR absence delegation, and medical leave regularisation.",
    guidelines: [
      "75% Mandatory Attendance Threshold: As per university regulations, students must maintain minimum 75% physical attendance in every registered subject (theory and practical) to be eligible for hall tickets.",
      "CR Absence Protocol: If the designated Class Representative is on sanctioned leave, an authorized deputy CR must record the class session log within the standard 48-hour backdate limit.",
      "Medical Leave Submission Window: Medical certificates must be countersigned by parents/guardians and submitted to the Academic Office within 3 working days of resumption of classes.",
      "Official Duty (OD) Sanctions: Students representing IIHM in national culinary salons, bartending championships, or campus banquets must obtain advance OD approval to prevent attendance deductions.",
    ],
  },
  {
    id: "sop-teaching-log",
    category: "Daily Teaching Log",
    title: "Class Session Logging & Faculty Verification Compliance",
    summary: "Workflow guidelines for daily class entry, syllabus mapping, and weekly official document generation.",
    guidelines: [
      "Real-Time Logging (<60s): CR must log the class session on the TeachLog web application immediately following the conclusion of the class period.",
      "2-Day Strict Backdate Cap: To prevent retrospective falsification, CRs cannot log any class older than 2 calendar days.",
      "24-Hour Edit Window: CRs may adjust student attendance or topic descriptions for up to 24 hours after creation; thereafter entries become immutable.",
      "Faculty Verification within 7 Days: Teaching faculty must enrich each logged session with topic planned, pedagogical method, and syllabus unit linkage before week closure.",
      "Weekly Signed Report Archive: Every Monday, the official Microsoft Word (.docx) report must be exported, wet-signed by Faculty, Program Leader, and Campus Director, and preserved in departmental audit files.",
    ],
  },
  {
    id: "sop-exams-holidays",
    category: "Examinations",
    title: "Public Holidays & Assessment Rescheduling SOP",
    summary: "Rules governing unexpected state closures, examination windows, and semester transitions.",
    guidelines: [
      "Declared State Bandhs / Severe Weather: In the event of government-mandated emergency closures, all scheduled sessions will shift automatically to online interactive delivery or compensatory Saturday timetables.",
      "Prohibition of Class Logging on Gazetted Holidays: The system restricts CR class logging on designated institutional holidays unless an official compensatory session is pre-authorized by Administration.",
      "Mid-Term Continuous Evaluation: Formative assessments must span across 6 weeks with results uploaded within 5 working days.",
    ],
  },
];

export async function getAcademicEventsForRange(
  startStr: string,
  endStr: string,
  batchId?: string,
  teacherId?: string
): Promise<AcademicEvent[]> {
  const adminClient = createAdminClient();

  try {
    let query = adminClient
      .from("academic_events")
      .select("id, title, description, event_type, start_date, end_date, is_holiday, batch_id, teacher_id, profiles(full_name)")
      .lte("start_date", endStr)
      .gte("end_date", startStr);

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        eventType: d.event_type as EventType,
        startDate: d.start_date,
        endDate: d.end_date,
        isHoliday: d.is_holiday,
        batchId: d.batch_id,
        teacherId: d.teacher_id,
        createdByName: d.profiles?.full_name || "Faculty",
      }));
    }
  } catch {
    // Fall back to default academic events
  }

  // Filter default events for this range
  return DEFAULT_ACADEMIC_EVENTS.filter(
    (e) => e.startDate <= endStr && e.endDate >= startStr
  );
}

export async function getCalendarSessionsForRange(
  startStr: string,
  endStr: string,
  filters?: { batchId?: string; teacherId?: string; subjectId?: string }
): Promise<CalendarSession[]> {
  const adminClient = createAdminClient();

  let query = adminClient
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
      subjects(name, code),
      batches(name, class_strength),
      profiles!class_sessions_teacher_id_fkey(full_name),
      cr:profiles!class_sessions_entered_by_fkey(full_name),
      session_syllabus_topics(
        syllabus_topics(title)
      )
    `)
    .gte("session_date", startStr)
    .lte("session_date", endStr)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (filters?.batchId) {
    query = query.eq("batch_id", filters.batchId);
  }
  if (filters?.teacherId) {
    query = query.eq("teacher_id", filters.teacherId);
  }
  if (filters?.subjectId) {
    query = query.eq("subject_id", filters.subjectId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: any) => {
    const syllabusList: string[] = (row.session_syllabus_topics || [])
      .map((st: any) => st.syllabus_topics?.title)
      .filter(Boolean);

    return {
      id: row.id,
      sessionDate: row.session_date,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      subjectName: row.subjects?.name || "Subject",
      subjectCode: row.subjects?.code || null,
      batchName: row.batches?.name || "Batch",
      teacherName: row.profiles?.full_name || "Faculty",
      studentsPresent: row.students_present,
      classStrength: row.batches?.class_strength || 60,
      topicCovered: row.topic_covered,
      topicPlanned: row.topic_planned,
      teachingMethod: row.teaching_method,
      assignmentActivity: row.assignment_activity,
      status: row.status,
      crName: row.cr?.full_name || "CR",
      syllabusTopics: syllabusList,
    };
  });
}

export async function getMonthCalendarData(
  targetDate: Date,
  filters?: { batchId?: string; teacherId?: string; subjectId?: string }
): Promise<{
  days: DayCalendarData[];
  events: AcademicEvent[];
  sessions: CalendarSession[];
  monthLabel: string;
}> {
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  // Calendar starts on Monday (weekStartsOn: 1)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const startStr = format(calendarStart, "yyyy-MM-dd");
  const endStr = format(calendarEnd, "yyyy-MM-dd");

  const [events, sessions] = await Promise.all([
    getAcademicEventsForRange(startStr, endStr, filters?.batchId, filters?.teacherId),
    getCalendarSessionsForRange(startStr, endStr, filters),
  ]);

  const allCalendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const days: DayCalendarData[] = allCalendarDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const isCurMonth = isSameMonth(day, monthStart);
    const isSun = getDay(day) === 0;

    // Matching events for this day
    const dayEvents = events.filter(
      (e) => e.startDate <= dayStr && e.endDate >= dayStr
    );

    // Matching sessions for this day
    const daySessions = sessions.filter((s) => s.sessionDate === dayStr);

    const hasHolidayEvent = dayEvents.some((e) => e.isHoliday);

    return {
      date: day,
      dateString: dayStr,
      dayOfMonth: day.getDate(),
      isCurrentMonth: isCurMonth,
      isToday: checkIsToday(day),
      isSunday: isSun,
      events: dayEvents,
      sessions: daySessions,
      isHoliday: hasHolidayEvent,
    };
  });

  return {
    days,
    events,
    sessions,
    monthLabel: format(targetDate, "MMMM yyyy"),
  };
}
