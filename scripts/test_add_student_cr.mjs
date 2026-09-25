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
  console.log("=== Testing Add New Student CR Flow in Admin Portal ===");

  const BATCH_SEM4_ID = "22222222-2222-2222-2222-222222222221"; // Sem 4
  const ADMIN_ID = "aaaa0000-0000-0000-0000-000000000001";

  const testStudentEmail = `test.student.${Date.now()}@student.iihmhyd.edu.in`;
  const testStudentName = "Rohan Sharma (Test CR)";
  const academicYear = "2026-27";

  console.log(`\n1. Creating New Student CR: ${testStudentName} <${testStudentEmail}>...`);

  // 1. Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: testStudentEmail,
    password: "password123",
    email_confirm: true,
    user_metadata: { full_name: testStudentName, role: "cr" },
  });

  if (authError || !authData?.user) {
    throw new Error(`Failed to create auth user: ${JSON.stringify(authError)}`);
  }
  const studentId = authData.user.id;
  console.log(`✅ Auth user created with ID: ${studentId}`);

  // 2. Create profile
  const { error: profError } = await adminClient.from("profiles").upsert({
    id: studentId,
    full_name: testStudentName,
    role: "cr",
    is_active: true,
  });

  if (profError) {
    throw new Error(`Failed to upsert profile: ${JSON.stringify(profError)}`);
  }
  console.log(`✅ Student profile created with role 'cr'`);

  // 3. Grant CR authorization (co-CR test, preserving Aarav Patel)
  const { data: authRecord, error: grantError } = await adminClient
    .from("cr_authorisations")
    .insert({
      cr_id: studentId,
      batch_id: BATCH_SEM4_ID,
      academic_year: academicYear,
      granted_by: ADMIN_ID,
    })
    .select("id, cr_id, batch_id, academic_year, granted_at")
    .single();

  if (grantError || !authRecord) {
    throw new Error(`Failed to grant CR authorization: ${JSON.stringify(grantError)}`);
  }
  console.log(`✅ CR Authorization granted: ID=${authRecord.id}`);

  // 4. Verify co-existence of multiple active CRs for Batch Sem 4
  const { data: activeCRs, error: crErr } = await adminClient
    .from("cr_authorisations")
    .select(`
      id,
      cr:profiles!cr_authorisations_cr_id_fkey(full_name),
      batches(name)
    `)
    .eq("batch_id", BATCH_SEM4_ID)
    .is("revoked_at", null);

  if (crErr || !activeCRs) {
    throw new Error(`Failed to fetch active CRs: ${JSON.stringify(crErr)}`);
  }

  console.log(`\n✅ Active CRs for ${activeCRs[0]?.batches?.name}: ${activeCRs.length}`);
  for (const c of activeCRs) {
    console.log(`   - Representative: ${c.cr?.full_name} (Auth ID: ${c.id})`);
  }

  if (activeCRs.length < 2) {
    throw new Error("Expected at least 2 active CRs for co-CR support");
  }

  // 5. Test Revoking CR Access
  console.log(`\n5. Testing Revoke CR Access for test student...`);
  const { error: revokeErr } = await adminClient
    .from("cr_authorisations")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: ADMIN_ID,
      revoke_reason: "Test cycle completed",
    })
    .eq("id", authRecord.id);

  if (revokeErr) {
    throw new Error(`Failed to revoke access: ${JSON.stringify(revokeErr)}`);
  }
  console.log("✅ Successfully revoked access with audit reason.");

  // 6. Cleanup test student
  console.log("\n6. Cleaning up test student data...");
  await adminClient.from("cr_authorisations").delete().eq("id", authRecord.id);
  await adminClient.from("profiles").delete().eq("id", studentId);
  await adminClient.auth.admin.deleteUser(studentId);
  console.log("✅ Test student cleaned up.");

  console.log("\n🎉 ALL ADD STUDENT CR ADMIN FLOW TESTS PASSED!");
}

main().catch(console.error);
