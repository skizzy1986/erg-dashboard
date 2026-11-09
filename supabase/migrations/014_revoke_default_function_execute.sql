-- 014_revoke_default_function_execute.sql
-- Additive + reversible (014_revoke_default_function_execute_rollback.sql).
-- Closes the root cause that 011's closing NOTE deliberately left open (#429):
-- every function created in `public` is born EXECUTE-able by anon.
--
-- WHAT IT CHANGES: *birth* privileges only, for functions created by
-- `postgres`. No existing function's ACL changes — ALTER DEFAULT PRIVILEGES
-- applies to objects created afterwards, never to objects that already exist.
-- The read-back at the end proves it on session_date_to_iso(text).
--
-- Live state before this ran (read-only MCP, 2026-11-07): pg_default_acl holds
-- two per-schema rows for `public`, objtype 'f', one per grantor (`postgres`
-- and `supabase_admin`), each granting EXECUTE to postgres, anon,
-- authenticated and service_role. There is no global row, so the hard-wired
-- default applies on top: EXECUTE to PUBLIC.
--
-- WHY TWO STATEMENTS. From the Postgres docs (sql-alterdefaultprivileges.html,
-- catalog-pg-default-acl.html, via Context7 /websites/postgresql):
--   "Default privileges that are specified per-schema are added to whatever
--    the global default privileges are for the particular object type. This
--    means you cannot revoke privileges per-schema if they are granted
--    globally (either by default, or according to a previous ALTER DEFAULT
--    PRIVILEGES command that did not specify a schema)."
-- and the docs name `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE
-- ON FUNCTIONS FROM PUBLIC;` explicitly as having no effect. The hard-wired
-- EXECUTE-to-PUBLIC on functions can only be removed by a GLOBAL statement
-- (no IN SCHEMA), which writes a global pg_default_acl row that overrides the
-- hard-wired default. So:
--   * statement 2 (global) removes PUBLIC;
--   * statement 3 (per-schema) removes the explicit anon/authenticated grants
--     in postgres's `public` row, which is a previous per-schema GRANT and so
--     is exactly what a per-schema REVOKE can undo.
-- The per-schema revoke alone would leave every new function anon-executable
-- through PUBLIC (anon inherits PUBLIC's grants — functions-info.html), which
-- is why acceptance item 3 cannot be met without the global statement.
--
-- BLAST RADIUS of the global revoke: every schema `postgres` creates functions
-- in from now on, not just `public` — a future private schema, an extension
-- installed as postgres. That is the intended deny-by-default. The cost is an
-- explicit GRANT on every function a client must be able to call.
--
-- OUT OF REACH: the `supabase_admin` grantor row. Default privileges are per
-- grantor role and altering another role's requires membership in it
-- (sql-alterdefaultprivileges.html, FOR ROLE); `postgres` is not a member of
-- that platform superuser. Acceptable because every function in `public` is
-- owned by `postgres`, our migrations run as `postgres`, and the security
-- advisor still flags an anon-executable SECURITY DEFINER function whoever
-- created it.
--
-- THE NEW RULE (also in .claude/skills/supabase-patterns.md § Migrations):
-- any function users must call — client RPCs, and helpers evaluated under the
-- caller's role (generated columns, CHECK constraints, index expressions, RLS
-- policy helpers) — needs an explicit
--   grant execute on function ... to authenticated;
-- (and `anon` only when an unauthenticated path genuinely needs it) in its own
-- migration. `create or replace` keeps the existing ACL; `drop` + `create`
-- loses it (sql-createfunction.html), so re-grant after one. SECURITY DEFINER
-- functions keep their explicit revoke/grant + pinned search_path as belt and
-- braces for the supabase_admin case. service_role and the owner keep EXECUTE
-- on new functions, so edge functions (service-role key) and pg_cron (runs as
-- postgres) need nothing.
--
-- APPLY: Scott approves; Supabase MCP apply_migration with name exactly
-- `014_revoke_default_function_execute`; then its supabase/migrations/
-- manifest.json entry flips to `applied` with the live version.

-- Default privileges are per grantor; FOR ROLE postgres needs membership.
do $$
begin
  if not pg_has_role(current_user, 'postgres', 'member') then
    raise exception '014 must run as postgres (or a member): current_user=%', current_user;
  end if;
end $$;

-- Global: overrides the hard-wired EXECUTE-to-PUBLIC for postgres's functions.
alter default privileges for role postgres revoke execute on functions from public;

-- Per-schema: undoes the explicit anon/authenticated grant in postgres's
-- `public` row. service_role and postgres stay.
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- Self-test: create a function the way a future migration would and check
-- what it is born with. The probe is dropped BEFORE the verdict, so it cannot
-- survive even if the apply is not transactional. `raise exception`, not
-- `assert`: plpgsql.check_asserts can switch assert off.
do $$
declare
  v_public        boolean;
  v_anon          boolean;
  v_authenticated boolean;
  v_service_role  boolean;
begin
  execute 'drop function if exists public.__acl_probe_429()';
  execute 'create function public.__acl_probe_429() returns int language sql security definer set search_path = '''' as ''select 1''';

  v_public        := has_function_privilege('public', 'public.__acl_probe_429()', 'execute');
  v_anon          := has_function_privilege('anon', 'public.__acl_probe_429()', 'execute');
  v_authenticated := has_function_privilege('authenticated', 'public.__acl_probe_429()', 'execute');
  v_service_role  := has_function_privilege('service_role', 'public.__acl_probe_429()', 'execute');

  execute 'drop function public.__acl_probe_429()';

  if v_public or v_anon or v_authenticated or not v_service_role then
    raise exception
      '014: new function born with wrong EXECUTE: public=% anon=% authenticated=% service_role=% (want f/f/f/t)',
      v_public, v_anon, v_authenticated, v_service_role;
  end if;

  raise notice '014: probe born with public=% anon=% authenticated=% service_role=%',
    v_public, v_anon, v_authenticated, v_service_role;
end $$;

-- Catalog read-back. (a) the global row exists and grants nothing to PUBLIC
-- (aclexplode reports PUBLIC as grantee 0); (b) postgres's `public` row no
-- longer names anon or authenticated; (c) an EXISTING function is untouched:
-- session_date_to_iso(text) backs the generated column sessions.date_iso,
-- evaluated under the inserting user's role, so it must stay executable.
do $$
begin
  if not exists (
    select 1 from pg_default_acl d
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 0
      and d.defaclobjtype = 'f'
      and not exists (select 1 from aclexplode(d.defaclacl) a where a.grantee = 0)
  ) then
    raise exception '014: no global pg_default_acl row for postgres/functions without PUBLIC';
  end if;

  if exists (
    select 1 from pg_default_acl d, aclexplode(d.defaclacl) a
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'f'
      and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
  ) then
    raise exception '014: postgres''s public-schema default still grants EXECUTE to anon/authenticated';
  end if;

  if to_regprocedure('public.session_date_to_iso(text)') is not null
     and not (has_function_privilege('anon', 'public.session_date_to_iso(text)', 'execute')
          and has_function_privilege('authenticated', 'public.session_date_to_iso(text)', 'execute')) then
    raise exception '014: session_date_to_iso(text) lost EXECUTE for anon/authenticated — sessions inserts would fail';
  end if;

  raise notice '014: read-back ok — global default has no PUBLIC, public-schema default has no anon/authenticated, existing functions untouched';
end $$;
