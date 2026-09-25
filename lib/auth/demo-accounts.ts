import { UserRole } from "@/lib/types/database";

export interface DemoAccount {
  role: UserRole;
  name: string;
  id: string;
}

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  "admin@iihmhyd.edu.in": {
    role: "admin",
    name: "Admin Naveen",
    id: "aaaa0000-0000-0000-0000-000000000001",
  },
  "rajesh.kumar@iihmhyd.edu.in": {
    role: "teacher",
    name: "Chef Rajesh Kumar",
    id: "bbbb0000-0000-0000-0000-000000000001",
  },
  "priya.sharma@iihmhyd.edu.in": {
    role: "teacher",
    name: "Ms. Priya Sharma",
    id: "bbbb0000-0000-0000-0000-000000000002",
  },
  "aarav.cr@student.iihmhyd.edu.in": {
    role: "cr",
    name: "Aarav Patel (CR Sem 4)",
    id: "cccc0000-0000-0000-0000-000000000001",
  },
  "ananya.cr@student.iihmhyd.edu.in": {
    role: "cr",
    name: "Ananya Reddy (CR Sem 2)",
    id: "cccc0000-0000-0000-0000-000000000002",
  },
};
