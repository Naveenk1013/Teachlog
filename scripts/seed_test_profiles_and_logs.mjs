import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateUser(email, password, fullName, role, department = null) {
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (existingUser) {
    console.log(`User ${email} exists with ID ${existingUser.id}. Updating password...`);
    userId = existingUser.id;
    await adminClient.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { full_name: fullName, role },
    });
  } else {
    console.log(`Creating user ${email}...`);
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (createErr || !newUser.user) {
      throw new Error(`Failed to create auth user ${email}: ${createErr?.message}`);
    }
    userId = newUser.user.id;
  }

  // Upsert profile
  const { error: profErr } = await adminClient.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      role,
      department,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profErr) {
    throw new Error(`Failed to upsert profile for ${email}: ${profErr.message}`);
  }

  return userId;
}

async function main() {
  console.log("=== Setting up Test_user (Teacher) and test_cr (CR) ===");

  // 1. Create Teacher Test_user
  const teacherEmail = "test_user@teachlog.edu";
  const teacherPassword = "Password@123";
  const teacherId = await getOrCreateUser(
    teacherEmail,
    teacherPassword,
    "Test_user",
    "teacher",
    "Front Office Operations"
  );
  console.log(`✅ Teacher Profile created: Test_user (${teacherEmail}) -> ${teacherId}`);

  // 2. Create CR test_cr
  const crEmail = "test_cr@teachlog.edu";
  const crPassword = "Password@123";
  const crId = await getOrCreateUser(
    crEmail,
    crPassword,
    "test_cr",
    "cr",
    null
  );
  console.log(`✅ CR Profile created: test_cr (${crEmail}) -> ${crId}`);

  // 3. Find Semester 1 Batches
  const { data: batches } = await adminClient
    .from("batches")
    .select("id, name, current_semester, academic_year")
    .eq("current_semester", 1)
    .order("name", { ascending: true });

  console.log("Semester 1 Batches:", batches?.map((b) => `${b.name} (${b.id})`));

  const secABatch = batches?.find((b) => b.name.includes("Sec A")) || batches?.[0];
  const secBBatch = batches?.find((b) => b.name.includes("Sec B")) || batches?.[1] || secABatch;

  if (!secABatch) {
    throw new Error("No Semester 1 batches found!");
  }

  // 4. Authorize CR for Sec A batch
  const { data: existingAuth } = await adminClient
    .from("cr_authorisations")
    .select("id")
    .eq("cr_id", crId)
    .eq("batch_id", secABatch.id)
    .maybeSingle();

  if (!existingAuth) {
    await adminClient.from("cr_authorisations").insert({
      cr_id: crId,
      batch_id: secABatch.id,
      academic_year: secABatch.academic_year || "2026-27",
      granted_by: teacherId,
    });
    console.log(`✅ Authorized test_cr for batch ${secABatch.name}`);
  }

  // 5. Find or Create Subjects for Semester 1
  const { data: subjects } = await adminClient
    .from("subjects")
    .select("id, name, code, semester")
    .eq("semester", 1);

  console.log(`Found ${subjects?.length} subjects for Semester 1.`);

  let foSubject = subjects?.find((s) => s.name.toLowerCase().includes("front office") || s.code === "1547" || s.name.toLowerCase().includes("accommodation"));
  if (!foSubject) {
    foSubject = subjects?.find((s) => s.name.toLowerCase().includes("food production")) || subjects?.[0];
  }
  let aiSubject = subjects?.find((s) => s.name.toLowerCase().includes("ai") || s.code === "1552");
  if (!aiSubject) {
    aiSubject = subjects?.[1] || foSubject;
  }

  console.log(`Selected Primary Subject: ${foSubject.name} (${foSubject.code})`);
  console.log(`Selected Secondary Subject: ${aiSubject.name} (${aiSubject.code})`);

  // 6. Allocate Teacher to these Subjects for both Section A & Section B
  const teachingAllocations = [
    { teacher_id: teacherId, subject_id: foSubject.id, batch_id: secABatch.id },
    { teacher_id: teacherId, subject_id: foSubject.id, batch_id: secBBatch.id },
    { teacher_id: teacherId, subject_id: aiSubject.id, batch_id: secABatch.id },
    { teacher_id: teacherId, subject_id: aiSubject.id, batch_id: secBBatch.id },
  ];

  for (const alloc of teachingAllocations) {
    const { data: existAlloc } = await adminClient
      .from("teaching_assignments")
      .select("id")
      .eq("teacher_id", alloc.teacher_id)
      .eq("subject_id", alloc.subject_id)
      .eq("batch_id", alloc.batch_id)
      .maybeSingle();

    if (!existAlloc) {
      await adminClient.from("teaching_assignments").insert({
        ...alloc,
        academic_year: secABatch.academic_year || "2026-27",
      });
    }
  }
  console.log(`✅ Teaching assignments created for Test_user in Sec A & Sec B.`);

  // 7. Seed Class Sessions from 2026-09-21 to 2026-09-25
  console.log("\nGenerating test sessions from 21/09/2026 to 25/09/2026...");

  // Remove existing sessions for this teacher and week to keep test clean
  await adminClient
    .from("class_sessions")
    .delete()
    .eq("teacher_id", teacherId)
    .gte("session_date", "2026-09-21")
    .lte("session_date", "2026-09-26");

  const sessionsToCreate = [
    // Monday 21/09/2026
    {
      session_date: "2026-09-21",
      start_time: "11:00:00",
      end_time: "12:00:00",
      batch_id: secABatch.id,
      subject_id: foSubject.id,
      topic_covered: "Front Office Operations - Theory Introduction (Sec A & B)",
      topic_planned: "Front Office Operations - Theory Introduction (Sec A & B)",
      teaching_method: "Lecture / Theory / Presentation",
      assignment_activity: "Overview concept questions and organizational hierarchy diagram",
      students_present: 48,
      status: "submitted",
    },
    // Tuesday 22/09/2026: Class 1 (Practical P1) & Class 2 (Theory Sec A)
    {
      session_date: "2026-09-22",
      start_time: "10:00:00",
      end_time: "12:00:00",
      batch_id: secABatch.id,
      subject_id: foSubject.id,
      topic_covered: "Front Office - Practical Demonstration (Group P1)",
      topic_planned: "Front Office - Practical Demonstration (Group P1)",
      teaching_method: "Practical / Demonstration",
      assignment_activity: "Standard Operating Procedure (SOP) Drill on Check-in Terminal",
      students_present: 24,
      status: "submitted",
    },
    {
      session_date: "2026-09-22",
      start_time: "14:00:00",
      end_time: "15:00:00",
      batch_id: secABatch.id,
      subject_id: foSubject.id,
      topic_covered: "Front Office Operations - Theory (Sec A)",
      topic_planned: "Front Office Operations - Theory (Sec A)",
      teaching_method: "Lecture / Theory",
      assignment_activity: "Review questions & guest cycle flow chart",
      students_present: 46,
      status: "submitted",
    },
    // Wednesday 23/09/2026: Class 1 (Practical P2) & Class 2 (Theory Sec B)
    {
      session_date: "2026-09-23",
      start_time: "10:00:00",
      end_time: "12:00:00",
      batch_id: secBBatch.id,
      subject_id: foSubject.id,
      topic_covered: "Front Office - Practical Demonstration (Group P2)",
      topic_planned: "Front Office - Practical Demonstration (Group P2)",
      teaching_method: "Practical / Demonstration",
      assignment_activity: "PMS Terminal check-in simulation & registration card drill",
      students_present: 23,
      status: "submitted",
    },
    {
      session_date: "2026-09-23",
      start_time: "14:00:00",
      end_time: "15:00:00",
      batch_id: secBBatch.id,
      subject_id: foSubject.id,
      topic_covered: "Front Office Operations - Theory (Sec B)",
      topic_planned: "Front Office Operations - Theory (Sec B)",
      teaching_method: "Lecture / Theory",
      assignment_activity: "Classification of hotels & room tariffs worksheet",
      students_present: 45,
      status: "submitted",
    },
    // Thursday 24/09/2026: AI in Hospitality & Front Office PMS
    {
      session_date: "2026-09-24",
      start_time: "14:00:00",
      end_time: "15:00:00",
      batch_id: secABatch.id,
      subject_id: aiSubject.id,
      topic_covered: "AI in Hospitality - Introduction & Technology Modules (Sec A & B)",
      topic_planned: "AI in Hospitality - Introduction & Technology Modules (Sec A & B)",
      teaching_method: "Lecture / Theory / Handouts",
      assignment_activity: "Case study review on AI concierge and chatbot integration in luxury hotels",
      students_present: 49,
      status: "submitted",
    },
    {
      session_date: "2026-09-24",
      start_time: "15:00:00",
      end_time: "16:00:00",
      batch_id: secABatch.id,
      subject_id: foSubject.id,
      topic_covered: "Guest Registration & PMS Check-in SOPs (Sec A)",
      topic_planned: "Guest Registration & PMS Check-in SOPs (Sec A)",
      teaching_method: "Interactive Discussion & Presentation",
      assignment_activity: "Draft guest folio & check-in billing exercise",
      students_present: 47,
      status: "submitted",
    },
    // Friday 25/09/2026: Practical & Theory
    {
      session_date: "2026-09-25",
      start_time: "10:00:00",
      end_time: "12:00:00",
      batch_id: secABatch.id,
      subject_id: foSubject.id,
      topic_covered: "Front Office - Practical Workstations (Group P1 & P2)",
      topic_planned: "Front Office - Practical Workstations (Group P1 & P2)",
      teaching_method: "Practical / Hands-on Demonstration",
      assignment_activity: "Guest interaction role-play & key card handling evaluation",
      students_present: 46,
      status: "submitted",
    },
    {
      session_date: "2026-09-25",
      start_time: "14:00:00",
      end_time: "15:00:00",
      batch_id: secABatch.id,
      subject_id: foSubject.id,
      topic_covered: "Front Office Operations - Weekly Theory Revision (Sec A & B)",
      topic_planned: "Front Office Operations - Weekly Theory Revision (Sec A & B)",
      teaching_method: "Lecture & Spot Questioning",
      assignment_activity: "Weekly unit quiz & conceptual assessment",
      students_present: 48,
      status: "submitted",
    },
    {
      session_date: "2026-09-25",
      start_time: "15:00:00",
      end_time: "16:00:00",
      batch_id: secBBatch.id,
      subject_id: foSubject.id,
      topic_covered: "Telephone Etiquette & Reservation Queries (Sec B)",
      topic_planned: "Telephone Etiquette & Reservation Queries (Sec B)",
      teaching_method: "Role-Play & Simulation",
      assignment_activity: "Standard reservation script drill & call handling logs",
      students_present: 44,
      status: "submitted",
    },
  ];

  for (const s of sessionsToCreate) {
    const { error: insErr } = await adminClient.from("class_sessions").insert({
      ...s,
      teacher_id: teacherId,
      semester: 1,
      academic_year: "2026-27",
      entered_by: crId,
    });
    if (insErr) {
      console.error(`Error inserting session ${s.session_date} ${s.start_time}:`, insErr.message);
    }
  }

  console.log(`✅ Inserted ${sessionsToCreate.length} test sessions across Monday 21/09 to Friday 25/09!`);

  // 8. Output Credentials
  console.log("\n========================================================");
  console.log("🎯 TEST LOGIN CREDENTIALS");
  console.log("========================================================");
  console.log("1. TEACHER ACCOUNT:");
  console.log(`   Email:    ${teacherEmail}`);
  console.log(`   Password: ${teacherPassword}`);
  console.log("   Role:     Teacher (Test_user)");
  console.log("   Subject:  Front Office Operations - I & AI in Hospitality 1");
  console.log("   Semester: Semester 1 (Batch 2026)");
  console.log("--------------------------------------------------------");
  console.log("2. CR (STUDENT REPRESENTATIVE) ACCOUNT:");
  console.log(`   Email:    ${crEmail}`);
  console.log(`   Password: ${crPassword}`);
  console.log("   Role:     CR (test_cr)");
  console.log(`   Batch:    ${secABatch.name} (Semester 1)`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
