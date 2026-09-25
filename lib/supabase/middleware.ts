import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getLandingPageForRole } from "@/lib/auth/roles";
import { UserRole } from "@/lib/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = request.nextUrl.clone();
  const path = url.pathname;

  const isPublicRoute =
    path === "/login" ||
    path.startsWith("/auth/") ||
    path.startsWith("/api/public/") ||
    path.startsWith("/_next/") ||
    path === "/favicon.ico";

  // Check for local dev session cookie — ONLY in development
  let devUser: { id: string; role: UserRole; is_active: boolean } | null = null;
  if (process.env.NODE_ENV !== "production") {
    const devCookie = request.cookies.get("teachlog_dev_session");
    if (devCookie?.value) {
      try {
        devUser = JSON.parse(devCookie.value);
      } catch {
        // invalid cookie
      }
    }
  }

  // If local dev session is active, handle routing immediately
  if (devUser) {
    if (!devUser.is_active) {
      url.pathname = "/login";
      url.searchParams.set("error", "inactive");
      return NextResponse.redirect(url);
    }

    const landingPage = getLandingPageForRole(devUser.role);

    if (path === "/" || path === "/login") {
      url.pathname = landingPage;
      url.searchParams.delete("error");
      return NextResponse.redirect(url);
    }

    if (devUser.role === "cr" && !path.startsWith("/cr")) {
      url.pathname = "/cr/log";
      return NextResponse.redirect(url);
    } else if (devUser.role === "teacher" && path.startsWith("/admin")) {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // Supabase Auth verification
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase offline or unconfigured
  }

  // 1. Unauthenticated users: redirect protected routes to /login
  if (!user && !isPublicRoute) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Authenticated users: enforce role guards and handle / and /login
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_active) {
      url.pathname = "/login";
      url.searchParams.set("error", "inactive");
      return NextResponse.redirect(url);
    }

    const role = profile.role as UserRole;
    const landingPage = getLandingPageForRole(role);

    if (path === "/" || path === "/login") {
      url.pathname = landingPage;
      url.searchParams.delete("error");
      return NextResponse.redirect(url);
    }

    if (role === "cr" && !path.startsWith("/cr")) {
      url.pathname = "/cr/log";
      return NextResponse.redirect(url);
    } else if (role === "teacher" && path.startsWith("/admin")) {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
