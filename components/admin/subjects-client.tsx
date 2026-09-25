"use client";

import { useState } from "react";
import { SubjectItem, ProgrammeItem, SyllabusTopicItem } from "@/lib/data/admin";
import {
  createSubjectAction,
  addSyllabusTopicAction,
  deleteSyllabusTopicAction,
} from "@/app/(admin)/admin/actions";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  ListOrdered,
} from "lucide-react";

export function SubjectsClient({
  initialSubjects,
  programmes,
}: {
  initialSubjects: SubjectItem[];
  programmes: ProgrammeItem[];
}) {
  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");

  // Create Subject Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState(1);
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id || "");
  const [initialTopicsText, setInitialTopicsText] = useState("");

  // Syllabus Modal State
  const [activeSubject, setActiveSubject] = useState<SubjectItem | null>(null);
  const [activeTopics, setActiveTopics] = useState<SyllabusTopicItem[]>([]);
  const [isSyllabusLoading, setIsSyllabusLoading] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicUnit, setNewTopicUnit] = useState(1);

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(search.toLowerCase())) ||
      s.programmeName.toLowerCase().includes(search.toLowerCase());

    const matchesSem = semesterFilter === "all" || s.semester === Number(semesterFilter);
    const matchesProg = programmeFilter === "all" || s.programmeId === programmeFilter;

    return matchesSearch && matchesSem && matchesProg;
  });

  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const initialTopics = initialTopicsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await createSubjectAction({
      programmeId,
      semester,
      code: code || undefined,
      name,
      initialTopics,
    });

    setIsLoading(false);

    if (res.success) {
      const progName = programmes.find((p) => p.id === programmeId)?.name || "BHM";
      setSuccessMessage(`Subject "${name}" added successfully with ${initialTopics.length} syllabus topic(s)!`);
      setSubjects((prev) => [
        {
          id: res.subjectId || Math.random().toString(),
          programmeId,
          programmeName: progName,
          semester,
          code: code || null,
          name,
          topicCount: initialTopics.length,
        },
        ...prev,
      ]);
      setName("");
      setCode("");
      setInitialTopicsText("");
      setIsAddOpen(false);
    } else {
      setErrorMessage(res.error || "Failed to create subject.");
    }
  }

  async function openSyllabusModal(subject: SubjectItem) {
    setActiveSubject(subject);
    setIsSyllabusLoading(true);
    try {
      // Dynamic import or fetch
      const { getSubjectSyllabusTopics } = await import("@/lib/data/admin");
      const topics = await getSubjectSyllabusTopics(subject.id);
      setActiveTopics(topics);
    } catch {
      setActiveTopics([]);
    } finally {
      setIsSyllabusLoading(false);
    }
  }

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSubject || !newTopicTitle.trim()) return;

    setIsLoading(true);
    const res = await addSyllabusTopicAction(activeSubject.id, newTopicTitle.trim(), newTopicUnit);
    setIsLoading(false);

    if (res.success) {
      const nextSeq = activeTopics.length + 1;
      setActiveTopics((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          subjectId: activeSubject.id,
          unitNo: newTopicUnit,
          seq: nextSeq,
          title: newTopicTitle.trim(),
        },
      ]);
      // Update count in list
      setSubjects((prev) =>
        prev.map((s) => (s.id === activeSubject.id ? { ...s, topicCount: s.topicCount + 1 } : s))
      );
      setNewTopicTitle("");
    } else {
      alert(res.error || "Failed to add topic");
    }
  }

  async function handleDeleteTopic(topicId: string) {
    if (!activeSubject) return;
    const res = await deleteSyllabusTopicAction(topicId, activeSubject.id);
    if (res.success) {
      setActiveTopics((prev) => prev.filter((t) => t.id !== topicId));
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === activeSubject.id ? { ...s, topicCount: Math.max(0, s.topicCount - 1) } : s
        )
      );
    } else {
      alert(res.error || "Failed to delete topic");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-600" />
            Curriculum & Subject Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Define academic subjects by semester, establish syllabus units, and monitor course coverage.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Subject</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by subject name, code, or programme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
        >
          <option value="all">All Semesters (1-6)</option>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>

        <select
          value={programmeFilter}
          onChange={(e) => setProgrammeFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
        >
          <option value="all">All Programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
      </div>

      {/* Subjects Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4">Programme & Semester</th>
                <th className="py-3 px-4 text-center">Syllabus Topics</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No subjects found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-[11px] border border-slate-200">
                        {sub.code || "N/A"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="font-semibold text-slate-900 text-xs">{sub.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                        {sub.programmeName} • Sem {sub.semester}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        <FileText className="w-3 h-3 text-slate-500" />
                        {sub.topicCount} topic{sub.topicCount === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openSyllabusModal(sub)}
                        className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>Syllabus Topics</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subject Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Add New Academic Subject
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

            <form onSubmit={handleCreateSubject} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Programme *
                  </label>
                  <select
                    value={programmeId}
                    onChange={(e) => setProgrammeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                  >
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester (1 - 6) *
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BHM105"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beverage Operations & Wine Studies"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Syllabus Topics (One topic per line)
                </label>
                <textarea
                  rows={4}
                  placeholder="Unit 1: Introduction to Viticulture&#10;Unit 1: Classification of Old World Wines&#10;Unit 2: Spirits Distillation Processes"
                  value={initialTopicsText}
                  onChange={(e) => setInitialTopicsText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  You can also add or modify syllabus topics individually at any time.
                </p>
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Save Subject"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Syllabus Topics Drawer / Modal */}
      {activeSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-amber-600" />
                  Syllabus: {activeSubject.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {activeSubject.code || "NO CODE"} • {activeSubject.programmeName} • Sem {activeSubject.semester}
                </p>
              </div>
              <button
                onClick={() => setActiveSubject(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Topics List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isSyllabusLoading ? (
                <div className="text-center py-8 text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading syllabus topics...
                </div>
              ) : activeTopics.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No syllabus topics defined yet. Add the first topic below.
                </div>
              ) : (
                activeTopics.map((topic, index) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shrink-0">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-medium text-slate-800">{topic.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Unit {topic.unitNo || 1}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTopic(topic.id)}
                      title="Delete topic"
                      className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Topic Input Form */}
            <form onSubmit={handleAddTopic} className="pt-3 border-t border-slate-100 shrink-0 space-y-2">
              <div className="text-xs font-semibold text-slate-700">Add New Syllabus Topic:</div>
              <div className="flex gap-2">
                <select
                  value={newTopicUnit}
                  onChange={(e) => setNewTopicUnit(Number(e.target.value))}
                  className="w-24 px-2 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white shrink-0"
                >
                  {[1, 2, 3, 4, 5].map((u) => (
                    <option key={u} value={u}>
                      Unit {u}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Operating Procedures for Banquet Service"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isLoading || !newTopicTitle.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
