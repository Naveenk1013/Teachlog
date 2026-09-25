-- =============================================================================
-- Migration: 0007_promotion_support.sql
-- Description: Expand semester check constraint to support higher semesters & promotion indexes
-- =============================================================================

-- 1. Relax students semester check constraint up to semester 8 (for 4-year degree tracks)
do $$
begin
  alter table students drop constraint if exists students_semester_check;
  alter table students add constraint students_semester_check check (semester between 1 and 8);
exception
  when others then null;
end $$;

-- 2. Index for fast cohort promotion filtering
create index if not exists idx_students_promotion on students (semester, is_active);
create index if not exists idx_batches_promotion on batches (current_semester, is_active);
