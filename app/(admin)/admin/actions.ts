"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { getCurrentAppUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function grantCRAuthorisationAction(
  crId: string,
  batchId: string,
  academicYear: string,
  replaceExisting = false
) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  if (!crId || !batchId || !academicYear) {
    return { success: false, error: "Student, batch, and academic year are required." };
  }

  const adminClient = createAdminClient();

  // Check if this student already has an active authorisation for this batch & academic year
  const { data: existingSelf } = await adminClient
    .from("cr_authorisations")
    .select("id")
    .eq("cr_id", crId)
    .eq("batch_id", batchId)
    .eq("academic_year", academicYear)
    .is("revoked_at", null)
    .maybeSingle();

  if (existingSelf) {
    return { success: false, error: "This student is already an active Class Representative for this cohort." };
  }

  // 1. If replaceExisting is true, revoke existing active authorizations for this batch
  if (replaceExisting) {
    await adminClient
      .from("cr_authorisations")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: admin.id,
        revoke_reason: "Replaced by new CR appointment",
      })
      .eq("batch_id", batchId)
      .eq("academic_year", academicYear)
      .is("revoked_at", null);
  }

  // 2. Grant new authorisation
  const { error } = await adminClient.from("cr_authorisations").insert({
    cr_id: crId,
    batch_id: batchId,
    academic_year: academicYear,
    granted_by: admin.id,
  });

  if (error) {
    return { success: false, error: "Failed to grant authorisation: " + error.message };
  }

  // 3. Write to audit_logs
  try {
    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: "grant_cr_authorisation",
      entity: "cr_authorisations",
      entity_id: crId,
      new_data: { crId, batchId, academicYear, replaceExisting },
    });
  } catch {
    // Non-blocking
  }

  revalidatePath("/admin/crs");
  revalidatePath("/cr/log");
  return { success: true };
}

