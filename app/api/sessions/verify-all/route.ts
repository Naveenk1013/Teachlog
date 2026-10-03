import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, format, parseISO } from "date-fns";
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
    const { batchId, subjectId, weekStartStr } = body;

    if (!batchId || !subjectId || !weekStartStr) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const startDate = parseISO(weekStartStr);
    const endDate = addDays(startDate, 5); // Saturday
    const endStr = format(endDate, "yyyy-MM-dd");

    const { error } = await adminClient
      .from("class_sessions")
      .update({
        status: "verified",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("batch_id", batchId)
      .eq("subject_id", subjectId)
      .gte("session_date", weekStartStr)
      .lte("session_date", endStr)
      .eq("status", "submitted");

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to verify sessions: " + error.message },
        { status: 500 }
      );
    }

    revalidatePath("/dashboard");
    revalidatePath("/weekly-logs");
    revalidatePath("/reports");
    revalidatePath("/summaries");
    revalidatePath("/calendar");
    revalidatePath("/cr/history");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
