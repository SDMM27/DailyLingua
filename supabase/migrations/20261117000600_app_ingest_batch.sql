-- Schema `app`, milestone 2, block S5: app.ingest_batch, the only way the server writes what a learner did
-- (attempts, reviews, XP, learning days, streak...). One transaction, one lock per user, optimistic
-- concurrency on app.ingest_state.seq. The rules of the game live in TypeScript (@dailylingua/core);
-- SQL guarantees atomicity, idempotence, ownership and the safety bounds only.
-- Nothing in `public` is modified. Spec: docs/refonte/specs/j2-architecture.md section 3.4,
-- docs/refonte/specs/j2-pr1-lots.md (lot S5, contract of p_payload).
--
-- Reserved to service_role (explicit revocations; app_access.test.sql checks it). p_user_id comes from the
-- server session, never from a request body.
--
-- p_payload: JSON object, every key optional (see the lot spec for the shape of each element):
--   sessions, session_steps, attempts, cards_created, reviews, productions, rewrites, error_items,
--   text_reads, xp, learning_days, streak (object or null), timezone_changes, device_cursors, ui_events.
-- An unknown key, a key that is not an array (streak: object or null), more than 500 elements in an array
-- or a payload above 1 MiB is refused (22023).
--
-- Application order: sessions, session_steps, attempts, cards_created, reviews, productions, rewrites,
-- error_items, text_reads, xp, learning_days, streak, timezone_changes, device_cursors, ui_events.
--
-- Idempotence: an element that carries a client_event_id and is already there with the same content is
-- ignored and its id is listed in `duplicates`; with different content the call fails (23505). Sessions,
-- steps, learning days, the streak and the device cursors are state: they replace (a session never goes
-- back to an earlier status). A card, a text read or a time zone change that already exists with the same
-- content is ignored. An XP line is identified by (attempt or review, reason); a line without source by its
-- whole content (day, language, reason, meta): put a distinguishing reference in `meta` when two such lines
-- can legitimately look alike.
--
-- Ownership: every element must point to rows of p_user_id (session, card, correction, attempt, review,
-- error item), otherwise 23503.
--
-- Safety bounds on app.xp_ledger: the sum of a user's lines of one day is at most 400, and a line's day is in
-- [server day - 3, server day + 1] (server day: profile.time_zone, day starting at 04:00); 23514 otherwise.
--
-- Errors: 22023 malformed payload; 23503 unknown user or foreign/unknown reference; 23505 same client event
-- id with another content; 23514 bound; 40001 stale p_expected_seq (retry from a fresh read of the state);
-- 55P03 lock not obtained within 5 s.
-- Returns { "seq": new sequence number, "duplicates": [client event ids ignored] }.

