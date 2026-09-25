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



