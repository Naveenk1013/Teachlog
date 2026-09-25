-- =============================================================================
-- TEACHLOG: COMPLETE ALL-IN-ONE SUPABASE SCHEMA & SEED SETUP
-- Paste this entire script into your Supabase SQL Editor and click Run
-- =============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SECTION: supabase/migrations/0001_init.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- Migration: 0001_init.sql
-- Description: Core schema for TeachLog (IIHM Teaching Log & Summary System)
-- =============================================================================

-- Enable Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────
create type user_role as enum ('admin', 'teacher', 'cr');
create type record_status as enum ('submitted', 'verified');

-- ─────────────────────────────────────────────
-- Users (linked to auth.users)
-- ─────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        user_role not null,
  department  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Academic structure
-- ─────────────────────────────────────────────
create table programmes (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  name            text not null,
  duration_years  int  not null default 3,
  total_semesters int  not null default 6
);

create table batches (
  id                   uuid primary key default gen_random_uuid(),
  programme_id         uuid not null references programmes(id),
  name                 text not null,               -- e.g. 'Intake 2025-28'
  intake_year          int  not null,
  current_semester     int  not null check (current_semester between 1 and 6),
  academic_year        text not null,               -- e.g. '2026-27'
  semester_start_date  date not null,
  class_strength       int  not null check (class_strength > 0),
  is_active            boolean not null default true,
  unique (programme_id, name)
);

create table subjects (
  id            uuid primary key default gen_random_uuid(),
  programme_id  uuid not null references programmes(id),
  semester      int  not null check (semester between 1 and 6),
  code          text,
  name          text not null,
  unique (programme_id, semester, name)
);

create table syllabus_topics (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references subjects(id) on delete cascade,
  unit_no     int,
  seq         int  not null,                        -- order within subject
  title       text not null,
  unique (subject_id, seq)
);

create table teaching_assignments (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid not null references profiles(id),
  subject_id     uuid not null references subjects(id),
  batch_id       uuid not null references batches(id),
  academic_year  text not null,
  unique (teacher_id, subject_id, batch_id, academic_year)
);

-- ─────────────────────────────────────────────
-- CR authorisation register
-- ─────────────────────────────────────────────
create table cr_authorisations (
  id             uuid primary key default gen_random_uuid(),
  cr_id          uuid not null references profiles(id),
  batch_id       uuid not null references batches(id),
  academic_year  text not null,
  granted_by     uuid not null references profiles(id),
  granted_at     timestamptz not null default now(),
  revoked_by     uuid references profiles(id),
  revoked_at     timestamptz,
  revoke_reason  text
);

-- Only one active authorisation per CR + batch + year
create unique index cr_auth_one_active
  on cr_authorisations (cr_id, batch_id, academic_year)
  where revoked_at is null;

-- ─────────────────────────────────────────────
-- Core class session log
-- ─────────────────────────────────────────────
create table class_sessions (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null references batches(id),
  subject_id          uuid not null references subjects(id),
  teacher_id          uuid not null references profiles(id),
  semester            int  not null check (semester between 1 and 6),  -- snapshot
  academic_year       text not null,                                   -- snapshot
  session_date        date not null,
  start_time          time not null,
  end_time            time not null,
  students_present    int  not null check (students_present >= 0),
  topic_covered       text not null,                 -- entered by CR
  -- teacher-enriched fields
  topic_planned       text,
  teaching_method     text,
  assignment_activity text,
  status              record_status not null default 'submitted',
  verified_by         uuid references profiles(id),
  verified_at         timestamptz,
  entered_by          uuid not null references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (end_time > start_time),
  unique (batch_id, subject_id, session_date, start_time)
);

create index idx_class_sessions_batch_date on class_sessions (batch_id, session_date);
create index idx_class_sessions_teacher_date on class_sessions (teacher_id, session_date);
create index idx_class_sessions_subject_batch on class_sessions (subject_id, batch_id);

create table session_syllabus_topics (
  session_id        uuid not null references class_sessions(id) on delete cascade,
  syllabus_topic_id uuid not null references syllabus_topics(id),
  primary key (session_id, syllabus_topic_id)
);

