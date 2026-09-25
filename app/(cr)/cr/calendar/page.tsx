import { redirect } from "next/navigation";
import { getCurrentCRUser, getCRBatchAndAssignments } from "@/lib/data/cr";
import { getMonthCalendarData } from "@/lib/data/calendar";
import { AcademicCalendar } from "@/components/calendar/academic-calendar";
import { Calendar as CalendarIcon, Sparkles } from "lucide-react";

interface CRCalendarPageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    subjectId?: string;
  }>;
}

export default async function CRCalendarPage({ searchParams }: CRCalendarPageProps) {
  const crUser = await getCurrentCRUser();
  if (!crUser) {
    redirect("/login");
  }

  const { batch, assignments } = await getCRBatchAndAssignments(crUser.id);
  if (!batch) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <h2 className="text-base font-bold text-slate-800">No Active Batch Allocated</h2>
        <p className="text-xs text-slate-500 mt-1">Please contact the academic office.</p>
      </div>
    );
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

  const subjects = assignments.map((a) => ({
    id: a.subjectId,
    name: `${a.subjectName} (${a.teacherName})`,
  }));

  const calendarData = await getMonthCalendarData(targetDate, {
    batchId: batch.id,
    subjectId: resolvedParams.subjectId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
            Cohort Schedule &amp; Log Explorer
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Academic Calendar • {batch.name}
          </h1>
          <p className="text-xs text-slate-500">
            Check class topics, attendance records, and upcoming state holidays &amp; vacations.
          </p>
        </div>

        <span className="text-xs font-medium px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Click any date to see what was taught
        </span>
      </div>

      {/* Main Calendar */}
      <AcademicCalendar
        days={calendarData.days}
        events={calendarData.events}
        sessions={calendarData.sessions}
        monthLabel={calendarData.monthLabel}
        currentYear={currentYear}
        currentMonth={currentMonth}
        subjects={subjects}
        canManageEvents={false}
        userRole="cr"
      />
    </div>
  );
}
