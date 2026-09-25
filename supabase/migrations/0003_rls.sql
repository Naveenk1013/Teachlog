-- =============================================================================
-- Migration: 0003_rls.sql
-- Description: Row Level Security policies for all tables
-- =============================================================================

-- Enable Row Level Security on all tables
alter table profiles               enable row level security;
alter table programmes             enable row level security;
alter table batches                enable row level security;
alter table subjects               enable row level security;
alter table syllabus_topics        enable row level security;
alter table teaching_assignments   enable row level security;
alter table cr_authorisations      enable row level security;
alter table class_sessions         enable row level security;
alter table session_syllabus_topics enable row level security;
alter table weekly_summaries       enable row level security;
alter table report_exports         enable row level security;
alter table audit_logs             enable row level security;
alter table access_logs            enable row level security;

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create policy "profiles_select_own"
  on profiles for select
  using (id = auth.uid());

create policy "profiles_admin_all"
  on profiles for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

create policy "profiles_teacher_view_crs"
  on profiles for select
  using (
    app_role() = 'teacher' and (
      id in (
        select ca.cr_id from cr_authorisations ca
        join teaching_assignments ta on ta.batch_id = ca.batch_id
        where ta.teacher_id = auth.uid()
      )
      or role = 'teacher'
    )
  );

create policy "profiles_cr_view_teachers"
  on profiles for select
  using (
    app_role() = 'cr' and id in (
      select ta.teacher_id from teaching_assignments ta
      where cr_has_batch(ta.batch_id)
    )
  );

-- ─────────────────────────────────────────────
-- MASTER DATA: programmes, batches, subjects, syllabus_topics
-- Read for all active authenticated users; write for admins
-- ─────────────────────────────────────────────
create policy "programmes_select_active"
  on programmes for select
  using (auth.uid() is not null and app_role() is not null);

create policy "programmes_admin_all"
  on programmes for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

create policy "batches_select_active"
  on batches for select
  using (auth.uid() is not null and app_role() is not null);

create policy "batches_admin_all"
  on batches for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

create policy "subjects_select_active"
  on subjects for select
  using (auth.uid() is not null and app_role() is not null);

create policy "subjects_admin_all"
  on subjects for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

create policy "syllabus_topics_select_active"
  on syllabus_topics for select
  using (auth.uid() is not null and app_role() is not null);

create policy "syllabus_topics_admin_all"
  on syllabus_topics for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- ─────────────────────────────────────────────
-- TEACHING ASSIGNMENTS
-- ─────────────────────────────────────────────
create policy "teaching_assignments_select"
  on teaching_assignments for select
  using (
    app_role() = 'admin'
    or (app_role() = 'teacher' and teacher_id = auth.uid())
    or (app_role() = 'cr' and cr_has_batch(batch_id))
  );

create policy "teaching_assignments_admin_all"
  on teaching_assignments for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- ─────────────────────────────────────────────
-- CR AUTHORISATIONS (D-08: Admin & Batch Teachers can manage)
-- ─────────────────────────────────────────────
create policy "cr_auth_select"
  on cr_authorisations for select
  using (
    app_role() = 'admin'
    or cr_id = auth.uid()
    or (
      app_role() = 'teacher' and exists (
        select 1 from teaching_assignments ta
        where ta.batch_id = cr_authorisations.batch_id
          and ta.teacher_id = auth.uid()
      )
    )
  );

create policy "cr_auth_admin_all"
  on cr_authorisations for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

create policy "cr_auth_teacher_manage"
  on cr_authorisations for insert
  with check (
    app_role() = 'teacher'
    and granted_by = auth.uid()
    and exists (
      select 1 from teaching_assignments ta
      where ta.batch_id = cr_authorisations.batch_id
        and ta.teacher_id = auth.uid()
    )
  );

create policy "cr_auth_teacher_revoke"
  on cr_authorisations for update
  using (
    app_role() = 'teacher'
    and exists (
      select 1 from teaching_assignments ta
      where ta.batch_id = cr_authorisations.batch_id
        and ta.teacher_id = auth.uid()
    )
  )
  with check (
    app_role() = 'teacher'
    and revoked_by = auth.uid()
  );