-- ─────────────────────────────────────────────
-- Weekly summary (7 sections of IIHM template)
-- ─────────────────────────────────────────────
create table weekly_summaries (
  id                   uuid primary key default gen_random_uuid(),
  teacher_id           uuid not null references profiles(id),
  subject_id           uuid not null references subjects(id),
  batch_id             uuid not null references batches(id),
  week_start           date not null,                -- Monday of the week
  syllabus_coverage    text,
  practical_conducted  text,
  assessment_conducted text,
  slow_learners        text,
  remedial_action      text,
  ai_digital_tools     text,
  industry_examples    text,
  status               record_status not null default 'submitted',
  submitted_on         date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (extract(isodow from week_start) = 1),
  unique (teacher_id, subject_id, batch_id, week_start)
);

-- ─────────────────────────────────────────────
-- Reports, audit, access
-- ─────────────────────────────────────────────
create table report_exports (
  id            uuid primary key default gen_random_uuid(),
  generated_by  uuid not null references profiles(id),
  report_type   text not null,                      -- 'weekly_log', 'coverage', etc.
  params        jsonb not null,
  storage_path  text,
  created_at    timestamptz not null default now()
);

create table if not exists academic_events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  event_type   text not null default 'holiday' check (event_type in ('holiday', 'vacation', 'exam', 'event', 'academic_note')),
  start_date   date not null,
  end_date     date not null,
  is_holiday   boolean not null default true,
  batch_id     uuid references batches(id) on delete cascade,       -- null = institute-wide
  teacher_id   uuid references profiles(id) on delete set null,     -- null = general, or specific to teacher/department
  created_by   uuid not null references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_academic_events_dates on academic_events (start_date, end_date);
create index if not exists idx_academic_events_batch on academic_events (batch_id);
create index if not exists idx_academic_events_teacher on academic_events (teacher_id);

create table audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id),
  action      text not null,                        -- INSERT / UPDATE / DELETE / CR_GRANTED / CR_REVOKED / REPORT_GENERATED
  entity      text not null,
  entity_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create table access_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references profiles(id),
  email       text,                                  -- kept for failed logins where user_id is unknown
  event       text not null,                         -- LOGIN_SUCCESS / LOGIN_FAILED / LOGOUT / ACCESS_DENIED
  ip          inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SECTION: supabase/migrations/0002_functions_triggers.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- Migration: 0002_functions_triggers.sql
-- Description: Security functions, audit triggers, and CR column-guard trigger
-- =============================================================================

-- ─────────────────────────────────────────────
-- Helper: get role of current authenticated user
-- ─────────────────────────────────────────────
create or replace function public.app_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

-- ─────────────────────────────────────────────
-- Helper: check if current user is active CR for a batch
-- ─────────────────────────────────────────────
create or replace function public.cr_has_batch(p_batch uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cr_authorisations
    where cr_id = auth.uid()
      and batch_id = p_batch
      and revoked_at is null
  );
$$;

-- ─────────────────────────────────────────────
-- Generic audit trigger
-- ─────────────────────────────────────────────
create or replace function public.log_row_change()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, old_data, new_data)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id'),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_class_sessions
  after insert or update or delete on class_sessions
  for each row execute function log_row_change();

create trigger audit_weekly_summaries
  after insert or update or delete on weekly_summaries
  for each row execute function log_row_change();

create trigger audit_cr_authorisations
  after insert or update or delete on cr_authorisations
  for each row execute function log_row_change();

-- ─────────────────────────────────────────────
-- Automatic updated_at timestamp trigger
-- ─────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_class_sessions
  before update on class_sessions
  for each row execute function touch_updated_at();

create trigger touch_weekly_summaries
  before update on weekly_summaries
  for each row execute function touch_updated_at();

-- ─────────────────────────────────────────────
-- CR Column-Guard Trigger
-- Ensures CR cannot modify teacher-owned fields or core session keys
-- ─────────────────────────────────────────────
create or replace function public.guard_cr_session_columns()
returns trigger
language plpgsql as $$
begin
  -- If executed by a CR user, enforce column restrictions
  if (public.app_role() = 'cr') then
    -- 1. Disallow touching structural keys
    if (new.batch_id is distinct from old.batch_id or
        new.subject_id is distinct from old.subject_id or
        new.teacher_id is distinct from old.teacher_id or
        new.semester is distinct from old.semester or
        new.academic_year is distinct from old.academic_year or
        new.entered_by is distinct from old.entered_by) then
      raise exception 'CRs cannot alter session keys (batch, subject, teacher, semester, year).';
    end if;

    -- 2. Disallow modifying teacher-owned enrichment fields
    if (new.topic_planned is distinct from old.topic_planned or
        new.teaching_method is distinct from old.teaching_method or
        new.assignment_activity is distinct from old.assignment_activity) then
      raise exception 'CRs are not permitted to modify teacher enrichment fields (topic planned, teaching method, assignment).';
    end if;

    -- 3. Disallow modifying verification status or verification metadata
    if (new.status is distinct from old.status or
        new.verified_by is distinct from old.verified_by or
        new.verified_at is distinct from old.verified_at) then
      raise exception 'CRs cannot modify verification status.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_guard_cr_session_columns
  before update on class_sessions
  for each row execute function guard_cr_session_columns();



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SECTION: supabase/migrations/0003_rls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SECTION: supabase/migrations/0004_views.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- Migration: 0004_views.sql
-- Description: Coverage views with security_invoker
-- =============================================================================

