-- Review fixes for the phase 2 schema.
--
-- 1. Quiz grading. The grading trigger only fired when question_id or selected_index
--    changed, so `update quiz_answers set is_correct = true` went through untouched and a
--    user could mark any answer as correct. It now regrades on every insert and update,
--    whatever columns the statement sets.
--
-- 2. Completed minutes. History and weekly stats used activity_progress.spent_seconds, a
--    measured time the UI never records (activities are ticked, not timed), so real users
--    would always see 0 min. The app counts progress as the estimated minutes of completed
--    activities (src/lib/domain/time-budget.ts); the view now exposes the same figure.
--    spent_seconds is kept for a future timer.

drop trigger quiz_answers_grade on public.quiz_answers;

create trigger quiz_answers_grade
  before insert or update on public.quiz_answers
  for each row execute function public.grade_quiz_answer();

-- New columns can only be appended by CREATE OR REPLACE VIEW; existing grants are kept.
create or replace view public.mission_stats with (security_invoker = true) as
select
  m.id as mission_id,
  m.user_id,
  m.mission_date,
  m.budget_minutes,
  m.status,
  m.started_at,
  m.completed_at,
  coalesce(sum(p.spent_seconds), 0)::integer as spent_seconds,
  count(p.completed_at)::integer as completed_activities,
  coalesce(sum(a.estimated_minutes) filter (where p.completed_at is not null), 0)::integer
    as completed_minutes
from public.missions m
left join public.mission_sessions s on s.mission_id = m.id
left join public.mission_activities a on a.session_id = s.id
left join public.activity_progress p on p.activity_id = a.id
group by m.id;
