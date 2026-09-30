import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { getWeeklyReportData } from "@/lib/data/reports";
import { buildWeeklyLogDocx } from "@/lib/reports/weekly-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeachingWeekOfMonth } from "@/lib/dates";
import { parseISO } from "date-fns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const batchId = searchParams.get("batchId");
  const semester = searchParams.get("semester");
  const weekStart = searchParams.get("weekStart");
  const reqTeacherId = searchParams.get("teacherId");

  if (!weekStart) {
    return NextResponse.json(
      { error: "Missing required query parameter (weekStart)" },
      { status: 400 }
    );
  }

  // 1. Authenticate user
  const currentUser = await getCurrentTeacherUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetTeacherId =
    (currentUser.role === "admin" || currentUser.role === "hod") && reqTeacherId
      ? reqTeacherId
      : currentUser.id;

  // 2. Fetch Report Data (supports semester-wise or batch-specific)
  const reportData = await getWeeklyReportData({
    teacherId: targetTeacherId,
    semester: semester ? Number(semester) : undefined,
    batchId: batchId && batchId !== "all" ? batchId : undefined,
    subjectId: subjectId && subjectId !== "all" ? subjectId : undefined,
    weekStartStr: weekStart,
  });

  if (!reportData) {
    return NextResponse.json(
      { error: "No curriculum or assignment data found for the specified criteria" },
      { status: 404 }
    );
  }

  // 3. Build DOCX
  try {
    const docxBuffer = await buildWeeklyLogDocx(reportData);

    // 4. Log in report_exports
    try {
      const adminClient = createAdminClient();
      await adminClient.from("report_exports").insert({
        generated_by: currentUser.id,
        report_type: "weekly_log",
        params: {
          teacherId: targetTeacherId,
          semester: semester || reportData.semester,
          subjectId: subjectId || "all",
          batchId: batchId || "all",
          weekStart,
        },
      });
    } catch {
      // Ignore write errors to report_exports
    }

    // 5. Construct Sanitized Filename
    const weekOfMonth = getTeachingWeekOfMonth(parseISO(weekStart));
    const cleanFaculty = (reportData.facultyName || "Faculty")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 15);
    const cleanBatch = (reportData.batchName || `Sem_${reportData.semester}`)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 25);
    const filename = `WeeklyLog_${cleanFaculty}_${cleanBatch}_W${weekOfMonth}_${weekStart}.docx`;

    // 6. Return File
    return new Response(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": docxBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("DOCX generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate DOCX document: " + err.message },
      { status: 500 }
    );
  }
}
