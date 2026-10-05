import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch session to verify ownership
    const { data: session, error: fetchErr } = await adminClient
      .from("class_sessions")
      .select("id, teacher_id, entered_by, topic_covered, session_date")
      .eq("id", sessionId)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json(
        { success: false, error: "Session not found." },
        { status: 404 }
      );
    }

    // Faculty can only delete their own sessions; Admin can delete any
    if (
      user.role !== "admin" &&
      session.teacher_id !== user.id &&
      session.entered_by !== user.id
    ) {
      return NextResponse.json(
        { success: false, error: "You are only permitted to delete your own logged sessions." },
        { status: 403 }
      );
    }

    // 2. Cascade cleanup: session syllabus topics
    await adminClient.from("session_syllabus_topics").delete().eq("session_id", sessionId);

    // 3. Cascade cleanup: attendance records
    try {
      await adminClient.from("attendance_records").delete().eq("session_id", sessionId);
    } catch {
      // non-blocking
    }
    try {
      await adminClient.from("session_attendance").delete().eq("session_id", sessionId);
    } catch {
      // non-blocking
    }

    // 4. Delete the class session
    const { error: delErr } = await adminClient
      .from("class_sessions")
      .delete()
      .eq("id", sessionId);

    if (delErr) {
      return NextResponse.json(
        { success: false, error: "Failed to delete session: " + delErr.message },
        { status: 500 }
      );
    }

    // 5. Audit Log entry
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: user.id,
        action: "SESSION_DELETED",
        entity: "class_sessions",
        entity_id: sessionId,
        old_data: session,
      });
    } catch {
      // audit log is non-blocking
    }

    revalidatePath("/weekly-logs");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/summaries");
    revalidatePath("/calendar");

    return NextResponse.json({
      success: true,
      message: `Session for ${session.session_date} was deleted successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
