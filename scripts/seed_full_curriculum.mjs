import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=== Seeding Full Semester Curriculum & Faculty ===");

  const PROG_ID = "11111111-1111-1111-1111-111111111111"; // BHA
  const BATCH_SEM4_ID = "22222222-2222-2222-2222-222222222221"; // Sem 4
  const BATCH_SEM2_ID = "22222222-2222-2222-2222-222222222222"; // Sem 2

  // 1. Create or Ensure Faculty Profiles
  const newTeachers = [
    {
      id: "bbbb0000-0000-0000-0000-000000000004",
      email: "neha.kapoor@iihmhyd.edu.in",
      full_name: "Ms. Neha Kapoor",
      department: "Hospitality Marketing & Sales",
      role: "teacher",
    },
    {
      id: "bbbb0000-0000-0000-0000-000000000005",
      email: "suresh.venkat@iihmhyd.edu.in",
      full_name: "Mr. Suresh Venkat",
      department: "Hotel Accountancy & Finance",
      role: "teacher",
    },
    {
      id: "bbbb0000-0000-0000-0000-000000000006",
      email: "meenakshi.sundaram@iihmhyd.edu.in",
      full_name: "Dr. Meenakshi Sundaram",
      department: "Food Science & Nutrition",
      role: "teacher",
    },
    {
      id: "bbbb0000-0000-0000-0000-000000000007",
      email: "vikram.rathore@iihmhyd.edu.in",
      full_name: "Er. Vikram Rathore",
      department: "Hotel Engineering & Maintenance",
      role: "teacher",
    },
  ];

  for (const t of newTeachers) {
    // Check if auth user exists
    const { data: existingUser } = await adminClient.auth.admin.getUserById(t.id);
    if (!existingUser?.user) {
      console.log(`Creating auth user: ${t.email}`);
      const { error: authErr } = await adminClient.auth.admin.createUser({
        id: t.id,
        email: t.email,
        password: "password123",
        email_confirm: true,
        user_metadata: { role: "teacher", full_name: t.full_name },
      });
      if (authErr && !authErr.message.includes("already exists")) {
        console.error(`Error creating user ${t.email}:`, authErr);
      }
    }

    // Upsert profile
    const { error: profErr } = await adminClient.from("profiles").upsert({
      id: t.id,
      full_name: t.full_name,
      role: t.role,
      department: t.department,
      is_active: true,
    });
    if (profErr) {
      console.error(`Error upserting profile for ${t.full_name}:`, profErr);
    } else {
      console.log(`✅ Profile upserted: ${t.full_name} (${t.department})`);
    }
  }

  // 2. Define 6 Subjects for Semester 4 and 6 Subjects for Semester 2
  const subjectsToSeed = [
    // Semester 4 (Intake 2024-27)
    {
      id: "33333333-3333-3333-3333-333333333304", // already exists
      programme_id: PROG_ID,
      semester: 4,
      code: "BHM211",
      name: "Food Production Management",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000001", // Chef Rajesh Kumar
      batchId: BATCH_SEM4_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333305", // already exists
      programme_id: PROG_ID,
      semester: 4,
      code: "BHM212",
      name: "Food & Beverage Management",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000002", // Ms. Priya Sharma
      batchId: BATCH_SEM4_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333306",
      programme_id: PROG_ID,
      semester: 4,
      code: "BHM213",
      name: "Front Office Management",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000003", // Mr. Amit Roy
      batchId: BATCH_SEM4_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333307",
      programme_id: PROG_ID,
      semester: 4,
      code: "BHM214",
      name: "Accommodation Management",
      defaultTeacherId: "2a7ab9ed-34c9-4d68-9f04-c37dda414cee", // Mr. Ananta Srinivas
      batchId: BATCH_SEM4_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333308",
      programme_id: PROG_ID,
      semester: 4,
      code: "BHM215",
      name: "Hospitality Marketing & Sales",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000004", // Ms. Neha Kapoor
      batchId: BATCH_SEM4_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333309",
      programme_id: PROG_ID,
      semester: 4,
      code: "BHM216",
      name: "Hotel Accountancy & Financial Controls",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000005", // Mr. Suresh Venkat
      batchId: BATCH_SEM4_ID,
    },

    // Semester 2 (Intake 2025-28)
    {
      id: "33333333-3333-3333-3333-333333333301", // already exists
      programme_id: PROG_ID,
      semester: 2,
      code: "BHM111",
      name: "Food Production Principles",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000001", // Chef Rajesh Kumar
      batchId: BATCH_SEM2_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333302", // already exists
      programme_id: PROG_ID,
      semester: 2,
      code: "BHM112",
      name: "Food & Beverage Service Operations",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000002", // Ms. Priya Sharma
      batchId: BATCH_SEM2_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333303", // already exists
      programme_id: PROG_ID,
      semester: 2,
      code: "BHM113",
      name: "Front Office Operations",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000003", // Mr. Amit Roy
      batchId: BATCH_SEM2_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333310",
      programme_id: PROG_ID,
      semester: 2,
      code: "BHM114",
      name: "Accommodation Operations",
      defaultTeacherId: "2a7ab9ed-34c9-4d68-9f04-c37dda414cee", // Mr. Ananta Srinivas
      batchId: BATCH_SEM2_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333311",
      programme_id: PROG_ID,
      semester: 2,
      code: "BHM115",
      name: "Principles of Food Science & Nutrition",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000006", // Dr. Meenakshi Sundaram
      batchId: BATCH_SEM2_ID,
    },
    {
      id: "33333333-3333-3333-3333-333333333312",
      programme_id: PROG_ID,
      semester: 2,
      code: "BHM116",
      name: "Hotel Engineering & Maintenance",
      defaultTeacherId: "bbbb0000-0000-0000-0000-000000000007", // Er. Vikram Rathore
      batchId: BATCH_SEM2_ID,
    },
  ];

  for (const s of subjectsToSeed) {
    const { error: subErr } = await adminClient.from("subjects").upsert({
      id: s.id,
      programme_id: s.programme_id,
      semester: s.semester,
      code: s.code,
      name: s.name,
    });
    if (subErr) {
      console.error(`Error upserting subject ${s.code} ${s.name}:`, subErr);
    } else {
      console.log(`✅ Subject ready: Sem ${s.semester} [${s.code}] ${s.name}`);
    }

    // Upsert teaching assignment
    // Check if assignment exists
    const { data: existingAssign } = await adminClient
      .from("teaching_assignments")
      .select("id")
      .eq("batch_id", s.batchId)
      .eq("subject_id", s.id)
      .maybeSingle();

    if (!existingAssign) {
      const { error: assignErr } = await adminClient.from("teaching_assignments").insert({
        batch_id: s.batchId,
        subject_id: s.id,
        teacher_id: s.defaultTeacherId,
        academic_year: "2026-27",
      });
      if (assignErr) {
        console.error(`Error assigning teacher to ${s.code}:`, assignErr);
      } else {
        console.log(`   🔗 Assigned default teacher to ${s.code}`);
      }
    } else {
      console.log(`   🔗 Assignment already exists for ${s.code}`);
    }
  }

  console.log("\n🎉 Full semester curriculum and teaching assignments seeded successfully!");
}

main().catch(console.error);
