import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Read .env.local manually
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
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runTest() {
  console.log("=== Testing Admin Master Data Management Flow ===");

  // 1. Check Programmes
  console.log("\n1. Fetching Academic Programmes...");
  const { data: programmes, error: progError } = await adminClient
    .from("programmes")
    .select("id, code, name");
  if (progError || !programmes || programmes.length === 0) {
    throw new Error("Failed to fetch programmes: " + JSON.stringify(progError));
  }
  console.log(`✅ Found ${programmes.length} programme(s):`, programmes.map((p) => p.code).join(", "));
  const testProgId = programmes[0].id;

  // 2. Create New Subject
  const testSubjectCode = "TEST" + Math.floor(Math.random() * 900 + 100);
  const testSubjectName = "Hospitality Management Tech " + Date.now();
  console.log(`\n2. Creating Subject [${testSubjectCode}] ${testSubjectName}...`);
  const { data: subject, error: subError } = await adminClient
    .from("subjects")
    .insert({
      programme_id: testProgId,
      semester: 3,
      code: testSubjectCode,
      name: testSubjectName,
    })
    .select("id, name, code, semester")
    .single();

  if (subError || !subject) {
    throw new Error("Failed to create subject: " + JSON.stringify(subError));
  }
  console.log(`✅ Subject created successfully: ID=${subject.id}`);

  // 3. Add Syllabus Topics
  console.log(`\n3. Adding Syllabus Topics for Subject ID=${subject.id}...`);
  const { error: topicsError } = await adminClient.from("syllabus_topics").insert([
    { subject_id: subject.id, unit_no: 1, seq: 1, title: "Overview of Hotel ERP Systems" },
    { subject_id: subject.id, unit_no: 1, seq: 2, title: "Property Management Systems Integration" },
    { subject_id: subject.id, unit_no: 2, seq: 3, title: "Point of Sale (POS) and Kitchen Display Systems" },
  ]);
  if (topicsError) {
    throw new Error("Failed to insert syllabus topics: " + JSON.stringify(topicsError));
  }
  console.log("✅ 3 Syllabus topics added.");

  // 4. Create New Batch / Cohort
  const testBatchName = "BHM Intake " + (2027 + Math.floor(Math.random() * 10)) + " Sec C";
  console.log(`\n4. Creating Student Batch [${testBatchName}]...`);
  const { data: batch, error: batchError } = await adminClient
    .from("batches")
    .insert({
      programme_id: testProgId,
      name: testBatchName,
      intake_year: 2027,
      current_semester: 3,
      academic_year: "2026-27",
      class_strength: 50,
      semester_start_date: "2026-07-15",
      is_active: true,
    })
    .select("id, name")
    .single();

  if (batchError || !batch) {
    throw new Error("Failed to create batch: " + JSON.stringify(batchError));
  }
  console.log(`✅ Batch created: ID=${batch.id}`);

  // 5. Query Existing Teachers
  console.log("\n5. Querying Teaching Faculty...");
  const { data: teachers, error: tError } = await adminClient
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "teacher")
    .limit(1);

  if (tError || !teachers || teachers.length === 0) {
    throw new Error("No teachers found to allocate: " + JSON.stringify(tError));
  }
  const teacher = teachers[0];
  console.log(`✅ Found teacher: ${teacher.full_name} (${teacher.id})`);

  // 6. Allocate Teacher to Subject & Batch
  console.log(`\n6. Allocating ${teacher.full_name} to Subject [${subject.code}] and Batch [${batch.name}]...`);
  const { data: assignment, error: assignError } = await adminClient
    .from("teaching_assignments")
    .insert({
      teacher_id: teacher.id,
      subject_id: subject.id,
      batch_id: batch.id,
      academic_year: "2026-27",
    })
    .select("id")
    .single();

  if (assignError || !assignment) {
    throw new Error("Failed to create teaching allocation: " + JSON.stringify(assignError));
  }
  console.log(`✅ Allocation successful: ID=${assignment.id}`);

  // 7. Verify Data Integrity via Joins
  console.log("\n7. Verifying Assignment Relations...");
  const { data: verifyData, error: verifyError } = await adminClient
    .from("teaching_assignments")
    .select(`
      id,
      academic_year,
      teacher:profiles(full_name),
      subjects(code, name),
      batches(name)
    `)
    .eq("id", assignment.id)
    .single();

  if (verifyError || !verifyData) {
    throw new Error("Verification failed: " + JSON.stringify(verifyError));
  }
  console.log("✅ Verified Assignment record:", {
    teacher: verifyData.teacher?.full_name,
    subject: verifyData.subjects?.name,
    batch: verifyData.batches?.name,
    academicYear: verifyData.academic_year,
  });

  // 8. Cleanup test allocation, batch, syllabus topics, and subject
  console.log("\n8. Cleaning up test data...");
  await adminClient.from("teaching_assignments").delete().eq("id", assignment.id);
  await adminClient.from("batches").delete().eq("id", batch.id);
  await adminClient.from("syllabus_topics").delete().eq("subject_id", subject.id);
  await adminClient.from("subjects").delete().eq("id", subject.id);
  console.log("✅ Cleanup complete.");

  console.log("\n🎉 ALL ADMIN MASTER DATA MANAGEMENT TESTS PASSED!");
}

runTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
