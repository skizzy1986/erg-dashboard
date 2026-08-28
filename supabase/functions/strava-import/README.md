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
points, so a manual sync and a scheduled one cannot drift apart. `supaClient.ts`
holds `serviceClient` and is the one file that value-imports supabase-js — see
**Tests** for why that split is load-bearing.

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

### An adopted row keeps its own duration and distance, for ever

`adopt_strava_session` deliberately does not touch `duration` or `distance_m`.
That promise only holds because `upsert_strava_session` honours it too: once a
row is linked, **every later run reaches it through `upsert_strava_session`**,
so an unguarded `DO UPDATE` there would undo the adoption's restraint one cron
cycle later — `60min` → `60:00`, `13618` → `13620`, and `9min` → `8:49`, which
changes the parsed duration from 9.0 to 8.82 minutes and therefore the load.

The discriminator is `sessions.source`, which is `'strava'` **only** on rows this
importer inserted; an adopted row keeps its original `portal` / `coach` /
`coach_plan` / `claude_csv` / `concept2`. So:

| | `duration`, `distance_m` | `avg_watts`, `avg_hr` |
|---|---|---|
| row this importer inserted (`source = 'strava'`) | refreshed each run | enriched (coalesce) |
| row adopted from another source | **never touched** | enriched (coalesce) |

Adoption never sets `source = 'strava'`, and that omission is what makes the
guarantee permanent rather than momentary.

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
| `avg_watts` | only when Strava reports device watts; **never a pace-derived estimate**. Almost always comes from the detail fetch, not the list payload — see below |
| `avg_hr` | only when `has_heartrate`. Same |
| `status` / `source` | `'completed'` / `'strava'` |
| `srpe`, `coach_note`, `prs`, `exercises`, `coach_flag`, `benchmark_key` | **never written** |

## The per-activity detail fetch is the normal path, not an exception

Strava's **SummaryActivity** — what `GET /athlete/activities` returns — **does
not reliably carry power or heart rate.** `average_watts` is documented
rides-only and `has_device_watts` is a `DetailedActivity` field. Verified against
Scott's account: the list payload for rowing activity `19859099686` carried
`distance`, `moving_time`, `average_speed`, `total_calories` and `average_cadence`
and **no watts and no heart rate**, while `GET /activities/19859099686` returned
`average_watts: 135.706`, `average_heartrate: 124.475`, `has_device_watts: true`.

An importer that only fetched detail for a summary missing `distance` /
`moving_time` / `start_date_local` would therefore write `avg_watts` and `avg_hr`
as **null on essentially every row**. `sessionLoad()` in
`web/src/utils/trainingLoad.js` scores such a session **0**, so the feature would
import sessions contributing nothing at all to CTL/ATL/TSB — silently, and the
exact opposite of its purpose. The 50-call budget exists to pay for these
fetches.

`needsDetailFetch()` in `mapper.ts` is the gate. It answers true for an eligible
sport whose summary lacks usable device watts **or** heart rate (or lacks the
core mapping fields), and false for everything else — including sports we do not
import, because a read spent on a `Walk` is a read taken from a row that counts.
An activity the summary already proves ineligible (too short, before
`STRAVA_BACKFILL_FROM`) costs no read either.

### What happens when the detail cannot be fetched

Budget spent, quota nearly spent, or the fetch itself failed: the activity is
**deferred, not written**. This is the load-bearing half. A row written with a
null `avg_watts` is indistinguishable from a genuine no-power session, and the
cursor would move past it, so the power would be lost silently and permanently.

Deferring instead holds the cursor that re-lists it — `incremental_after` is
clamped below the activity for something the incremental pass found,
`backfill_cursor_before` is clamped above it (and `backfill_complete` cleared)
for something the backfill found — and the chunk ends cleanly for the next run
to pick up. `ImportResult.deferred` counts them, and each gets a decision with
`action: "skip"` and `detail: "deferred:<why>"`. **No `*_total` counter
accumulates a deferral**: it is a property of one chunk, not a verdict on the
activity.

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
(detail = the reason) or `ambiguous` (detail = the tied session ids). A `skip`
whose detail starts `deferred:` is **not** a decision about the activity — the
run could not fetch its detail and the next run will process it.

A dry run makes **zero writes of any kind**, and that explicitly includes the
token row: `getFreshAccessToken` deletes it on a second consecutive
`invalid_grant`, and `runImport` suppresses that deletion under `dry_run`. Token
*rotation* still happens — listing anything needs a live access token, and
Strava rotates the refresh token whenever it issues one — but a dry run can
never disconnect the integration.

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