export async function createStudentAndGrantCRAction(data: {
  fullName: string;
  email: string;
  password?: string;
  batchId: string;
  academicYear: string;
  replaceExisting?: boolean;
}) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const fullName = data.fullName?.trim();
  const email = data.email?.trim().toLowerCase();
  const password = data.password?.trim() || "password123";
  const batchId = data.batchId?.trim();
  const academicYear = data.academicYear?.trim();
  const replaceExisting = Boolean(data.replaceExisting);

  if (!fullName || !email) {
    return { success: false, error: "Student full name and email are required." };
  }

  if (!batchId || !academicYear) {
    return { success: false, error: "Target cohort/batch and academic year are required." };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Create or retrieve auth user for student
    let studentId: string;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "cr" },
    });

    if (authError) {
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already exists") ||
        authError.status === 422
      ) {
        const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 500 });
        const existing = usersList?.users?.find((u) => u.email?.toLowerCase() === email);
        if (existing) {
          studentId = existing.id;
        } else {
          return { success: false, error: "Student email is already registered: " + authError.message };
        }
      } else {
        return { success: false, error: "Failed to create authentication user: " + authError.message };
      }
    } else {
      studentId = authData.user.id;
    }

    // 2. Ensure profile exists and has role 'cr'
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: studentId,
      full_name: fullName,
      role: "cr",
      is_active: true,
    });

    if (profileError) {
      return { success: false, error: "Failed to create student profile: " + profileError.message };
    }

    // 3. Check if already active CR for this cohort & academic year
    const { data: existingActive } = await adminClient
      .from("cr_authorisations")
      .select("id")
      .eq("cr_id", studentId)
      .eq("batch_id", batchId)
      .eq("academic_year", academicYear)
      .is("revoked_at", null)
      .maybeSingle();

    if (existingActive) {
      return { success: false, error: "This student is already an active Class Representative for this cohort." };
    }

    // 4. Revoke previous if requested
    if (replaceExisting) {
      await adminClient
        .from("cr_authorisations")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: admin.id,
          revoke_reason: `Replaced by appointment of ${fullName}`,
        })
        .eq("batch_id", batchId)
        .eq("academic_year", academicYear)
        .is("revoked_at", null);
    }

    // 5. Grant CR authorization
    const { error: grantError } = await adminClient.from("cr_authorisations").insert({
      cr_id: studentId,
      batch_id: batchId,
      academic_year: academicYear,
      granted_by: admin.id,
    });

    if (grantError) {
      return { success: false, error: "Failed to grant CR authorization: " + grantError.message };
    }

    // 6. Write to audit_logs
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: admin.id,
        action: "create_student_and_grant_cr",
        entity: "cr_authorisations",
        entity_id: studentId,
        new_data: { studentId, fullName, email, batchId, academicYear, replaceExisting },
      });
    } catch {
      // Non-blocking
    }

    revalidatePath("/admin/crs");
    revalidatePath("/cr/log");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Student ${fullName} (${email}) has been registered and appointed as Class Representative!`,
      studentId,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred while adding student CR." };
  }
}

export async function revokeCRAuthorisationAction(authId: string, reason: string) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  if (!reason.trim()) {
    return { success: false, error: "Please provide a reason for revocation." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("cr_authorisations")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: admin.id,
      revoke_reason: reason.trim(),
    })
    .eq("id", authId);

  if (error) {
    return { success: false, error: "Failed to revoke authorisation: " + error.message };
  }

  revalidatePath("/admin/crs");
  revalidatePath("/cr/log");
  return { success: true };
}

// ─────────────────────────────────────────────
// Teacher / Faculty Management Actions
// ─────────────────────────────────────────────

export async function createTeacherAction(data: {
  fullName: string;
  email: string;
  department?: string;
  password?: string;
}) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const fullName = data.fullName?.trim();
  const email = data.email?.trim().toLowerCase();
  const department = data.department?.trim() || null;
  const password = data.password?.trim() || "password123";

  if (!fullName || !email) {
    return { success: false, error: "Full name and email are required." };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Create or retrieve auth user
    let userId: string;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "teacher" },
    });

    if (authError) {
      // If user already exists in auth, check if profile exists
      if (authError.message.toLowerCase().includes("already registered") || authError.status === 422) {
        const { data: usersList } = await adminClient.auth.admin.listUsers();
        const existing = usersList?.users?.find((u) => u.email?.toLowerCase() === email);
        if (existing) {
          userId = existing.id;
        } else {
          return { success: false, error: "User already registered: " + authError.message };
        }
      } else {
        return { success: false, error: "Failed to create authentication user: " + authError.message };
      }
    } else {
      userId = authData.user.id;
    }

    // 2. Insert or update profile
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      role: "teacher",
      department,
      is_active: true,
    });

    if (profileError) {
      return { success: false, error: "Failed to create teacher profile: " + profileError.message };
    }

    // 3. Write to audit_logs
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: admin.id,
        action: "TEACHER_CREATED",
        entity: "profiles",
        entity_id: userId,
        new_data: { full_name: fullName, email, department, role: "teacher" },
      });
    } catch {
      // Ignore audit failure
    }

    revalidatePath("/admin/teachers");
    revalidatePath("/admin");
    return { success: true, teacherId: userId };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

export async function toggleTeacherStatusAction(teacherId: string, isActive: boolean) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", teacherId);

  if (error) {
    return { success: false, error: "Failed to update teacher status: " + error.message };
  }

  try {
    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: isActive ? "TEACHER_ACTIVATED" : "TEACHER_DEACTIVATED",
      entity: "profiles",
      entity_id: teacherId,
      new_data: { is_active: isActive },
    });
  } catch {
    // Ignore audit log error
  }

  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function updateUserCredentialsAction(data: {
  userId: string;
  email?: string;
  password?: string;
  fullName?: string;
  department?: string;
}) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const { userId, email, password, fullName, department } = data;
  if (!userId) {
    return { success: false, error: "User ID is required." };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Prepare Auth update attributes
    const authAttributes: Record<string, any> = {};

    if (email && email.trim()) {
      authAttributes.email = email.trim().toLowerCase();
      authAttributes.email_confirm = true;
    }

    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return { success: false, error: "Password must be at least 6 characters." };
      }
      authAttributes.password = password.trim();
    }

    if (fullName && fullName.trim()) {
      authAttributes.user_metadata = { full_name: fullName.trim() };
    }

    // Update Auth user if attributes present
    if (Object.keys(authAttributes).length > 0) {
      const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, authAttributes);
      if (authErr) {
        return { success: false, error: "Failed to update authentication account: " + authErr.message };
      }
    }

    // 2. Prepare Profiles table update
    const profileUpdates: Record<string, any> = {};
    if (fullName && fullName.trim()) {
      profileUpdates.full_name = fullName.trim();
    }
    if (department !== undefined) {
      profileUpdates.department = department.trim() || null;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileErr } = await adminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);

      if (profileErr) {
        return { success: false, error: "Failed to update user profile: " + profileErr.message };
      }
    }

    // 3. Write to audit_logs
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: admin.id,
        action: "CREDENTIALS_UPDATED",
        entity: "profiles",
        entity_id: userId,
        new_data: { email, fullName, department, passwordUpdated: Boolean(password) },
      });
    } catch {
      // Ignore audit log error
    }

    revalidatePath("/admin/teachers");
    revalidatePath("/admin/crs");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user credentials." };
  }
}

export async function deleteTeacherAction(teacherId: string) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  if (admin.id === teacherId) {
    return { success: false, error: "You cannot delete your own administrator account." };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Remove teaching assignments
    await adminClient.from("teaching_assignments").delete().eq("teacher_id", teacherId);

    // 2. Remove weekly summaries
    await adminClient.from("weekly_summaries").delete().eq("teacher_id", teacherId);

    // 3. Remove sessions taught or entered by this teacher
    const { data: sessions } = await adminClient
      .from("class_sessions")
      .select("id")
      .or(`teacher_id.eq.${teacherId},entered_by.eq.${teacherId}`);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      await adminClient.from("session_syllabus_topics").delete().in("session_id", sessionIds);
      await adminClient.from("class_sessions").delete().in("id", sessionIds);
    }

    // 4. Remove report exports
    await adminClient.from("report_exports").delete().eq("generated_by", teacherId);

    // 5. Delete profile
    await adminClient.from("profiles").delete().eq("id", teacherId);

    // 6. Delete Supabase Auth user
    try {
      await adminClient.auth.admin.deleteUser(teacherId);
    } catch {
      // Ignore if auth user doesn't exist
    }

    // 7. Write to audit_logs
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: admin.id,
        action: "TEACHER_DELETED",
        entity: "profiles",
        entity_id: teacherId,
      });
    } catch {
      // Ignore audit failure
    }

    revalidatePath("/admin/teachers");
    revalidatePath("/admin/allocations");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete teacher account." };
  }
}

export async function deleteCRAction(crAuthId: string, studentId: string) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  if (admin.id === studentId) {
    return { success: false, error: "You cannot delete your own account." };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Delete CR authorisations
    if (crAuthId) {
      await adminClient.from("cr_authorisations").delete().eq("id", crAuthId);
    }
    if (studentId) {
      await adminClient.from("cr_authorisations").delete().eq("cr_id", studentId);

      // 2. Remove sessions entered by this CR
      const { data: sessions } = await adminClient
        .from("class_sessions")
        .select("id")
        .eq("entered_by", studentId);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s) => s.id);
        await adminClient.from("session_syllabus_topics").delete().in("session_id", sessionIds);
        await adminClient.from("class_sessions").delete().in("id", sessionIds);
      }

      // 3. Delete profile
      await adminClient.from("profiles").delete().eq("id", studentId);

      // 4. Delete Auth user
      try {
        await adminClient.auth.admin.deleteUser(studentId);
      } catch {
        // Ignore
      }
    }

    // 5. Write to audit_logs
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: admin.id,
        action: "CR_DELETED",
        entity: "cr_authorisations",
        entity_id: crAuthId || studentId,
      });
    } catch {
      // Ignore
    }

    revalidatePath("/admin/crs");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete Class Representative." };
  }
}

export async function deleteBatchAction(batchId: string) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Remove related assignments, authorisations, summaries
    await adminClient.from("teaching_assignments").delete().eq("batch_id", batchId);
    await adminClient.from("cr_authorisations").delete().eq("batch_id", batchId);
    await adminClient.from("weekly_summaries").delete().eq("batch_id", batchId);

    // 2. Remove sessions and linked topics
    const { data: sessions } = await adminClient
      .from("class_sessions")
      .select("id")
      .eq("batch_id", batchId);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      await adminClient.from("session_syllabus_topics").delete().in("session_id", sessionIds);
      await adminClient.from("class_sessions").delete().in("id", sessionIds);
    }

    // 3. Remove events
    await adminClient.from("academic_events").delete().eq("batch_id", batchId);

    // 4. Delete the batch
    const { error } = await adminClient.from("batches").delete().eq("id", batchId);
    if (error) {
      return { success: false, error: "Failed to delete cohort/batch: " + error.message };
    }

    // 5. Audit log
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: admin.id,
        action: "BATCH_DELETED",
        entity: "batches",
        entity_id: batchId,
      });
    } catch {
      // Ignore
    }

    revalidatePath("/admin/batches");
    revalidatePath("/admin/crs");
    revalidatePath("/admin/allocations");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete batch." };
  }
}

export async function deleteSubjectAction(subjectId: string) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Remove teaching allocations and summaries
    await adminClient.from("teaching_assignments").delete().eq("subject_id", subjectId);
    await adminClient.from("weekly_summaries").delete().eq("subject_id", subjectId);

    // 2. Remove class sessions & topics
    const { data: sessions } = await adminClient
      .from("class_sessions")
      .select("id")
      .eq("subject_id", subjectId);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      await adminClient.from("session_syllabus_topics").delete().in("session_id", sessionIds);
      await adminClient.from("class_sessions").delete().in("id", sessionIds);
    }

    // 3. Remove syllabus topics
    await adminClient.from("syllabus_topics").delete().eq("subject_id", subjectId);

    // 4. Delete subject
    const { error } = await adminClient.from("subjects").delete().eq("id", subjectId);
    if (error) {
      return { success: false, error: "Failed to delete subject: " + error.message };
    }

    // 5. Audit log
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: admin.id,
        action: "SUBJECT_DELETED",
        entity: "subjects",
        entity_id: subjectId,
      });
    } catch {
      // Ignore
    }

    revalidatePath("/admin/subjects");
    revalidatePath("/admin/allocations");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete subject." };
  }
}

// ─────────────────────────────────────────────
// Subject & Syllabus Management Actions
// ─────────────────────────────────────────────

export async function createSubjectAction(data: {
  programmeId: string;
  semester: number;
  code?: string;
  name: string;
  initialTopics?: string[];
}) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const name = data.name?.trim();
  const code = data.code?.trim() || null;
  const semester = Number(data.semester);

  if (!name || !data.programmeId || isNaN(semester) || semester < 1 || semester > 6) {
    return { success: false, error: "Valid subject name, programme, and semester (1-6) are required." };
  }

  const adminClient = createAdminClient();

  // 1. Insert Subject
  const { data: subject, error } = await adminClient
    .from("subjects")
    .insert({
      programme_id: data.programmeId,
      semester,
      code,
      name,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `A subject named "${name}" already exists for this semester and programme.` };
    }
    return { success: false, error: "Failed to create subject: " + error.message };
  }

  // 2. Insert initial syllabus topics if provided
  if (data.initialTopics && data.initialTopics.length > 0) {
    const topicsToInsert = data.initialTopics
      .map((t) => t.trim())
      .filter(Boolean)
      .map((title, idx) => ({
        subject_id: subject.id,
        unit_no: Math.floor(idx / 3) + 1,
        seq: idx + 1,
        title,
      }));

    if (topicsToInsert.length > 0) {
      await adminClient.from("syllabus_topics").insert(topicsToInsert);
    }
  }

  try {
    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: "SUBJECT_CREATED",
      entity: "subjects",
      entity_id: subject.id,
      new_data: { name, code, semester, programme_id: data.programmeId },
    });
  } catch {
    // Ignore audit log error
  }

  revalidatePath("/admin/subjects");
  revalidatePath("/admin");
  return { success: true, subjectId: subject.id };
}

export async function addSyllabusTopicAction(
  subjectId: string,
  title: string,
  unitNo: number = 1
) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  if (!title.trim() || !subjectId) {
    return { success: false, error: "Topic title and subject ID are required." };
  }

  const adminClient = createAdminClient();

  // Get current max seq for this subject
  const { data: existing } = await adminClient
    .from("syllabus_topics")
    .select("seq")
    .eq("subject_id", subjectId)
    .order("seq", { ascending: false })
    .limit(1);

  const nextSeq = existing && existing.length > 0 ? (existing[0].seq || 0) + 1 : 1;

  const { error } = await adminClient.from("syllabus_topics").insert({
    subject_id: subjectId,
    unit_no: unitNo || 1,
    seq: nextSeq,
    title: title.trim(),
  });

  if (error) {
    return { success: false, error: "Failed to add syllabus topic: " + error.message };
  }

  revalidatePath("/admin/subjects");
  return { success: true };
}

export async function deleteSyllabusTopicAction(topicId: string, subjectId: string) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("syllabus_topics").delete().eq("id", topicId);

  if (error) {
    return { success: false, error: "Failed to delete syllabus topic: " + error.message };
  }

  revalidatePath("/admin/subjects");
  return { success: true };
}

// ─────────────────────────────────────────────
// Teaching Assignment / Allocation Actions
// ─────────────────────────────────────────────

export async function createTeachingAssignmentAction(data: {
  teacherId: string;
  subjectId: string;
  batchId: string;
  academicYear: string;
}) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const { teacherId, subjectId, batchId, academicYear } = data;
  if (!teacherId || !subjectId || !batchId || !academicYear) {
    return { success: false, error: "Teacher, Subject, Batch, and Academic Year are all required." };
  }

  const adminClient = createAdminClient();

  const { data: assignment, error } = await adminClient
    .from("teaching_assignments")
    .insert({
      teacher_id: teacherId,
      subject_id: subjectId,
      batch_id: batchId,
      academic_year: academicYear.trim(),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This teacher is already allocated to this subject, batch, and academic year." };
    }
    return { success: false, error: "Failed to create teaching allocation: " + error.message };
  }

  try {
    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: "TEACHING_ALLOCATED",
      entity: "teaching_assignments",
      entity_id: assignment.id,
      new_data: { teacher_id: teacherId, subject_id: subjectId, batch_id: batchId, academic_year: academicYear },
    });
  } catch {
    // Ignore audit log error
  }

  revalidatePath("/admin/allocations");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
  return { success: true };
}

export async function removeTeachingAssignmentAction(assignmentId: string) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("teaching_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    return { success: false, error: "Failed to remove teaching allocation: " + error.message };
  }

  try {
    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: "TEACHING_DEALLOCATED",
      entity: "teaching_assignments",
      entity_id: assignmentId,
    });
  } catch {
    // Ignore audit log error
  }

  revalidatePath("/admin/allocations");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
  return { success: true };
}

// ─────────────────────────────────────────────
// Batch / Cohort Management Actions
// ─────────────────────────────────────────────

export async function createBatchAction(data: {
  programmeId: string;
  name: string;
  intakeYear: number;
  currentSemester: number;
  academicYear: string;
  classStrength: number;
  semesterStartDate?: string;
}) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  const name = data.name?.trim();
  const intakeYear = Number(data.intakeYear);
  const currentSemester = Number(data.currentSemester);
  const academicYear = data.academicYear?.trim();
  const classStrength = Number(data.classStrength);
  const semesterStartDate = data.semesterStartDate || new Date().toISOString().split("T")[0];

  if (!name || !data.programmeId || isNaN(intakeYear) || isNaN(currentSemester) || !academicYear || isNaN(classStrength)) {
    return { success: false, error: "All batch fields are required and must be valid." };
  }

  const adminClient = createAdminClient();

  const { data: batch, error } = await adminClient
    .from("batches")
    .insert({
      programme_id: data.programmeId,
      name,
      intake_year: intakeYear,
      current_semester: currentSemester,
      academic_year: academicYear,
      class_strength: classStrength,
      semester_start_date: semesterStartDate,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `A batch named "${name}" already exists for this programme.` };
    }
    return { success: false, error: "Failed to create batch: " + error.message };
  }

  try {
    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: "BATCH_CREATED",
      entity: "batches",
      entity_id: batch.id,
      new_data: { name, intake_year: intakeYear, current_semester: currentSemester, academic_year: academicYear, class_strength: classStrength },
    });
  } catch {
    // Ignore audit log error
  }

  revalidatePath("/admin/batches");
  revalidatePath("/admin/crs");
  revalidatePath("/admin");
  return { success: true, batchId: batch.id };
}

export async function createMultipleBatchesAction(
  batchList: Array<{
    programmeId: string;
    name: string;
    intakeYear: number;
    currentSemester: number;
    academicYear: string;
    classStrength: number;
    semesterStartDate?: string;
  }>
) {
  const admin = await getCurrentTeacherUser();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Administrator privileges required." };
  }

  if (!Array.isArray(batchList) || batchList.length === 0) {
    return { success: false, error: "No batches provided to create." };
  }

  const adminClient = createAdminClient();
  const created: Array<{ id: string; name: string; programmeId: string; intakeYear: number; currentSemester: number; academicYear: string; classStrength: number; semesterStartDate: string }> = [];
  const errors: string[] = [];
  let skippedCount = 0;

  for (const item of batchList) {
    const name = item.name?.trim();
    const intakeYear = Number(item.intakeYear);
    const currentSemester = Number(item.currentSemester);
    const academicYear = item.academicYear?.trim();
    const classStrength = Number(item.classStrength);
    const semesterStartDate = item.semesterStartDate || new Date().toISOString().split("T")[0];

    if (!name || !item.programmeId || isNaN(intakeYear) || isNaN(currentSemester) || !academicYear || isNaN(classStrength)) {
      errors.push(`Skipped invalid entry: ${item.name || "Unnamed"}`);
      continue;
    }

    const { data: batch, error } = await adminClient
      .from("batches")
      .insert({
        programme_id: item.programmeId,
        name,
        intake_year: intakeYear,
        current_semester: currentSemester,
        academic_year: academicYear,
        class_strength: classStrength,
        semester_start_date: semesterStartDate,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        skippedCount++;
        errors.push(`"${name}" already exists (skipped).`);
      } else {
        errors.push(`Failed to create "${name}": ${error.message}`);
      }
    } else if (batch) {
      created.push({
        id: batch.id,
        name,
        programmeId: item.programmeId,
        intakeYear,
        currentSemester,
        academicYear,
        classStrength,
        semesterStartDate,
      });

      try {
        await adminClient.from("audit_logs").insert({
          actor_id: admin.id,
          action: "BATCH_CREATED",
          entity: "batches",
          entity_id: batch.id,
          new_data: { name, intake_year: intakeYear, current_semester: currentSemester, academic_year: academicYear, class_strength: classStrength },
        });
      } catch {
        // Ignore audit log error
      }
    }
  }

  revalidatePath("/admin/batches");
  revalidatePath("/admin/crs");
  revalidatePath("/admin");

  return {
    success: created.length > 0 || skippedCount > 0,
    createdCount: created.length,
    skippedCount,
    createdBatches: created,
    errors,
  };
}

// ─────────────────────────────────────────────
// Weekly Log Quick Editor Actions
// ─────────────────────────────────────────────

export async function quickUpdateSessionAction(data: {
  sessionId: string;
  topicCovered?: string;
  topicPlanned?: string;
  teachingMethod?: string;
  assignmentActivity?: string;
  studentsPresent?: number;
  status?: "submitted" | "verified";
}) {
  const user = await getCurrentAppUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const adminClient = createAdminClient();

  // 1. Fetch current session to verify ownership / role
  const { data: session, error: fetchError } = await adminClient
    .from("class_sessions")
    .select("id, teacher_id, session_date, batch_id, subject_id, status, topic_covered, topic_planned, teaching_method, assignment_activity, students_present, entered_by")
    .eq("id", data.sessionId)
    .single();

  if (fetchError || !session) {
    return { success: false, error: "Session not found." };
  }

  const isTeacher = user.role === "teacher" && session.teacher_id === user.id;
  const isAdmin = user.role === "admin";
  let isAuthorisedCR = false;

  if (user.role === "cr") {
    // Check if CR entered this session or is currently authorized for this batch
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
      return { success: false, error: "Unauthorized. You can only edit class sessions for your assigned cohort." };
    }
  } else if (!isAdmin && !isTeacher) {
    return { success: false, error: "Unauthorized. You do not have permission to modify this class session." };
  }

  // 2. Build update payload
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // Topic Planned and Covered topic must be identical (copy pasted in both sections)
  if (data.topicCovered !== undefined) {
    if (!data.topicCovered.trim()) {
      return { success: false, error: "Topic covered cannot be empty." };
    }
    const syncedTopic = data.topicCovered.trim();
    updatePayload.topic_covered = syncedTopic;
    updatePayload.topic_planned = syncedTopic;
  } else if (data.topicPlanned !== undefined && data.topicPlanned.trim()) {
    const syncedTopic = data.topicPlanned.trim();
    updatePayload.topic_covered = syncedTopic;
    updatePayload.topic_planned = syncedTopic;
  }

  // Both CRs, Teachers, and Admins can update students present
  if (data.studentsPresent !== undefined) {
    const count = Number(data.studentsPresent);
    if (isNaN(count) || count < 0) {
      return { success: false, error: "Students present must be a non-negative number." };
    }
    updatePayload.students_present = count;
  }

  // Teacher enrichment fields and status (only teachers and admins)
  if (isAdmin || isTeacher) {

    if (data.teachingMethod !== undefined) {
      updatePayload.teaching_method = data.teachingMethod.trim() || null;
    }

    if (data.assignmentActivity !== undefined) {
      updatePayload.assignment_activity = data.assignmentActivity.trim() || null;
    }

    if (data.status !== undefined) {
      updatePayload.status = data.status;
      if (data.status === "verified") {
        updatePayload.verified_by = user.id;
        updatePayload.verified_at = new Date().toISOString();
      } else if (data.status === "submitted") {
        updatePayload.verified_by = null;
        updatePayload.verified_at = null;
      }
    }
  }

  // 3. Execute update
  const { error: updateError } = await adminClient
    .from("class_sessions")
    .update(updatePayload)
    .eq("id", data.sessionId);

  if (updateError) {
    return { success: false, error: "Failed to update session: " + updateError.message };
  }

  // 4. Log in audit_logs
  try {
    await adminClient.from("audit_logs").insert({
      actor_id: user.id,
      action: user.role === "cr" ? "CR_SESSION_QUICK_EDIT" : "SESSION_QUICK_EDIT",
      entity: "class_sessions",
      entity_id: data.sessionId,
      new_data: updatePayload,
      old_data: {
        topic_covered: session.topic_covered,
        topic_planned: session.topic_planned,
        teaching_method: session.teaching_method,
        assignment_activity: session.assignment_activity,
        students_present: session.students_present,
        status: session.status,
      },
    });
  } catch {
    // Ignore audit log error
  }

  revalidatePath("/admin/logs");
  revalidatePath("/weekly-logs");
  revalidatePath("/cr/logs");
  revalidatePath("/cr/history");
  revalidatePath("/cr/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { success: true };
}

export async function quickToggleVerifyAction(sessionId: string, newStatus: "submitted" | "verified") {
  const user = await getCurrentAppUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return { success: false, error: "Only faculty members and administrators can verify class sessions." };
  }
  return quickUpdateSessionAction({
    sessionId,
    status: newStatus,
  });
}


