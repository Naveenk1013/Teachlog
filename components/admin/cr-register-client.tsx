"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CRAuthorisationItem } from "@/lib/data/admin";
import {
  grantCRAuthorisationAction,
  revokeCRAuthorisationAction,
  createStudentAndGrantCRAction,
  updateUserCredentialsAction,
  deleteCRAction,
} from "@/app/(admin)/admin/actions";
import {
  UserCheck,
  UserX,
  ShieldCheck,
  Plus,
  AlertCircle,
  X,
  Clock,
  CheckCircle2,
  Calendar,
  UserPlus,
  Users,
  Key,
  Mail,
  Lock,
  Loader2,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface CRRegisterClientProps {
  authorisations: CRAuthorisationItem[];
  availableStudents: { id: string; name: string; email?: string }[];
  availableBatches: { id: string; name: string; academicYear: string }[];
}

export function CRRegisterClient({
  authorisations,
  availableStudents,
  availableBatches,
}: CRRegisterClientProps) {
  const router = useRouter();
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"new" | "existing">("new");
  const [revokeTarget, setRevokeTarget] = useState<CRAuthorisationItem | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // New Student Form State
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("password123");

  // Existing Student State
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Common Allocation State
  const [selectedBatchId, setSelectedBatchId] = useState(availableBatches[0]?.id || "");
  const [academicYear, setAcademicYear] = useState(availableBatches[0]?.academicYear || "2026-27");
  const [replaceExisting, setReplaceExisting] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit CR Credentials State
  const [editCRTarget, setEditCRTarget] = useState<CRAuthorisationItem | null>(null);
  const [editCRName, setEditCRName] = useState("");
  const [editCREmail, setEditCREmail] = useState("");
  const [editCRPassword, setEditCRPassword] = useState("");
  const [editCRError, setEditCRError] = useState<string | null>(null);
  const [isEditCRLoading, setIsEditCRLoading] = useState(false);

  const openCREditModal = (auth: CRAuthorisationItem) => {
    setEditCRTarget(auth);
    setEditCRName(auth.crName);
    setEditCREmail(auth.crEmail || "");
    setEditCRPassword("");
    setEditCRError(null);
  };

  const handleUpdateCRCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCRTarget) return;

    setIsEditCRLoading(true);
    setEditCRError(null);

    const res = await updateUserCredentialsAction({
      userId: editCRTarget.crId,
      fullName: editCRName,
      email: editCREmail,
      password: editCRPassword.trim() ? editCRPassword : undefined,
    });

    setIsEditCRLoading(false);

    if (res.success) {
      setSuccessMessage(`Credentials updated for Class Representative "${editCRName}"!`);
      setEditCRTarget(null);
    } else {
      setEditCRError(res.error || "Failed to update CR credentials.");
    }
  };

  const handleGrant = () => {
    setError(null);
    setSuccessMessage(null);

    if (modalMode === "new") {
      if (!newFullName.trim() || !newEmail.trim()) {
        setError("Please enter the student's full name and official email.");
        return;
      }
      if (!selectedBatchId || !academicYear) {
        setError("Please select a target cohort/batch.");
        return;
      }

      startTransition(async () => {
        const res = await createStudentAndGrantCRAction({
          fullName: newFullName,
          email: newEmail,
          password: newPassword,
          batchId: selectedBatchId,
          academicYear,
          replaceExisting,
        });

        if (!res.success) {
          setError(res.error || "Failed to create student CR.");
        } else {
          setSuccessMessage(res.message || "Student registered and appointed as CR!");
          setIsGrantModalOpen(false);
          setNewFullName("");
          setNewEmail("");
          setNewPassword("password123");
        }
      });
    } else {
      if (!selectedStudentId || !selectedBatchId || !academicYear) {
        setError("Please select both a student and cohort.");
        return;
      }

      startTransition(async () => {
        const res = await grantCRAuthorisationAction(
          selectedStudentId,
          selectedBatchId,
          academicYear,
          replaceExisting
        );

        if (!res.success) {
          setError(res.error || "Failed to grant authorisation");
        } else {
          setSuccessMessage("CR Authorisation granted successfully!");
          setIsGrantModalOpen(false);
          setSelectedStudentId("");
        }
      });
    }
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    setError(null);
    setSuccessMessage(null);
    if (!revokeReason.trim()) {
      setError("Please enter a reason for revocation.");
      return;
    }

    startTransition(async () => {
      const res = await revokeCRAuthorisationAction(revokeTarget.id, revokeReason);
      if (!res.success) {
        setError(res.error || "Failed to revoke");
      } else {
        setSuccessMessage(`CR Access revoked for ${revokeTarget.crName}.`);
        setRevokeTarget(null);
        setRevokeReason("");
      }
    });
  };

  const handleDeleteCR = (auth: CRAuthorisationItem) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete Class Representative "${auth.crName}" (${auth.crEmail || "Student"})?\n\nThis will remove their appointment, student profile, authentication login, and any session logs entered by them. This action CANNOT be undone.`
      )
    ) {
      return;
    }
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await deleteCRAction(auth.id, auth.crId);
      if (!res.success) {
        setError(res.error || "Failed to delete Class Representative.");
      } else {
        setSuccessMessage(`Class Representative "${auth.crName}" was permanently deleted.`);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Class Representative Authorisation Register
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register new student CRs or assign cohorts. Active CRs can log teaching sessions for their assigned cohort.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalMode("new");
              setIsGrantModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Student CR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalMode("existing");
              setIsGrantModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>Select Existing</span>
          </button>
        </div>
      </div>

      {/* Register Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Representative</th>
                <th className="py-3 px-4">Cohort / Batch</th>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Granted Metadata</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {authorisations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No CR authorisations recorded yet. Click "Add New Student CR" to appoint representatives.
                  </td>
                </tr>
              ) : (
                authorisations.map((auth) => {
                  const grantedDate = format(parseISO(auth.grantedAt), "dd MMM yyyy");
                  const revokedDate = auth.revokedAt
                    ? format(parseISO(auth.revokedAt), "dd MMM yyyy")
                    : null;

                  return (
                    <tr
                      key={auth.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        auth.isActive ? "bg-white" : "bg-slate-50/40 opacity-80"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block leading-tight">
                          {auth.crName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {auth.crEmail || "Student"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 block">
                          {auth.batchName}
                        </span>
                        <span className="text-[10px] text-indigo-600 font-medium">
                          Semester {auth.currentSemester}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-700">
                        {auth.academicYear}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-800 block">{grantedDate}</span>
                        <span className="text-[10px] text-slate-400">
                          By {auth.grantedByName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {auth.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Active CR
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <UserX className="w-3 h-3 text-red-600" />
                              Revoked
                            </span>
                            {auth.revokeReason && (
                              <span className="text-[10px] text-slate-400 block italic max-w-[150px] truncate" title={auth.revokeReason}>
                                Reason: {auth.revokeReason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openCREditModal(auth)}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Key className="w-3 h-3 text-indigo-600" />
                            <span>Edit Credentials</span>
                          </button>
                          {auth.isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setRevokeTarget(auth);
                              }}
                              className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Revoke Access
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCR(auth)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Permanently Delete Class Representative"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                            <span>Delete</span>
                          </button>
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

      {/* Add / Grant Authorisation Modal */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {modalMode === "new" ? (
                  <UserPlus className="w-5 h-5 text-indigo-300" />
                ) : (
                  <UserCheck className="w-5 h-5 text-indigo-300" />
                )}
                <h3 className="text-base font-bold">
                  {modalMode === "new" ? "Add & Authorise New Student CR" : "Assign Existing Student as CR"}
                </h3>
              </div>
              <button
                onClick={() => setIsGrantModalOpen(false)}
                className="p-1 rounded-lg text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setModalMode("new");
                }}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                  modalMode === "new"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Register New Student</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setModalMode("existing");
                }}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                  modalMode === "existing"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Select Existing Student</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {modalMode === "new" ? (
                <>
                  {/* New Student Details */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohan Verma"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Official Student Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rohan.cr@student.iihmhyd.edu.in"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Login Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Default: password123"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-slate-900 placeholder:text-slate-400"
                    />
                    <span className="text-[11px] text-slate-400 block">
                      Student can sign in immediately at /login using this password.
                    </span>
                  </div>
                </>
              ) : (
                /* Select Existing Student */
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 block">
                    Select Existing Student *
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden bg-white text-slate-900"
                  >
                    <option value="">-- Choose Registered Student --</option>
                    {availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.email ? `(${s.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Batch */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Assign Cohort / Batch *
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value);
                    const b = availableBatches.find((item) => item.id === e.target.value);
                    if (b?.academicYear) setAcademicYear(b.academicYear);
                  }}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden bg-white text-slate-900"
                >
                  <option value="">-- Choose Batch --</option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Academic Year *
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-slate-900"
                />
              </div>

              {/* Replace / Co-CR Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block">
                      Replace previous active CR for this cohort
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Leave unchecked if this student is a co-CR (multiple CRs can log for the same cohort).
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsGrantModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrant}
                disabled={isPending}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? (
                  <span>Processing...</span>
                ) : modalMode === "new" ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register & Appoint CR</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Confirm & Grant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Authorisation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserX className="w-5 h-5" />
                <h3 className="text-base font-bold">Revoke CR Access</h3>
              </div>
              <button
                onClick={() => setRevokeTarget(null)}
                className="p-1 rounded-lg text-red-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-xs text-slate-600">
                You are about to revoke CR logging access for{" "}
                <strong className="text-slate-900">{revokeTarget.crName}</strong> on cohort{" "}
                <strong className="text-slate-900">{revokeTarget.batchName}</strong>. The student will immediately lose all logging permissions.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Revocation Reason *
                </label>
                <textarea
                  rows={2}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Completed semester tenure, student stepped down, academic misconduct..."
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-hidden text-slate-900"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isPending}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {isPending ? "Revoking..." : "Revoke Access Immediately"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit CR Credentials Modal */}
      {editCRTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-indigo-300" />
                <h3 className="text-base font-bold">Update CR Credentials</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditCRTarget(null)}
                className="p-1 rounded-lg text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCRCredentials} className="p-6 space-y-4">
              {editCRError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{editCRError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCRName}
                  onChange={(e) => setEditCRName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Official Student Email *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={editCREmail}
                    onChange={(e) => setEditCREmail(e.target.value)}
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  New Password (Optional)
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Leave blank to keep existing password unchanged"
                    value={editCRPassword}
                    onChange={(e) => setEditCRPassword(e.target.value)}
                    className="w-full text-sm font-mono pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-slate-900"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Enter a new password (min 6 characters) to reset this CR's login password.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCRTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditCRLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isEditCRLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save & Update Account"
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
