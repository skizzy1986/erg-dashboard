---
id: WO-005
title: Vitals daily import via Google Health API
status: draft
author: coach
created: 2026-06-25
targets: [edge-function, secrets, cron]
schedule: "0 3 * * *"   # 03:00 UTC ~= 11:00 Perth, same window as vitals-import
notify: "#build"         # posts result on success/failure; webhook already live from WO-002
reversible: true
depends_on: [WO-001]    # upsert_vital RPC and vitals_user_date_unique constraint required
                        # external prereq: Google Cloud setup + one-time OAuth grant (~20 min) — see Scope
acceptance:
  - token exchange succeeds headlessly with no browser interaction at cron runtime
  - all four metrics upserted for yesterday's date on each successful cron run
  - run twice back-to-back -> row count unchanged (upsert_vital coalesce is idempotent)
  - a populated field is not nulled by a partial API response (coalesce in upsert_vital)
  - Slack posts "WO-005 OK" on a successful run
  - Slack posts "WO-005 FAIL" on token exchange failure; function returns 502
  - deno test passes for mapper.ts unit tests with fixture API responses
---

# WO-005 · Vitals daily import via Google Health API

## Goal

Replace the manual CSV pipeline (Fitbit → Google Health Connect → Google Sheets → `vitals-import`) with a direct daily call to the Google Health API (`health.googleapis.com/v4`). Eliminate the Google Sheets dependency and establish continuity past the September 2026 Fitbit Web API shutdown. The `vitals` table schema and `upsert_vital` RPC are unchanged; only the ingestion path changes.

## Scope

- **In:** new edge function `vitals-import-api`, OAuth grant script, three new Supabase secrets, cron registration, 7-day parallel-run cutover, retirement of the CSV cron.
- **Out:** UI changes (vitals already render from the `vitals` table regardless of source). No schema changes.
- **External prerequisite (Bridge, ~20 min):** Google Cloud project setup and one-time OAuth grant — must be completed before Cowork deploys the function. Full steps in §Implementation → Google Cloud Setup.

## Schema

None. The `vitals` table and `upsert_vital` RPC already exist (WO-001). The `source` column already accepts arbitrary strings; `"google_health_api"` requires no migration.

## Implementation

### Google Cloud Setup (one-time manual steps — Bridge only)

These steps happen in the Google Cloud console and Scott's browser. Cowork does not execute them.

1. Go to `console.cloud.google.com`. Create a new project (e.g. `erg-dashboard`) or select an existing one.
2. Enable the **Google Health API**: APIs & Services → Library → search "Google Health API" → Enable.
3. Configure the **OAuth consent screen**: APIs & Services → OAuth consent screen.
   - User type: **External**.
   - Publishing status: **Production**. ⚠️ Do NOT leave it on Testing — Testing tokens expire after 7 days and will break the cron silently.
   - Add two restricted scopes:
     - `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly` (covers HRV and RHR)
     - `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly` (covers sleep)
   - Weight scope: verify the exact scope string at `developers.google.com/health/scopes` before the grant; add it to the consent screen if it differs from the two above.
   - Test users: add Scott's Google account.
4. Create an **OAuth 2.0 Client ID**: APIs & Services → Credentials → Create credentials → OAuth client ID.
   - Application type: **Web application**.
   - Authorised redirect URIs: add `http://localhost:8080/callback`.
   - Download the JSON credentials file (contains `client_id` and `client_secret`).
5. Run `scripts/google-health-oauth.ts` locally (see §One-time OAuth Grant Script below).
6. When the browser opens, click through the "Google hasn't verified this app" warning — this is the personal-use exemption; no security review is required for single-user OAuth.
7. Copy the printed `refresh_token` and store it as a Supabase secret: `GOOGLE_HEALTH_REFRESH_TOKEN`. Store `client_id` as `GOOGLE_HEALTH_CLIENT_ID` and `client_secret` as `GOOGLE_HEALTH_CLIENT_SECRET`.

### One-time OAuth Grant Script (`scripts/google-health-oauth.ts`)

This file is **gitignored** (it prints secrets to stdout). It is a Deno script run once locally by Scott to obtain the long-lived refresh token.

