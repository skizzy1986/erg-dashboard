-- Rollback for 014_revoke_default_function_execute.sql. NOT auto-applied.
--
-- THIS REOPENS THE HOLE. Every new function created by postgres in `public`
-- is born EXECUTE-able by anon again — through PUBLIC and through the
-- explicit per-schema grant — including any SECURITY DEFINER function, which
-- bypasses RLS and is then callable by anyone holding the anon key compiled
-- into the shipped bundle. Do not run it to "unblock" a failure without first
-- establishing that 014 is genuinely the cause.
--
-- It almost certainly is not. 014 changes no existing function's ACL, only
-- what NEW functions are born with. Check these first, in this order:
--   1. A NEW function is missing its explicit GRANT. A client RPC, or a helper
--      evaluated under the caller's role (generated column, CHECK, index
--      expression, RLS policy helper), now needs
--        grant execute on function ... to authenticated;
--      in that function's migration. Fix it there, not by rolling back.
--   2. A function was DROPped and re-CREATEd (rather than CREATE OR REPLACE),
--      which discards its old ACL. Re-grant in the same migration.
--   3. An edge function lost its service-role key and fell back to anon.
--      service_role still gets EXECUTE on new functions; fix the secret.
--
-- Order of operations: per-schema grant first, then the global grant that
-- restores PUBLIC, then the probe proves new functions are born open again.
-- The probe asserts behaviour only — not whether the global pg_default_acl
-- row survives the re-grant. On a local Postgres 16 dry run the row was
-- deleted (it then equals the built-in default), but that is not a documented
-- guarantee, so nothing here depends on it.

alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated;

alter default privileges for role postgres grant execute on functions to public;

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

  if not (v_public and v_anon and v_authenticated and v_service_role) then
    raise exception
      '014 ROLLBACK: new function not born with the old defaults: public=% anon=% authenticated=% service_role=% (want t/t/t/t)',
      v_public, v_anon, v_authenticated, v_service_role;
  end if;

  raise warning '014 ROLLBACK: new functions in public are anon-executable again';
end $$;
