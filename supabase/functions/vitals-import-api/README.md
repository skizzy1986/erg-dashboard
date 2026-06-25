# vitals-import-api (WO-005)

Daily ingestion of vitals directly from the **Google Health API**
(`health.googleapis.com/v4`) into `public.vitals`.

## Purpose

Replaces the manual CSV path (`vitals-import`: Fitbit → Google Health Connect →
Google Sheets → edge function). Eliminates the Google Sheets dependency and
establishes continuity past the **September 2026 Fitbit Web API shutdown**.

The `vitals` table schema and the `upsert_vital` coalesce RPC are unchanged — only
the ingestion path changes. Rows from this function carry `source = "google_health_api"`.

## How it works

On each run the function:

1. Guards on the `x-cron-secret` header (vs `CRON_SECRET`).
2. Exchanges `GOOGLE_HEALTH_REFRESH_TOKEN` for a short-lived access token (no browser).
3. Computes yesterday's date in Perth time (UTC+8).
4. Fetches four `dataPoints:dailyRollUp` metrics in parallel — HRV, RHR, sleep, weight.
   A failure on any one metric maps that field to `null`; the others still upsert.
5. Maps responses to a `VitalRecord` (`mapper.ts`) and calls `upsert_vital`.
6. Posts a best-effort `#build` Slack notification.

Returns `200` when all four metrics are present, `207` on partial data.

## Required secrets

Set in Supabase dashboard → Edge Functions → Secrets.

**New (WO-005):**

| Secret | Source |
|---|---|
| `GOOGLE_HEALTH_CLIENT_ID` | Google Cloud OAuth 2.0 credentials JSON |
| `GOOGLE_HEALTH_CLIENT_SECRET` | Google Cloud OAuth 2.0 credentials JSON |
| `GOOGLE_HEALTH_REFRESH_TOKEN` | Output of `scripts/google-health-oauth.ts` (see below) |

**Reused (WO-001 / WO-002):**

| Secret | Purpose |
|---|---|
| `VITALS_USER_ID` | Owner uuid — rows written with this so RLS shows them to Scott |
| `CRON_SECRET` | Shared secret for the `x-cron-secret` header guard |
| `SUPABASE_URL` | Auto-injected by the Edge Function runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — bypasses RLS; required to write via `upsert_vital` |
| `SLACK_BUILD_WEBHOOK_URL` | `#build` webhook for best-effort notifications |

> The service role bypasses RLS, so `auth.uid()` is null in this function. It sets
> `user_id` explicitly to `VITALS_USER_ID` on every `upsert_vital` call, or rows
> would be hidden from the app under RLS.

## Getting the refresh token

One-time local grant (Bridge/Scott, ~20 min). Full Google Cloud setup is in
`coach/work-orders/WO-005-google-health-api.md` §Google Cloud Setup. Briefly:

1. Create a GCP project, enable the Google Health API, configure the OAuth consent
   screen (User type **External**, publishing status **Production** — Testing tokens
   expire after 7 days), add the three readonly scopes, and create a **Web
   application** OAuth client with redirect URI `http://localhost:8080/callback`.
2. Run the gitignored grant script locally:

   ```bash
   export GOOGLE_HEALTH_CLIENT_ID=<client id>
   export GOOGLE_HEALTH_CLIENT_SECRET=<client secret>
   deno run --allow-env --allow-net scripts/google-health-oauth.ts
   ```

3. Open the printed URL, consent (click through the "Google hasn't verified this
   app" warning — personal-use exemption), and copy the printed `refresh_token`.
4. Store it as the `GOOGLE_HEALTH_REFRESH_TOKEN` Supabase secret (and store the
   client id/secret as the two other `GOOGLE_HEALTH_*` secrets).

`scripts/` is gitignored — the script prints a secret to stdout and must never be committed.

## Cron registration

03:00 UTC ~= 11:00 Perth, same window as `vitals-import`. Replace the `<CRON_SECRET>`
placeholder with the real value before registering; do not commit the secret.

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

Run both `vitals-import` (CSV) and `vitals-import-api` in parallel for 7 days, then
retire the CSV cron with `select cron.unschedule('vitals-daily-import');` (Bridge only).

## ⚠️ Unverified response field names

`mapper.ts` field paths are **PROVISIONAL**. The Google Health API launched May 2026
and the exact `dataPoints:dailyRollUp` response shape is not yet empirically confirmed
in this repo. Every extractor (`extractHrv`, `extractRhr`, `extractSleepHours`,
`extractWeightKg`) documents the field path it assumes. **These names MUST be validated
against a live API response (or developers.google.com/health) before production use.**
The extractors fail safe — a wrong/missing shape yields `null`, not an exception, so a
mismatch surfaces as persistent null fields (visible in the `[..=null]` Slack suffix)
rather than a crash.