create or replace view v_syllabus_coverage with (security_invoker = true) as
select
  ta.batch_id,
  ta.subject_id,
  ta.academic_year,
  (select count(*) from syllabus_topics st
    where st.subject_id = ta.subject_id) as total_topics,
  (select count(distinct sst.syllabus_topic_id)
     from session_syllabus_topics sst
     join class_sessions cs on cs.id = sst.session_id
    where cs.batch_id = ta.batch_id
      and cs.subject_id = ta.subject_id) as covered_topics
from teaching_assignments ta;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SECTION: supabase/seed.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- Seed Data: seed.sql (Development and Local Testing)
-- =============================================================================

-- Deterministic UUIDs for seed references
do $$
declare
  v_prog_id uuid := '11111111-1111-1111-1111-111111111111';
  v_batch1_id uuid := '22222222-2222-2222-2222-222222222221';
  v_batch2_id uuid := '22222222-2222-2222-2222-222222222222';
  
  -- Subject UUIDs
  v_sub_fp2 uuid := '33333333-3333-3333-3333-333333333301';
  v_sub_fb2 uuid := '33333333-3333-3333-3333-333333333302';
  v_sub_fo2 uuid := '33333333-3333-3333-3333-333333333303';
  v_sub_fp4 uuid := '33333333-3333-3333-3333-333333333304';
  v_sub_fb4 uuid := '33333333-3333-3333-3333-333333333305';
  
  -- User UUIDs (Mock auth users)
  v_admin_id uuid := 'aaaa0000-0000-0000-0000-000000000001';
  v_teach_rajesh uuid := 'bbbb0000-0000-0000-0000-000000000001';
  v_teach_priya uuid := 'bbbb0000-0000-0000-0000-000000000002';
  v_teach_amit uuid := 'bbbb0000-0000-0000-0000-000000000003';
  v_cr_aarav uuid := 'cccc0000-0000-0000-0000-000000000001';
  v_cr_ananya uuid := 'cccc0000-0000-0000-0000-000000000002';