-- ─────────────────────────────────────────────
-- CLASS SESSIONS
-- ─────────────────────────────────────────────
create policy "sessions_select"
  on class_sessions for select
  using (
    app_role() = 'admin'
    or (app_role() = 'teacher' and teacher_id = auth.uid())
    or (app_role() = 'cr' and cr_has_batch(batch_id))
  );

create policy "sessions_cr_insert"
  on class_sessions for insert
  with check (
    app_role() = 'cr'
    and cr_has_batch(batch_id)
    and entered_by = auth.uid()
    and session_date between current_date - 2 and current_date
    and status = 'submitted'
    and exists (
      select 1 from teaching_assignments ta
      where ta.batch_id = class_sessions.batch_id
        and ta.subject_id = class_sessions.subject_id
        and ta.teacher_id = class_sessions.teacher_id
    )
  );

create policy "sessions_cr_update"
  on class_sessions for update
  using (
    app_role() = 'cr'
    and cr_has_batch(batch_id)
    and entered_by = auth.uid()
    and status <> 'verified'
    and created_at > now() - interval '24 hours'
  )
  with check (
    app_role() = 'cr'
    and cr_has_batch(batch_id)
    and entered_by = auth.uid()
  );

create policy "sessions_teacher_insert"
  on class_sessions for insert
  with check (
    app_role() = 'teacher'
    and teacher_id = auth.uid()
    and entered_by = auth.uid()
  );

create policy "sessions_teacher_update"
  on class_sessions for update
  using (
    app_role() = 'teacher' and teacher_id = auth.uid()
  )
  with check (
    app_role() = 'teacher' and teacher_id = auth.uid()
  );

create policy "sessions_admin_all"
  on class_sessions for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- ─────────────────────────────────────────────
-- SESSION SYLLABUS TOPICS
-- ─────────────────────────────────────────────
create policy "session_topics_select"
  on session_syllabus_topics for select
  using (
    exists (
      select 1 from class_sessions cs
      where cs.id = session_syllabus_topics.session_id
        and (
          app_role() = 'admin'
          or (app_role() = 'teacher' and cs.teacher_id = auth.uid())
          or (app_role() = 'cr' and cr_has_batch(cs.batch_id))
        )
    )
  );

create policy "session_topics_teacher_modify"
  on session_syllabus_topics for all
  using (
    exists (
      select 1 from class_sessions cs
      where cs.id = session_syllabus_topics.session_id
        and (
          app_role() = 'admin'
          or (app_role() = 'teacher' and cs.teacher_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from class_sessions cs
      where cs.id = session_syllabus_topics.session_id
        and (
          app_role() = 'admin'
          or (app_role() = 'teacher' and cs.teacher_id = auth.uid())
        )
    )
  );

-- ─────────────────────────────────────────────
-- WEEKLY SUMMARIES
-- ─────────────────────────────────────────────
create policy "weekly_summaries_select"
  on weekly_summaries for select
  using (
    app_role() = 'admin'
    or (app_role() = 'teacher' and teacher_id = auth.uid())
  );

create policy "weekly_summaries_teacher_insert"
  on weekly_summaries for insert
  with check (
    (app_role() = 'teacher' and teacher_id = auth.uid())
    or app_role() = 'admin'
  );

create policy "weekly_summaries_teacher_update"
  on weekly_summaries for update
  using (
    (app_role() = 'teacher' and teacher_id = auth.uid())
    or app_role() = 'admin'
  )
  with check (
    (app_role() = 'teacher' and teacher_id = auth.uid())
    or app_role() = 'admin'
  );

-- ─────────────────────────────────────────────
-- REPORT EXPORTS
-- ─────────────────────────────────────────────
create policy "report_exports_select"
  on report_exports for select
  using (
    app_role() = 'admin' or generated_by = auth.uid()
  );

create policy "report_exports_insert"
  on report_exports for insert
  with check (
    app_role() is not null and generated_by = auth.uid()
  );

-- ─────────────────────────────────────────────
-- AUDIT & ACCESS LOGS (Admin read-only, no client mutations)
-- ─────────────────────────────────────────────
create policy "audit_logs_admin_select"
  on audit_logs for select
  using (app_role() = 'admin');

create policy "access_logs_admin_select"
  on access_logs for select
  using (app_role() = 'admin');

-- Explicitly revoke write permissions from anon & authenticated roles
revoke insert, update, delete on audit_logs from anon, authenticated;
revoke insert, update, delete on access_logs from anon, authenticated;
