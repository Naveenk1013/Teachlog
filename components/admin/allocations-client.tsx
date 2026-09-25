"use client";

import { useState } from "react";
import {
  TeachingAssignmentItem,
  TeacherItem,
  SubjectItem,
  BatchItem,
} from "@/lib/data/admin";
import {
  createTeachingAssignmentAction,
  removeTeachingAssignmentAction,
} from "@/app/(admin)/admin/actions";
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  Building,
  BookOpen,
  Users,
} from "lucide-react";

export function AllocationsClient({
  initialAssignments,
  teachers,
  subjects,
  batches,
}: {
  initialAssignments: TeachingAssignmentItem[];
  teachers: TeacherItem[];
  subjects: SubjectItem[];
  batches: BatchItem[];
}) {
  const [assignments, setAssignments] = useState<TeachingAssignmentItem[]>(initialAssignments);
  const [search, setSearch] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || "");
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || "");
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || "");
  const [academicYear, setAcademicYear] = useState("2026-27");

  const academicYears = Array.from(new Set(assignments.map((a) => a.academicYear)));
  if (!academicYears.includes("2026-27")) academicYears.push("2026-27");

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      a.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      (a.subjectCode && a.subjectCode.toLowerCase().includes(search.toLowerCase())) ||
      a.batchName.toLowerCase().includes(search.toLowerCase());

    const matchesYear = academicYearFilter === "all" || a.academicYear === academicYearFilter;
    return matchesSearch && matchesYear;
  });

  async function handleCreateAllocation(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await createTeachingAssignmentAction({
      teacherId: selectedTeacherId,
      subjectId: selectedSubjectId,
      batchId: selectedBatchId,
      academicYear,
    });

    setIsLoading(false);

    if (res.success) {
      const teacher = teachers.find((t) => t.id === selectedTeacherId);
      const subject = subjects.find((s) => s.id === selectedSubjectId);
      const batch = batches.find((b) => b.id === selectedBatchId);

      setSuccessMessage(
        `Successfully allocated ${teacher?.fullName || "Faculty"} to ${subject?.name || "Subject"} for ${batch?.name || "Batch"} (${academicYear})!`
      );

      setAssignments((prev) => [
        {
          id: Math.random().toString(),
          teacherId: selectedTeacherId,
          teacherName: teacher?.fullName || "Faculty",
          teacherDepartment: teacher?.department || null,
          subjectId: selectedSubjectId,
          subjectCode: subject?.code || null,
          subjectName: subject?.name || "Subject",
          semester: subject?.semester || 1,
          batchId: selectedBatchId,
          batchName: batch?.name || "Batch",
          academicYear,
        },
        ...prev,
      ]);

      setIsAddOpen(false);
    } else {
      setErrorMessage(res.error || "Failed to create teaching allocation.");
    }
  }

  async function handleRemoveAllocation(assignmentId: string) {
    if (!confirm("Are you sure you want to remove this faculty allocation?")) return;

    const res = await removeTeachingAssignmentAction(assignmentId);
    if (res.success) {
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } else {
      alert(res.error || "Failed to remove allocation");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Faculty Teaching Allocations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign teaching faculty to academic subjects and student cohorts. Multiple teachers can be assigned to parallel sections.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Allocate Teacher</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by faculty, subject name, code, or cohort..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <select
          value={academicYearFilter}
          onChange={(e) => setAcademicYearFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
        >
          <option value="all">All Academic Years</option>
          {academicYears.map((yr) => (
            <option key={yr} value={yr}>
              AY {yr}
            </option>
          ))}
        </select>
      </div>

      {/* Allocations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Subject & Code</th>
                <th className="py-3 px-4">Student Cohort / Batch</th>
                <th className="py-3 px-4 text-center">Academic Year</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No faculty allocations found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                          {alloc.teacherName.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{alloc.teacherName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Building className="w-2.5 h-2.5" />
                            {alloc.teacherDepartment || "General"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        {alloc.subjectName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {alloc.subjectCode || "N/A"} • Semester {alloc.semester}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md text-[11px] font-medium">
                        <Users className="w-3 h-3 text-slate-500" />
                        {alloc.batchName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-indigo-50 text-indigo-700 font-mono text-[11px] px-2 py-0.5 rounded-full font-semibold">
                        {alloc.academicYear}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRemoveAllocation(alloc.id)}
                        title="Remove allocation"
                        className="text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Unassign</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocate Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Allocate Teaching Faculty
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateAllocation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Faculty Member *
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department || "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Subject *
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || "NO CODE"} - Sem {s.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Cohort / Batch *
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Sem {b.currentSemester}, AY {b.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-27"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Allocating...
                    </>
                  ) : (
                    "Confirm Allocation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
