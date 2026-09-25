"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { academicEventSchema, AcademicEventInput } from "@/lib/validation/calendar";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createAcademicEventAction(input: AcademicEventInput) {
  const user = await getCurrentTeacherUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Faculty or administrator access required." };
  }

  const validation = academicEventSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const data = validation.data;
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("academic_events").insert({
    title: data.title,
    description: data.description || null,
    event_type: data.eventType,
    start_date: data.startDate,
    end_date: data.endDate,
    is_holiday: data.isHoliday,
    batch_id: data.batchId || null,
    teacher_id: data.teacherId || (user.role === "teacher" ? user.id : null),
    created_by: user.id,
  });

  if (error) {
    return { success: false, error: "Failed to create academic event: " + error.message };
  }

  revalidatePath("/calendar");
  revalidatePath("/cr/calendar");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAcademicEventAction(input: AcademicEventInput & { id: string }) {
  const user = await getCurrentTeacherUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Faculty or administrator access required." };
  }

  const validation = academicEventSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const data = validation.data;
  const adminClient = createAdminClient();

  // Verify ownership or admin role
  const { data: existing, error: fetchErr } = await adminClient
    .from("academic_events")
    .select("created_by")
    .eq("id", input.id)
    .single();

  if (fetchErr || !existing) {
    return { success: false, error: "Event not found." };
  }

  if (user.role !== "admin" && existing.created_by !== user.id) {
    return { success: false, error: "You can only edit events created by you." };
  }

  const { error } = await adminClient
    .from("academic_events")
    .update({
      title: data.title,
      description: data.description || null,
      event_type: data.eventType,
      start_date: data.startDate,
      end_date: data.endDate,
      is_holiday: data.isHoliday,
      batch_id: data.batchId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    return { success: false, error: "Failed to update event: " + error.message };
  }

  revalidatePath("/calendar");
  revalidatePath("/cr/calendar");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAcademicEventAction(eventId: string) {
  const user = await getCurrentTeacherUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Faculty or administrator access required." };
  }

  const adminClient = createAdminClient();

  // Verify ownership or admin role
  const { data: existing, error: fetchErr } = await adminClient
    .from("academic_events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  if (fetchErr || !existing) {
    return { success: false, error: "Event not found." };
  }

  if (user.role !== "admin" && existing.created_by !== user.id) {
    return { success: false, error: "You can only delete events created by you." };
  }

  const { error } = await adminClient.from("academic_events").delete().eq("id", eventId);

  if (error) {
    return { success: false, error: "Failed to delete event: " + error.message };
  }

  revalidatePath("/calendar");
  revalidatePath("/cr/calendar");
  revalidatePath("/dashboard");
  return { success: true };
}
