-- Schema `app`, milestone 7, lot 4: the drift report (docs/refonte/specs/j7-social.md, lot 4; h-indicateurs.md section 2).
-- One JSON object of aggregates over the learning days p_from..p_through: counts and shares, never an account id, a pseudonym
-- or a per-account row. Read by the service role only (npm run metrics:report -- --drift); there is no screen.
--
-- Signal             Measure (window p_from..p_through unless said)                       Alert when
-- xpRetention        weekly XP and recall rate over the 4 weeks ending p_through          XP up and recall down by 5 points or more
-- midnight           validated days (< 30 XP) whose last XP line is in the 30 min before   one account has more than half of its validated
--                    04:00 local time                                                      days like that
-- anxiousStreak      accounts with 7 validated days in a row, each under 25 XP            any
-- easyQuests         daily quests rerolled / daily quests assigned                         more than 80 %
--                    (share of the targeted volet that did not rise in 14 days: not measured, see voletGainReason)
-- compulsiveLeague   league members at the 150 XP cap 7 days in a row                     any
-- inflatedImmersion  accounts with more than 4 h declared 5 days in a row                  any
-- switchedOff        accounts that turned a switch off, per key                            30 % or more of the active accounts, for a key
-- notificationOptOut accounts that turned the notifications off within 24 h of one sent   any
-- challengeDeparture accounts that left a cooperative challenge and whose XP of the 7      any
--                    following days is under half of the 7 days before
create function app.drift_report(p_from date, p_through date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with active as (
    select count(distinct d.user_id)::integer as accounts
    from app.learning_day d
    where d.day between p_from and p_through and (d.xp_verified > 0 or d.validated)
  ),
  -- 4 weeks ending on p_through, oldest first.
  weeks as (
    select w.n,
      coalesce((select sum(x.amount) from app.xp_ledger x
                where x.day between p_through - 7 * (w.n + 1) + 1 and p_through - 7 * w.n and x.reason not like 'immersion.%'), 0)::integer as xp,
      (select count(*) from app.review_log r
       where r.origin = 'fsrs' and r.elapsed_days >= 1 and r.rating >= 2
         and r.reviewed_at::date between p_through - 7 * (w.n + 1) + 1 and p_through - 7 * w.n)::integer as recall_count,
      (select count(*) from app.review_log r
       where r.origin = 'fsrs' and r.elapsed_days >= 1
         and r.reviewed_at::date between p_through - 7 * (w.n + 1) + 1 and p_through - 7 * w.n)::integer as recall_total
    from generate_series(0, 3) as w (n)
  ),
  xp_retention as (
    select jsonb_agg(jsonb_build_object('xp', xp, 'recallCount', recall_count, 'recallTotal', recall_total) order by n desc) as weeks,
      ((select xp from weeks where n = 0) > (select xp from weeks where n = 3)
        and (select recall_total from weeks where n = 0) > 0 and (select recall_total from weeks where n = 3) > 0
        and (select recall_count::numeric / recall_total from weeks where n = 3) - (select recall_count::numeric / recall_total from weeks where n = 0) >= 0.05) as alert
    from weeks
  ),
  validated as (
    select d.user_id, d.day, d.xp_verified,
      (select max(x.created_at) from app.xp_ledger x where x.user_id = d.user_id and x.day = d.day and x.reason not like 'immersion.%') as last_line,
      d.time_zone
    from app.learning_day d
    where d.validated and d.day between p_from and p_through
  ),
  midnight_days as (
    select v.user_id,
      (v.xp_verified < 30 and v.last_line is not null
        and (v.last_line at time zone v.time_zone)::time >= time '03:30' and (v.last_line at time zone v.time_zone)::time < time '04:00') as flagged
    from validated v
  ),
  midnight as (
    select count(*)::integer as validated_days, count(*) filter (where flagged)::integer as flagged_days,
      (select count(*) from (select user_id from midnight_days group by user_id
                             having count(*) filter (where flagged) * 2 > count(*)) over_half)::integer as accounts_over
    from midnight_days
  ),
  anxious_days as (
    select d.user_id, d.day, d.day - (row_number() over (partition by d.user_id order by d.day))::integer as grp
    from app.learning_day d
    where d.validated and d.xp_verified < 25 and d.day between p_from and p_through
  ),
  anxious as (
    select count(*)::integer as accounts from (
      select user_id from anxious_days group by user_id, grp having count(*) >= 7) s
  ),
  quests as (
    select count(*) filter (where q.rerolled_from is not null)::integer as rerolled, count(*)::integer as total
    from app.quest_assignment q
    where q.period = 'day' and q.period_start between p_from and p_through
  ),
  league_days as (
    select x.user_id, x.day, x.day - (row_number() over (partition by x.user_id order by x.day))::integer as grp
    from app.xp_ledger x
    where x.league_eligible and x.reason not like 'immersion.%' and x.day between p_from and p_through
      and x.user_id in (select m.user_id from app.league_membership m)
    group by x.user_id, x.day
    having sum(x.amount) >= 150
  ),
  league as (
    select count(*)::integer as accounts from (select user_id from league_days group by user_id, grp having count(*) >= 7) s
  ),
  immersion_days as (
    select e.user_id, e.day, e.day - (row_number() over (partition by e.user_id order by e.day))::integer as grp
    from app.immersion_entry e
    where e.day between p_from and p_through
    group by e.user_id, e.day
    having sum(e.minutes) > 240
  ),
  immersion as (
    select count(*)::integer as accounts from (select user_id from immersion_days group by user_id, grp having count(*) >= 5) s
  ),
  switches as (
    select c.key, count(distinct c.user_id)::integer as accounts
    from app.setting_change c
    where c.value = 'false'::jsonb and c.changed_at::date between p_from and p_through
    group by c.key
  ),
  notifications as (
    select count(distinct c.user_id)::integer as accounts
    from app.setting_change c
    where c.key = 'notifications.enabled' and c.value = 'false'::jsonb and c.changed_at::date between p_from and p_through
      and exists (select 1 from app.notification_log n
                  where n.user_id = c.user_id and n.sent_at <= c.changed_at and n.sent_at > c.changed_at - interval '24 hours')
  ),
  departures as (
    select m.user_id, m.left_at::date as day
    from app.coop_member m
    where m.joined_at is not null and m.left_at is not null and m.left_at::date between p_from and p_through - 7
  ),
  departure_drop as (
    select count(distinct d.user_id)::integer as accounts
    from departures d
    where (select coalesce(sum(x.amount), 0) from app.xp_ledger x where x.user_id = d.user_id and x.reason not like 'immersion.%' and x.day between d.day - 7 and d.day - 1) > 0
      and (select coalesce(sum(x.amount), 0) from app.xp_ledger x where x.user_id = d.user_id and x.reason not like 'immersion.%' and x.day between d.day + 1 and d.day + 7) * 2
        < (select coalesce(sum(x.amount), 0) from app.xp_ledger x where x.user_id = d.user_id and x.reason not like 'immersion.%' and x.day between d.day - 7 and d.day - 1)
  )
  select jsonb_build_object(
    'window', jsonb_build_object('from', p_from, 'through', p_through),
    'activeAccounts', active.accounts,
    'xpRetention', jsonb_build_object('weeks', xp_retention.weeks, 'alert', xp_retention.alert),
    'midnight', jsonb_build_object('validatedDays', midnight.validated_days, 'flaggedDays', midnight.flagged_days,
      'accountsOver', midnight.accounts_over, 'alert', midnight.accounts_over > 0),
    'anxiousStreak', jsonb_build_object('accounts', anxious.accounts, 'alert', anxious.accounts > 0),
    'easyQuests', jsonb_build_object('rerolled', quests.rerolled, 'total', quests.total,
      'alert', quests.total > 0 and quests.rerolled * 5 > quests.total * 4,
      'voletGain', null, 'voletGainReason', 'per-account share of the targeted strand over 14 days is not kept in a journal'),
    'compulsiveLeague', jsonb_build_object('accounts', league.accounts, 'alert', league.accounts > 0),
    'inflatedImmersion', jsonb_build_object('accounts', immersion.accounts, 'alert', immersion.accounts > 0),
    'switchedOff', jsonb_build_object(
      'keys', coalesce((select jsonb_agg(jsonb_build_object('key', s.key, 'accounts', s.accounts) order by s.key) from switches s), '[]'::jsonb),
      'alert', exists (select 1 from switches s where active.accounts > 0 and s.accounts * 10 >= active.accounts * 3)),
    'notificationOptOut', jsonb_build_object('accounts', notifications.accounts, 'alert', notifications.accounts > 0),
    'challengeDeparture', jsonb_build_object('accounts', departure_drop.accounts, 'alert', departure_drop.accounts > 0)
  )
  from active cross join xp_retention cross join midnight cross join anxious cross join quests cross join league
    cross join immersion cross join notifications cross join departure_drop;
$$;

revoke execute on function app.drift_report(date, date) from public, anon, authenticated;
grant execute on function app.drift_report(date, date) to service_role;
