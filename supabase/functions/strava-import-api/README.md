# strava-import-api (issue #54)

Import Strava activities into `public.sessions`. This directory holds the shared
modules used by the three deployed Strava edge functions:

| Module | Role |
|---|---|
| `client.ts` | All Strava HTTP (OAuth token endpoints, list/detail reads). No Supabase. |
| `mapper.ts` | Pure mapping of Strava activities → `StravaSessionRecord`. Deno-testable, no IO. |
| `sync.ts` | Shared sync runner: token read/refresh, paging, rate-limit stop, upsert. |
| `test.ts` | Unit tests for `mapper.ts` (run with `deno run --allow-env test.ts`). |

Deployed functions that import these modules:

| Function | Trigger | JWT | Notes |
|---|---|---|---|
| `strava-oauth-callback` | Browser OAuth redirect | off (`verify_jwt=false`) | Exchanges `?code` → tokens, stores via `upsert_integration_token`. Never renders tokens. |
| `strava-import` | Cron | off (`verify_jwt=false`) | `x-cron-secret` guard. 365-day backfill on first run, incremental after. Slack posts. |
| `strava-sync` | On-demand (UI button) | **on** (do NOT `--no-verify-jwt`) | CORS preamble. Incremental only. No Slack. |

## Data model

`supabase/migrations/006_strava_integration.sql` adds:

- `integration_tokens` — OAuth tokens per `(user_id, provider)`. RLS: owner SELECT
  only; no client write policies (service-role writes only).
- `strava_activities` — dedup ledger linking a Strava activity to its `sessions` row.
- `upsert_integration_token(...)` — store/rotate a token (SECURITY DEFINER).
- `upsert_strava_session(...) RETURNS uuid` — idempotently project an activity into
  `sessions` (COALESCE, never null-wipes; preserves `srpe`/`exercises`/`prs`/`status`
  and a user-set `label`) and record the link.

## Sport mapping

`sport_type ?? type`:

| Strava | session.type |
|---|---|
| `Rowing` | `erg` |
| `Ride`, `VirtualRide` | `cycling` |
| `WeightTraining`, `Workout` | `Strength` |
| anything else (Run, Walk, Hike, Swim, …) | skipped (no detail fetch) |

## Required secrets

Set in Supabase dashboard → Edge Functions → Secrets.

| Secret | Used by | Source |
|---|---|---|
| `STRAVA_CLIENT_ID` | all | Strava API application (https://www.strava.com/settings/api) |
| `STRAVA_CLIENT_SECRET` | all | Strava API application |
| `STRAVA_REDIRECT_URI` | oauth-callback | The deployed `strava-oauth-callback` function URL |
| `STRAVA_USER_ID` | all | Owner uuid — rows written with this so RLS shows them to Scott |
| `CRON_SECRET` | strava-import | Shared secret for the `x-cron-secret` header guard |
| `SUPABASE_URL` | all | Auto-injected by the Edge Function runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | all | Service role — bypasses RLS; required to write |
| `SLACK_BUILD_WEBHOOK_URL` | oauth-callback, import | `#build` webhook (best-effort) |

Frontend (`.env` for Vite):

| Var | Purpose |
|---|---|
| `VITE_STRAVA_CLIENT_ID` | Builds the authorize URL in `SettingsView` |
| `VITE_STRAVA_REDIRECT_URI` | Must equal `STRAVA_REDIRECT_URI` (the callback function URL) |

> The service role bypasses RLS, so `auth.uid()` is null in these functions. They
> set `user_id` explicitly to `STRAVA_USER_ID` on every write, or rows would be
> hidden from the app under RLS. OAuth tokens are never exposed to the client —
> `useStravaConnection` selects only `athlete_id, expires_at, scope`.

## Strava application setup

1. Create an API application at https://www.strava.com/settings/api.
2. Set the **Authorization Callback Domain** to the host of the deployed
   `strava-oauth-callback` function.
3. Copy the Client ID and Client Secret into the secrets above.
4. The OAuth scope requested is `activity:read_all`.

## Connecting

1. Open the dashboard **Settings** tab → **Connect Strava**. This is a full-page
   navigation to `https://www.strava.com/oauth/authorize` (not `functions.invoke`).
2. Authorize on Strava. Strava redirects to `strava-oauth-callback`, which stores
   the token and shows "Strava connected — you can close this tab."
3. Back in Settings, the card shows the connected status and a **Sync now** button
   (calls `strava-sync`). The cron `strava-import` also runs on schedule.

## Cron registration

```sql
select cron.schedule(
  'strava-import',
  '15 3 * * *',
  $$
    select net.http_post(
      url     := 'https://<project>.supabase.co/functions/v1/strava-import',
      headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);
```

To force a one-time 365-day backfill, POST with body `{"backfill": true}`.

## Tests

```bash
cd supabase/functions/strava-import-api
deno run --allow-env test.ts
```
