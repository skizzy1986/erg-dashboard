# WO-005 Session Handoff — Google Health API vitals integration

## What we're building

Replace the manual vitals pipeline (Fitbit → Google Health Connect → Google Sheets CSV → `vitals-import` edge function) with a direct daily call to the **Google Health API** (`health.googleapis.com/v4`). The Fitbit Web API underlying the current path shuts down **September 2026**. The spec is written and approved — this session implements it.

---

## Confirmed research (do not re-research)

| Question | Answer |
|---|---|
| Fitbit Web API | Shuts down September 2026. Do not build on it. |
| Google Fit REST API | Dead since June 2025. |
| Google Health Connect | Android-only, no cloud REST API. Wrong layer. |
| **Google Health API** | Launched May 2026. Correct target. All 4 metrics supported. |
| OAuth | Standard Google OAuth 2.0. Refresh tokens are long-lived, do NOT rotate on use. |
| Personal-use review | Not required — click through "unverified app" warning once. |
| Consent screen mode | Must be **Production** (not Testing — Testing tokens expire after 7 days). |
| Data types | `daily-heart-rate-variability`, `daily-resting-heart-rate`, `sleep`, `weight` |
| API method | `POST .../dataPoints:dailyRollUp` with `{ startDate, endDate }` body |
| Response field names | **Unverified** — API is new (May 2026). Must be checked against live response before coding `mapper.ts`. |

---

## Spec location

**`coach/work-orders/WO-005-google-health-api.md`** — read this first. It is the authoritative implementation spec. Status: `draft` (approved, ready to build).

---

## What to build

### 1. `scripts/google-health-oauth.ts` (gitignored, one-time local tool)
Deno script that performs Authorization Code flow and prints the refresh token to stdout. Scott runs it once locally, clicks through the "unverified app" warning, and stores the output in Supabase secrets.

Key requirements:
- Reads `GOOGLE_HEALTH_CLIENT_ID` and `GOOGLE_HEALTH_CLIENT_SECRET` from env
- Auth URL: `https://accounts.google.com/o/oauth2/v2/auth` with `access_type=offline&prompt=consent`
- Local callback server on `http://localhost:8080/callback`
- Token exchange: `POST https://oauth2.googleapis.com/token`
- Prints `refresh_token` to stdout

Add `scripts/` to `.gitignore`.

### 2. `supabase/functions/vitals-import-api/` (new edge function)

**Files:** `index.ts`, `client.ts`, `mapper.ts`, `test.ts`, `deno.json`, `README.md`

**`index.ts` flow:**
1. `x-cron-secret` header guard → 401 if mismatch
2. Validate env vars → 500 with list of missing names
3. `exchangeToken()` → 502 + Slack FAIL on error
4. Compute yesterday in Perth time: `new Date(Date.now() + 8 * 3600 * 1000)` minus 1 day → `YYYY-MM-DD`
5. Four parallel `fetchMetric()` calls (independent — failure on one must not block others)
6. `mapResponses()` → `VitalRecord`
7. `supa.rpc("upsert_vital", { p_user_id, p_date, p_rhr, p_hrv, p_sleep, p_bodyweight, p_source: "google_health_api" })`
8. Slack notify (best-effort) → 200 or 207 if any metric was null

**`client.ts` exports:**
- `exchangeToken(clientId, clientSecret, refreshToken): Promise<string>` — POSTs to `https://oauth2.googleapis.com/token`, returns `access_token`
- `fetchMetric(accessToken, dataType, date): Promise<unknown>` — POSTs to `https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`

**`mapper.ts`:**
- `mapResponses(date, hrv, rhr, sleep, weight): VitalRecord`
- ⚠️ Response field names are NOT confirmed — implementer must check live API docs/response before finalising. Provisional: RMSSD for HRV, beatsPerMinute for RHR, stage minutes for sleep (exclude Awake), kilograms for weight.
- All fields nullable; null means no data that day (upsert_vital coalesce handles it safely)

**`test.ts` — 5 test cases using inline fixture objects:**
1. All four metrics present → all fields populated correctly
2. HRV response empty → `hrv_ms` null, others unaffected
3. Sleep with only Awake stages → `sleep_hours` null
4. Weight absent → `bodyweight_kg` null
5. All absent → all fields null

---

## Existing patterns to copy

| Pattern | Source file |
|---|---|
| Edge function entry point | `supabase/functions/vitals-import/index.ts` |
| `VitalRecord` type | `supabase/functions/vitals-import/parser.ts:6-12` |
| Slack notify helper | `supabase/functions/vitals-import/index.ts:85-98` |
| `upsert_vital` RPC call | `supabase/functions/vitals-import/index.ts:63-74` |
| Deno test pattern | `supabase/functions/vitals-import/test.ts` |
| `deno.json` | `supabase/functions/vitals-import/deno.json` |

---

## New secrets (to be set in Supabase after OAuth grant)

| Secret | Source |
|---|---|
| `GOOGLE_HEALTH_CLIENT_ID` | Google Cloud credentials JSON |
| `GOOGLE_HEALTH_CLIENT_SECRET` | Google Cloud credentials JSON |
| `GOOGLE_HEALTH_REFRESH_TOKEN` | Output of `scripts/google-health-oauth.ts` |

Reused (already set): `VITALS_USER_ID`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SLACK_BUILD_WEBHOOK_URL`

---

## Cron to register (after secrets are set)

```sql
select cron.schedule(
  'vitals-api-import', '0 3 * * *',
  $$ select net.http_post(
    url     := 'https://swdrueaserjzhuxnzmeu.supabase.co/functions/v1/vitals-import-api',
    headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb
  ) $$
);
```

---

## Cutover

Run both `vitals-import` (CSV) and `vitals-import-api` (API) in parallel for 7 days. After 7 matching days, retire the CSV cron:
```sql
select cron.unschedule('vitals-daily-import');
```
Keep `vitals-import` deployed as rollback for 30 days. Source column distinguishes rows: `"health_export"` vs `"google_health_api"`.

---

## Acceptance criteria

1. Token exchange succeeds headlessly (no browser at cron runtime)
2. All 4 metrics upserted for yesterday's date on each run
3. Idempotent: run twice → row count unchanged
4. Coalesce: a populated field not nulled by partial API response
5. Slack posts `WO-005 OK` on success
6. Slack posts `WO-005 FAIL · token exchange: <error>` + HTTP 502 on token failure
7. `deno test test.ts` passes all 5 fixture cases

---

## Branch

`claude/health-connect-fitbit-supabase-5sunbb` — all changes go here.

## First action in new session

Read `coach/work-orders/WO-005-google-health-api.md` in full, then implement using the pipeline:
```
/feature implement WO-005 Google Health API vitals integration
```
or directly: spawn `backend-builder` with the spec above, then `test-verifier`, then `code-reviewer`.
