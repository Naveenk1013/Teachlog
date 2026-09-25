import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface CurrentAppUser {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "teacher" | "cr";
  department?: string | null;
}

export async function getCurrentAppUser(): Promise<CurrentAppUser | null> {
  const cookieStore = await cookies();
  const devCookie = cookieStore.get("teachlog_dev_session");
  if (devCookie?.value) {
    try {
      const dev = JSON.parse(devCookie.value);
      return {
        id: dev.id as string,
        email: dev.email as string,
        fullName: dev.name as string,
        role: dev.role as "admin" | "teacher" | "cr",
      };
    } catch {
      // Ignore
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, department")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email || "",
    fullName: profile.full_name,
    role: profile.role as "admin" | "teacher" | "cr",
    department: profile.department,
  };
}