Behaviour:
1. Reads `GOOGLE_HEALTH_CLIENT_ID` and `GOOGLE_HEALTH_CLIENT_SECRET` from environment variables.
2. Builds an authorisation URL with:
   - `response_type=code`
   - `client_id=<GOOGLE_HEALTH_CLIENT_ID>`
   - `redirect_uri=http://localhost:8080/callback`
   - `scope=<all three scopes, space-separated, URL-encoded>`
   - `access_type=offline`
   - `prompt=consent` — required to force a refresh token to be issued even if the user has previously consented
3. Prints the URL and instructs Scott to open it in a browser.
4. Starts a local HTTP server on `http://localhost:8080` waiting for the redirect callback.
5. Extracts the `code` parameter from the callback URL.
6. POSTs to `https://oauth2.googleapis.com/token` with:
   - `grant_type=authorization_code`
   - `code=<code>`
   - `redirect_uri=http://localhost:8080/callback`
   - `client_id=<GOOGLE_HEALTH_CLIENT_ID>`
   - `client_secret=<GOOGLE_HEALTH_CLIENT_SECRET>`
7. Parses the response JSON and prints the `refresh_token` to stdout.
8. Exits. The script is not needed again — Google does not rotate refresh tokens on use.

Add `scripts/` to `.gitignore`.

### New edge function: `supabase/functions/vitals-import-api/`

**Files to create:**

| File | Purpose |
|---|---|
| `index.ts` | Entry point: secret guard, token exchange, date calc, API calls, upsert, notify |
| `client.ts` | Token exchange + `dailyRollUp` fetch — isolates all HTTP to the Google APIs |
| `mapper.ts` | Maps raw API response objects → `VitalRecord` (pure function, no side effects) |
| `test.ts` | Deno test for `mapper.ts` using fixture response objects |
| `deno.json` | `{ "imports": {} }` — mirror existing `vitals-import/deno.json` |
| `README.md` | Setup summary: secrets required, how to run the OAuth script, cron registration |

**`VitalRecord` type** — imported from `../vitals-import/parser.ts` or redeclared identically:

```ts
type VitalRecord = {
  date: string;           // YYYY-MM-DD
  rhr_bpm: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  bodyweight_kg: number | null;
};
```

**`index.ts` — flow:**

1. `x-cron-secret` header guard (same pattern as `vitals-import/index.ts`): if `CRON_SECRET` is set and the header does not match, return `{ error: "unauthorized" }` with status 401.
2. Validate all required env vars are present; return 500 with a list of missing names if any are absent.
3. Call `exchangeToken()` from `client.ts`. If it throws, post `WO-005 FAIL · token exchange: <error>` to Slack and return 502.
4. Compute yesterday's date in Perth time (UTC+8): subtract 1 day from `new Date(Date.now() + 8 * 3600 * 1000)`, format as `YYYY-MM-DD`.
5. Call four parallel `fetchMetric()` functions from `client.ts`, one per data type. Each call is independent; a failure on one must not block the others. Collect individual errors.
6. Call `mapResponses()` from `mapper.ts` to produce one `VitalRecord` for yesterday. Fields with failed or empty API responses map to `null`.
7. Call `supa.rpc("upsert_vital", { p_user_id, p_date, p_rhr, p_hrv, p_sleep, p_bodyweight, p_source: "google_health_api" })`. If the RPC errors, post `WO-005 FAIL · upsert: <error>` to Slack and return 502.
8. Post Slack notification (best-effort, same helper pattern as `vitals-import/index.ts`).
9. Return 200 if all four metrics were upserted, or 207 if any metric was null (partial data).

**`client.ts` — two exports:**

`exchangeToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string>`
- POSTs to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`.
- Returns the `access_token` string from the response JSON.
- Throws with the error description if the response is not ok or if `access_token` is absent.

`fetchMetric(accessToken: string, dataType: string, date: string): Promise<unknown>`
- POSTs to `https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`.
- Request body: `{ "startDate": date, "endDate": date }` (both set to yesterday's `YYYY-MM-DD`).
- Authorization header: `Bearer <accessToken>`.
- Returns the parsed response JSON on success.
- Throws with a descriptive message on HTTP error (include status code and truncated body).

Data type strings (pass as the `dataType` argument):
- `daily-heart-rate-variability`
- `daily-resting-heart-rate`
- `sleep`
- `weight`

**`mapper.ts` — response field names:**

⚠️ The Google Health API launched May 2026. The field names below are derived from the documented schema and are illustrative. The implementer **must** verify the actual field names by inspecting a live API response (or the API reference at `developers.google.com/health`) before finalising `mapper.ts`. Do not assume these are correct — validate empirically.

Provisional mapping:
- `daily-heart-rate-variability` → `hrv_ms`: extract the RMSSD value from the response, `Math.round()` to nearest int, `null` if absent or non-numeric.
- `daily-resting-heart-rate` → `rhr_bpm`: extract the resting heart rate value, `Math.round()` to nearest int, `null` if absent.
- `sleep` → `sleep_hours`: sum the duration of all non-Awake sleep stage entries in minutes, divide by 60, round to 2 decimal places (`+(…).toFixed(2)`), `null` if no sleep data present.
- `weight` → `bodyweight_kg`: extract the body weight value in kg, `null` if absent.

`mapResponses()` signature:
```ts
function mapResponses(
  date: string,
  hrv: unknown,
  rhr: unknown,
  sleep: unknown,
  weight: unknown,
): VitalRecord
```

Returns a `VitalRecord` with `date` set and all four metric fields populated or `null`. A `null` on any field means the API returned no data for that metric that day — the `upsert_vital` coalesce logic ensures this never overwrites an existing non-null value in the database.

**`test.ts` — structure:**

Mirror `vitals-import/test.ts`. Use fixture objects (inline constants, not live API calls) representing the four API responses. Test cases must cover:
1. All four metrics present and well-formed → all four fields populated with correct values.
2. `daily-heart-rate-variability` response missing or empty → `hrv_ms` is `null`, other fields unaffected.
3. Sleep response with only Awake stage entries → `sleep_hours` is `null` or 0.
4. Weight response absent → `bodyweight_kg` is `null`.
5. All four responses absent → `VitalRecord` with all four fields `null`.

Use the same pass/fail counter + `console.log` pattern as `vitals-import/test.ts`. Exit 1 on any failure.

## Schedule

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

03:00 UTC ~= 11:00 Perth, same window as `vitals-import`. The `<CRON_SECRET>` placeholder must be replaced with the actual secret value before registering. Do not store the secret in this file.

## Notify

Posts to `#build` via `SLACK_BUILD_WEBHOOK_URL` (provisioned by WO-002). Best-effort: guarded on the env var, wrapped in try/catch — a Slack outage never fails the import.

- Success → `WO-005 OK · vitals: 1 date(s) upserted (latest YYYY-MM-DD)`
- Partial run (some metrics null, upsert succeeded) → `WO-005 OK · vitals: 1 date(s) upserted (latest YYYY-MM-DD) [hrv=null]`
- Token exchange failure → `WO-005 FAIL · token exchange: <error>`
- Health API fetch failure → `WO-005 FAIL · Health API <dataType>: <error>`
- Upsert failure → `WO-005 FAIL · upsert: <error>`

## Secrets / env

**New secrets — set in Supabase dashboard → Edge Functions → Secrets:**

| Secret | Source | Notes |
|---|---|---|
| `GOOGLE_HEALTH_CLIENT_ID` | Google Cloud credentials JSON | OAuth 2.0 client ID |
| `GOOGLE_HEALTH_CLIENT_SECRET` | Google Cloud credentials JSON | OAuth 2.0 client secret |
| `GOOGLE_HEALTH_REFRESH_TOKEN` | Output of `scripts/google-health-oauth.ts` | Long-lived; does not rotate |

**Reused secrets — already set from WO-001 / WO-002:**

| Secret | Purpose |
|---|---|
| `VITALS_USER_ID` | Supabase user UUID — rows written with this so RLS shows them to Scott |
| `CRON_SECRET` | Shared secret for the `x-cron-secret` header guard |
| `SUPABASE_URL` | Auto-injected by Supabase Edge Function runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — bypasses RLS; required to write via `upsert_vital` |
| `SLACK_BUILD_WEBHOOK_URL` | Incoming webhook for `#build` notifications |

