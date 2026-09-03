-- 011_revoke_security_definer_execute.sql
-- Additive + reversible. Closes the hole that made every SECURITY DEFINER
-- function in `public` callable from the browser with the public anon key.
--
-- Supabase projects ship with:
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
-- That fires at CREATE FUNCTION time, through the PUBLIC pseudo-role. None of
-- the migrations that created these functions (004, 007, and the two backup
-- functions that live only in the DB) revoked it, so all six inherited it.
--
-- A SECURITY DEFINER function is owned by `postgres` and therefore bypasses RLS.
-- VITE_SUPABASE_ANON_KEY is compiled into the shipped JS bundle by design, so
-- "callable by anon" means "callable by anyone who opens the site".
--
-- Severity is data-integrity and resource-abuse, NOT disclosure:
--   * upsert_vital takes p_user_id as a PARAMETER and writes to vitals with RLS
--     bypassed — an anonymous caller can forge vitals rows for any user_id.
--   * run_backup_snapshot / backup_snapshot can be invoked anonymously in a loop
--     to trigger full-DB JSON snapshots — storage and cost exhaustion.
--   * backup_snapshots itself has RLS on, zero policies, and no select privilege
--     for anon or authenticated, so snapshot CONTENTS were never readable.
-- The two trg_* functions are trigger functions; direct invocation is far less
-- useful, but they are revoked for consistency — a trigger fires as the table
-- owner and does not consult EXECUTE privilege, so this cannot break the
-- strength rollup.
--
-- NO CALLER BREAKS. Verified before writing rather than assumed:
--   * `web/src` contains ZERO `.rpc(` call sites. The browser's only server call
--     of this kind is supabase.functions.invoke('vitals-sync') in
--     web/src/hooks/useVitalsSync.js, which runs inside the edge function.
--   * All three edge functions that call upsert_vital build their client with
--     SUPABASE_SERVICE_ROLE_KEY, which the grant below preserves:
--       supabase/functions/vitals-import/index.ts:95,100
--       supabase/functions/vitals-import-api/index.ts:119,120
--       supabase/functions/vitals-sync/index.ts:64,124
--   * The function OWNER (postgres) keeps EXECUTE regardless — REVOKE ... FROM
--     PUBLIC does not touch owner privileges — so a pg_cron job scheduled as
--     postgres is unaffected.
--
-- SIGNATURES ARE RESOLVED AT RUNTIME, NOT HARDCODED. This is deliberate, because
-- this repo's migrations are a mirror of a DB that has drifted:
--   * 004 defines upsert_vital with SEVEN parameters, but vitals-sync/index.ts
--     calls it with ELEVEN (p_steps, p_distance, p_active_min, p_calories were
--     added live for the Google-Health columns and never mirrored back).
--   * backup_snapshot and run_backup_snapshot appear in NO migration at all.
-- A literal `revoke ... on function public.upsert_vital(uuid,date,...)` would
-- therefore name a signature that may not exist and abort the whole migration.
-- Looping over pg_proc by name is correct against the drifted production DB AND
-- against a fresh DB rebuilt from this folder, and silently no-ops on a function
-- that is absent rather than failing.

do $$
declare
  target_names text[] := array[
    'upsert_vital',
    'backup_snapshot',
    'run_backup_snapshot',
    'fn_sync_strength_session',
    'trg_strength_set_sync',
    'trg_strength_workout_sync'
  ];
  sig   text;
  found int := 0;
begin
  for sig in
    -- pg_get_function_identity_arguments emits the arg list WITHOUT default
    -- values (it does still include parameter names, which REVOKE/GRANT accept
    -- as `argname argtype` pairs). Dropping the DEFAULTs is the load-bearing
    -- part: `REVOKE ... ON FUNCTION f(x integer DEFAULT 1)` is a syntax error,
    -- so pg_get_function_arguments would NOT work here.
    select format('%I.%I(%s)', n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (target_names)
  loop
    -- `from public` is the load-bearing half. PUBLIC is the pseudo-role the
    -- default grant actually flows through; revoking only anon/authenticated
    -- leaves the function reachable by both of them via PUBLIC.
    execute format('revoke all on function %s from public, anon, authenticated', sig);
    execute format('grant execute on function %s to service_role', sig);
    found := found + 1;
    raise notice '011: locked down %', sig;
  end loop;

  raise notice '011: revoked EXECUTE on % function(s)', found;
end $$;

-- Fail loudly on regression, and on drift this migration does not know about.
-- Scoped to every SECURITY DEFINER function in public, not just the six named
-- above, so that a seventh one created outside migrations is reported here
-- instead of quietly keeping the default grant. If this raises, the fix is to
-- add the offending name to target_names — not to weaken the check.
do $$
declare
  leaked text;
begin
  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
    into leaked
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute'));

  if leaked is not null then
    raise exception
      '011: SECURITY DEFINER functions still EXECUTE-able by anon/authenticated: %',
      leaked;
  end if;
end $$;

-- The service_role path must survive, or the vitals cron silently stops writing.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'upsert_vital'
  ) then
    assert (
      select bool_and(has_function_privilege('service_role', p.oid, 'execute'))
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'upsert_vital'
    ), '011: service_role lost EXECUTE on upsert_vital — the vitals cron would break';
  end if;
end $$;

-- NOTE — this migration is a one-time sweep, not a standing policy. The
-- ALTER DEFAULT PRIVILEGES grant described at the top is still in force, so the
-- NEXT function created in public will again be born EXECUTE-able by anon.
-- Revoking that default is the actual root-cause fix and is deliberately NOT
-- done here: it changes the birth privileges of every future function in the
-- schema and deserves its own reviewed change rather than riding along in a
-- lockdown migration.
