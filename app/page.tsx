import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getLandingPageForRole } from "@/lib/auth/roles";
import { UserRole } from "@/lib/types/database";

export default async function HomePage() {
  const cookieStore = await cookies();
  const devSession = cookieStore.get("teachlog_dev_session");
  if (devSession?.value) {
    try {
      const parsed = JSON.parse(devSession.value);
      if (parsed.role) {
        redirect(getLandingPageForRole(parsed.role as UserRole));
      }
    } catch {
      // Ignore
    }
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      redirect(getLandingPageForRole(profile.role as UserRole));
    }
  } catch {
    // If Supabase not running
  }

  redirect("/login");
}
