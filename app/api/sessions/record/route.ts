import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in as faculty." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      batchId,
      subjectId,
      sessionDate,
      startTime,
      endTime,
      topicPlanned,
      topicCovered,
      teachingMethod,
      assignmentActivity,
      studentsPresent,
      teacherId,
    } = body;

    const targetTeacherId =
      user.role === "admin" && teacherId ? teacherId : user.id;

    if (!batchId || !subjectId || !sessionDate || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: "Please fill in all required class session fields." },
        { status: 400 }
      );
    }

    const topicText = topicCovered?.trim() || topicPlanned?.trim();
    if (!topicText) {
      return NextResponse.json(
        { success: false, error: "Topic title is required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch batch details
    const { data: batch, error: batchErr } = await adminClient
      .from("batches")
      .select("current_semester, academic_year, class_strength, name")
      .eq("id", batchId)
      .single();

    if (batchErr || !batch) {
      return NextResponse.json(
        { success: false, error: "Selected batch not found." },
        { status: 404 }
      );
    }

    // 2. Insert into class_sessions
    const startTimeFormatted = startTime.length === 5 ? `${startTime}:00` : startTime;
    const endTimeFormatted = endTime.length === 5 ? `${endTime}:00` : endTime;

    const { data: insertedSession, error: insertErr } = await adminClient
      .from("class_sessions")
      .insert({
        batch_id: batchId,
        subject_id: subjectId,
        teacher_id: targetTeacherId,
        session_date: sessionDate,
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        topic_planned: topicPlanned?.trim() || topicText,
        topic_covered: topicText,
        teaching_method: teachingMethod?.trim() || "Interactive Lecture with PPT & Visual Aids",
        assignment_activity: assignmentActivity?.trim() || null,
        students_present: studentsPresent ?? batch.class_strength,
        status: "verified",
        verified_at: new Date().toISOString(),
        semester: batch.current_semester || 1,
        academic_year: batch.academic_year || "2026-27",
        logged_by: user.id,
      })
      .select("id")
      .single();

    if (insertErr || !insertedSession) {
      return NextResponse.json(
        { success: false, error: "Failed to record session: " + insertErr?.message },
        { status: 500 }
      );
    }

    // 3. Sync default student attendance
    try {
      const { data: students } = await adminClient
        .from("students")
        .select("id")
        .eq("batch_id", batchId);

      if (students && students.length > 0) {
        const attendanceRows = students.map((st) => ({
          session_id: insertedSession.id,
          student_id: st.id,
          status: "present",
        }));
        await adminClient.from("attendance_records").insert(attendanceRows);
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      sessionId: insertedSession.id,
      message: "Class session successfully recorded and verified by faculty!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
