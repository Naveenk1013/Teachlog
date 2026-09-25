-- =============================================================================
-- Calendar Setup: Academic Calendar, State Festivals, Holidays & Vacations
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xvgwnibqawgrsdsuvzpm/sql
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

-- Drop existing policies if re-running
drop policy if exists "academic_events_select" on academic_events;
drop policy if exists "academic_events_insert" on academic_events;
drop policy if exists "academic_events_update" on academic_events;
drop policy if exists "academic_events_delete" on academic_events;

-- Policies:
create policy "academic_events_select"
  on academic_events for select
  using (true);

create policy "academic_events_insert"
  on academic_events for insert
  with check (
    app_role() in ('admin', 'teacher')
    and created_by = auth.uid()
  );

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

-- ─────────────────────────────────────────────
-- Seed Initial Academic Calendar Events (2026-27)
-- ─────────────────────────────────────────────
do $$
declare
  v_admin_id uuid := 'aaaa0000-0000-0000-0000-000000000001';
  v_teach_rajesh uuid := 'bbbb0000-0000-0000-0000-000000000001';
begin
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
