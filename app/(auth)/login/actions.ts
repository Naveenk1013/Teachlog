"use server";

import { z } from "zod";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLandingPageForRole } from "@/lib/auth/roles";
import { UserRole } from "@/lib/types/database";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function loginAction(prevState: { error?: string } | null, formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || null;
  const userAgent = reqHeaders.get("user-agent") || null;

  let landingPage: string | null = null;

  // 1. Authenticate with real Supabase Auth
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Authenticated with real Supabase Auth
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

      if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        return { error: "Your account is inactive or not found. Please contact administration." };
      }

      // Record access log
      try {
        const adminClient = createAdminClient();
        await adminClient.from("access_logs").insert({
          user_id: data.user.id,
          email,
          event: "LOGIN_SUCCESS",
          ip,
          user_agent: userAgent,
        });
      } catch {
        // Ignore access log write issues
      }

      landingPage = getLandingPageForRole(profile.role as UserRole);
    }
  } catch {
    // Supabase client failure
  }

  if (landingPage) {
    redirect(landingPage);
  }

  // 2. Dev / Demo Fallback (if cloud connection is down or local mock testing)
  if (DEMO_ACCOUNTS[email] && password === "password123") {
    const demo = DEMO_ACCOUNTS[email];
    const cookieStore = await cookies();
    cookieStore.set("teachlog_dev_session", JSON.stringify({
      id: demo.id,
      email,
      role: demo.role,
      name: demo.name,
      is_active: true,
    }), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect(getLandingPageForRole(demo.role));
  }

  // Failed login
  try {
    const adminClient = createAdminClient();
    await adminClient.from("access_logs").insert({
      email,
      event: "LOGIN_FAILED",
      ip,
      user_agent: userAgent,
    });
  } catch {
    // Ignore
  }

  return { error: "Invalid email or password. Please check your credentials." };
}

export async function quickDemoLogin(role: UserRole) {
  const accountEntry = Object.entries(DEMO_ACCOUNTS).find(([, val]) => val.role === role);
  if (!accountEntry) return;

  const [email, demo] = accountEntry;
  const cookieStore = await cookies();
  cookieStore.set("teachlog_dev_session", JSON.stringify({
    id: demo.id,
    email,
    role: demo.role,
    name: demo.name,
    is_active: true,
  }), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  const landingPage = getLandingPageForRole(demo.role);
  redirect(landingPage);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("teachlog_dev_session");

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      try {
        const adminClient = createAdminClient();
        await adminClient.from("access_logs").insert({
          user_id: user.id,
          email: user.email,
          event: "LOGOUT",
        });
      } catch {
        // Ignore
      }
    }
    await supabase.auth.signOut();
  } catch {
    // Ignore
  }

  redirect("/login");
}
