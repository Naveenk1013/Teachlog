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
  console.log("=== Testing Student Subject & Faculty Selection Flow ===");

  const BATCH_SEM4_ID = "22222222-2222-2222-2222-222222222221"; // Sem 4
  const CR_USER_ID = "cccc0000-0000-0000-0000-000000000001"; // Aarav Patel

  // 1. Fetch available subjects for Semester 4
  const { data: subjects, error: sErr } = await adminClient
    .from("subjects")
    .select("id, code, name, semester")
    .eq("semester", 4)
    .order("code", { ascending: true });

  if (sErr || !subjects || subjects.length < 6) {
    throw new Error(`Expected at least 6 subjects for Sem 4, got ${subjects?.length}: ${JSON.stringify(sErr)}`);
  }
  console.log(`✅ Verified ${subjects.length} subjects for Semester 4:`);
  subjects.forEach(s => console.log(`   - [${s.code}] ${s.name}`));

  // 2. Fetch all teachers
  const { data: teachers, error: tErr } = await adminClient
    .from("profiles")
    .select("id, full_name, department")
    .eq("role", "teacher")
    .eq("is_active", true);

  if (tErr || !teachers || teachers.length < 6) {
    throw new Error(`Expected at least 6 active teachers, got ${teachers?.length}: ${JSON.stringify(tErr)}`);
  }
  console.log(`✅ Verified ${teachers.length} active teachers across departments:`);
  teachers.forEach(t => console.log(`   - ${t.full_name} (${t.department})`));

  // 3. Test logging a session for BHM215 (Hospitality Marketing & Sales) with Ms. Neha Kapoor
  const marketingSub = subjects.find(s => s.code === "BHM215");
  const nehaTeacher = teachers.find(t => t.full_name.includes("Neha Kapoor"));
  if (!marketingSub || !nehaTeacher) {
    throw new Error("Could not find BHM215 or Ms. Neha Kapoor");
  }

  console.log(`\nLogging session with designated faculty: [${marketingSub.code}] ${marketingSub.name} with ${nehaTeacher.full_name}`);
  const today = new Date().toISOString().split("T")[0];

  const testSession1 = {
    batch_id: BATCH_SEM4_ID,
    subject_id: marketingSub.id,
    teacher_id: nehaTeacher.id,
    semester: 4,
    academic_year: "2026-27",
    session_date: today,
    start_time: "14:00",
    end_time: "15:00",
    students_present: 58,
    topic_covered: "Market Segmentation & Targeting in Luxury Hotels",
    topic_planned: "Market Segmentation & Targeting in Luxury Hotels",
    status: "submitted",
    entered_by: CR_USER_ID,
  };

  // Remove duplicate if exists from prior test
  await adminClient.from("class_sessions").delete()
    .eq("batch_id", BATCH_SEM4_ID)
    .eq("subject_id", marketingSub.id)
    .eq("session_date", today)
    .eq("start_time", "14:00");

  const { data: inserted1, error: insErr1 } = await adminClient
    .from("class_sessions")
    .insert(testSession1)
    .select("id, subject_id, teacher_id, topic_covered, topic_planned, status")
    .single();

  if (insErr1 || !inserted1) {
    throw new Error(`Failed to insert session 1: ${JSON.stringify(insErr1)}`);
  }
  console.log("✅ Successfully logged session 1 with designated faculty:", inserted1);

  // 4. Test logging a session with a substitute / custom teacher selected
  // Front Office Management taught by Chef Rajesh Kumar (guest/substitute)
  const frontOfficeSub = subjects.find(s => s.code === "BHM213");
  const rajeshTeacher = teachers.find(t => t.full_name.includes("Rajesh Kumar"));

  console.log(`\nLogging session with substitute faculty: [${frontOfficeSub.code}] ${frontOfficeSub.name} with ${rajeshTeacher.full_name}`);
  const testSession2 = {
    batch_id: BATCH_SEM4_ID,
    subject_id: frontOfficeSub.id,
    teacher_id: rajeshTeacher.id,
    semester: 4,
    academic_year: "2026-27",
    session_date: today,
    start_time: "15:00",
    end_time: "16:00",
    students_present: 56,
    topic_covered: "Inter-departmental Coordination: Front Office & Executive Kitchen",
    topic_planned: "Inter-departmental Coordination: Front Office & Executive Kitchen",
    status: "submitted",
    entered_by: CR_USER_ID,
  };

  // Remove duplicate if exists from prior test
  await adminClient.from("class_sessions").delete()
    .eq("batch_id", BATCH_SEM4_ID)
    .eq("subject_id", frontOfficeSub.id)
    .eq("session_date", today)
    .eq("start_time", "15:00");

  const { data: inserted2, error: insErr2 } = await adminClient
    .from("class_sessions")
    .insert(testSession2)
    .select("id, subject_id, teacher_id, topic_covered, topic_planned, status")
    .single();

  if (insErr2 || !inserted2) {
    throw new Error(`Failed to insert session 2: ${JSON.stringify(insErr2)}`);
  }
  console.log("✅ Successfully logged session 2 with custom faculty:", inserted2);

  // 5. Verify how recent sessions return these logs
  const { data: verifiedSessions, error: vErr } = await adminClient
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      topic_covered,
      topic_planned,
      subjects(code, name),
      profiles!class_sessions_teacher_id_fkey(full_name, department)
    `)
    .in("id", [inserted1.id, inserted2.id]);

  if (vErr || !verifiedSessions) {
    throw new Error(`Failed to verify sessions: ${JSON.stringify(vErr)}`);
  }

  console.log("\n✅ Verified Retrieved Sessions in Database:");
  for (const s of verifiedSessions) {
    console.log(`- [${s.subjects?.code}] ${s.subjects?.name} | Teacher: ${s.profiles?.full_name} (${s.profiles?.department})`);
    console.log(`  Topic: ${s.topic_covered}`);
    console.log(`  Topic Planned === Topic Covered: ${s.topic_planned === s.topic_covered}`);
  }

  // Cleanup test sessions
  console.log("\nCleaning up test sessions...");
  await adminClient.from("class_sessions").delete().in("id", [inserted1.id, inserted2.id]);
  console.log("✅ Cleaned up successfully.");

  console.log("\n🎉 ALL STUDENT SUBJECT & FACULTY SELECTION TESTS PASSED!");
}

main().catch(console.error);
