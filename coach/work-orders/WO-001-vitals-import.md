---
id: WO-001
title: Vitals daily import from Health Data Export sheet
status: ready
author: coach
created: 2026-06-22
targets: [supabase-migration, edge-function, cron]
schedule: "0 3 * * *"   # 03:00 UTC ~= 11:00 Perth, after the morning health sync
notify: "#build"         # posts result on success/failure; activates once WO-002 sets the webhook
reversible: true
depends_on: []           # external prereq: sheet published to web as CSV (Bridge) — see Scope. Notify uses WO-002's webhook (best-effort; skipped if unset)
acceptance:
  - run twice back-to-back -> row count unchanged, zero duplicates
  - a populated field is not nulled by a later partial sheet row (coalesce)
  - readiness / soreness / notes on an existing row survive a run
  - a new sheet date appears in vitals the next day with no manual action
  - on success a "WO-001 OK" line lands in #build; on a forced error a "WO-001 FAIL" line lands
---

# WO-001 · Vitals daily import

## Goal
Keep `public.vitals` current automatically — including during FIFO swings when Scott is not prompting Coach — by pulling the auto-updated *Health Data Export* sheet daily and upserting recovery metrics (HRV / RHR / sleep / bodyweight). Full mapping rationale and caveats: `VITALS_IMPORT.md`.

## Scope
- **In:** unique constraint, scheduled edge function, cron registration.
- **Out:** UI (vitals already render).
- **External prerequisite (Bridge, ~1 min):** publish the sheet to web as CSV (File -> Share -> Publish to web -> CSV) -> stable URL. If sections are separate tabs, publish each tab's CSV by `gid`.

## Schema
```sql
alter table public.vitals
  add constraint vitals_user_date_unique unique (user_id, date);
```
Enables idempotent upsert. Additive, no data loss.

## Implementation
Edge function (Deno): fetch CSV -> segment sections by header signature -> build one record per date -> upsert.

Mapping (full detail in `VITALS_IMPORT.md` §2):
- `hrv_ms` <- `Heart rate variability avg (ms)`, round int
- `rhr_bpm` <- `Resting heart rate avg (bpm)`, round int, null if blank
- `sleep_hours` <- (`Light` + `Deep` + `REM`) / 60, 2 dp, Awake excluded; if a date has two sleep rows take the complete one
- `bodyweight_kg` <- Weight section by date
- **never set** `readiness` / `soreness` / `notes`

```ts
import { createClient } from "jsr:@supabase/supabase-js";

Deno.serve(async () => {
  const csv = await fetch(Deno.env.get("SHEET_CSV_URL")!).then(r => r.text());
  const s = segmentByHeader(csv);            // split by known header signatures
  const byDate: Record<string, any> = {};

  for (const r of s.vitals) {
    const d = isoDate(r["Date"]); byDate[d] ??= { date: d };
    byDate[d].hrv_ms  = roundOrNull(r["Heart rate variability avg (ms)"]);
    byDate[d].rhr_bpm = roundOrNull(r["Resting heart rate avg (bpm)"]);
  }
  for (const r of s.sleep) {
    const d = isoDate(r["Date"]); byDate[d] ??= { date: d };
    const mins = num(r["Light Sleep (min)"]) + num(r["Deep Sleep (min)"]) + num(r["REM Sleep (min)"]);
    byDate[d].sleep_hours = Math.max(byDate[d].sleep_hours ?? 0, +(mins / 60).toFixed(2)) || null;
  }
  for (const r of s.weight) {
    const d = isoDate(r["Date/Time"] ?? r["Date"]); byDate[d] ??= { date: d };
    byDate[d].bodyweight_kg = numOrNull(r["Weight (kg)"]);
  }

  const userId = Deno.env.get("VITALS_USER_ID")!;
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    let added = 0;
    for (const v of Object.values(byDate)) {
      await upsertVital(supa, { ...v, user_id: userId, source: "health_export" });  // SQL below
      added++;
    }
    const latest = Object.keys(byDate).sort().at(-1);
    await notify(`WO-001 OK · vitals: ${added} date(s) upserted (latest ${latest})`);
    return new Response(JSON.stringify({ upserted: added }), { status: 200 });
  } catch (e) {
    await notify(`WO-001 FAIL · vitals import: ${String(e).slice(0, 200)}`);
    return new Response(String(e), { status: 500 });
  }
});

// best-effort Slack post — never throws, never blocks the job
async function notify(text: string) {
  const url = Deno.env.get("SLACK_BUILD_WEBHOOK_URL");
  if (!url) return;                                   // WO-002 not yet applied -> silently skip
  try { await fetch(url, { method: "POST", body: JSON.stringify({ text }) }); } catch (_) { /* swallow */ }
}
```

Upsert (coalesce = never null-wipe an existing value, never touch subjective fields):
```sql
insert into vitals (user_id, date, rhr_bpm, hrv_ms, sleep_hours, bodyweight_kg, source)
values ($1, $2, $3, $4, $5, $6, 'health_export')
on conflict (user_id, date) do update set
  rhr_bpm       = coalesce(excluded.rhr_bpm,       vitals.rhr_bpm),
  hrv_ms        = coalesce(excluded.hrv_ms,        vitals.hrv_ms),
  sleep_hours   = coalesce(excluded.sleep_hours,   vitals.sleep_hours),
  bodyweight_kg = coalesce(excluded.bodyweight_kg, vitals.bodyweight_kg);
```

## Schedule
```sql
select cron.schedule('vitals-daily-import', '0 3 * * *',
  $$ select net.http_post(url := '<edge-function-url>', headers := '{...}'::jsonb) $$);
```
03:00 UTC ~= 11:00 Perth, after the ~10:00 Perth sync. Adjust if the sync time drifts.

## Notify
Posts to `#build` via the shared webhook on success and failure (see the function tail). Best-effort: guarded on `SLACK_BUILD_WEBHOOK_URL`, wrapped in try/catch — a Slack outage never fails the import. Activates automatically once WO-002 sets the secret; until then the calls no-op.
- success → `WO-001 OK · vitals: N date(s) upserted (latest <date>)`
- failure → `WO-001 FAIL · vitals import: <error>`

## Secrets / env
- `SHEET_CSV_URL` (or one per tab if multi-tab)
- `VITALS_USER_ID = f815f57e-3c6d-49ba-9dea-d5a5528ce775`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_BUILD_WEBHOOK_URL` (from WO-002; optional — notify no-ops if unset)

> Service role bypasses RLS, so `auth.uid()` is null here — the function **must set `user_id` explicitly** to `VITALS_USER_ID`, or the rows are hidden from the app under RLS.

## Acceptance
1. Invoke twice back-to-back -> row count unchanged, zero duplicates (idempotency + unique constraint).
2. A populated field is not nulled by a later partial sheet row (coalesce).
3. `readiness` / `soreness` / `notes` on an existing row survive a run.
4. Next day a fresh sheet date appears in `vitals` with no manual action.

## Rollback
```sql
select cron.unschedule('vitals-daily-import');
-- delete the edge function
alter table public.vitals drop constraint vitals_user_date_unique;
```
Imported rows stay valid (`source='health_export'`); remove with `delete from vitals where source='health_export';` if a clean slate is wanted.

## Authority notes
All steps reversible; the unique constraint is additive (no data loss). No destructive ops -> no separate Bridge handover required beyond committing this WO.
