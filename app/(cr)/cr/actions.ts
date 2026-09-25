"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionSchema, updateSessionSchema } from "@/lib/validation/session";
import { getCurrentCRUser } from "@/lib/data/cr";
import { isWithinCREditWindow } from "@/lib/dates";

export async function createClassSessionAction(prevState: any, formData: FormData) {
  const user = await getCurrentCRUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please sign in as a Class Representative." };
  }

  const rawData = {
    batchId: formData.get("batchId") as string,
    subjectId: formData.get("subjectId") as string,
    teacherId: formData.get("teacherId") as string,
    sessionDate: formData.get("sessionDate") as string,
    startTime: formData.get("startTime") as string,
    endTime: formData.get("endTime") as string,
    studentsPresent: formData.get("studentsPresent"),
    topicCovered: formData.get("topicCovered") as string,
  };

  const validation = createSessionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const data = validation.data;
  const adminClient = createAdminClient();

  // 0. Verify the CR is authorised for this batch (prevent IDOR)
  const { data: crAuth, error: crAuthErr } = await adminClient
    .from("cr_authorisations")
    .select("id")
    .eq("cr_id", user.id)
    .eq("batch_id", data.batchId)
    .is("revoked_at", null)
    .maybeSingle();

  if (crAuthErr || !crAuth) {
    return { success: false, error: "You are not authorised to log sessions for this batch." };
  }

  // 1. Fetch batch details for snapshot values & strength limit
  const { data: batch, error: batchErr } = await adminClient
    .from("batches")
    .select("current_semester, academic_year, class_strength, name")
    .eq("id", data.batchId)
    .single();

  if (batchErr || !batch) {
    return { success: false, error: "Authorized batch not found." };
  }

  if (data.studentsPresent > batch.class_strength) {
    return {
      success: false,
      error: `Students present (${data.studentsPresent}) exceeds the total class strength of ${batch.class_strength} for ${batch.name}.`,
    };
  }

  // 2. Check for duplicate session entry
  const { data: existingDuplicate } = await adminClient
    .from("class_sessions")
    .select("id")
    .eq("batch_id", data.batchId)
    .eq("subject_id", data.subjectId)
    .eq("session_date", data.sessionDate)
    .eq("start_time", data.startTime)
    .maybeSingle();

  if (existingDuplicate) {
    return {
      success: false,
      error: `This class session has already been logged for ${data.sessionDate} starting at ${data.startTime}.`,
    };
  }

  // 3. Insert class session into database
  const { error: insertErr } = await adminClient.from("class_sessions").insert({
    batch_id: data.batchId,
    subject_id: data.subjectId,
    teacher_id: data.teacherId,
    semester: batch.current_semester,
    academic_year: batch.academic_year,
    session_date: data.sessionDate,
    start_time: data.startTime,
    end_time: data.endTime,
    students_present: data.studentsPresent,
    topic_covered: data.topicCovered.trim(),
    topic_planned: data.topicCovered.trim(), // Topic Planned and Covered topic must be identical
    status: "submitted",
    entered_by: user.id,
  });

  if (insertErr) {
    return { success: false, error: insertErr.message || "Failed to save class session." };
  }

  revalidatePath("/cr/log");
  revalidatePath("/cr/history");

  return { success: true, message: "Class session logged successfully!" };
}

export async function updateClassSessionAction(prevState: any, formData: FormData) {
  const user = await getCurrentCRUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please sign in as a Class Representative." };
  }

  const rawData = {
    sessionId: formData.get("sessionId") as string,
    startTime: formData.get("startTime") as string,
    endTime: formData.get("endTime") as string,
    studentsPresent: formData.get("studentsPresent"),
    topicCovered: formData.get("topicCovered") as string,
  };

  const validation = updateSessionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const data = validation.data;
  const adminClient = createAdminClient();

  // 1. Verify session exists and belongs to CR's batch
  const { data: session, error: fetchErr } = await adminClient
    .from("class_sessions")
    .select("id, status, created_at, batch_id, entered_by, batches(class_strength)")
    .eq("id", data.sessionId)
    .single();

  if (fetchErr || !session) {
    return { success: false, error: "Session record not found." };
  }

  // 1b. Verify session was entered by this CR (prevent IDOR)
  if (session.entered_by !== user.id) {
    return { success: false, error: "You can only edit sessions you logged." };
  }

  // 2. Check if verified
  if (session.status === "verified") {
    return { success: false, error: "This session has already been verified by faculty and cannot be edited." };
  }

  // 3. Check 24-hour edit window
  if (!isWithinCREditWindow(session.created_at)) {
    return { success: false, error: "The 24-hour edit window for this session has expired." };
  }

  // 4. Check class strength limit
  const maxStrength = (session.batches as any)?.class_strength || 100;
  if (data.studentsPresent > maxStrength) {
    return { success: false, error: `Students present cannot exceed class strength (${maxStrength}).` };
  }

  // 5. Update only CR-permitted fields
  const { error: updateErr } = await adminClient
    .from("class_sessions")
    .update({
      start_time: data.startTime,
      end_time: data.endTime,
      students_present: data.studentsPresent,
      topic_covered: data.topicCovered.trim(),
      topic_planned: data.topicCovered.trim(), // Topic Planned and Covered topic must be identical
    })
    .eq("id", data.sessionId);

  if (updateErr) {
    return { success: false, error: updateErr.message || "Failed to update session." };
  }

  revalidatePath("/cr/history");
  revalidatePath("/cr/log");

  return { success: true, message: "Class session updated successfully." };
}
