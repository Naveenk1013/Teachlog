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