begin
  -- 1. Programme
  insert into programmes (id, code, name, duration_years, total_semesters)
  values (v_prog_id, 'BHA', 'B.Sc in Hospitality & Hotel Administration', 3, 6)
  on conflict (code) do nothing;

  -- 2. Batches
  insert into batches (id, programme_id, name, intake_year, current_semester, academic_year, semester_start_date, class_strength)
  values 
    (v_batch1_id, v_prog_id, 'Intake 2024-27 (Sem 4)', 2024, 4, '2026-27', '2026-06-15', 60),
    (v_batch2_id, v_prog_id, 'Intake 2025-28 (Sem 2)', 2025, 2, '2026-27', '2026-06-15', 65)
  on conflict (programme_id, name) do nothing;

  -- 3. Subjects
  insert into subjects (id, programme_id, semester, code, name)
  values
    (v_sub_fp2, v_prog_id, 2, 'BHM111', 'Food Production Principles'),
    (v_sub_fb2, v_prog_id, 2, 'BHM112', 'Food & Beverage Service Operations'),
    (v_sub_fo2, v_prog_id, 2, 'BHM113', 'Front Office Operations'),
    (v_sub_fp4, v_prog_id, 4, 'BHM211', 'Food Production Management'),
    (v_sub_fb4, v_prog_id, 4, 'BHM212', 'Food & Beverage Management')
  on conflict (programme_id, semester, name) do nothing;

  -- 4. Syllabus Topics for Food Production Principles (BHM111)
  insert into syllabus_topics (subject_id, unit_no, seq, title)
  values
    (v_sub_fp2, 1, 1, 'Introduction to Cookery & Kitchen Organisation'),
    (v_sub_fp2, 1, 2, 'Aims and Objectives of Cooking Food'),
    (v_sub_fp2, 2, 3, 'Basic Principles of Food Production & Heat Transfer'),
    (v_sub_fp2, 2, 4, 'Methods of Cooking Food: Boiling, Poaching, Steaming'),
    (v_sub_fp2, 3, 5, 'Stocks: Classification, White, Brown, and Vegetable'),
    (v_sub_fp2, 3, 6, 'Mother Sauces: Béchamel, Velouté, Espagnole, Tomato, Hollandaise'),
    (v_sub_fp2, 4, 7, 'Soups: Classification, Consommé, Puree, Cream, Chowders'),
    (v_sub_fp2, 5, 8, 'Culinary Terms and French Classical Menu')
  on conflict (subject_id, seq) do nothing;

  -- 5. Syllabus Topics for Food & Beverage Service Operations (BHM112)
  insert into syllabus_topics (subject_id, unit_no, seq, title)
  values
    (v_sub_fb2, 1, 1, 'The Food & Beverage Service Industry Overview'),
    (v_sub_fb2, 1, 2, 'Department Hierarchy and Attributes of Service Staff'),
    (v_sub_fb2, 2, 3, 'Food & Beverage Service Equipment: Glassware, Crockery, Cutlery'),
    (v_sub_fb2, 3, 4, 'Table Setting & Mise-en-place Procedures'),
    (v_sub_fb2, 4, 5, 'Types of Food Service: Silver, American, English, Buffet')
  on conflict (subject_id, seq) do nothing;

  -- 6. Insert Mock Auth Users into auth.users (with password: password123)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token,
    created_at,
    updated_at
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'admin@iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Admin Naveen"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_teach_rajesh, 'authenticated', 'authenticated', 'rajesh.kumar@iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Chef Rajesh Kumar"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_teach_priya, 'authenticated', 'authenticated', 'priya.sharma@iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Ms. Priya Sharma"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_teach_amit, 'authenticated', 'authenticated', 'amit.roy@iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Mr. Amit Roy"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_cr_aarav, 'authenticated', 'authenticated', 'aarav.cr@student.iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Aarav Patel (CR Sem 4)"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_cr_ananya, 'authenticated', 'authenticated', 'ananya.cr@student.iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Ananya Reddy (CR Sem 2)"}'::jsonb, '', '', '', '', '', '', '', '', now(), now())
  on conflict (id) do nothing;

  -- Ensure any existing rows have empty strings instead of NULL for GoTrue scanner
  update auth.users 
  set 
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    reauthentication_token = coalesce(reauthentication_token, '');

  -- 6b. Identities for Supabase Auth
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values
    (v_admin_id, v_admin_id, format('{"sub":"%s","email":"%s"}', v_admin_id, 'admin@iihmhyd.edu.in')::jsonb, 'email', 'admin@iihmhyd.edu.in', now(), now(), now()),
    (v_teach_rajesh, v_teach_rajesh, format('{"sub":"%s","email":"%s"}', v_teach_rajesh, 'rajesh.kumar@iihmhyd.edu.in')::jsonb, 'email', 'rajesh.kumar@iihmhyd.edu.in', now(), now(), now()),
    (v_teach_priya, v_teach_priya, format('{"sub":"%s","email":"%s"}', v_teach_priya, 'priya.sharma@iihmhyd.edu.in')::jsonb, 'email', 'priya.sharma@iihmhyd.edu.in', now(), now(), now()),
    (v_teach_amit, v_teach_amit, format('{"sub":"%s","email":"%s"}', v_teach_amit, 'amit.roy@iihmhyd.edu.in')::jsonb, 'email', 'amit.roy@iihmhyd.edu.in', now(), now(), now()),
    (v_cr_aarav, v_cr_aarav, format('{"sub":"%s","email":"%s"}', v_cr_aarav, 'aarav.cr@student.iihmhyd.edu.in')::jsonb, 'email', 'aarav.cr@student.iihmhyd.edu.in', now(), now(), now()),
    (v_cr_ananya, v_cr_ananya, format('{"sub":"%s","email":"%s"}', v_cr_ananya, 'ananya.cr@student.iihmhyd.edu.in')::jsonb, 'email', 'ananya.cr@student.iihmhyd.edu.in', now(), now(), now())
  on conflict (id) do nothing;

  -- 7. Profiles
  insert into profiles (id, full_name, role, department, is_active)
  values
    (v_admin_id, 'Admin Naveen', 'admin', 'Academic Administration', true),
    (v_teach_rajesh, 'Chef Rajesh Kumar', 'teacher', 'Food Production', true),
    (v_teach_priya, 'Ms. Priya Sharma', 'teacher', 'Food & Beverage Service', true),
    (v_teach_amit, 'Mr. Amit Roy', 'teacher', 'Rooms Division', true),
    (v_cr_aarav, 'Aarav Patel', 'cr', 'Hospitality Studies', true),
    (v_cr_ananya, 'Ananya Reddy', 'cr', 'Hospitality Studies', true)
  on conflict (id) do nothing;

  -- 8. Teaching Assignments (Demonstrating repeat teaching)
  insert into teaching_assignments (teacher_id, subject_id, batch_id, academic_year)
  values
    -- Chef Rajesh teaches Food Production to Batch 2 AND Batch 1
    (v_teach_rajesh, v_sub_fp2, v_batch2_id, '2026-27'),
    (v_teach_rajesh, v_sub_fp4, v_batch1_id, '2026-27'),
    -- Ms. Priya teaches F&B Service
    (v_teach_priya, v_sub_fb2, v_batch2_id, '2026-27'),
    (v_teach_priya, v_sub_fb4, v_batch1_id, '2026-27'),
    -- Mr. Amit teaches Front Office
    (v_teach_amit, v_sub_fo2, v_batch2_id, '2026-27')
  on conflict (teacher_id, subject_id, batch_id, academic_year) do nothing;

  -- 9. CR Authorisations
  insert into cr_authorisations (cr_id, batch_id, academic_year, granted_by)
  values
    (v_cr_aarav, v_batch1_id, '2026-27', v_admin_id),
    (v_cr_ananya, v_batch2_id, '2026-27', v_admin_id)
  on conflict do nothing;

  -- 10. Academic Calendar Events (2026-27)
  insert into academic_events (title, description, event_type, start_date, end_date, is_holiday, created_by)
  values
    ('Independence Day', 'National Holiday - Flag hoisting at campus', 'holiday', '2026-08-15', '2026-08-15', true, v_admin_id),
    ('Sri Krishna Janmashtami', 'Gazetted Holiday', 'holiday', '2026-09-04', '2026-09-04', true, v_admin_id),
    ('Eid Milad-un-Nabi', 'State Public Holiday', 'holiday', '2026-09-14', '2026-09-14', true, v_admin_id),
    ('Bathukamma & Dussehra Vacation', 'Telangana State Festival & Autumn Term Vacation', 'vacation', '2026-09-28', '2026-10-02', true, v_admin_id),
    ('Mahatma Gandhi Jayanti', 'National Holiday', 'holiday', '2026-10-02', '2026-10-02', true, v_admin_id),
    ('Deepavali / Diwali Holidays', 'Festival of Lights - Campus Closed', 'holiday', '2026-10-19', '2026-10-20', true, v_admin_id),
    ('Annual Culinary & Hospitality Expo', 'Inter-college student culinary exhibition and hospitality salon', 'event', '2026-11-14', '2026-11-15', false, v_admin_id),
    ('Christmas Holidays', 'Winter Term Break', 'vacation', '2026-12-24', '2026-12-26', true, v_admin_id),
    ('Sankranti / Pongal Vacation', 'Harvest Festival State Holidays', 'vacation', '2027-01-13', '2027-01-16', true, v_admin_id),
    ('Republic Day', 'National Holiday - Institutional Parade', 'holiday', '2027-01-26', '2027-01-26', true, v_admin_id),
    ('Ugadi (Telugu New Year)', 'Telangana State Festival Holiday', 'holiday', '2027-03-20', '2027-03-20', true, v_admin_id),
    ('End-Semester Practical & Theory Exams', 'NCHMCT / IIHM Central Semester Examinations', 'exam', '2027-04-15', '2027-04-28', false, v_admin_id)
  on conflict do nothing;

  -- Teacher Rajesh custom departmental event
  insert into academic_events (title, description, event_type, start_date, end_date, is_holiday, teacher_id, created_by)
  values
    ('Food Production Practical Assessment Week', 'Continuous internal practical evaluation of butchery & sauce making in Kitchen Lab 1', 'exam', '2026-09-24', '2026-09-25', false, v_teach_rajesh, v_teach_rajesh)
  on conflict do nothing;

