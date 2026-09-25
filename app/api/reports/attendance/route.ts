import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getCohortAttendanceOverview } from "@/lib/data/attendance";
import { buildAttendanceReportDocx } from "@/lib/reports/attendance-report";
import { buildAttendanceReportXml } from "@/lib/reports/attendance-xml";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  const format = (searchParams.get("format") || "docx").toLowerCase();

  if (!batchId) {
    return NextResponse.json(
      { error: "Missing required query parameter: batchId" },
      { status: 400 }
    );
  }

  // 1. Authenticate user
  const currentUser = await getCurrentAppUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  // 2. Fetch Attendance Overview
  const overview = await getCohortAttendanceOverview(batchId);
  if (!overview) {
    return NextResponse.json(
      { error: "Cohort not found or no attendance data available." },
      { status: 404 }
    );
  }

  // 3. Log export event
  try {
    const adminClient = createAdminClient();
    await adminClient.from("report_exports").insert({
      generated_by: currentUser.id,
      report_type: `attendance_${format}`,
      params: {
        batchId,
        batchName: overview.batchName,
        format,
        studentsCount: overview.students.length,
        sessionsCount: overview.sessions.length,
      },
    });
  } catch {
    // Ignore audit log error
  }

  const cleanBatchName = overview.batchName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const dateStamp = new Date().toISOString().split("T")[0];

  // 4. Return Requested Format
  if (format === "xml") {
    const xmlContent = buildAttendanceReportXml(overview, currentUser.fullName);
    const filename = `Attendance_Report_${cleanBatchName}_${dateStamp}.xml`;

    return new Response(xmlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === "csv") {
    const headers = [
      "Roll Number",
      "Student Name",
      "Section",
      "Practical Group",
      "Total Classes Held",
      "Attended",
      "Absent",
      "Late",
      "Attendance %",
      "Exam Eligibility",
    ];

    const rows = overview.students.map((st) => [
      st.rollNumber,
      `"${st.fullName.replace(/"/g, '""')}"`,
      st.section,
      st.practicalGroup || "None",
      st.totalClasses,
      st.attendedClasses,
      st.absentClasses,
      st.lateClasses || 0,
      `${st.percentage}%`,
      st.percentage >= 75 ? "Eligible" : "Shortage Warning",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const filename = `Attendance_Register_${cleanBatchName}_${dateStamp}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Default: DOCX
  try {
    const docxBuffer = await buildAttendanceReportDocx(overview, currentUser.fullName);
    const filename = `Attendance_Report_${cleanBatchName}_${dateStamp}.docx`;

    return new Response(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": docxBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("Attendance DOCX generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate Word document: " + err.message },
      { status: 500 }
    );
  }
}
