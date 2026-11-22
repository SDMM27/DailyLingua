-- Monthly milestone 2 metrics. Aggregate in Postgres; the reporting client receives no account IDs,
-- free text, or API call payloads. Calendar reporting is UTC except for learner activity days.
create function app.metrics_report(p_month date, p_as_of timestamptz default now())
returns jsonb
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select date_trunc('month', p_month::timestamp)::date as first_day,
      (date_trunc('month', p_month::timestamp) + interval '1 month')::date as next_month
  ),
  cohort as (
    select p.user_id, app.learning_day_at(p.time_zone, p.created_at) as signed_up,
      app.learning_day_at(p.time_zone, p_as_of) as current_day
    from app.profile p cross join bounds b
    where not p.is_guest and p.created_at >= b.first_day::timestamp at time zone 'UTC'
      and p.created_at < b.next_month::timestamp at time zone 'UTC' and p.created_at <= p_as_of
  ),
  follow_up as (
    select c.user_id, c.signed_up, c.current_day, min(s.day) filter (where s.day = c.signed_up + 1) as returned_j1,
      min(s.day) filter (where s.day between c.signed_up + 7 and c.signed_up + 9) as returned_j7
    from cohort c
    left join app.session s on s.user_id = c.user_id and s.kind = 'daily'
      and s.completed_at <= p_as_of and s.day between c.signed_up + 1 and c.signed_up + 9
    group by c.user_id, c.signed_up, c.current_day
  ),
  retention as (
    select count(*) filter (where signed_up + 1 < current_day) as j1_eligible,
      count(returned_j1) filter (where signed_up + 1 < current_day) as j1_returned,
      count(*) filter (where signed_up + 9 < current_day) as j7_eligible,
      count(returned_j7) filter (where signed_up + 9 < current_day) as j7_returned
    from follow_up
  ),
  sessions as (
    select count(*) as started, count(*) filter (where s.completed_at <= p_as_of) as completed
    from app.session s cross join bounds b
    where s.kind = 'daily' and s.day >= b.first_day and s.day < b.next_month and s.started_at <= p_as_of
  ),
  memory as (
    select count(*) as attempted, count(*) filter (where r.rating >= 2) as recalled
    from app.review_log r cross join bounds b
    where r.origin = 'fsrs' and r.elapsed_days >= 1
      and r.reviewed_at >= b.first_day::timestamp at time zone 'UTC'
      and r.reviewed_at < b.next_month::timestamp at time zone 'UTC' and r.reviewed_at <= p_as_of
  ),
  expression as (
    select count(*) as corrections, count(*) filter (where exists (
      select 1 from app.rewrite r
      where r.correction_id = c.id and r.user_id = c.user_id and r.accepted is true and r.created_at <= p_as_of
    )) as rewritten
    from app.correction c cross join bounds b
    where c.created_at >= b.first_day::timestamp at time zone 'UTC'
      and c.created_at < b.next_month::timestamp at time zone 'UTC' and c.created_at <= p_as_of
  ),
  active as (
    select count(distinct d.user_id) as learners
    from app.learning_day d cross join bounds b
    where d.day >= b.first_day and d.day < b.next_month and d.first_activity_at <= p_as_of
      and (d.xp_verified > 0 or d.validated)
  ),
  spend as (
    select coalesce(sum(c.cost_usd), 0) as usd
    from app.ai_call c cross join bounds b
    where c.created_at >= b.first_day::timestamp at time zone 'UTC'
      and c.created_at < b.next_month::timestamp at time zone 'UTC' and c.created_at <= p_as_of
  )
  select jsonb_build_object(
    'j1', jsonb_build_object('count', retention.j1_returned, 'total', retention.j1_eligible),
    'j7', jsonb_build_object('count', retention.j7_returned, 'total', retention.j7_eligible),
    'sessions', jsonb_build_object('count', sessions.completed, 'total', sessions.started),
    'recall', jsonb_build_object('count', memory.recalled, 'total', memory.attempted),
    'rewrites', jsonb_build_object('count', expression.rewritten, 'total', expression.corrections),
    'activeLearners', active.learners,
    'costUsd', spend.usd
  )
  from retention cross join sessions cross join memory cross join expression cross join active cross join spend;
$$;

revoke execute on function app.metrics_report(date, timestamptz) from public, anon, authenticated;
grant execute on function app.metrics_report(date, timestamptz) to service_role;