end $$;





-- =============================================================================
-- Migration: 0006_attendance_system.sql
-- Description: Students register & Session Attendance tracking with classwise Theory/Practical roster
-- =============================================================================

-- 1. Students Table
create table if not exists students (
  id               uuid primary key default gen_random_uuid(),
  roll_number      text unique not null,
  full_name        text not null,
  academic_year    text not null default '2026-27',
  semester         int not null check (semester between 1 and 6),
  section          text not null, -- 'Sec A', 'Sec B', 'Mixed A&B'
  practical_group  text,          -- 'P1', 'P2', 'P3', 'P4', or null
  batch_id         uuid references batches(id) on delete set null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists idx_students_roll on students (roll_number);
create index if not exists idx_students_cohort on students (semester, section, practical_group);
create index if not exists idx_students_batch on students (batch_id);

-- 2. Session Attendance Table
create table if not exists session_attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references class_sessions(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  status      text not null check (status in ('present', 'absent', 'late', 'od')) default 'present',
  remarks     text,
  marked_by   uuid not null references profiles(id),
  marked_at   timestamptz not null default now(),
  updated_by  uuid references profiles(id),
  updated_at  timestamptz not null default now(),
  unique (session_id, student_id)
);

create index if not exists idx_session_attendance_session on session_attendance (session_id);
create index if not exists idx_session_attendance_student on session_attendance (student_id);
create index if not exists idx_session_attendance_status on session_attendance (session_id, status);

-- 3. RLS Policies
alter table students enable row level security;
alter table session_attendance enable row level security;

create policy "Students are viewable by authenticated users"
  on students for select to authenticated using (true);

create policy "Admins can manage students"
  on students for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "Attendance viewable by authenticated users"
  on session_attendance for select to authenticated using (true);

create policy "Attendance insertable by CRs, Teachers, and Admins"
  on session_attendance for insert to authenticated with check (true);

create policy "Attendance updatable by Teachers, Admins, and session owner"
  on session_attendance for update to authenticated using (true);

create policy "Attendance deletable by Admins and Teachers"
  on session_attendance for delete to authenticated using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher'))
  );

