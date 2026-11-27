-- Rehearsal of the public -> app migration (milestone 8, steps R0/R1). Run through
-- `npm run migration:rehearse`, never by hand on a hosted project.
--
-- In one transaction: snapshot public (row count and digest of every table), migrate_all twice,
-- verify_migration after each pass, snapshot public again. Every line of the result is
-- `check|ok|detail`. The transaction is rolled back unless psql receives `-v apply=1`.
\set ON_ERROR_STOP on
\set QUIET on
\if :{?apply}
\else
  \set apply 0
\endif

begin;

create temp table rehearse_result (pos serial, check_name text, ok boolean, detail text) on commit drop;
create temp table rehearse_snap (phase text, tbl text, n bigint, digest text) on commit drop;

create function pg_temp.snap(p_phase text, p_schema text, p_digest boolean) returns void
language plpgsql as $$
declare
  t record;
  v_n bigint;
  v_digest text;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = p_schema and table_type = 'BASE TABLE' order by table_name
  loop
    if p_digest then
      execute format('select count(*), md5(coalesce(string_agg(x::text, %L order by x::text), %L)) from %I.%I x',
        chr(10), '', p_schema, t.table_name) into v_n, v_digest;
    else
      execute format('select count(*) from %I.%I', p_schema, t.table_name) into v_n;
    end if;
    insert into rehearse_snap values (p_phase, p_schema || '.' || t.table_name, v_n, v_digest);
  end loop;
end;
$$;

create function pg_temp.pass(p_name text) returns void
language plpgsql as $$
declare
  v_res jsonb;
  v_verify bigint;
  v_errors int;
begin
  v_res := app.migrate_all();
  v_errors := jsonb_array_length(v_res -> 'errors');
  insert into rehearse_result (check_name, ok, detail) values
    (p_name || ': migrate_all', v_errors = 0, v_res::text);
  select count(*) into v_verify from app.verify_migration();
  insert into rehearse_result (check_name, ok, detail) values
    (p_name || ': verify_migration', v_verify = 0, v_verify || ' discrepancy row(s)');
end;
$$;

do $$
begin
  perform pg_temp.snap('before', 'public', true);
  perform pg_temp.pass('pass 1');
  perform pg_temp.snap('after 1', 'app', false);
  perform pg_temp.pass('pass 2');
  perform pg_temp.snap('after 2', 'app', false);
  perform pg_temp.snap('after', 'public', true);
end;
$$;

-- Pass 2 creates nothing: every count in its migrate_all report except users/skipped is 0.
insert into rehearse_result (check_name, ok, detail)
select 'pass 2 creates nothing', coalesce(bool_and(e.value::text = '0'), true),
       coalesce(string_agg(e.key || '=' || e.value::text, ', ') filter (where e.value::text <> '0'), 'all 0')
from (select detail::jsonb as d from rehearse_result where check_name = 'pass 2: migrate_all' offset 0) r,
     jsonb_each(r.d - 'users' - 'skipped_active' - 'errors') e;

-- The app tables have the same row counts after both passes.
insert into rehearse_result (check_name, ok, detail)
select 'app row counts stable', count(*) = 0,
       coalesce(string_agg(a.tbl || ' ' || a.n || '->' || b.n, ', '), 'identical')
from rehearse_snap a join rehearse_snap b on b.tbl = a.tbl and b.phase = 'after 2'
where a.phase = 'after 1' and a.n <> b.n;

-- public is never written by the migration.
insert into rehearse_result (check_name, ok, detail)
select 'public untouched', count(*) = 0,
       coalesce(string_agg(a.tbl, ', '), (select count(*) || ' tables, ' || sum(n) || ' rows'
                                          from rehearse_snap where phase = 'before'))
from rehearse_snap a join rehearse_snap b on b.tbl = a.tbl and b.phase = 'after'
where a.phase = 'before' and (a.n, a.digest) is distinct from (b.n, b.digest);

\pset format unaligned
\pset tuples_only on
\pset fieldsep '|'
select check_name, case when ok then 'ok' else 'FAIL' end, detail from rehearse_result order by pos;

\if :apply
  commit;
\else
  rollback;
\endif