create function app.ingest_batch(p_user_id uuid, p_expected_seq bigint, p_payload jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arrays constant text[] := array['sessions', 'session_steps', 'attempts', 'cards_created', 'reviews',
    'productions', 'rewrites', 'error_items', 'text_reads', 'xp', 'learning_days', 'timezone_changes',
    'device_cursors', 'ui_events'];
  v_key text;
  v_val jsonb;
  v_tz text;
  v_today date;
  v_seq bigint;
  v_dups uuid[] := '{}';
  v_xp_days date[] := '{}';
  v_day date;
  v_lang text;
  v_rank_old integer;
  v_rank_new integer;
  v_id_attempt bigint;
  v_id_review bigint;
  v_src_kind text;
  v_src_event uuid;
  v_n integer;
  v_new_tz text;
  v_card jsonb;
  r record;
  e record;
begin
  -- Shape of the call and of the payload (cheap checks first) ---------------------------------------------
  if p_user_id is null or p_expected_seq is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid ingest call' using errcode = '22023';
  end if;
  if octet_length(p_payload::text) > 1048576 then
    raise exception 'payload larger than 1 MiB' using errcode = '22023';
  end if;
  for v_key, v_val in select k.key, k.value from jsonb_each(p_payload) as k loop
    if v_key = any (v_arrays) then
      if jsonb_typeof(v_val) <> 'array' or jsonb_array_length(v_val) > 500 then
        raise exception 'payload.%: expected an array of at most 500 elements', v_key using errcode = '22023';
      end if;
    elsif v_key = 'streak' then
      if jsonb_typeof(v_val) not in ('object', 'null') then
        raise exception 'payload.streak: expected an object or null' using errcode = '22023';
      end if;
    else
      raise exception 'payload: unknown key %', v_key using errcode = '22023';
    end if;
  end loop;

  -- Lock and sequence -----------------------------------------------------------------------------------------
  perform set_config('lock_timeout', '5s', true);
  perform pg_advisory_xact_lock(hashtextextended('app.ingest:' || p_user_id::text, 0));

  select p.time_zone into v_tz from app.profile p where p.user_id = p_user_id;
  if not found then
    raise exception 'unknown user %', p_user_id using errcode = '23503';
  end if;

  -- Accounts created before the row existed get it here (the signup trigger and the backfill cover the others).
  insert into app.ingest_state (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select s.seq into v_seq from app.ingest_state s where s.user_id = p_user_id;
  if v_seq <> p_expected_seq then
    raise exception 'stale sequence: expected %, current %', p_expected_seq, v_seq using errcode = '40001';
  end if;

  v_today := app.learning_day_at(v_tz, now());

  -- sessions --------------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'sessions', '[]'))
      as x(id uuid, status text, started_at timestamptz, completed_at timestamptz)
  loop
    if r.id is null or r.status is null or r.status <> all (array['planned', 'started', 'completed', 'abandoned']) then
      raise exception 'sessions: invalid element' using errcode = '22023';
    end if;
    select case s.status when 'planned' then 0 when 'started' then 1 when 'abandoned' then 2 else 3 end
      into v_rank_old
    from app.session s where s.id = r.id and s.user_id = p_user_id;
    if not found then
      raise exception 'sessions: unknown session' using errcode = '23503';
    end if;
    v_rank_new := case r.status when 'planned' then 0 when 'started' then 1 when 'abandoned' then 2 else 3 end;
    -- A session never goes back to an earlier status.
    update app.session s
    set status = case when v_rank_new >= v_rank_old then r.status else s.status end,
        started_at = coalesce(s.started_at, r.started_at),
        completed_at = coalesce(s.completed_at, r.completed_at)
    where s.id = r.id and s.user_id = p_user_id;
  end loop;

  -- session_steps ---------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'session_steps', '[]'))
      as x(session_id uuid, step text, validated_at timestamptz, proof jsonb)
  loop
    if r.session_id is null or r.step is null then
      raise exception 'session_steps: invalid element' using errcode = '22023';
    end if;
    select s.language into v_lang from app.session s where s.id = r.session_id and s.user_id = p_user_id;
    if not found then
      raise exception 'session_steps: unknown session' using errcode = '23503';
    end if;
    insert into app.session_step (session_id, user_id, language, step, validated_at, proof)
    values (r.session_id, p_user_id, v_lang, r.step, r.validated_at, coalesce(r.proof, '{}'))
    on conflict (session_id, step) do update
    set validated_at = excluded.validated_at, proof = excluded.proof;
  end loop;

  -- attempts --------------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'attempts', '[]'))
      as x(client_event_id uuid, session_id uuid, language text, step text, exercise_kind text,
           exercise_ref text, answer jsonb, result jsonb, correct boolean, duration_ms integer,
           occurred_at timestamptz)
  loop
    if r.client_event_id is null then
      raise exception 'attempts: client_event_id is required' using errcode = '22023';
    end if;
    select * into e from app.attempt a where a.user_id = p_user_id and a.client_event_id = r.client_event_id;
    if found then
      if e.session_id is not distinct from r.session_id and e.language is not distinct from r.language
         and e.step is not distinct from r.step and e.exercise_kind is not distinct from r.exercise_kind
         and e.exercise_ref is not distinct from r.exercise_ref and e.answer is not distinct from r.answer
         and e.result is not distinct from r.result and e.correct is not distinct from r.correct
         and e.duration_ms is not distinct from r.duration_ms and e.occurred_at is not distinct from r.occurred_at then
        v_dups := v_dups || r.client_event_id;
      else
        raise exception 'attempts: client_event_id % already used with another content', r.client_event_id
          using errcode = '23505';
      end if;
    else
      -- The composite key (session, user, language) makes a foreign session a 23503.
      insert into app.attempt (user_id, session_id, language, step, exercise_kind, exercise_ref, answer, result,
                               correct, duration_ms, client_event_id, occurred_at)
      values (p_user_id, r.session_id, r.language, r.step, r.exercise_kind, r.exercise_ref, r.answer, r.result,
              r.correct, r.duration_ms, r.client_event_id, r.occurred_at);
    end if;
  end loop;

  -- cards_created ---------------------------------------------------------------------------------------------------
  -- Before the reviews: a card created in a session can be reviewed in the same batch.
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'cards_created', '[]'))
      as x(id uuid, language text, kind text, front text, back text, back_language text, context text,
           source text, payload jsonb, state text, due_at timestamptz)
  loop
    if r.id is null then
      raise exception 'cards_created: id is required' using errcode = '22023';
    end if;
    select * into e from app.card c where c.id = r.id;
    if found then
      if e.user_id <> p_user_id then
        raise exception 'cards_created: card % belongs to another user', r.id using errcode = '23503';
      end if;
      if e.language is distinct from r.language or e.kind is distinct from r.kind or e.front is distinct from r.front then
        raise exception 'cards_created: card % already exists with another content', r.id using errcode = '23505';
      end if;
    else
      insert into app.card (id, user_id, language, kind, front, back, back_language, context, source, payload, state, due_at)
      values (r.id, p_user_id, r.language, r.kind, r.front, r.back, r.back_language, r.context,
              coalesce(r.source, 'session'), coalesce(r.payload, '{}'), coalesce(r.state, 'new'), r.due_at);
    end if;
  end loop;

  -- reviews ---------------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'reviews', '[]'))
      as x(client_event_id uuid, card_id uuid, rating smallint, mode text, reviewed_at timestamptz,
           elapsed_days real, scheduled_days real, card jsonb)
  loop
    if r.client_event_id is null or r.card_id is null or r.card is null or jsonb_typeof(r.card) <> 'object' then
      raise exception 'reviews: invalid element' using errcode = '22023';
    end if;
    select * into e from app.review_log l where l.user_id = p_user_id and l.client_event_id = r.client_event_id;
    if found then
      if e.card_id = r.card_id and e.rating is not distinct from r.rating and e.mode is not distinct from r.mode
         and e.reviewed_at is not distinct from r.reviewed_at and e.elapsed_days is not distinct from r.elapsed_days
         and e.scheduled_days is not distinct from r.scheduled_days then
        v_dups := v_dups || r.client_event_id;
      else
        raise exception 'reviews: client_event_id % already used with another content', r.client_event_id
          using errcode = '23505';
      end if;
    else
      v_card := r.card;
      -- The card is updated only if it belongs to p_user_id.
      update app.card c
      set state = v_card ->> 'state',
          stability = (v_card ->> 'stability')::real,
          difficulty = (v_card ->> 'difficulty')::real,
          due_at = (v_card ->> 'due_at')::timestamptz,
          last_review_at = (v_card ->> 'last_review_at')::timestamptz,
          reps = (v_card ->> 'reps')::integer,
          lapses = (v_card ->> 'lapses')::integer
      where c.id = r.card_id and c.user_id = p_user_id;
      if not found then
        raise exception 'reviews: unknown card' using errcode = '23503';
      end if;
      insert into app.review_log (user_id, card_id, rating, mode, reviewed_at, elapsed_days, scheduled_days, origin,
                                  client_event_id)
      values (p_user_id, r.card_id, r.rating, r.mode, r.reviewed_at, r.elapsed_days, r.scheduled_days, 'fsrs',
              r.client_event_id);
    end if;
  end loop;

  -- productions -----------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'productions', '[]'))
      as x(id uuid, client_event_id uuid, session_id uuid, language text, mode text, task jsonb, text text)
  loop
    if r.id is null or r.client_event_id is null then
      raise exception 'productions: id and client_event_id are required' using errcode = '22023';
    end if;
    select * into e from app.production p where p.user_id = p_user_id and p.client_event_id = r.client_event_id;
    if found then
      if e.id = r.id and e.session_id is not distinct from r.session_id and e.language is not distinct from r.language
         and e.mode is not distinct from r.mode and e.task is not distinct from coalesce(r.task, '{}')
         and e.text is not distinct from r.text then
        v_dups := v_dups || r.client_event_id;
      else
        raise exception 'productions: client_event_id % already used with another content', r.client_event_id
          using errcode = '23505';
      end if;
    else
      insert into app.production (id, user_id, language, session_id, mode, task, text, client_event_id)
      values (r.id, p_user_id, r.language, r.session_id, r.mode, coalesce(r.task, '{}'), r.text, r.client_event_id);
    end if;
  end loop;

  -- rewrites --------------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'rewrites', '[]'))
      as x(client_event_id uuid, correction_id uuid, sentence_index smallint, text text, accepted boolean)
  loop
    if r.client_event_id is null then
      raise exception 'rewrites: client_event_id is required' using errcode = '22023';
    end if;
    select * into e from app.rewrite w where w.user_id = p_user_id and w.client_event_id = r.client_event_id;
    if found then
      if e.correction_id = r.correction_id and e.sentence_index is not distinct from r.sentence_index
         and e.text is not distinct from r.text and e.accepted is not distinct from r.accepted then
        v_dups := v_dups || r.client_event_id;
      else
        raise exception 'rewrites: client_event_id % already used with another content', r.client_event_id
          using errcode = '23505';
      end if;
    else
      -- The composite key (correction, user) makes a foreign correction a 23503.
      insert into app.rewrite (user_id, correction_id, sentence_index, text, accepted, client_event_id)
      values (p_user_id, r.correction_id, r.sentence_index, r.text, r.accepted, r.client_event_id);
    end if;
  end loop;

  -- error_items -----------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'error_items', '[]')) as x(id uuid, reworked_day date)
  loop
    if r.id is null or r.reworked_day is null then
      raise exception 'error_items: id and reworked_day are required' using errcode = '22023';
    end if;
    -- The first day recorded stays.
    update app.error_item i
    set reworked_day = coalesce(i.reworked_day, r.reworked_day)
    where i.id = r.id and i.user_id = p_user_id;
    if not found then
      raise exception 'error_items: unknown error item' using errcode = '23503';
    end if;
  end loop;

  -- text_reads ------------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'text_reads', '[]')) as x(text_id uuid, first_read_day date)
  loop
    if r.text_id is null or r.first_read_day is null then
      raise exception 'text_reads: text_id and first_read_day are required' using errcode = '22023';
    end if;
    -- The first read stays; an unknown text is a 23503 from the foreign key.
    insert into app.text_read (user_id, text_id, first_read_day)
    values (p_user_id, r.text_id, r.first_read_day)
    on conflict (user_id, text_id) do nothing;
  end loop;

  -- xp --------------------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'xp', '[]'))
      as x(source jsonb, language text, day date, amount integer, reason text, rule_version text,
           league_eligible boolean, meta jsonb)
  loop
    if r.day is null or r.amount is null or r.reason is null or r.reason !~ '^[a-z0-9_.]{1,60}$'
       or (r.language is not null and r.language !~ '^[a-z]{2,3}$') then
      raise exception 'xp: invalid element' using errcode = '22023';
    end if;
    if r.day < v_today - 3 or r.day > v_today + 1 then
      raise exception 'xp: day % is outside [server day - 3, server day + 1]', r.day using errcode = '23514';
    end if;
    if r.amount < 1 or r.amount > 100 then
      raise exception 'xp: amount % is outside 1 to 100', r.amount using errcode = '23514';
    end if;
    if not (r.day = any (v_xp_days)) then
      v_xp_days := v_xp_days || r.day;
    end if;

    v_id_attempt := null;
    v_id_review := null;
    if r.source is not null and jsonb_typeof(r.source) <> 'null' then
      if jsonb_typeof(r.source) <> 'object'
         or (r.source ->> 'kind') is null or (r.source ->> 'kind') <> all (array['attempt', 'review'])
         or (r.source ->> 'client_event_id') is null
         or (r.source ->> 'client_event_id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception 'xp: invalid source' using errcode = '22023';
      end if;
      v_src_kind := r.source ->> 'kind';
      v_src_event := (r.source ->> 'client_event_id')::uuid;
      if v_src_kind = 'attempt' then
        select a.id into v_id_attempt from app.attempt a
        where a.user_id = p_user_id and a.client_event_id = v_src_event;
        if not found then
          raise exception 'xp: unknown attempt %', v_src_event using errcode = '23503';
        end if;
      else
        select l.id into v_id_review from app.review_log l
        where l.user_id = p_user_id and l.client_event_id = v_src_event;
        if not found then
          raise exception 'xp: unknown review %', v_src_event using errcode = '23503';
        end if;
      end if;
    end if;

    if v_id_attempt is not null or v_id_review is not null then
      select * into e from app.xp_ledger x
      where x.user_id = p_user_id and x.reason = r.reason
        and x.attempt_id is not distinct from v_id_attempt and x.review_log_id is not distinct from v_id_review;
      if found then
        if e.day = r.day and e.language is not distinct from r.language and e.amount = r.amount
           and e.rule_version = coalesce(r.rule_version, 'j2.1')
           and e.league_eligible = coalesce(r.league_eligible, true) and e.meta = coalesce(r.meta, '{}') then
          continue;
        end if;
        raise exception 'xp: line (%, %) already inscribed with another content', r.reason, coalesce(v_src_event::text, '')
          using errcode = '23505';
      end if;
      insert into app.xp_ledger (user_id, language, day, amount, reason, attempt_id, review_log_id, meta, rule_version,
                                 league_eligible)
      values (p_user_id, r.language, r.day, r.amount, r.reason, v_id_attempt, v_id_review, coalesce(r.meta, '{}'),
              coalesce(r.rule_version, 'j2.1'), coalesce(r.league_eligible, true));
    else
      -- Without source: an identical line already there is the same line (see xp_ledger_sourceless_idx).
      insert into app.xp_ledger (user_id, language, day, amount, reason, meta, rule_version, league_eligible)
      values (p_user_id, r.language, r.day, r.amount, r.reason, coalesce(r.meta, '{}'),
              coalesce(r.rule_version, 'j2.1'), coalesce(r.league_eligible, true))
      on conflict do nothing;
    end if;
  end loop;

  -- Sum of the day, per user (the theoretical ceiling of the scale is 336).
  foreach v_day in array v_xp_days loop
    select coalesce(sum(x.amount), 0)::integer into v_n
    from app.xp_ledger x where x.user_id = p_user_id and x.day = v_day;
    if v_n > 400 then
      raise exception 'xp: % XP on % (at most 400 a day)', v_n, v_day using errcode = '23514';
    end if;
  end loop;

  -- learning_days (replace the rows of the same days) ----------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'learning_days', '[]'))
      as x(day date, time_zone text, xp_verified integer, validated boolean, cause text, first_activity_at timestamptz)
  loop
    if r.day is null or r.time_zone is null then
      raise exception 'learning_days: day and time_zone are required' using errcode = '22023';
    end if;
    if r.day > v_today + 1 then
      raise exception 'learning_days: day % is in the future', r.day using errcode = '23514';
    end if;
    insert into app.learning_day (user_id, day, time_zone, xp_verified, validated, cause, first_activity_at)
    values (p_user_id, r.day, r.time_zone, coalesce(r.xp_verified, 0), coalesce(r.validated, false),
            coalesce(r.cause, 'none'), r.first_activity_at)
    on conflict (user_id, day) do update
    set time_zone = excluded.time_zone,
        xp_verified = excluded.xp_verified,
        validated = excluded.validated,
        cause = excluded.cause,
        first_activity_at = excluded.first_activity_at;
  end loop;

  -- streak (replaces the state) -----------------------------------------------------------------------------------------
  if p_payload -> 'streak' is not null and jsonb_typeof(p_payload -> 'streak') = 'object' then
    select * into r from jsonb_to_record(p_payload -> 'streak')
      as x("current" integer, best integer, last_day date, freezes smallint, mode text, last_repair_day date,
           freezes_granted_through date, best_set_on date, time_zone_changed_at timestamptz);
    insert into app.streak_state as s (user_id, "current", best, last_day, freezes, mode, last_repair_day,
                                       freezes_granted_through, best_set_on, time_zone_changed_at)
    values (p_user_id, coalesce(r."current", 0), coalesce(r.best, 0), r.last_day, coalesce(r.freezes, 0),
            coalesce(r.mode, 'daily'), r.last_repair_day, r.freezes_granted_through, r.best_set_on,
            r.time_zone_changed_at)
    on conflict (user_id) do update
    set "current" = excluded."current",
        best = excluded.best,
        last_day = excluded.last_day,
        freezes = excluded.freezes,
        mode = excluded.mode,
        last_repair_day = excluded.last_repair_day,
        freezes_granted_through = excluded.freezes_granted_through,
        best_set_on = excluded.best_set_on,
        time_zone_changed_at = excluded.time_zone_changed_at;
  end if;

  -- timezone_changes ------------------------------------------------------------------------------------------------------
  v_n := 0;
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'timezone_changes', '[]'))
      as x(effective_at timestamptz, time_zone text)
  loop
    if r.effective_at is null or r.time_zone is null then
      raise exception 'timezone_changes: effective_at and time_zone are required' using errcode = '22023';
    end if;
    select * into e from app.timezone_change t where t.user_id = p_user_id and t.effective_at = r.effective_at;
    if found then
      if e.time_zone <> r.time_zone then
        raise exception 'timezone_changes: a change already exists at % with another time zone', r.effective_at
          using errcode = '23505';
      end if;
    else
      insert into app.timezone_change (user_id, effective_at, time_zone) values (p_user_id, r.effective_at, r.time_zone);
    end if;
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    -- The profile follows the accepted time zone: the latest change that has taken effect.
    select t.time_zone into v_new_tz from app.timezone_change t
    where t.user_id = p_user_id and t.effective_at <= now() order by t.effective_at desc limit 1;
    if v_new_tz is not null then
      update app.profile p set time_zone = v_new_tz where p.user_id = p_user_id and p.time_zone <> v_new_tz;
    end if;
  end if;

  -- device_cursors (never go back) ------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'device_cursors', '[]'))
      as x(device_id uuid, last_seq bigint, last_day date)
  loop
    if r.device_id is null or r.last_seq is null then
      raise exception 'device_cursors: device_id and last_seq are required' using errcode = '22023';
    end if;
    insert into app.device_cursor as d (user_id, device_id, last_seq, last_day)
    values (p_user_id, r.device_id, r.last_seq, r.last_day)
    on conflict (user_id, device_id) do update
    set last_seq = greatest(d.last_seq, excluded.last_seq),
        last_day = greatest(d.last_day, excluded.last_day);
  end loop;

  -- ui_events -------------------------------------------------------------------------------------------------------------------
  for r in
    select * from jsonb_to_recordset(coalesce(p_payload -> 'ui_events', '[]'))
      as x(client_event_id uuid, name text, value jsonb, occurred_at timestamptz)
  loop
    if r.client_event_id is null then
      raise exception 'ui_events: client_event_id is required' using errcode = '22023';
    end if;
    select * into e from app.ui_event u where u.user_id = p_user_id and u.client_event_id = r.client_event_id;
    if found then
      if e.name = r.name and e.value is not distinct from coalesce(r.value, '{}')
         and e.occurred_at is not distinct from r.occurred_at then
        v_dups := v_dups || r.client_event_id;
      else
        raise exception 'ui_events: client_event_id % already used with another content', r.client_event_id
          using errcode = '23505';
      end if;
    else
      insert into app.ui_event (user_id, name, value, occurred_at, client_event_id)
      values (p_user_id, r.name, coalesce(r.value, '{}'), r.occurred_at, r.client_event_id);
    end if;
  end loop;

  -- Done: next sequence number --------------------------------------------------------------------------------------------------
  update app.ingest_state s set seq = s.seq + 1 where s.user_id = p_user_id returning s.seq into v_seq;
  perform app.mark_active(p_user_id);

  return jsonb_build_object(
    'seq', v_seq,
    'duplicates', (select coalesce(jsonb_agg(distinct d), '[]'::jsonb) from unnest(v_dups) as d)
  );
end;
$$;

revoke execute on function app.ingest_batch(uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function app.ingest_batch(uuid, bigint, jsonb) to service_role;