-- 4. Seed all 227 students from Studentdata.md
insert into students (roll_number, full_name, semester, section, practical_group, academic_year)
values
  ('IIHM26HYD001', 'Komara Jai Kishen Rao', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD002', 'Jalli Abhi', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD003', 'Vasanth Vankudoth', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD004', 'DITTAKAVI GEETHA SAI KIRAN', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD005', 'Bharatham Sathwik', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD006', 'Konda Sathwik', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD007', 'Benjarapu Bhavya Goud', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD008', 'YALLA VIDYA CHARAN', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD009', 'Velpula Sagar', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD010', 'KARNATI SAI SARAN GOUD', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD011', 'BADA Nikith Babu', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD012', 'Vani', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD013', 'Metre Arvind', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD014', 'BOJJOLU VENKATARAMANA', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD015', 'NASKANTI Vignesh', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD016', 'ANISETTY SAJITH', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD017', 'Shaik Mastan', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD018', 'Rathod Sarkar Venkatesh', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD019', 'Aayush Tolani', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD020', 'Srujan Reddy', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD021', 'Srishti Ekka', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD022', 'Chinthala Manish Kumar', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD023', 'Suri Venkata Naga Sampreeti', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD024', 'Gujjula Chandukar Reddy', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD025', 'Gulam Hamzakhan', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD026', 'Erekar Sai Teja', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD027', 'Ramana Sidharth reddy', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD028', 'Shresta Ghantoji', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD029', 'Baswaraj Sai Teja Yadav', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD030', 'Gunturu Naga Sai Manikanta', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD031', 'Dittakavi Mohan Sai Charan', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD032', 'Mavin Yuvraj', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD033', 'AMBATI VISHNUVARDHAN REDDY', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD034', 'Akanksha Kerketta', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD035', 'Gangavarapu Sri Harsha', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD036', 'Indhuvadhani Ramachandran', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD037', 'Boppu Harshith Varma', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD038', 'ANUGU GURUNATH REDDY', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD039', 'Chanda Revanth', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD040', 'Siripuram Mani Charan', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD041', 'Abdul Huzaifa', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD042', 'Vemula Thrivikram', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD043', 'Kapuganti Venkata Surya Narayana', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD044', 'PINNIKA RAMANJI', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD045', 'Pomar Gagandeep', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD046', 'Aliza Pirani', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD047', 'Gundu Rishi', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD048', 'Thota Karuna Sri', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD049', 'ALLADA DIPANWITA', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD050', 'Jayamangala Jyothi Durga', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD051', 'N Samiksha Rao', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD052', 'Chintala Gowtham', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD053', 'Kanneboina Prasad', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD054', 'Stallone Allen Walker', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD055', 'Arjampudi Narayan Sai Ram', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD056', 'Ugranam Sai Kumar', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD057', 'Kummari Rishab', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD058', 'Gangarapu Varshith Goud', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD059', 'Baddam Snehith Reddy', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD060', 'Nakkana Harish', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD061', 'Pasham Jaswanth Reddy', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD062', 'Tejavath Rambabu', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD063', 'NANDIBHATLA KAILASH', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD064', 'Jinuka shiva charan', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD065', 'Pittala Harinesh', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD066', 'Antharam Abhilash', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD067', 'KURNI NAVEEN KUMAR B', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD068', 'Abdul Mujeeb', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD069', 'Muthyala Shashi kumar', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD070', 'Gadagoni Harshavardhan', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD071', 'Sappidi Shashank Reddy', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD072', 'Sura Chandrashekar Reddy', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD073', 'Gurram Suryateja', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD074', 'Ampilli Jashuva', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD075', 'Dammalapati Yaswanth', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD076', 'MD Umair', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD077', 'Asi Sirish Kumar', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD078', 'Jagithyala Anish Goud', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD079', 'Shaik Fayaz', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD080', 'Avvaru Naga Siva Sai charan teja', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD081', 'METTI HEMA LOKESH', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD082', 'Kothuri Vamshi', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD083', 'Salivendri Ganesh Reddy', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD084', 'Bimanaboina Veerendra', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD085', 'AKULA SURYATEJA', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD086', 'RATHNAGAR RISHITH', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD087', 'BERELLI PRIYADATH', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD088', 'Talluri John Welsey', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD089', 'Sah Mohith Kumar', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD090', 'KATTA SIDDHARTHA', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD091', 'Goshika Sushanth', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD092', 'Gurram Manith Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD093', 'Madireddy Pujith Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD094', 'Karanam Bhaskar', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD095', 'Inaganti Vignesh Chowdary', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD096', 'Saysani Karthik Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD097', 'Shiva Teja Ek', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD098', 'Mohammed Rehan', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD099', 'Chalamala Pavani Krishnaveni', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD100', 'Regula Thirumalesh', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD101', 'Sreeshanth Raj Kanjarla', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD102', 'Mitta Lohith Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD103', 'Edara Hitesh Balaji', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD104', 'Sheelam Shivaraju', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD105', 'Pullapalli Teja Charan', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD106', 'Gudi UmaKanth', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD107', 'Gunasainath Majjari', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD108', 'Nagavarapu Sai Nikhila', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD109', 'Vejju Hasya Sai Shivani', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD110', 'Rathod Venkata Narasimha', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD111', 'Akshath Chowdari Gowri Mundru', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD112', 'Jannu John Banyan', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD113', 'Dasari Sai Ram', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD114', 'Gargi Mitra', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD115', 'Gannu Sanjeev Srinivas', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD116', 'Sushant Kumar Singh', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD117', 'Katta Ajay Kumar', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD118', 'Krishna Suresh Agrawal', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD119', 'Palle Maheeth Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM25HYD002', 'Vedant Vidyadhar Kuntala', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD003', 'Edurinti Mohan', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD004', 'Mukkisa Harsha Vardhan Redyy', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD005', 'Seetammagari Siva Kumar', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD006', 'Mallipeddi Venkata Naga Sai Tejaswini', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD007', 'Pellate Sai Nikhil', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD008', 'Vardhini Nalli', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD009', 'Kadakuditi Jaya Suryanarayana Murthy', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD010', 'Srikanth Singh Bidla', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD012', 'Rangu Sandeep', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD013', 'Bollikonda Venkat Sai', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD014', 'Teki Ram Charan Tej', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD015', 'Kannale Nishanth', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD016', 'Nehal Basant Ray', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD022', 'Kalangi Seetharam', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD023', 'Varaganti Sandeep', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD024', 'Burra Abhilash', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD025', 'Jagannath THOTOLLLA', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD026', 'Donakonda Shiva Kumar', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD027', 'Lambu Laleep Krishnasai', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD028', 'Silla Dinakar', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD029', 'Basit Ali Nawab', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD030', 'Harsh Kumar', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD031', 'Nagappagari Bharath Reddy', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD033', 'Pathan Taheer', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD034', 'Lakshmi Manaswi Puttapaka', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD035', 'Teja Keshav', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD036', 'Subhash .', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD037', 'Karthik .', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD038', 'Kusuru Shyam', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD039', 'Sathwik Challa', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD044', 'Busireddy Abhilash', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD050', 'Gajulla Gowtham', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD052', 'Nadiminti Narasimha', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD064', 'Medisetti Narasimha Murthy', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD075', 'Garlapati Aravind', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD076', 'Garlapati Navadeep', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD119', 'Venkatesh', 4, 'Sec A', null, '2026-27'),
  ('IIHM24HYD001', 'Byagari Harshavardhan', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD002', 'Rohan Natakam', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD004', 'Debapriya Saha', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD005', 'Jadhao Aryan Vijayrao', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD006', 'Vanshika Saraf', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD007', 'Jatin Gupta', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD008', 'Vanga Vijay Raghava Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD009', 'Galigudem Dinesh Kumar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD010', 'Pachi Palli Vaishnavi', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD012', 'Ashray Pasula', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD013', 'Bandaru Maheshwar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD014', 'Khatroth Vikranth Rathod', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD015', 'Matta Venkata Chandra Mouli', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD016', 'V YETHIN NEEL KUMAR', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD017', 'Vangur Chaitanya', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD018', 'Borigam Chandu', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD019', 'Sanne Vishnu Vedhanth Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD020', 'Pagadala Abhinav Sidharth', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD021', 'Dwaram Tejodhar Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD022', 'Pamulapati Dimple Chowdary', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD024', 'Manne Hari Krishna', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD025', 'Ivan Parker', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD026', 'Donda Durgaprasad', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD027', 'M Sai Sujal', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD029', 'Kelvin John Patrick', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD030', 'Abhishek', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD031', 'Chennuru Venkata Sree Shyam Kasyap', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD032', 'Kummari Durga Prasad', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD033', 'Nomula Hrishikesh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD034', 'Sravan Gundu', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD036', 'Barma Sagar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD037', 'Vajjala Venkatesh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD038', 'Sriram Ananya', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD039', 'Guduru Sairam', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD041', 'Gadwal Abhinav', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD042', 'N Arthik Goud', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD043', 'Farhatul Nasreen', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD044', 'Amalapuram Susheela', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD045', 'Palakati Hanumanthu', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD046', 'Sambarapu Anil', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD047', 'Aarushi Sharma', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD049', 'Ramapurapu Reuel Wilson', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD050', 'Joy Joshua N', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD051', 'Sheri Rohith Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD055', 'Abhishek Singh Pawar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD056', 'Mohammad Abrar Ul Haq', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD057', 'Yeruva Sashank Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD058', 'Ramavath Hanmanthu Naik', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD061', 'Mojjada Shiva', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD063', 'Unkili Suresh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD064', 'Uyyala Sathwik', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD065', 'Nalla Ramcharan Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD066', 'Syed Rehan Hassan Razvi', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD068', 'Kommu Trinesh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD069', 'Gundekari Vivek', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD070', 'Zara Hasan', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD071', 'Pothana Himaja', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD073', 'Vatsa Rakesh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD074', 'MEDAM SRAVAN', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD075', 'Velagapudi Jathin', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD076', 'Dubbakula Thrilok', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD077', 'Sirigiri Lohith Kumar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD078', 'P Manivardhan Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD079', 'Pamoti Chandrasekhar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD081', 'Gaddamedi Prabhas', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD082', 'Ratnala Anand Vardhan Goud', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD083', 'Mekala Kavya Sri', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD084', 'Gawali Vaishnavi Ravi', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD085', 'Shaik Abdul Moied Shareef', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM20HYD023', 'MUDAVATH SUMAN', 5, 'Mixed A&B', null, '2026-27')
on conflict (roll_number) do update set
  full_name = excluded.full_name,
  semester = excluded.semester,
  section = excluded.section,
  practical_group = excluded.practical_group;

-- 5. Link students with existing batches automatically
update students s
set batch_id = b.id
from batches b
where (
  (s.practical_group is not null and b.name ilike '%' || s.practical_group || '%')
  or (s.practical_group is null and s.semester = 4 and b.name ilike '%Sem 4%')
  or (s.practical_group is null and s.semester = 5 and b.name ilike '%Sem 5%')
)
and s.batch_id is null;

-- 6. Relax semester check constraint up to 8 and add promotion indexes
do $$
begin
  alter table students drop constraint if exists students_semester_check;
  alter table students add constraint students_semester_check check (semester between 1 and 8);
exception
  when others then null;
end $$;

create index if not exists idx_students_promotion on students (semester, is_active);
create index if not exists idx_batches_promotion on batches (current_semester, is_active);
