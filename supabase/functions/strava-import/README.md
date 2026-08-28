# strava-import (#54)

Imports Strava activities into `public.sessions`, and — more importantly —
**adopts** the sessions that are already there under a different `source`.

Four functions ship together:

| Function | JWT | Purpose |
|---|---|---|
| `strava-connect` | **verified** (default) | Mints the OAuth `state`, returns the authorize URL; also disconnects |
| `strava-oauth-callback` | **`--no-verify-jwt`** | Strava's redirect target. Always 302, never a body |
| `strava-import` | **`--no-verify-jwt`** + `x-cron-secret` | The scheduled run |
| `strava-sync` | **verified** (default) | The Sync button. Same `runImport` as the cron |

The pure logic lives in `mapper.ts` (what an activity becomes), `state.ts`
(cursors and budgets), `tokens.ts` (refresh-token rotation) and `client.ts`
(all Strava HTTP). `importer.ts` is the only orchestration, shared by both entry
points, so a manual sync and a scheduled one cannot drift apart.

## Why adoption is the whole feature

Around twenty sessions in `public.sessions` are the **same training** as a
Strava activity, filed by hand or by Coach under `source` = `portal`, `coach`,
`coach_plan`, `claude_csv` or `concept2`. Importing those again would **double
ten weeks of CTL, ATL and TSB** — the app's central numbers — with no error
anywhere to notice it.

For every eligible activity not already linked, `chooseAdoptionCandidate` looks
for an existing unlinked session in the same type family, within ±1 day, whose
`distance_m` agrees:

- **exactly one** match → `adopt_strava_session` (links the existing row, writes
  only `strava_activity_id`, device `avg_watts` and `avg_hr` — never
  `coach_note`, `duration`, `label`, `date` or `source`)
- **zero** matches → `upsert_strava_session` (a new row)
- **two or more** → **nothing at all.** The activity id is appended to
  `strava_sync_state.ambiguous_activity_ids`, `skipped_total` increments, and
  Sentry gets one issue for the run. A wrong adoption silently rewrites power
  onto a session that was not that session; a visible unresolved item does not.

