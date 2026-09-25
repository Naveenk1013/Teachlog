import Link from "next/link";
import { getAdminOverviewStats } from "@/lib/data/admin";
import {
  ShieldCheck,
  Users,
  BookOpen,
  UserCheck,
  Activity,
  KeyRound,
  FileSpreadsheet,
  Calendar,
  CalendarClock,
  ArrowRight,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const stats = await getAdminOverviewStats();

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            System Administration &amp; Governance
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Institute Master Data &amp; Controls
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage cohort authorisations, view immutable audit trails, and export official teaching logs.
          </p>
        </div>
      </div>

      {/* Real-time KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Cohorts
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalBatches}</p>
          <span className="text-[10px] text-slate-400">Enrolled Batches</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Curriculum Subjects
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalSubjects}</p>
          <span className="text-[10px] text-slate-400">All Semesters</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Teaching Faculty
          </span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalTeachers}</p>
          <span className="text-[10px] text-slate-400">Professors &amp; Chefs</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Authorized CRs
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeCRs}</p>
          <span className="text-[10px] text-slate-400">Active Logging Rights</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Class Sessions
          </span>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalSessions}</p>
          <span className="text-[10px] text-slate-400">Logged to date</span>
        </div>
      </div>

      {/* Quick Action Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Link
          href="/admin/logs"
          className="bg-white border-2 border-blue-200 hover:border-blue-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
            Quick Editor
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <CalendarClock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
            <span>Weekly Logs &amp; Quick Editor</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Browse Monday–Saturday sessions by faculty and batch. Inline-edit topics, methods, and verify class logs.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Class Tracking</span>
            <span className="font-semibold text-blue-600">Open Weekly Logs →</span>
          </div>
        </Link>

        <Link
          href="/admin/teachers"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center justify-between">
            <span>Faculty &amp; Teachers</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Add new professors and instructors, assign departments, manage passwords, and toggle active status.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Personnel Registry</span>
            <span className="font-semibold text-emerald-600">Manage Faculty →</span>
          </div>
        </Link>

        <Link
          href="/admin/subjects"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-amber-600 transition-colors flex items-center justify-between">
            <span>Curriculum &amp; Subjects</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Create new subjects with codes and semesters. Define and manage unit-wise syllabus topics.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Academic Catalog</span>
            <span className="font-semibold text-amber-600">Manage Subjects →</span>
          </div>
        </Link>

        <Link
          href="/admin/allocations"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
            <span>Teaching Allocations</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Allocate faculty members to specific subjects, student cohorts, and academic years.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Faculty Assignments</span>
            <span className="font-semibold text-indigo-600">Allocate Teaching →</span>
          </div>
        </Link>

        <Link
          href="/admin/batches"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-cyan-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors flex items-center justify-between">
            <span>Student Batches &amp; Cohorts</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Register new intake cohorts, manage current active semesters, and track class strengths.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Cohort Management</span>
            <span className="font-semibold text-cyan-600">Manage Batches →</span>
          </div>
        </Link>

        <Link
          href="/admin/crs"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-purple-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-purple-600 transition-colors flex items-center justify-between">
            <span>CR Authorisation Register</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Authorize CR accounts by batch and academic year. Immediate revocation support with audit notes.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Access Management</span>
            <span className="font-semibold text-purple-600">Open Register →</span>
          </div>
        </Link>

        <Link
          href="/admin/audit"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4 group-hover:bg-slate-700 group-hover:text-white transition-colors">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-slate-700 transition-colors flex items-center justify-between">
            <span>Audit &amp; Access Trail</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Inspect append-only logs for logins, session modifications, and authorization lifecycle events.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Security Logs</span>
            <span className="font-semibold text-slate-700">View Trail →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

