import { UserRole } from "@/lib/types/database";

export const ROLE_LANDING_PAGES: Record<UserRole, string> = {
  cr: "/cr/log",
  teacher: "/dashboard",
  admin: "/admin",
};

export function getLandingPageForRole(role: UserRole): string {
  return ROLE_LANDING_PAGES[role] || "/login";
}
