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
  const { data: batches } = await adminClient.from("batches").select("id, name, intake_year, current_semester, academic_year, class_strength");
  console.log("=== BATCHES ===");
  console.table(batches);

  const { data: subjects } = await adminClient.from("subjects").select("id, code, name, semester");
  console.log("=== SUBJECTS ===");
  console.table(subjects);

  const { data: teachers, error: tErr } = await adminClient.from("profiles").select("id, full_name, department, role, is_active").eq("role", "teacher");
  if (tErr) console.error("Teacher fetch error:", tErr);
  console.log("=== TEACHERS ===");
  console.table(teachers);

  const { data: users } = await adminClient.auth.admin.listUsers();
  console.log("=== AUTH USERS ===");
  if (users?.users) {
    console.table(users.users.map(u => ({ id: u.id, email: u.email, role: u.user_metadata?.role })));
  }

  const { data: programmes } = await adminClient.from("programmes").select("*");
  console.log("=== PROGRAMMES ===");
  console.table(programmes);

  const { data: assignments } = await adminClient.from("teaching_assignments").select(`
    id,
    batch_id,
    batches(name),
    subject_id,
    subjects(code, name, semester),
    teacher_id,
    profiles(full_name, department)
  `);
  console.log("=== TEACHING ASSIGNMENTS ===");
  const { data: topics } = await adminClient.from("syllabus_topics").select("subject_id, title");
  console.log(`=== SYLLABUS TOPICS (Total: ${topics?.length}) ===`);
  const topicMap = {};
  for (const t of topics || []) {
    topicMap[t.subject_id] = (topicMap[t.subject_id] || 0) + 1;
  }
  console.table(topicMap);
}

main().catch(console.error);
