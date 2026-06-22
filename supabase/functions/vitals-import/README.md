# vitals-import

Daily ingestion of the **Health Data Export** Google Sheet into `public.vitals`.
Implements VITALS_IMPORT.md Mode 2. Built & gated 2026-06-22.

## How it works
- `parser.ts` — pure, dependency-free. Segments the stacked sheet CSV by header
  signature (Activity/Weight/Nutrition/Sleep/Vitals are all in one tab) and maps:
  - `hrv_ms`  ← Vitals · `Heart rate variability avg (ms)` (rounded; Concept2 rows blank → skipped)
  - `rhr_bpm` ← Vitals · `Resting heart rate avg (bpm)` (rounded)
  - `sleep_hours` ← Sleep · (Light+Deep+REM)/60, **Awake excluded**, double-row → max total
  - `bodyweight_kg` ← Weight · `Weight (kg)` (keyed on `Date/Time`, latest that day)
  - Unit-tested 15/15 against the real layout.
- `index.ts` — fetches `SHEET_CSV_URL`, runs the parser, upserts each date via the
  `public.upsert_vital` RPC (coalesce: never null-wipes; never touches
  readiness/soreness/notes). Deployed with `verify_jwt=false`, guarded by `x-cron-secret`.

## Deploy
```
supabase functions deploy vitals-import --no-verify-jwt
```
(Or it's already deployed via the Supabase MCP.)

## Secrets (Edit → Edge Functions → Secrets)
- `SHEET_CSV_URL` — publish-to-web CSV URL of the Health Data Export sheet (one tab)
- `VITALS_USER_ID` — `f815f57e-3c6d-49ba-9dea-d5a5528ce775`
- `CRON_SECRET` — any random string (caller must send it as `x-cron-secret`)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — auto-injected, do not set

## Schedule (after secrets are set)
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('vitals-daily-import', '0 3 * * *', $$
  select net.http_post(
    url     := 'https://swdrueaserjzhuxnzmeu.supabase.co/functions/v1/vitals-import',
    headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb
  );
$$);
```

## Smoke gate (§5.6)
1. Invoke twice back-to-back → row count unchanged (idempotent).
2. A populated field isn't nulled by a later partial row (coalesce).
3. `readiness`/`soreness`/`notes` survive a run (subjective untouched).
4. Tomorrow: a new sheet date appears in `vitals` with no one touching it.

The DB-layer gates (1–3) are already verified live via `upsert_vital`.
