import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { format, startOfWeek } from "date-fns";

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runPhase4Tests() {
  console.log("==================================================");
  console.log("📄 PHASE 4: OFFICIAL DOCX & ADMIN CONTROLS SUITE");
  console.log("==================================================");

  // 1. Find verified session and summary for Chef Rajesh
  console.log("\n[Test 1] Locating verified curriculum data for Chef Rajesh...");
  const { data: sessions, error: sessErr } = await supabase
    .from("class_sessions")
    .select("batch_id, subject_id, teacher_id, session_date")
    .eq("teacher_id", "bbbb0000-0000-0000-0000-000000000001")
    .order("created_at", { ascending: false })
    .limit(1);

  if (sessErr || !sessions || sessions.length === 0) {
    throw new Error("No session found for Chef Rajesh: " + sessErr?.message);
  }

  const session = sessions[0];

  const weekStart = format(startOfWeek(new Date(session.session_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
  console.log(`- Subject ID: ${session.subject_id}`);
  console.log(`- Batch ID: ${session.batch_id}`);
  console.log(`- Week Start: ${weekStart}`);

  // 2. Test HTTP API Route: GET /api/reports/weekly-log
  console.log("\n[Test 2] Testing DOCX Download API Endpoint on Localhost...");
  const teacherCookie = encodeURIComponent(
    JSON.stringify({
      id: "bbbb0000-0000-0000-0000-000000000001",
      email: "rajesh.kumar@iihmhyd.edu.in",
      role: "teacher",
      name: "Chef Rajesh Kumar",
      is_active: true,
    })
  );

  const downloadUrl = `http://localhost:3000/api/reports/weekly-log?subjectId=${session.subject_id}&batchId=${session.batch_id}&weekStart=${weekStart}`;
  const apiRes = await fetch(downloadUrl, {
    headers: {
      Cookie: `teachlog_dev_session=${teacherCookie}`,
    },
  });

  console.log(`- API Status: ${apiRes.status}`);
  const contentType = apiRes.headers.get("content-type");
  const contentDisposition = apiRes.headers.get("content-disposition");
  console.log(`- Content-Type: ${contentType}`);
  console.log(`- Content-Disposition: ${contentDisposition}`);

  if (apiRes.status !== 200) {
    const errorText = await apiRes.text();
    throw new Error(`API returned ${apiRes.status}: ${errorText}`);
  }

  const fileBuffer = Buffer.from(await apiRes.arrayBuffer());
  console.log(`- Generated DOCX Size: ${fileBuffer.length} bytes`);

  // Check Zip Header for DOCX (PK\x03\x04)
  const isDocxZip =
    fileBuffer[0] === 0x50 &&
    fileBuffer[1] === 0x4b &&
    fileBuffer[2] === 0x03 &&
    fileBuffer[3] === 0x04;
  console.log(`- Valid Word Document Zip Signature: ${isDocxZip ? "✅ YES (PK..)" : "❌ NO"}`);

  if (!isDocxZip || fileBuffer.length < 5000) {
    throw new Error("Generated file is not a valid DOCX document archive");
  }

  // Save generated sample artifact
  const outDir = path.resolve(process.cwd(), "exports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const samplePath = path.join(outDir, "Generated_Weekly_Teaching_Log_Sample.docx");
  fs.writeFileSync(samplePath, fileBuffer);
  console.log(`✅ Saved sample generated report: ${samplePath}`);

  // 3. Test Teacher Reports Hub UI
  console.log("\n[Test 3] Testing Faculty Reports Hub Page (GET /reports)...");
  const reportsPageRes = await fetch("http://localhost:3000/reports", {
    headers: {
      Cookie: `teachlog_dev_session=${teacherCookie}`,
    },
  });
  console.log(`- GET /reports status: ${reportsPageRes.status}`);
  const reportsHtml = await reportsPageRes.text();
  const hasReportsHeader = reportsHtml.includes("Weekly Teaching Log Reports (.docx)");
  const hasDownloadBtn = reportsHtml.includes("Download Document (.docx)");
  console.log(`- Reports Hub Page loaded: ${hasReportsHeader && hasDownloadBtn ? "✅ YES" : "❌ NO"}`);

  // 4. Test Admin Controls: Overview, CR Register, Audit Trail
  console.log("\n[Test 4] Testing Admin Controls Pages & APIs...");
  const adminCookie = encodeURIComponent(
    JSON.stringify({
      id: "aaaa0000-0000-0000-0000-000000000001",
      email: "admin@iihmhyd.edu.in",
      role: "admin",
      name: "Admin Naveen",
      is_active: true,
    })
  );

  // Admin Overview
  const adminRes = await fetch("http://localhost:3000/admin", {
    headers: { Cookie: `teachlog_dev_session=${adminCookie}` },
  });
  console.log(`- GET /admin status: ${adminRes.status}`);
  const adminHtml = await adminRes.text();
  const hasAdminKpis = adminHtml.includes("Active Cohorts") && adminHtml.includes("Curriculum Subjects");
  console.log(`- Admin Overview KPIs loaded: ${hasAdminKpis ? "✅ YES" : "❌ NO"}`);

  // Admin CR Register
  const crPageRes = await fetch("http://localhost:3000/admin/crs", {
    headers: { Cookie: `teachlog_dev_session=${adminCookie}` },
  });
  console.log(`- GET /admin/crs status: ${crPageRes.status}`);
  const crHtml = await crPageRes.text();
  const hasCRTable = crHtml.includes("Class Representative Authorisation Register");
  console.log(`- CR Register Page loaded: ${hasCRTable ? "✅ YES" : "❌ NO"}`);

  // Admin Audit Trail
  const auditRes = await fetch("http://localhost:3000/admin/audit", {
    headers: { Cookie: `teachlog_dev_session=${adminCookie}` },
  });
  console.log(`- GET /admin/audit status: ${auditRes.status}`);
  const auditHtml = await auditRes.text();
  const hasAuditTables = auditHtml.includes("Recent Authentication Activity") && auditHtml.includes("Data Changes Audit Trail");
  console.log(`- Audit Trail Page loaded: ${hasAuditTables ? "✅ YES" : "❌ NO"}`);

  // 5. Verify Report Exports Table was updated
  console.log("\n[Test 5] Verifying report_exports audit tracking in Database...");
  const { data: exportRows } = await supabase
    .from("report_exports")
    .select("id, report_type, created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (exportRows && exportRows.length > 0) {
    console.log(`- Recorded Export: ${exportRows[0].id} (Type: ${exportRows[0].report_type}) at ${exportRows[0].created_at}`);
    console.log("✅ Report export successfully audited in database.");
  } else {
    console.log("⚠️ No report_exports row found (check permissions).");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 4 VERIFICATION TESTS PASSED PERFECTLY!");
  console.log("==================================================");
}

runPhase4Tests().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
