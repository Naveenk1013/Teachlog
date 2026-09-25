"use client";

import { useActionState, useState } from "react";
import { loginAction, quickDemoLogin } from "./actions";
import { Lock, Mail, GraduationCap, ArrowRight, AlertCircle, ShieldCheck, UserCheck, BookOpen } from "lucide-react";
import { UserRole } from "@/lib/types/database";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedPassword, setSelectedPassword] = useState("");

  const fillCredentials = (email: string) => {
    setSelectedEmail(email);
    setSelectedPassword("password123");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white shadow-lg mb-3">
            <img src="/iihm_logo.png" alt="IIHM Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            IIHM Hyderabad
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Teaching Log &amp; Weekly Summary System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/85 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl p-6 sm:p-7">
          <h2 className="text-lg font-semibold text-white mb-5 text-center">
            Sign In to TeachLog
          </h2>

          {state?.error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Institute Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  placeholder="name@iihmhyd.edu.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={selectedPassword}
                  onChange={(e) => setSelectedPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Section */}
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Test Accounts (Password: <code className="text-indigo-400 font-mono">password123</code>)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("admin@iihmhyd.edu.in")}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-700/80 border border-slate-700/80 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Naveen</p>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("rajesh.kumar@iihmhyd.edu.in")}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-700/80 border border-slate-700/80 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Teacher</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Chef Rajesh</p>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("aarav.cr@student.iihmhyd.edu.in")}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-700/80 border border-slate-700/80 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>CR</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Aarav Patel</p>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-2.5">
              Click a role above to auto-fill credentials, then click <strong>Sign In</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          &copy; {new Date().getFullYear()} International Institute of Hotel Management, Hyderabad
        </p>
      </div>
    </div>
  );
}
