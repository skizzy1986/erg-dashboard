-- Rollback for 011_revoke_security_definer_execute.sql. NOT auto-applied.
--
-- THIS REOPENS THE HOLE. Running it restores the Supabase default grant, which
-- makes every listed SECURITY DEFINER function callable from the browser with
-- the public anon key again — including upsert_vital, which takes p_user_id as
-- a parameter and bypasses RLS. Do not run it to "unblock" a failure without
-- first establishing that the revoke is genuinely the cause.
--
-- It almost certainly is not. Before rolling back, check the far more likely
-- explanations, in this order:
--   1. Did the caller lose its service-role key rather than its privilege?
--      A missing/expired SUPABASE_SERVICE_ROLE_KEY makes supabase-js fall back
--      to the anon key, which now correctly fails — the fix is the secret, not
--      this file. Check the Edge Function secrets before anything else.
--   2. Is a NEW caller using the anon key for something that should never have
--      been anon-callable? Then the caller is the defect.
--   3. Only if a legitimate, RLS-safe caller genuinely needs anon or
--      authenticated EXECUTE should you restore it — and then restore it for
--      that ONE function by name, not by running this whole file.
--
-- Mirrors 011: names are resolved through pg_proc rather than hardcoded, because
-- upsert_vital's live signature (11 args) does not match the 7-arg definition in
-- 004, and the two backup functions appear in no migration at all.
--
-- Restores exactly what the Supabase default privileges would have granted:
-- ALL to anon, authenticated, service_role.

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
  sig text;
begin
  for sig in
    select format('%I.%I(%s)', n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (target_names)
  loop
    execute format('grant all on function %s to anon, authenticated, service_role', sig);
    raise warning '011 ROLLBACK: % is anon-callable again', sig;
  end loop;
end $$;
