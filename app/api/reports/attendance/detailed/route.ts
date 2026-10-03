import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/data/auth";
import { getDetailedAttendanceMatrix } from "@/lib/data/attendance";
import {
  buildDetailedAttendanceCSV,
  buildDetailedAttendanceDocx,
} from "@/lib/reports/attendance-detail";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  const format = (searchParams.get("format") || "csv").toLowerCase();

  if (!batchId) {
    return NextResponse.json(
      { error: "Missing required query parameter: batchId" },
      { status: 400 }
    );
  }

  // 1. Authenticate
  const currentUser = await getCurrentAppUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  // 2. Fetch full matrix
  const matrix = await getDetailedAttendanceMatrix(batchId);
  if (!matrix) {
    return NextResponse.json(
      { error: "Batch not found or no data available." },
      { status: 404 }
    );
  }

  // 3. Audit log
  try {
    const adminClient = createAdminClient();
    await adminClient.from("report_exports").insert({
      generated_by: currentUser.id,
      report_type: `detailed_attendance_${format}`,
      params: {
        batchId,
        batchName: matrix.batchName,
        format,
        studentsCount: matrix.students.length,
        sessionsCount: matrix.sessions.length,
      },
    });
  } catch {
    // Non-fatal
  }

  const cleanName = matrix.batchName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const dateStamp = new Date().toISOString().split("T")[0];

  // 4. Build and return
  if (format === "docx") {
    try {
      const buf = await buildDetailedAttendanceDocx(matrix, currentUser.fullName);
      const filename = `Detailed_Register_${cleanName}_${dateStamp}.docx`;
      return new Response(buf as any, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": buf.length.toString(),
        },
      });
    } catch (err: any) {
      console.error("Detailed DOCX generation failed:", err);
      return NextResponse.json(
        { error: "Failed to generate Word document: " + err.message },
        { status: 500 }
      );
    }
  }

  // Default: CSV (works for any number of sessions)
  const csvContent = buildDetailedAttendanceCSV(matrix, currentUser.fullName);
  const filename = `Detailed_Register_${cleanName}_${dateStamp}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
