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

    const body = await request.json();
    const { sessionId, topicPlanned, teachingMethod, assignmentActivity, syllabusTopicIds } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required." },
        { status: 400 }
      );
    }

    if (!topicPlanned || !topicPlanned.trim()) {
      return NextResponse.json(
        { success: false, error: "Topic title is required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify session exists and belongs to this teacher (or admin)
    const { data: session, error: fetchErr } = await adminClient
      .from("class_sessions")
      .select("id, teacher_id")
      .eq("id", sessionId)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json(
        { success: false, error: "Session not found." },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && session.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only edit sessions assigned to you." },
        { status: 403 }
      );
    }

    // 1. Update class_sessions
    const cleanTopic = topicPlanned.trim();
    const cleanMethod = teachingMethod ? teachingMethod.trim() : "Lecture & Demonstration";
    const cleanAssignment = assignmentActivity ? assignmentActivity.trim() : null;

    const { error: updateErr } = await adminClient
      .from("class_sessions")
      .update({
        topic_planned: cleanTopic,
        topic_covered: cleanTopic,
        teaching_method: cleanMethod,
        assignment_activity: cleanAssignment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: "Failed to update session details: " + updateErr.message },
        { status: 500 }
      );
    }

    // 2. Sync syllabus topics
    await adminClient.from("session_syllabus_topics").delete().eq("session_id", sessionId);

    if (Array.isArray(syllabusTopicIds) && syllabusTopicIds.length > 0) {
      const rows = syllabusTopicIds.map((topicId: string) => ({
        session_id: sessionId,
        syllabus_topic_id: topicId,
      }));
      const { error: linkErr } = await adminClient.from("session_syllabus_topics").insert(rows);
      if (linkErr) {
        return NextResponse.json(
          { success: false, error: "Session saved, but failed to link syllabus topics: " + linkErr.message },
          { status: 500 }
        );
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/weekly-logs");
    revalidatePath("/summaries");
    revalidatePath("/cr/history");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
