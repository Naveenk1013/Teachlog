import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in as faculty or admin." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      teacherId,
      batchId,
      subjectId,
      weekStart,
      syllabusCoverage,
      practicalConducted,
      assessmentConducted,
      slowLearners,
      remedialAction,
      aiDigitalTools,
      industryExamples,
      status,
    } = body;

    if (!batchId || !subjectId || !weekStart) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters (batch, subject, week)." },
        { status: 400 }
      );
    }

    if (!syllabusCoverage || !syllabusCoverage.trim()) {
      return NextResponse.json(
        { success: false, error: "Syllabus coverage is required." },
        { status: 400 }
      );
    }

    const targetTeacherId = user.role === "admin" && teacherId ? teacherId : user.id;
    const adminClient = createAdminClient();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const { error } = await adminClient.from("weekly_summaries").upsert(
      {
        teacher_id: targetTeacherId,
        subject_id: subjectId,
        batch_id: batchId,
        week_start: weekStart,
        syllabus_coverage: syllabusCoverage.trim(),
        practical_conducted: practicalConducted ? practicalConducted.trim() : null,
        assessment_conducted: assessmentConducted ? assessmentConducted.trim() : null,
        slow_learners: slowLearners ? slowLearners.trim() : null,
        remedial_action: remedialAction ? remedialAction.trim() : null,
        ai_digital_tools: aiDigitalTools ? aiDigitalTools.trim() : null,
        industry_examples: industryExamples ? industryExamples.trim() : null,
        status: status || "draft",
        submitted_on: todayStr,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "teacher_id,subject_id,batch_id,week_start",
      }
    );

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to save weekly summary: " + error.message },
        { status: 500 }
      );
    }

    revalidatePath("/summaries");
    revalidatePath("/dashboard");
    revalidatePath("/weekly-logs");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
