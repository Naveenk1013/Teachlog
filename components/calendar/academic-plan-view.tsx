"use client";

import { useState } from "react";
import {
  AcademicEvent,
  INSTITUTIONAL_ACADEMIC_SOPS,
  DEFAULT_ACADEMIC_EVENTS,
} from "@/lib/data/calendar";
import {
  Calendar,
  BookOpen,
  CheckCircle2,
  FileText,
  Printer,
  Search,
  AlertCircle,
  Plus,
  Building,
  GraduationCap,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AcademicPlanViewProps {
  events: AcademicEvent[];
  canManageEvents?: boolean;
  onOpenAddEvent: () => void;
}

export function AcademicPlanView({
  events,
  canManageEvents = false,
  onOpenAddEvent,
}: AcademicPlanViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "sops" | "milestones">("schedule");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedSOP, setExpandedSOP] = useState<string | null>(INSTITUTIONAL_ACADEMIC_SOPS[0].id);

  // Combine database events with built-in default events, removing duplicate IDs
  const allEventsMap = new Map<string, AcademicEvent>();
  for (const ev of DEFAULT_ACADEMIC_EVENTS) {
    allEventsMap.set(ev.title.toLowerCase(), ev);
  }
  for (const ev of events) {
    allEventsMap.set(ev.title.toLowerCase(), ev);
  }
  const combinedEvents = Array.from(allEventsMap.values()).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const filteredEvents = combinedEvents.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase()));

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "holiday" && e.eventType === "holiday") ||
      (typeFilter === "vacation" && e.eventType === "vacation") ||
      (typeFilter === "exam" && e.eventType === "exam") ||
      (typeFilter === "event" && e.eventType === "event");

    return matchesSearch && matchesType;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Official Institute Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/iihm_logo.png"
                alt="IIHM Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-indigo-700 uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  Official Academic Document
                </span>
                <span className="text-[10px] text-slate-400 font-medium">AY 2026-27</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                IIHM Hyderabad Academic Plan &amp; SOPs
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                International Institute of Hotel Management • Telangana State &amp; National Gazetted Holidays, Term Vacations &amp; Institutional Leave Guidelines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Schedule</span>
            </button>

            {canManageEvents && (
              <button
                type="button"
                onClick={onOpenAddEvent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Date to Calendar</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-1 border-t border-slate-100 mt-5 pt-3 print:hidden">
          <button
            type="button"
            onClick={() => setActiveSubTab("schedule")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "schedule"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Dates &amp; Holidays ({combinedEvents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("sops")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "sops"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Leave &amp; Rescheduling SOPs ({INSTITUTIONAL_ACADEMIC_SOPS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("milestones")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "milestones"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Semester Milestones</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ACADEMIC DATES & HOLIDAYS SCHEDULE */}
      {activeSubTab === "schedule" && (
        <div className="space-y-4">
          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 print:hidden">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search holidays, festivals, examinations, or vacations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">All Event Categories</option>
              <option value="holiday">Gazetted &amp; State Holidays</option>
              <option value="vacation">Vacation Breaks</option>
              <option value="exam">Examinations &amp; CIE</option>
              <option value="event">Institutional Events</option>
            </select>
          </div>

          {/* Schedule Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 w-40">Date / Period</th>
                    <th className="py-3.5 px-4">Event / Festival Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Class Status</th>
                    <th className="py-3.5 px-4">Remarks &amp; Guidelines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">
                        No academic events found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev) => {
                      const isMultiDay = ev.startDate !== ev.endDate;
                      let badgeStyle = "bg-slate-100 text-slate-700";
                      let categoryLabel = "Event";
                      if (ev.eventType === "holiday") {
                        badgeStyle = "bg-red-50 text-red-700 border border-red-200";
                        categoryLabel = "Gazetted Holiday";
                      } else if (ev.eventType === "vacation") {
                        badgeStyle = "bg-amber-50 text-amber-800 border border-amber-200";
                        categoryLabel = "Term Vacation";
                      } else if (ev.eventType === "exam") {
                        badgeStyle = "bg-purple-50 text-purple-800 border border-purple-200";
                        categoryLabel = "Examinations";
                      } else if (ev.eventType === "event") {
                        badgeStyle = "bg-emerald-50 text-emerald-800 border border-emerald-200";
                        categoryLabel = "Institutional Event";
                      }

                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                            <div className="font-semibold text-slate-900">{ev.startDate}</div>
                            {isMultiDay && (
                              <div className="text-[10px] text-slate-400">to {ev.endDate}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-xs">{ev.title}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeStyle}`}
                            >
                              {categoryLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {ev.isHoliday ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                                Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                In Session
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                            <div className="text-[11px] line-clamp-2">
                              {ev.description || "Official institutional observance."}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INSTITUTIONAL SOPS FOR HOLIDAYS & LEAVES */}
      {activeSubTab === "sops" && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Standard Operating Procedures (SOPs) &amp; Compliance Policy</span>
              <p className="mt-0.5 text-indigo-800 leading-relaxed">
                These procedures govern student attendance, faculty lesson plan continuity, class representative logging protocol, and compensatory scheduling across IIHM Hyderabad. All faculty and students are required to adhere strictly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INSTITUTIONAL_ACADEMIC_SOPS.map((sop) => {
              const isExpanded = expandedSOP === sop.id;
              return (
                <div
                  key={sop.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {sop.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedSOP(isExpanded ? null : sop.id)}
                        className="text-slate-400 hover:text-slate-600 p-1 text-xs font-semibold flex items-center gap-1"
                      >
                        <span>{isExpanded ? "Collapse" : "Expand"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{sop.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{sop.summary}</p>

                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Mandatory Guidelines:
                        </span>
                        <ul className="space-y-2">
                          {sop.guidelines.map((guide, idx) => (
                            <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                              <span className="leading-relaxed">{guide}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SEMESTER MILESTONES OVERVIEW */}
      {activeSubTab === "milestones" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Odd Semester Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Semesters 1, 3, 5
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">Odd Semester (July – Dec 2026)</h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  Current Term
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Commencement of Lectures</span>
                <span className="font-semibold text-slate-900">July 15, 2026</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Mid-Term Assessment (CIE)</span>
                <span className="font-semibold text-slate-900">Nov 23 – Nov 28, 2026</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">End of Teaching Days</span>
                <span className="font-semibold text-slate-900">December 05, 2026</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Preparatory Leave</span>
                <span className="font-semibold text-slate-900">Dec 07 – Dec 12, 2026</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">University Final Examinations</span>
                <span className="font-semibold text-slate-900">Dec 14 – Dec 23, 2026</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Winter Term Break</span>
                <span className="font-semibold text-slate-900">Dec 24, 2026 – Jan 02, 2027</span>
              </div>
            </div>
          </div>

          {/* Even Semester Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                  Semesters 2, 4, 6
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">Even Semester (Jan – June 2027)</h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  Upcoming Term
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Resumption of Classes</span>
                <span className="font-semibold text-slate-900">January 04, 2027</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Mid-Term Practical Reviews</span>
                <span className="font-semibold text-slate-900">March 15 – March 20, 2027</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">End of Teaching Term</span>
                <span className="font-semibold text-slate-900">April 24, 2027</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Preparatory Leave</span>
                <span className="font-semibold text-slate-900">April 26 – May 01, 2027</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Final University Examinations</span>
                <span className="font-semibold text-slate-900">May 03 – May 15, 2027</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Summer Vacation &amp; Internships</span>
                <span className="font-semibold text-slate-900">June 03 – July 10, 2027</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
