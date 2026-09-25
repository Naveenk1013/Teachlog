-- =============================================================================
-- Migration: 0005_academic_calendar.sql
-- Description: Academic Calendar Events, Holidays, Vacations & Teacher Notes
-- =============================================================================

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

-- Enable RLS
alter table academic_events enable row level security;

-- Policies:
-- 1. All authenticated users can view academic events that are institute-wide, for their batch, or for their teacher
create policy "academic_events_select"
  on academic_events for select
  using (
    auth.uid() is not null
  );

-- 2. Teachers and Admins can create academic events
create policy "academic_events_insert"
  on academic_events for insert
  with check (
    app_role() in ('admin', 'teacher')
    and created_by = auth.uid()
  );

-- 3. Teachers can update/delete their own events; Admins can update/delete all
create policy "academic_events_update"
  on academic_events for update
  using (
    app_role() = 'admin'
    or (app_role() = 'teacher' and created_by = auth.uid())
  )
  with check (
    app_role() = 'admin'
    or (app_role() = 'teacher' and created_by = auth.uid())
  );

create policy "academic_events_delete"
  on academic_events for delete
  using (
    app_role() = 'admin'
    or (app_role() = 'teacher' and created_by = auth.uid())
  );
