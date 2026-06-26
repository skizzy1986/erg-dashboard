# Cowork Deployment Handover — WO-005 Google Health API

## Status

Code is **fully built, reviewed, and pushed** on branch `claude/health-connect-fitbit-supabase-5sunbb`. This document covers the two remaining steps: Scott's one-time Google Cloud setup, then Cowork deploying the edge function.

---

## What was built (do not rebuild)

| File | Purpose |
|---|---|
| `supabase/functions/vitals-import-api/index.ts` | Edge function entry point |
| `supabase/functions/vitals-import-api/client.ts` | Token exchange + `dailyRollUp` API calls |
| `supabase/functions/vitals-import-api/mapper.ts` | Maps API responses → `VitalRecord` (⚠️ field names provisional) |
| `supabase/functions/vitals-import-api/test.ts` | 20 unit tests, all pass |
| `supabase/functions/vitals-import-api/README.md` | Full setup guide |
| `coach/work-orders/WO-005-google-health-api.md` | Authoritative spec |
| `scripts/google-health-oauth.ts` | One-time OAuth grant script (gitignored) |

Code review: APPROVE (3 findings addressed). Branch is ready to deploy.

---

## Step 1 — Scott does this first (Bridge, ~20 min)

These steps require a browser. Cowork cannot do them.

### Google Cloud setup

1. `console.cloud.google.com` → create or select a project (e.g. `erg-dashboard`)
2. APIs & Services → Library → search **Google Health API** → Enable
3. APIs & Services → OAuth consent screen:
   - User type: **External**
   - Publishing status: **Production** ⚠️ NOT Testing (Testing tokens expire after 7 days — breaks cron)
   - Add scopes:
     - `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly` (HRV + RHR)
     - `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly` (sleep)
   - Verify weight scope at `developers.google.com/health/scopes` — add if separate from the two above
4. Credentials → Create credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorised redirect URI: `http://localhost:8080/callback`
   - Download the credentials JSON → note `client_id` and `client_secret`

### Run the OAuth grant script (one-time, local)

```bash
export GOOGLE_HEALTH_CLIENT_ID=<client-id>
export GOOGLE_HEALTH_CLIENT_SECRET=<client-secret>
deno run --allow-env --allow-net scripts/google-health-oauth.ts
```

- Open the printed URL in a browser
- Sign in as the Google account linked to Fitbit / Google Health
- Click through **"Google hasn't verified this app"** — personal-use exemption, expected
- Copy the printed `refresh_token`

### Store secrets in Supabase

Supabase dashboard → Edge Functions → Secrets → Add:

| Secret | Value |
|---|---|
| `GOOGLE_HEALTH_CLIENT_ID` | from credentials JSON |
| `GOOGLE_HEALTH_CLIENT_SECRET` | from credentials JSON |
| `GOOGLE_HEALTH_REFRESH_TOKEN` | printed by the grant script |

> Already set (WO-001/WO-002, do not touch): `VITALS_USER_ID`, `CRON_SECRET`, `SLACK_BUILD_WEBHOOK_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Tell Cowork "secrets are set, proceed" when done.**

---

## Step 2 — Cowork deploys (opening prompt below)

Paste this as your opening message in the Cowork session:

---

> We're deploying WO-005 — the Google Health API vitals edge function. Code is on branch `claude/health-connect-fitbit-supabase-5sunbb`, fully built and code-reviewed. Scott has completed the Google Cloud setup and stored `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`, and `GOOGLE_HEALTH_REFRESH_TOKEN` in Supabase secrets.
>
> Read the spec first: `coach/work-orders/WO-005-google-health-api.md`
> And the README: `supabase/functions/vitals-import-api/README.md`
>
> Deploy steps:
> 1. Deploy the edge function via Supabase MCP with `--no-verify-jwt`
> 2. Register the cron (SQL below) — replace `<CRON_SECRET>` with the real value
> 3. Invoke the function manually once (via Supabase dashboard or MCP)
> 4. Verify a row appeared: `select * from vitals where source = 'google_health_api' order by date desc limit 1`
> 5. If any metric column is null, check `mapper.ts` — field names are provisional and may need correcting against the live API response
> 6. Update `coach/work-orders/WO-005-google-health-api.md` status to `in_progress`

---

### Cron SQL (Cowork registers this via Supabase MCP)

```sql
select cron.schedule(
  'vitals-api-import',
  '0 3 * * *',
  $$
    select net.http_post(
      url     := 'https://swdrueaserjzhuxnzmeu.supabase.co/functions/v1/vitals-import-api',
      headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb
    );
  $$
);
```

Replace `<CRON_SECRET>` with the actual secret value. Do not commit the substituted value.

---

## Step 3 — 7-day parallel validation (after deploy)

Both `vitals-import` (CSV) and `vitals-import-api` (Google Health API) run in parallel. Check each morning:

```sql
select date, rhr_bpm, hrv_ms, sleep_hours, bodyweight_kg, source
from vitals
where date >= current_date - 7
order by date desc;
```

Values should match across both sources (minor float rounding acceptable). After 7 matching days, retire the CSV cron:

```sql
select cron.unschedule('vitals-daily-import');
```

Keep `vitals-import` deployed (not deleted) for 30 days as rollback.

---

## Key facts (confirmed, do not re-research)

| Fact | Detail |
|---|---|
| Google Health API base | `health.googleapis.com/v4`, launched May 2026 |
| Refresh tokens | Long-lived, do NOT rotate on use (unlike Fitbit) |
| Production consent mode | Required — Testing tokens expire after 7 days |
| Personal-use exemption | No security review; click through warning once |
| Fitbit Web API shutdown | September 2026 — this function replaces it |
| mapper.ts field names | **Provisional** — validate after first live run |
| Null fields after run | Means field name mismatch, not a crash (fail-safe design) |
| `upsert_vital` coalesce | Null API values never overwrite existing DB values |
| Source tag | `"google_health_api"` (CSV uses `"health_export"`) |