Tolerances come from real pairs: `±max(5 m, 0.5%)` (8/6 `13618` vs `13620`;
7/3 `10187` vs `10192.2`) and a ±1-day window (four rows are filed a day off the
activity's local date).

## Eligibility

All four must hold. `sport_type` is an **allow-list**, never a deny-list — the
account also contains `Ride`, `Walk`, `Workout` and `WeightTraining`.

| Rule | Value |
|---|---|
| `sport_type` | `Rowing` → `type='erg'`, `VirtualRide` → `type='cycling'` |
| local date | `>= STRAVA_BACKFILL_FROM` (`2026-06-14`) |
| `moving_time` | `>= 120 s` |
| `distance` | `>= 200 m` |

The floors keep the 240 s / 1080 m `CP Test` while dropping the 4 s / 16 s /
23 s / 72 s and 9 m / 40 m / 53 m / 155 m fragments a bumped PM5 records.

## Mapping contract

| column | value |
|---|---|
| `date` | first 10 chars of `start_date_local`, reformatted to unpadded `M/D/YY`. **Never `new Date(...)`** — Deno runs in UTC and a timezone-less local string would shift the day for every evening session |
| `type` | `'erg'` / `'cycling'`, lower case (what `normType()` in `web/src/utils/formatting.js` recognises) |
| `label` | `` `<name> HH:MM` ``, ≤120 chars. **Never contains a watts figure** — that is what breaks dedupe today |
| `duration` | `m:ss` from `moving_time` (1560 → `26:00`, 2469 → `41:09`) |
| `distance_m` | `Math.round(distance)` |
| `avg_watts` | only when Strava reports device watts; **never a pace-derived estimate** |
| `avg_hr` | only when `has_heartrate` |
| `status` / `source` | `'completed'` / `'strava'` |
| `srpe`, `coach_note`, `prs`, `exercises`, `coach_flag`, `benchmark_key` | **never written** |

## Required secrets

Supabase dashboard → Edge Functions → Secrets.

| Secret | Purpose |
|---|---|
| `STRAVA_CLIENT_ID` | Strava API application id |
| `STRAVA_CLIENT_SECRET` | Strava API application secret |
| `STRAVA_OAUTH_CALLBACK_URL` | The public URL of `strava-oauth-callback`. Must match the **Authorization Callback Domain** registered on the Strava app, and is the `redirect_uri` sent to Strava |
| `STRAVA_APP_REDIRECT_URL` | Where the callback 302s the browser afterwards, e.g. `https://erg-dashboard-eight.vercel.app/`. Always this value, never anything from the request |
| `STRAVA_BACKFILL_FROM` | `2026-06-14` (Scott's Gate 2 decision) |
| `STRAVA_CRON_SECRET` | `x-cron-secret` for `strava-import`. **Distinct from the vitals `CRON_SECRET`** so a leak of one cannot be replayed against the other |
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected. Bypasses RLS; the only role granted EXECUTE on the two RPCs |
| `SENTRY_DSN` | Shared with the other functions; without it every Sentry export is a no-op |

There is **no `STRAVA_OAUTH_STATE_SECRET`**. The `state` is a plain opaque
32-byte random token with nothing embedded and no HMAC — the
`strava_oauth_state` row is what makes it single-use *and* what binds it to a
user, so a signature would add a second mechanism providing no property the row
does not already provide.

**Never logged, never sent to Sentry:** `access_token`, `refresh_token`,
`client_secret`, the `state`, the `code`. Sentry context carries ids, counts and
status codes only — the fingerprint is the error message, so a message must
never carry token material.

## Deploy

Apply the migrations first (`011` then `012`), then:

```bash
# JWT verification ON — do NOT pass --no-verify-jwt to these two
supabase functions deploy strava-connect
supabase functions deploy strava-sync

# public: Strava's browser redirect carries no JWT
supabase functions deploy strava-oauth-callback --no-verify-jwt

# public: pg_cron carries no JWT; the x-cron-secret guard is the only gate
supabase functions deploy strava-import --no-verify-jwt
```

Getting the last two wrong in either direction is silent: deploy the callback
with JWT on and every connect dies at the redirect with a 401 the user never
sees the cause of; deploy `strava-import` with JWT on and the cron 401s nightly.

## Cron registration

Every 15 minutes, aligned with Strava's short rate-limit window. Replace the
placeholder with the real `STRAVA_CRON_SECRET` before running; do not commit it.

```sql
select cron.schedule(
  'strava-import',
  '*/15 * * * *',
  $$
    select net.http_post(
      url     := 'https://swdrueaserjzhuxnzmeu.supabase.co/functions/v1/strava-import',
      headers := '{"Content-Type":"application/json","x-cron-secret":"<STRAVA_CRON_SECRET>"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
```

To stop it: `select cron.unschedule('strava-import');`

A run that hits HTTP 429 sets `strava_sync_state.rate_limit_resets_at` to the
next quarter hour, and every run before that returns immediately — which is what
stops one 429 becoming ninety-six a day.

## Dry run — and the legacy-6 verification

**Do this before the first real import.** `dry_run` runs the entire pipeline and
reports the per-activity decision with **zero writes**, including no sync-state
update, so inspecting the plan cannot change what the next real run does.

```bash
# cron entry point
curl -sS -X POST 'https://swdrueaserjzhuxnzmeu.supabase.co/functions/v1/strava-import?dry_run=1' \
  -H 'x-cron-secret: <STRAVA_CRON_SECRET>' | jq '.results[0]'

# user entry point (browser session JWT)
curl -sS -X POST 'https://swdrueaserjzhuxnzmeu.supabase.co/functions/v1/strava-sync' \
  -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' \
  -d '{"dry_run":true}' | jq
```

Each entry in `.decisions` is `{ activityId, sportType, date, action, detail }`
where `action` is `insert`, `adopt` (detail = the session id), `update`, `skip`
(detail = the reason) or `ambiguous` (detail = the tied session ids).

**The check that matters.** List the legacy sessions that a Strava activity
should adopt rather than duplicate:

```sql
select id, date, date_iso, type, label, distance_m, source
  from public.sessions
 where user_id = '<uuid>'
   and strava_activity_id is null
   and status in ('actual','completed','logged')
   and date_iso >= '2026-06-14'
   and distance_m is not null
   and (type ilike '%erg%' or type ilike '%row%' or lower(type) = 'z2 aerobic'
        or type ilike '%cycl%' or type ilike '%bike%' or type ilike '%ride%')
 order by date_iso;
```

Then, in the dry-run output:

1. **Every** one of those rows must appear as the `detail` of an `adopt`
   decision. A legacy row that does not appear will be **duplicated** by the
   real run — that is the doubled-CTL failure, and the dry run is the only place
   it is cheap to catch.
2. No session id may appear as the `detail` of two different `adopt` decisions.
3. Anything reported `ambiguous` needs a human decision before the real run:
   inspect the tied ids, delete or relabel the wrong one, then re-run the dry
   run and confirm it has become an `adopt`.
4. `insert` decisions should be activities with no counterpart in the table at
   all. Spot-check a few dates against the Log.

Only when 1–3 hold should the cron be registered.

After the first real run:

```sql
select last_run_at, last_run_status, last_error_code, imported_total, adopted_total,
       skipped_total, failed_total, ambiguous_activity_ids, backfill_complete,
       backfill_cursor_before, incremental_after
  from public.strava_sync_state;

-- must return zero rows: one activity can only ever be on one session
select strava_activity_id, count(*) from public.sessions
 where strava_activity_id is not null group by 1 having count(*) > 1;
```

## Backfill, incremental and throttling

- **Incremental** lists `?after=<incremental_after>`, paging until exhausted. The
  watermark advances over **everything seen, ineligible activities included** —
  otherwise a week of nothing but `WeightTraining` is re-listed for ever.
- **Backfill** walks *backwards* via `?before=<backfill_cursor_before>`. The
  cursor is persisted **before** the next page is fetched, so an interrupted run
  resumes rather than losing the page. `backfill_complete` is set when a page
  returns an activity older than `STRAVA_BACKFILL_FROM`, comes back short, or is
  empty.
- **Budget:** 50 Strava calls and 20 s of wall clock per invocation, and the run
  stops at **80% of the 15-minute quota read from the response headers**
  (`X-RateLimit-Limit` / `X-RateLimit-Usage`, preferring the `X-ReadRateLimit-*`
  pair). The remaining 20% is headroom for `vitals-import`, the Coach tab and a
  manual sync — spending the quota to the last call would make *those* fail.
- **Per-activity `try/catch`:** one failure increments `failed_total`, reports to
  Sentry and continues. A run failing 2 of 14 ends `partial` with 12 rows
  correctly written.
- Zero eligible activities → no writes beyond `last_run_at` and
  `last_run_status='noop'`, HTTP 200.

## Status and error codes

`last_run_status` ∈ `ok | partial | noop | rate_limited | auth_failed | error`.
`last_error_code` ∈ `token_exchange_failed | refresh_failed | auth_failed |
rate_limited | upstream_5xx | insufficient_scope | db_write_failed | unknown`.

Both are CHECK-constrained. **There is deliberately no free-text error column**:
`String(e)` from a failed token exchange routinely carries the whole response
body, which for `/oauth/token` includes the tokens themselves — and
`strava_sync_state` is the one Strava table the browser can read. Detail goes to
Sentry; the row gets a bounded code.

## Refresh-token rotation, and one deviation from the spec

Strava **rotates the refresh token on every refresh**: the response carries a new
one and the presented one dies immediately. Dropping it does not fail now — it
fails about six hours later as an opaque 401.

The design called for `pg_advisory_xact_lock` held across read-refresh-write.
**That is not achievable from an edge function and was not implemented.** The
refresh is an HTTPS round trip sitting in the middle of the critical section, and
every PostgREST call is its own transaction on a pooled connection, so any lock
taken is released before the HTTP call is even made. A transaction-scoped lock
here would serialise nothing while looking like it did.

What holds the invariant instead is a **compare-and-swap on the write**:

```
update strava_tokens set ... where user_id = $1 and refresh_token = $presented
```

Only the worker that presented the token being replaced can write the rotation.
The loser matches zero rows, learns it lost, and uses the winner's stored access
token rather than overwriting it. Combined with the `invalid_grant` handling
below, no rotation is ever lost and the worst case is one wasted HTTP call.

`invalid_grant` is **not** treated as revocation on first sight — that is exactly
what a lost race looks like from the loser's side. The row is re-read and the
refresh retried once; only a **second consecutive** `invalid_grant` on a freshly
read token deletes the row and sets `auth_failed`. A real revocation fails twice;
a race does not. Deleting on the first failure would silently disconnect Strava,
with no symptom except activities quietly ceasing to appear.

## Security notes worth not undoing

- `strava_tokens` and `strava_oauth_state` have RLS **enabled and forced** with
  **no policies at all**. Only `service_role` (BYPASSRLS) can reach them. Adding
  a policy to `strava_tokens` would hand a token granting full read access to
  Scott's entire Strava history to anything holding a session JWT.
- `strava_sync_state` is **SELECT-only** for `authenticated`, own row only.
- Both RPCs are `REVOKE ALL ... FROM public, anon, authenticated` and granted
  only to `service_role`. Revoking from `PUBLIC` is the load-bearing half —
  `PUBLIC` is the pseudo-role the default EXECUTE grant flows through. Migration
  `012` asserts all of this and fails loudly if it regresses.
- The user id always comes from the **verified bearer's `sub`** claim
  (`_shared/jwtSubject.ts`), never from a request body and never from an env var.
  `vitals-sync`'s `VITALS_USER_ID` is the counter-example, not the pattern.
- `strava-oauth-callback` is public, so **expected validation failures are not
  errors**: a malformed, expired or replayed `state` gets a 302 with
  `?strava=error&reason=state` and **nothing is reported to Sentry**. Otherwise
  an anonymous caller could drain the free plan's quota and blind monitoring for
  the whole org. Sentry hears only about token-exchange 5xx, DB write failure and
  unexpected throws.
- State redemption is **one atomic statement** (`update ... where redeemed_at is
  null returning user_id`), never check-then-set. That is what makes it
  single-use, and what makes a double-clicked Connect button land on the error
  page instead of exchanging the code twice.
- Granted scope is asserted to contain `activity:read_all` **after** the
  exchange; a narrower grant is not persisted and the fresh token is
  deauthorized immediately. `activity:read` omits private activities, so a
  narrower grant would produce a silently partial history — and the adoption
  pass would then insert duplicates for everything it could not see.
- A callback for a **different `athlete_id`** than the one already stored is
  refused (`reason=athlete_mismatch`). Blending two athletes into one training
  log is not a confidentiality problem, it is a corrupted history nobody can
  untangle.

## Tests

```bash
deno run --allow-env supabase/functions/strava-import/test.ts
```

150 assertions, TC-01 to TC-15, all pure — no network, no database, no
dependence on the machine's timezone. Wired into `.github/workflows/ci-functions.yml`;
that job's steps are **hardcoded**, so a new function's tests are not
auto-discovered and need a step adding by hand.

## Client-facing behaviour

- `strava-connect` `{action:"start"}` → `{ ok, authorize_url }`; send the browser there.
- `strava-connect` `{action:"disconnect"}` → `{ ok, disconnected, revokedAtStrava }`.
  `revokedAtStrava:false` means the local tokens are gone but the app
  authorisation may still stand — point the user at
  <https://www.strava.com/settings/apps> rather than claiming success.
- The callback returns to `STRAVA_APP_REDIRECT_URL` with `?strava=connected` or
  `?strava=error&reason=<denied|state|code|exchange|insufficient_scope|athlete_mismatch|method|server>`.
- `strava-sync` returns the full `ImportResult` (200, or 207 when a run ended
  `partial`/`error`).
