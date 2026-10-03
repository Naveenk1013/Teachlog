import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      sessionId,
      topicCovered,
      topicPlanned,
      teachingMethod,
      assignmentActivity,
      studentsPresent,
      status,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch current session to verify ownership / role
    const { data: session, error: fetchError } = await adminClient
      .from("class_sessions")
      .select("id, teacher_id, session_date, batch_id, status, entered_by")
      .eq("id", sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { success: false, error: "Session not found." },
        { status: 404 }
      );
    }

    const isTeacher = user.role === "teacher" && session.teacher_id === user.id;
    const isAdmin = user.role === "admin";
    let isAuthorisedCR = false;

    if (user.role === "cr") {
      if (session.entered_by === user.id) {
        isAuthorisedCR = true;
      } else {
        const { data: authRecord } = await adminClient
          .from("cr_authorisations")
          .select("id")
          .eq("cr_id", user.id)
          .eq("batch_id", session.batch_id)
          .is("revoked_at", null)
          .maybeSingle();
        if (authRecord) isAuthorisedCR = true;
      }

      if (!isAuthorisedCR) {
        return NextResponse.json(
          { success: false, error: "Unauthorized to modify this session." },
          { status: 403 }
        );
      }
    } else if (!isAdmin && !isTeacher) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to modify this session." },
        { status: 403 }
      );
    }

    // 2. Build update payload
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (topicCovered !== undefined) {
      updatePayload.topic_covered = topicCovered.trim();
      updatePayload.topic_planned = topicCovered.trim();
    } else if (topicPlanned !== undefined) {
      updatePayload.topic_planned = topicPlanned.trim();
      updatePayload.topic_covered = topicPlanned.trim();
    }

    if (teachingMethod !== undefined) {
      updatePayload.teaching_method = teachingMethod ? teachingMethod.trim() : null;
    }
    if (assignmentActivity !== undefined) {
      updatePayload.assignment_activity = assignmentActivity ? assignmentActivity.trim() : null;
    }
    if (studentsPresent !== undefined && !isNaN(Number(studentsPresent))) {
      updatePayload.students_present = Number(studentsPresent);
    }
    if (status !== undefined) {
      updatePayload.status = status;
      if (status === "verified") {
        updatePayload.verified_at = new Date().toISOString();
      }
    }

    const { error: updateError } = await adminClient
      .from("class_sessions")
      .update(updatePayload)
      .eq("id", sessionId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Class session log updated successfully!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
