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
