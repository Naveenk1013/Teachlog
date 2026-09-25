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