- **Incremental** lists `?after=<incremental_after>`, paging until exhausted.
  **`after` is held fixed for the whole paging loop and only `page` moves.**
  Advancing both together double-advances — page 2 gets requested against a set
  that already excludes page 1's activities, so the block in between is never
  listed, and the watermark has moved past it so it is never listed again.
  The watermark advances over **everything seen, ineligible activities
  included** — otherwise a week of nothing but `WeightTraining` is re-listed for
  ever — but **only when the loop ran to exhaustion**: a loop cut short by the
  budget has seen an unknown subset of the window. Re-listing is free (the
  upsert is idempotent); skipping is permanent.
- **Backfill** walks *backwards* via `?before=<backfill_cursor_before>`, at a
  fixed `page=1` with the cursor moving. The cursor is persisted **once, at the
  end of the run, in the same write as the rows it describes** — never mid-walk.
  Collection and writing are separate phases, so a cursor written mid-walk would
  describe rows that do not exist yet, and a run killed in between would lose
  them permanently (they sit below `incremental_after`, so nothing re-lists
  them). Without the mid-walk write an interrupted run simply re-walks from the
  last durable cursor, which is idempotent and costs one repeated page.
  `backfill_complete` is set when a page returns an activity older than
  `STRAVA_BACKFILL_FROM`, comes back short, or is empty.
- **Budget:** 50 Strava calls (list *and* detail) and 20 s of wall clock per invocation, and the run
  stops at **80% of the 15-minute quota read from the response headers**
  (`X-RateLimit-Limit` / `X-RateLimit-Usage`, preferring the `X-ReadRateLimit-*`
  pair). The remaining 20% is headroom for `vitals-import`, the Coach tab and a
  manual sync — spending the quota to the last call would make *those* fail.
- **Per-activity `try/catch`:** one failure increments `failed_total`, reports to
  Sentry and continues. A run failing 2 of 14 ends `partial` with 12 rows
  correctly written. A failed *write* does **not** hold the cursor, on purpose: a
  row that fails every time (a `23505` label collision, say) would otherwise
  stall the whole import for ever. It is loud — `failed_total`, a non-`ok`
  status and a Sentry issue — which a deferral is not, and deferrals are the
  case where holding the cursor is correct.
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

242 assertions, TC-01 to TC-25. No network, no database, no dependence on the
machine's clock or timezone. Wired into `.github/workflows/ci-functions.yml`;
that job's steps are **hardcoded**, so a new function's tests are not
auto-discovered and need a step adding by hand.

- **TC-01 to TC-15** cover the pure functions: mapping, eligibility, adoption,
  cursors, budgets, refresh-token rotation, the cron guard.
- **TC-16 to TC-25** drive `runImport` itself against two fakes — a Supabase
  client implementing exactly the surface `importer.ts` uses (backed by a tiny
  in-memory sessions table, recording every call **in order**) and a
  `globalThis.fetch` stub, so the real `client.ts` runs. They pin the dry run's
  zero writes, re-import idempotence, that an adopted row is never duplicated,
  the per-activity failure isolation, the detail fetch and its deferral
  behaviour, the cursor-after-rows ordering, multi-page incremental completeness
  and the `status` precedence.

Call **order** is asserted, not only call counts: two of the defects these tests
exist to pin (a cursor written before the rows it describes, a watermark moved
past unlisted activities) are ordering bugs that any count-based assertion
passes straight through.

`serviceClient` lives in `supaClient.ts` rather than `importer.ts` so that
`importer.ts` can import `SupabaseClient` as a **type only**. Deno erases a
type-only import without loading the module, so the suite drives `runImport`
with a structural fake and never needs `jsr:@supabase/supabase-js` in its module
graph. Moving `createClient` back into `importer.ts` makes every `runImport`
test unrunnable offline.

## Client-facing behaviour

- `strava-connect` `{action:"start"}` → `{ ok, authorize_url }`; send the browser there.
- `strava-connect` `{action:"disconnect"}` → `{ ok, disconnected, revokedAtStrava }`.
  `disconnected` is always `true` on a 200 — the local token row and
  `connected` flag are gone either way. **`revokedAtStrava` is the only part of
  the response the UI must actually read.** It is `true` only when Strava itself
  accepted `POST /oauth/deauthorize`; it is `false` whenever the grant may still
  stand on Scott's Strava account:
  - the stored token was already unusable (refresh returned `invalid_grant`, or
    a 5xx/network failure meant no live access token could be obtained), or
  - `deauthorize` returned a non-2xx or threw.

  In every one of those cases the app has **destroyed the only credential that
  could revoke the grant programmatically**, so nothing can undo it later from
  here. A UI that reports plain success on `revokedAtStrava:false` leaves a live
  authorisation on the account with no signposting; it must instead point the
  user at <https://www.strava.com/settings/apps> to finish the job.
- The callback returns to `STRAVA_APP_REDIRECT_URL` with `?strava=connected` or
  `?strava=error&reason=<denied|state|code|exchange|insufficient_scope|athlete_mismatch|method|server>`.
- `strava-sync` returns the full `ImportResult` (200, or 207 when a run ended
  `partial`/`error`).
