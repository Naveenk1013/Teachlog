import { redirect } from "next/navigation";
import { getCurrentTeacherUser, getTeacherAssignments } from "@/lib/data/teacher";
import { getMonthCalendarData } from "@/lib/data/calendar";
import { AcademicCalendar } from "@/components/calendar/academic-calendar";
import { Calendar as CalendarIcon, Sparkles } from "lucide-react";

interface TeacherCalendarPageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    batchId?: string;
    subjectId?: string;
  }>;
}

export default async function TeacherCalendarPage({
  searchParams,
}: TeacherCalendarPageProps) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const now = new Date();

  const currentYear = resolvedParams.year
    ? parseInt(resolvedParams.year, 10)
    : now.getFullYear();
  const currentMonth = resolvedParams.month
    ? parseInt(resolvedParams.month, 10)
    : now.getMonth() + 1;

  const targetDate = new Date(currentYear, currentMonth - 1, 1);

  // Load teacher's assigned batches and subjects for filters
  const assignments = await getTeacherAssignments(teacher.id);

  // Unique batches and subjects
  const batchMap = new Map<string, string>();
  const subjectMap = new Map<string, string>();

  assignments.forEach((a) => {
    batchMap.set(a.batchId, a.batchName);
    subjectMap.set(a.subjectId, `${a.subjectName} (${a.subjectCode || "Core"})`);
  });

  const batches = Array.from(batchMap.entries()).map(([id, name]) => ({ id, name }));
  const subjects = Array.from(subjectMap.entries()).map(([id, name]) => ({ id, name }));

  // Load calendar data
  const calendarData = await getMonthCalendarData(targetDate, {
    batchId: resolvedParams.batchId,
    subjectId: resolvedParams.subjectId,
    teacherId: teacher.role === "admin" ? undefined : teacher.id,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Institutional Schedule &amp; Log Explorer
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Academic Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore past and upcoming teaching dates, Telangana state festivals, institutional vacations, and syllabus coverage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Click any date to inspect classes
          </span>
        </div>
      </div>

      {/* Main Calendar View */}
      <AcademicCalendar
        days={calendarData.days}
        events={calendarData.events}
        sessions={calendarData.sessions}
        monthLabel={calendarData.monthLabel}
        currentYear={currentYear}
        currentMonth={currentMonth}
        batches={batches}
        subjects={subjects}
        canManageEvents={true}
        userRole={teacher.role}
      />
    </div>
  );
}
