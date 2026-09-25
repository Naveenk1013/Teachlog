"use client";

import { useState, useId } from "react";
import { BatchItem, ProgrammeItem } from "@/lib/data/admin";
import {
  createBatchAction,
  createMultipleBatchesAction,
  deleteBatchAction,
} from "@/app/(admin)/admin/actions";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Loader2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  CheckSquare,
  Square,
  Beaker,
  BookOpen,
  Trash2,
} from "lucide-react";

function parseBatchSectionAndGroup(name: string) {
  // Check for Section: Sec A, Sec B, Sec C, Section A, Section B
  const secMatch = name.match(/Sec(?:tion)?\s+([A-Za-z0-9]+)/i);
  const section = secMatch ? `Sec ${secMatch[1].toUpperCase()}` : null;

  // Check for Practical Group: [P1], [P2], P1, P2 etc.
  const groupMatch = name.match(/\[(P\d+)\]/i) || name.match(/\b(P[1-9]\d*)\b/i);
  const group = groupMatch ? groupMatch[1].toUpperCase() : null;

  const isPractical = !!group;
  const isTheory = !group && !!section;

  return { section, group, isPractical, isTheory };
}

export function BatchesClient({
  initialBatches,
  programmes,
}: {
  initialBatches: BatchItem[];
  programmes: ProgrammeItem[];
}) {
  const [batches, setBatches] = useState<BatchItem[]>(initialBatches);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"single" | "multi">("single");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Common Form State
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id || "");
  const [intakeYear, setIntakeYear] = useState(new Date().getFullYear());
  const [currentSemester, setCurrentSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [semesterStartDate, setSemesterStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Single Batch Form State
  const [sectionChoice, setSectionChoice] = useState<"Sec A" | "Sec B" | "Sec C" | "CUSTOM">("Sec A");
  const [customSection, setCustomSection] = useState("");
  const [groupChoice, setGroupChoice] = useState<string>("ALL");
  const [customGroup, setCustomGroup] = useState("");
  const [classStrength, setClassStrength] = useState(60);
  const [batchName, setBatchName] = useState("");
  const [autoSyncName, setAutoSyncName] = useState(true);

  // Multi Generator State
  const [multiTheoryStrength, setMultiTheoryStrength] = useState(60);
  const [multiPracticalStrength, setMultiPracticalStrength] = useState(30);
  const [selectedMultiKeys, setSelectedMultiKeys] = useState<Record<string, boolean>>({
    secA_theory: true,
    secA_p1: true,
    secA_p2: true,
    secB_theory: true,
    secB_p3: true,
    secB_p4: true,
  });

  const intakeEndYear = (intakeYear + 3).toString().slice(-2);
  const baseIntakeName = `Intake ${intakeYear}-${intakeEndYear} (Sem ${currentSemester})`;

  // Determine active section name string
  const activeSectionName = sectionChoice === "CUSTOM" ? customSection.trim() || "Sec Custom" : sectionChoice;

  // Compute auto-generated batch name
  function computeBatchName(sec: string, grp: string, cGroup: string) {
    if (grp === "ALL") {
      return `${baseIntakeName} - ${sec}`;
    }
    if (grp === "BOTH") {
      return `${baseIntakeName} - ${sec} [P1 & P2]`;
    }
    const groupLabel = grp === "CUSTOM" ? (cGroup.trim() || "P1") : grp;
    return `${baseIntakeName} - ${sec} [${groupLabel}]`;
  }

  // Update batch name when parameters change if autoSyncName is enabled
  function handleSectionChange(newSection: "Sec A" | "Sec B" | "Sec C" | "CUSTOM") {
    setSectionChoice(newSection);
    // Reset group to ALL when switching sections
    setGroupChoice("ALL");
    setClassStrength(60);
    if (autoSyncName) {
      const computedSec = newSection === "CUSTOM" ? (customSection.trim() || "Sec Custom") : newSection;
      setBatchName(computeBatchName(computedSec, "ALL", customGroup));
    }
  }

  function handleGroupChange(newGroup: string) {
    setGroupChoice(newGroup);
    if (newGroup === "ALL") {
      setClassStrength(60);
    } else {
      setClassStrength(30);
    }
    if (autoSyncName) {
      setBatchName(computeBatchName(activeSectionName, newGroup, customGroup));
    }
  }

  // Multi-batch items definition
  const multiBatchTemplates = [
    {
      key: "secA_theory",
      section: "Sec A",
      group: "ALL",
      name: `${baseIntakeName} - Sec A`,
      type: "Theory (All Students)",
      defaultStrength: multiTheoryStrength,
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    {
      key: "secA_p1",
      section: "Sec A",
      group: "P1",
      name: `${baseIntakeName} - Sec A [P1]`,
      type: "Practical Group P1",
      defaultStrength: multiPracticalStrength,
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    },
    {
      key: "secA_p2",
      section: "Sec A",
      group: "P2",
      name: `${baseIntakeName} - Sec A [P2]`,
      type: "Practical Group P2",
      defaultStrength: multiPracticalStrength,
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    },
    {
      key: "secB_theory",
      section: "Sec B",
      group: "ALL",
      name: `${baseIntakeName} - Sec B`,
      type: "Theory (All Students)",
      defaultStrength: multiTheoryStrength,
      badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
    },
    {
      key: "secB_p3",
      section: "Sec B",
      group: "P3",
      name: `${baseIntakeName} - Sec B [P3]`,
      type: "Practical Group P3",
      defaultStrength: multiPracticalStrength,
      badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    },
    {
      key: "secB_p4",
      section: "Sec B",
      group: "P4",
      name: `${baseIntakeName} - Sec B [P4]`,
      type: "Practical Group P4",
      defaultStrength: multiPracticalStrength,
      badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    },
  ];

  // Filtering Batches for Table
  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.academicYear.toLowerCase().includes(search.toLowerCase()) ||
      b.programmeName.toLowerCase().includes(search.toLowerCase());

    const matchesSem = semesterFilter === "all" || b.currentSemester === Number(semesterFilter);

    const { section, isPractical, isTheory } = parseBatchSectionAndGroup(b.name);
    let matchesType = true;
    if (typeFilter === "sec_a") {
      matchesType = section === "Sec A";
    } else if (typeFilter === "sec_b") {
      matchesType = section === "Sec B";
    } else if (typeFilter === "practical") {
      matchesType = isPractical;
    } else if (typeFilter === "theory") {
      matchesType = isTheory;
    }

    return matchesSearch && matchesSem && matchesType;
  });

  // Handler for Single Batch Submit
  async function handleCreateSingleBatch(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // If user chose "BOTH" groups in single form, we create two practical batches
    if (groupChoice === "BOTH") {
      const g1 = sectionChoice === "Sec A" ? "P1" : sectionChoice === "Sec B" ? "P3" : "P5";
      const g2 = sectionChoice === "Sec A" ? "P2" : sectionChoice === "Sec B" ? "P4" : "P6";
      const b1Name = `${baseIntakeName} - ${activeSectionName} [${g1}]`;
      const b2Name = `${baseIntakeName} - ${activeSectionName} [${g2}]`;

      const res = await createMultipleBatchesAction([
        {
          programmeId,
          name: b1Name,
          intakeYear,
          currentSemester,
          academicYear,
          classStrength,
          semesterStartDate,
        },
        {
          programmeId,
          name: b2Name,
          intakeYear,
          currentSemester,
          academicYear,
          classStrength,
          semesterStartDate,
        },
      ]);

      setIsLoading(false);
      if (res.success) {
        const progName = programmes.find((p) => p.id === programmeId)?.name || "BHM";
        const newItems: BatchItem[] = (res.createdBatches || []).map((b) => ({
          id: b.id,
          programmeId,
          programmeName: progName,
          name: b.name,
          intakeYear: b.intakeYear,
          currentSemester: b.currentSemester,
          academicYear: b.academicYear,
          semesterStartDate: b.semesterStartDate,
          classStrength: b.classStrength,
          isActive: true,
        }));
        setBatches((prev) => [...newItems, ...prev]);
        setSuccessMessage(`Successfully registered groups ${g1} and ${g2} for ${activeSectionName}!`);
        setIsAddOpen(false);
      } else {
        setErrorMessage(res.errors?.join(", ") || "Failed to create batches.");
      }
      return;
    }

    const finalName = batchName.trim() || computeBatchName(activeSectionName, groupChoice, customGroup);

    const res = await createBatchAction({
      programmeId,
      name: finalName,
      intakeYear,
      currentSemester,
      academicYear,
      classStrength,
      semesterStartDate,
    });

    setIsLoading(false);

    if (res.success) {
      const progName = programmes.find((p) => p.id === programmeId)?.name || "BHM";
      setSuccessMessage(`Cohort / Batch "${finalName}" registered successfully!`);
      setBatches((prev) => [
        {
          id: res.batchId || Math.random().toString(),
          programmeId,
          programmeName: progName,
          name: finalName,
          intakeYear,
          currentSemester,
          academicYear,
          semesterStartDate,
          classStrength,
          isActive: true,
        },
        ...prev,
      ]);
      setIsAddOpen(false);
    } else {
      setErrorMessage(res.error || "Failed to create batch.");
    }
  }

  async function handleDeleteBatch(batch: BatchItem) {
    if (
      !confirm(
        `Are you sure you want to permanently delete cohort "${batch.name}"?\n\nThis will remove this batch, related teaching assignments, CR authorisations, academic events, and linked class sessions. This action CANNOT be undone.`
      )
    ) {
      return;
    }
    const res = await deleteBatchAction(batch.id);
    if (res.success) {
      setSuccessMessage(`Cohort "${batch.name}" was permanently deleted.`);
      setBatches((prev) => prev.filter((b) => b.id !== batch.id));
    } else {
      alert(res.error || "Failed to delete cohort/batch.");
    }
  }

  // Handler for Multi Batch Submit
  async function handleCreateMultiBatches(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const toCreate = multiBatchTemplates
      .filter((t) => selectedMultiKeys[t.key])
      .map((t) => ({
        programmeId,
        name: t.name,
        intakeYear,
        currentSemester,
        academicYear,
        classStrength: t.group === "ALL" ? multiTheoryStrength : multiPracticalStrength,
        semesterStartDate,
      }));

    if (toCreate.length === 0) {
      setIsLoading(false);
      setErrorMessage("Please select at least one batch to create.");
      return;
    }

    const res = await createMultipleBatchesAction(toCreate);
    setIsLoading(false);

    if (res.success) {
      const progName = programmes.find((p) => p.id === programmeId)?.name || "BHM";
      const newItems: BatchItem[] = (res.createdBatches || []).map((b) => ({
        id: b.id,
        programmeId,
        programmeName: progName,
        name: b.name,
        intakeYear: b.intakeYear,
        currentSemester: b.currentSemester,
        academicYear: b.academicYear,
        semesterStartDate: b.semesterStartDate,
        classStrength: b.classStrength,
        isActive: true,
      }));
      setBatches((prev) => [...newItems, ...prev]);

      let msg = `Created ${res.createdCount} batches successfully!`;
      if (res.skippedCount && res.skippedCount > 0) {
        msg += ` (${res.skippedCount} already existed and were skipped)`;
      }
      setSuccessMessage(msg);
      setIsAddOpen(false);
    } else {
      setErrorMessage(res.errors?.join(", ") || "Failed to create batches.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-600" />
            Student Batches, Sections & Groups
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage semester cohorts, theory sections (Sec A, Sec B), and practical lab groups (P1, P2, P3, P4).
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            // Default initial name
            setBatchName(computeBatchName("Sec A", "ALL", ""));
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Batch / Section</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by cohort name, Sec A, Sec B, P1-P4, or academic year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
          />
        </div>

        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
        >
          <option value="all">All Semesters (1-6)</option>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
        >
          <option value="all">All Sections & Groups</option>
          <option value="sec_a">Section A Cohorts</option>
          <option value="sec_b">Section B Cohorts</option>
          <option value="theory">Theory Sections (Whole Sec)</option>
          <option value="practical">Practical Groups (P1, P2, P3, P4)</option>
        </select>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Cohort / Batch Name</th>
                <th className="py-3 px-4">Section & Division</th>
                <th className="py-3 px-4">Programme</th>
                <th className="py-3 px-4 text-center">Semester</th>
                <th className="py-3 px-4 text-center">Academic Year</th>
                <th className="py-3 px-4 text-center">Class Strength</th>
                <th className="py-3 px-4">Semester Start</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No batches or sections found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const { section, group, isPractical, isTheory } = parseBatchSectionAndGroup(b.name);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          {isPractical ? (
                            <Beaker className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <Users className="w-4 h-4 text-cyan-600 shrink-0" />
                          )}
                          <span className="font-medium text-slate-900">{b.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 ml-6">
                          Intake Year: {b.intakeYear}
                        </div>
                      </td>

                      {/* Section & Division Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {section && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                section === "Sec A"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : section === "Sec B"
                                  ? "bg-violet-50 text-violet-700 border-violet-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {section}
                            </span>
                          )}

                          {group ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Beaker className="w-2.5 h-2.5" />
                              Lab {group}
                            </span>
                          ) : isTheory ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <BookOpen className="w-2.5 h-2.5" />
                              Theory
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          <GraduationCap className="w-3 h-3 text-slate-500" />
                          {b.programmeName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-cyan-50 text-cyan-800 font-semibold px-2.5 py-0.5 rounded-full text-xs">
                          Sem {b.currentSemester}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                        {b.academicYear}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-semibold text-xs px-2 py-0.5 rounded-md ${
                            isPractical
                              ? "bg-amber-50/70 text-amber-900 border border-amber-200/50"
                              : "text-slate-900"
                          }`}
                        >
                          {b.classStrength} students
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {b.semesterStartDate}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {b.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Archived</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(b)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Permanently Delete Cohort"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Register Batch Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  Register Student Batch & Practical Groups
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure Sections (Sec A, Sec B) and Practical Groups (P1, P2, P3, P4)
                </p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab("single")}
                className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === "single"
                    ? "bg-white text-cyan-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Single Section / Group
              </button>
              <button
                type="button"
                onClick={() => setModalTab("multi")}
                className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === "multi"
                    ? "bg-white text-cyan-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Semester Setup (Sec A & B)
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: SINGLE BATCH / GROUP FORM */}
            {modalTab === "single" && (
              <form onSubmit={handleCreateSingleBatch} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Programme *
                  </label>
                  <select
                    value={programmeId}
                    onChange={(e) => setProgrammeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden bg-white"
                  >
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Intake Year *
                    </label>
                    <input
                      type="number"
                      required
                      min={2020}
                      max={2035}
                      value={intakeYear}
                      onChange={(e) => {
                        const yr = Number(e.target.value);
                        setIntakeYear(yr);
                        if (autoSyncName) {
                          const endYr = (yr + 3).toString().slice(-2);
                          const base = `Intake ${yr}-${endYr} (Sem ${currentSemester})`;
                          const s = sectionChoice === "CUSTOM" ? customSection.trim() || "Sec Custom" : sectionChoice;
                          if (groupChoice === "ALL") setBatchName(`${base} - ${s}`);
                          else setBatchName(`${base} - ${s} [${groupChoice === "CUSTOM" ? customGroup || "P1" : groupChoice}]`);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current Semester *
                    </label>
                    <select
                      value={currentSemester}
                      onChange={(e) => {
                        const sem = Number(e.target.value);
                        setCurrentSemester(sem);
                        if (autoSyncName) {
                          const base = `Intake ${intakeYear}-${intakeEndYear} (Sem ${sem})`;
                          const s = sectionChoice === "CUSTOM" ? customSection.trim() || "Sec Custom" : sectionChoice;
                          if (groupChoice === "ALL") setBatchName(`${base} - ${s}`);
                          else setBatchName(`${base} - ${s} [${groupChoice === "CUSTOM" ? customGroup || "P1" : groupChoice}]`);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section Selection */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      1. Select Section *
                    </label>
                    <span className="text-[11px] text-slate-500">e.g. Sec A has P1, P2; Sec B has P3, P4</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(["Sec A", "Sec B", "Sec C", "CUSTOM"] as const).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleSectionChange(sec)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                          sectionChoice === sec
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {sec === "CUSTOM" ? "Custom..." : sec}
                      </button>
                    ))}
                  </div>

                  {sectionChoice === "CUSTOM" && (
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Enter custom section (e.g. Sec D or Weekend)"
                        value={customSection}
                        onChange={(e) => {
                          setCustomSection(e.target.value);
                          if (autoSyncName) {
                            setBatchName(computeBatchName(e.target.value.trim() || "Sec Custom", groupChoice, customGroup));
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-hidden bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Practical Group Selection */}
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Beaker className="w-3.5 h-3.5 text-amber-600" />
                      2. Practical Group / Division *
                    </label>
                    <span className="text-[11px] text-amber-700 font-medium">
                      {sectionChoice === "Sec A" && "Section A Labs: P1 & P2"}
                      {sectionChoice === "Sec B" && "Section B Labs: P3 & P4"}
                      {sectionChoice === "Sec C" && "Section C Labs: P5 & P6"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Theory Option */}
                    <button
                      type="button"
                      onClick={() => handleGroupChange("ALL")}
                      className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                        groupChoice === "ALL"
                          ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                          : "bg-white/80 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="font-semibold text-slate-800">Whole Section (Theory)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">All students (e.g. 60 students)</div>
                    </button>

                    {/* Section A Groups */}
                    {sectionChoice === "Sec A" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGroupChange("P1")}
                          className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                            groupChoice === "P1"
                              ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-white/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-amber-900">Group P1 (Lab Practical)</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Kitchen / Service practical group (~30 students)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupChange("P2")}
                          className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                            groupChoice === "P2"
                              ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-white/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-amber-900">Group P2 (Lab Practical)</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Kitchen / Service practical group (~30 students)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupChange("BOTH")}
                          className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                            groupChoice === "BOTH"
                              ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-white/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-cyan-900">Both P1 & P2</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Creates both practical batches at once</div>
                        </button>
                      </>
                    )}

                    {/* Section B Groups */}
                    {sectionChoice === "Sec B" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGroupChange("P3")}
                          className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                            groupChoice === "P3"
                              ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-white/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-amber-900">Group P3 (Lab Practical)</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Kitchen / Service practical group (~30 students)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupChange("P4")}
                          className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                            groupChoice === "P4"
                              ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-white/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-amber-900">Group P4 (Lab Practical)</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Kitchen / Service practical group (~30 students)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupChange("BOTH")}
                          className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                            groupChoice === "BOTH"
                              ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-white/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-cyan-900">Both P3 & P4</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Creates both practical batches at once</div>
                        </button>
                      </>
                    )}

                    {/* Section C or Custom */}
                    {(sectionChoice === "Sec C" || sectionChoice === "CUSTOM") && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGroupChange("P5")}
                          className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                            groupChoice === "P5"
                              ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-white/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-amber-900">Group P5</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Practical lab group</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupChange("P6")}
                          className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                            groupChoice === "P6"
                              ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-white/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-amber-900">Group P6</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Practical lab group</div>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Batch Name Preview & Override */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Generated Cohort / Batch Name *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newSync = !autoSyncName;
                        setAutoSyncName(newSync);
                        if (newSync) {
                          setBatchName(computeBatchName(activeSectionName, groupChoice, customGroup));
                        }
                      }}
                      className="text-[11px] text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      {autoSyncName ? "Edit manually" : "Reset to auto-generated"}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    readOnly={autoSyncName}
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-medium border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden ${
                      autoSyncName ? "bg-slate-50 border-slate-200 text-slate-900 font-mono" : "bg-white border-cyan-300"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standard convention: <code className="text-slate-600">Intake YYYY-YY (Sem X) - Sec A [P1]</code>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Academic Year *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="2026-27"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Class Strength *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={200}
                      value={classStrength}
                      onChange={(e) => setClassStrength(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">
                      {groupChoice === "ALL" ? "Default: ~60 (Whole Sec)" : "Default: ~30 (Lab Group)"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester Start Date
                  </label>
                  <input
                    type="date"
                    value={semesterStartDate}
                    onChange={(e) => setSemesterStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Registering...
                      </>
                    ) : groupChoice === "BOTH" ? (
                      "Register Both Groups (P1 & P2)"
                    ) : (
                      "Register Batch"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: QUICK SEMESTER SETUP (SEC A & B with P1-P4) */}
            {modalTab === "multi" && (
              <form onSubmit={handleCreateMultiBatches} className="space-y-4">
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Quick Semester Generator</span>
                    <p className="text-[11px] text-cyan-800 mt-0.5">
                      Instantly generate all standard Theory Sections (Sec A, Sec B) and Practical Groups (P1 & P2 for Sec A, P3 & P4 for Sec B) for the chosen semester.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Programme *
                  </label>
                  <select
                    value={programmeId}
                    onChange={(e) => setProgrammeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden bg-white"
                  >
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Intake Year *
                    </label>
                    <input
                      type="number"
                      required
                      min={2020}
                      max={2035}
                      value={intakeYear}
                      onChange={(e) => setIntakeYear(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current Semester *
                    </label>
                    <select
                      value={currentSemester}
                      onChange={(e) => setCurrentSemester(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
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
                      placeholder="2026-27"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Theory Section Strength
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={150}
                      value={multiTheoryStrength}
                      onChange={(e) => setMultiTheoryStrength(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">For Sec A & Sec B theory</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Practical Group Strength
                    </label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={100}
                      value={multiPracticalStrength}
                      onChange={(e) => setMultiPracticalStrength(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">For P1, P2, P3, P4 lab cohorts</span>
                  </div>
                </div>

                {/* Cohort Checklist Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Cohorts to Register ({Object.values(selectedMultiKeys).filter(Boolean).length} of 6 selected)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = Object.values(selectedMultiKeys).every(Boolean);
                        const next: Record<string, boolean> = {};
                        multiBatchTemplates.forEach((t) => {
                          next[t.key] = !allSelected;
                        });
                        setSelectedMultiKeys(next);
                      }}
                      className="text-[11px] text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      {Object.values(selectedMultiKeys).every(Boolean) ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                    {multiBatchTemplates.map((t) => {
                      const isChecked = !!selectedMultiKeys[t.key];
                      return (
                        <div
                          key={t.key}
                          onClick={() =>
                            setSelectedMultiKeys((prev) => ({
                              ...prev,
                              [t.key]: !prev[t.key],
                            }))
                          }
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? "bg-slate-50/90 border-cyan-400/80 shadow-xs"
                              : "bg-white border-slate-200 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-cyan-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div>
                              <div className="text-xs font-semibold text-slate-900 font-mono">
                                {t.name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {t.type} • {t.section}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${t.badgeColor}`}>
                              {t.group === "ALL" ? t.section : t.group}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {t.group === "ALL" ? multiTheoryStrength : multiPracticalStrength} seats
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                    disabled={isLoading || Object.values(selectedMultiKeys).filter(Boolean).length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating Cohorts...
                      </>
                    ) : (
                      `Generate Selected Batches (${Object.values(selectedMultiKeys).filter(Boolean).length})`
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
