import { redirect } from "next/navigation";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { getAccessLogs, getAuditLogs } from "@/lib/data/admin";
import { format, parseISO } from "date-fns";
import {
  Activity,
  ShieldCheck,
  KeyRound,
  LogIn,
  LogOut,
  AlertTriangle,
  Clock,
  Database,
} from "lucide-react";

export default async function AdminAuditPage() {
  const user = await getCurrentTeacherUser();
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  const [accessLogs, auditLogs] = await Promise.all([
    getAccessLogs(40),
    getAuditLogs(40),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Governance &amp; Security Compliance
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Audit Trail &amp; Access Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable, append-only logs of authentication events and database row mutations.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Row-Level Auditing Active
        </span>
      </div>

      {/* Grid: Access Logs vs Entity Changes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Access Logs Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <LogIn className="w-4 h-4 text-indigo-600" />
              Recent Authentication Activity
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Last {accessLogs.length} events
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {accessLogs.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No access logs recorded yet.</p>
            ) : (
              accessLogs.map((log) => {
                const dateFormatted = format(parseISO(log.createdAt), "dd MMM HH:mm:ss");
                const isSuccess = log.event === "LOGIN_SUCCESS";
                const isLogout = log.event === "LOGOUT";
                const isFailure = log.event === "LOGIN_FAILED";

                return (
                  <div key={log.id} className="p-3.5 hover:bg-slate-50/50 transition-colors text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isSuccess && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                        {isLogout && (
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                        )}
                        {isFailure && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}

                        <span className="font-bold text-slate-800">
                          {log.userName || log.email || "Unknown User"}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {dateFormatted}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        {log.event}
                      </span>
                      {log.ip && <span className="font-mono text-[10px]">IP: {log.ip}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Database Mutation Audit Logs Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              Data Changes Audit Trail
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Last {auditLogs.length} changes
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No database audit changes recorded yet.</p>
            ) : (
              auditLogs.map((log) => {
                const dateFormatted = format(parseISO(log.createdAt), "dd MMM HH:mm:ss");

                let actionBadge = "bg-slate-100 text-slate-700";
                if (log.action === "INSERT") actionBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                if (log.action === "UPDATE") actionBadge = "bg-blue-50 text-blue-700 border-blue-200";
                if (log.action === "DELETE") actionBadge = "bg-red-50 text-red-700 border-red-200";

                return (
                  <div key={log.id} className="p-3.5 hover:bg-slate-50/50 transition-colors text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${actionBadge}`}>
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {log.entity}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {dateFormatted}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Actor: <strong className="text-slate-700">{log.actorName}</strong></span>
                      {log.entityId && (
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                          ID: {log.entityId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