> Service role bypasses RLS, so `auth.uid()` is null in this function. The function **must set `user_id` explicitly** to `VITALS_USER_ID` in every `upsert_vital` call, or rows will be hidden from the app under RLS.

## Cutover strategy

Run both `vitals-import` (CSV path) and `vitals-import-api` (API path) in parallel for 7 consecutive days after `vitals-import-api` is deployed. Both crons run at 03:00 UTC. During this period the `source` column distinguishes rows: `"health_export"` vs `"google_health_api"`. The `upsert_vital` coalesce logic means whichever runs second wins only for fields that were null from the first run.

Validation query (run each morning during the parallel window):
```sql
select date, rhr_bpm, hrv_ms, sleep_hours, bodyweight_kg, source
from vitals
where date >= current_date - 7
order by date desc;
```

After 7 days of matching values across both sources, retire the CSV cron:
```sql
select cron.unschedule('vitals-daily-import');
```

Keep the `vitals-import` function deployed but idle as a rollback option. Do not delete it until the API path has been stable for 30 days.

## Acceptance

1. Token exchange succeeds headlessly: invoke the function with a valid `x-cron-secret` header and no browser — the function must proceed past the token exchange step without error.
2. All four metrics are upserted for yesterday's date on each cron run (verify with `select * from vitals where date = current_date - 1`).
3. Idempotent: invoke the function twice in sequence → row count for yesterday is unchanged, zero duplicate rows.
4. A populated field is not nulled by a partial API response: pre-seed a row with `hrv_ms=30`, simulate an API run where the HRV response is empty → `hrv_ms` remains 30 after the run.
5. Slack posts a `WO-005 OK` line in `#build` after a successful run.
6. Slack posts a `WO-005 FAIL · token exchange: <error>` line in `#build` when the token exchange fails (simulate by passing an invalid `GOOGLE_HEALTH_CLIENT_SECRET`); function returns HTTP 502.
7. `deno test test.ts` passes for `mapper.ts` unit tests using all 5 fixture test cases.

## Rollback

```sql
-- Unschedule the API cron:
select cron.unschedule('vitals-api-import');

-- Re-enable the CSV cron if it was already retired:
select cron.schedule('vitals-daily-import', '0 3 * * *',
  $$ select net.http_post(
    url     := 'https://swdrueaserjzhuxnzmeu.supabase.co/functions/v1/vitals-import',
    headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb
  ) $$
);

-- Optionally remove API-sourced rows (Bridge confirms before executing):
-- delete from vitals where source = 'google_health_api';
```

The `vitals-import-api` edge function remains deployed; it simply has no active cron. Revoke the three `GOOGLE_HEALTH_*` secrets in Supabase to prevent any accidental invocation.

## Authority notes

- All Cowork steps are additive and reversible: a new edge function, three new secrets, one new cron entry. No schema changes, no destructive operations.
- The `delete from vitals where source = 'google_health_api'` rollback line is flagged as a destructive op and is commented out above — the Bridge must execute it explicitly if a clean rollback is required. Cowork does not run it automatically.
- The Google Cloud setup steps (§Google Cloud Setup) are **Bridge-only**: creating a GCP project, enabling APIs, and performing the OAuth grant are account/integration actions performed by Scott in a browser. Cowork does not execute them.
- `scripts/google-health-oauth.ts` is a one-time tool that prints a secret to stdout. It must be gitignored before committing. If it is accidentally committed, rotate `GOOGLE_HEALTH_REFRESH_TOKEN` immediately by performing the OAuth grant again and revoking the old token at `myaccount.google.com/permissions`.
- Retiring the CSV cron (`cron.unschedule('vitals-daily-import')`) requires the Bridge's explicit instruction after the 7-day parallel validation window. Cowork does not do this automatically.
- `prompt=consent` in the OAuth grant script is load-bearing — without it, Google may not issue a new refresh token if the user has previously consented to these scopes.
