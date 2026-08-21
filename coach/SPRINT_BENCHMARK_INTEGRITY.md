# Sprint Plan: Benchmark Integrity — 2026-08-18 → 2026-09-18 (re-timed)

> **STATUS: APPROVED AND IN FLIGHT. GitHub Issues are the source of truth,
> not this file.** Approved at Gate 1 on 2026-08-18. All eight tasks are now
> tracked as issues #174–#181 under the sprint tracking issue **#182**.
>
> **Before starting any task in this document, check its issue state first.**
> The status table below is a snapshot and goes stale the moment a PR merges;
> #182 does not. A task with a closed issue is DONE — do not rebuild it.
>
> This file remains useful as the *reasoning* behind the sprint — why these
> eight, in this order, and what each is guarding against. It is not a work
> queue.

## Task status — snapshot 2026-08-21, verify against #182

| Task | Issue | State | Landed by |
|---|---|---|---|
| T1 — Fix live erg capture | [#174](https://github.com/skizzy1986/erg-dashboard/issues/174) | ✅ **DONE** | PR #173 |
| T2 — Benchmark due/overdue indicator | [#175](https://github.com/skizzy1986/erg-dashboard/issues/175) | ✅ **DONE** | PRs #189, #190 |
| T3 — Reconcile CP 190 → live anchor | [#176](https://github.com/skizzy1986/erg-dashboard/issues/176) | open | — |
| T4 — Confidence Migration panel | [#177](https://github.com/skizzy1986/erg-dashboard/issues/177) | open | — |
| T5 — Pre-benchmark checklist | [#178](https://github.com/skizzy1986/erg-dashboard/issues/178) | open | — |
| T6 — Live-wire ergTrend / deriveTargets | [#179](https://github.com/skizzy1986/erg-dashboard/issues/179) | open | — |
| T7 — Populate `POWER_DURATION.actualW` | [#180](https://github.com/skizzy1986/erg-dashboard/issues/180) | open | — |
| T8 — Calibration tier upgrade pass | [#181](https://github.com/skizzy1986/erg-dashboard/issues/181) | open | — |

**Follow-ups raised while building the above** (not sprint tasks): #184 (closed)
· #187 read-side date ordering (**closed** by #198) · #188 real session↔ladder
link · #192 benchmark reschedule state · #194 `useSessionLog` counts cancelled
as completed · #195 offline-queue invalidation · #196 benchmark-status-unavailable
line. Their state moves too — check the issues, not this list.

> **Why this header exists.** On 2026-08-21 a session read the previous
> "no GitHub issues exist yet" note, took T2 as un-started, and rebuilt the
> whole feature — through a full seven-stage pipeline — a day after it had
> already merged. The duplicate PR was closed unmerged. One issue-tracker
> check would have prevented it. If you are reading a task section below,
> its issue state governs; this document does not.

## What changed between 2026-07-16 and 2026-08-18

- **The benchmarks slipped entirely.** The CP retest (session 61, 7/5) was
  **cancelled**, never rescheduled. No 5k benchmark session exists in the DB.
  The `anchors` table is untouched since 2026-07-01: `rowing_cp` still 205 W
  provisional, `bike_ftp` still unvalidated, `current_block` still names the
  July 8–21 block. A month of benchmark cadence was lost silently — exactly
  the failure mode T2 below is designed to catch.
- **The repo moved.** The App.jsx milestone landed (`erg-dashboard.jsx`
  dissolved); #146/#147/#151/#154 merged (doc sweep, coverage ratchet to
  68/67/64, `useSessionLog` extraction, THEME tokens); the `npm audit` CI
  blocker was resolved and the dependabot backlog cleared (2 PRs remain, both
  green with auto-merge armed). None of this touched the benchmark surface —
  re-verified by grep on 2026-08-18 (see task list).
- **Scheduling note (Coach's lane):** T7/T8 need a benchmark to actually
  happen. Rescheduling the CP retest / 5k is a Coach prescription decision,
  not a Code task — flagging it here so the dependency is visible.

## Why this sprint, why now

The one capability this app most needs — capturing and trusting a benchmark
test result — is broken at the point of capture, invisible at the point of
scheduling, and stale at the point of display:

- **Capture (P1, DB-verified):** the live PM5 save path
  (`ErgLiveView.jsx:490-491`) still inserts `watts`/`distance` and an ISO
  date, but `sessions` has only `avg_watts`/`avg_hr`/`distance_m` with text
  `MM/DD/YY` dates. Zero rows with `source='bluetooth'` or `status='logged'`
  have ever landed; the offline queue re-inserts the same broken shape. A
  benchmark rowed against the live view is silently lost.
- **Scheduling:** no code flags a due/overdue benchmark — which is how the CP
  retest vanished in July without a trace.
- **Display:** `trainingConfig.js:148` still hardcodes `cpEstimate: 190`
  against the live 205 provisional anchor, and `trainingConfig.js:326`
  derives a static `PACE_ZONES` export from that stale 190. The
  PENDING→MEASURED panel (`logs.js:454`, `JournalView.jsx:284`) still shows
  June text; `ergTrend` (`ErgView.jsx:29`) is still a hardcoded array.

This sprint does not touch training-load modeling, the ProgramView refactor
(#77/#114), or Concept2 import (#56/#116). It is narrowly: **make the
benchmark land in the database, make its schedule visible, and make its
result trustworthy on screen.**

## Sprint Goal

By 2026-09-18, a benchmark test performed in the app (CP retest or the 5k)
reliably reaches the `sessions` table in the correct shape, an
overdue/upcoming benchmark is visible without Scott having to remember the
date, and every screen showing a CP/FTP number agrees with the live `anchors`
value instead of a stale hardcoded one.

**Exit criteria**

- [ ] A session logged via `ErgLiveView` (online or from the offline queue)
      inserts successfully with correct column names and `MM/DD/YY` date
      format — verified against the actual schema, with a passing regression
      test that would have caught the current bug.
- [ ] The app surfaces at least one visible "benchmark due/overdue" signal,
      driven by real session/schedule state (not a static string), covering
      both the cancelled CP retest and the still-unscheduled 5k.
- [ ] No screen in the app displays a CP/FTP number that contradicts the live
      `anchors.rowing_cp` value without explicit "as of" framing (includes
      the static `PACE_ZONES` derivation at `trainingConfig.js:326`).
- [ ] All capture/display fixes ship as independent PRs, each green on
      Lint/Test/Build, each with tests co-located per convention, coverage
      ratchet (now 68/67/64) unaffected or improved.
- [ ] Nothing added this sprint writes to the `anchors` table from the app —
      any task that would require that is flagged to Scott as a lane-change
      decision rather than shipped silently.

---

## Task List

### T1 — Fix live erg session capture (the P1 bug)

**Size: M — Week 1** · Issue [#174](https://github.com/skizzy1986/erg-dashboard/issues/174) · ✅ **DONE — shipped in PR #173.** Do not rebuild.

**Story:** As Scott, I want a session I complete on the live PM5 view to
actually save to my training log, so that a rowed benchmark (or any live
session) isn't silently lost.

**Acceptance criteria:**

1. Given a completed live PM5 session with network available, when I save it,
   then a row is inserted into `sessions` using the real schema columns
   (`avg_watts`, `avg_hr`, `distance_m`) — not `watts`/`distance` — and the
   row appears in the session list within one query refresh.
2. Given the same save, the `date` field is written as `MM/DD/YY` text,
   matching every other row in `sessions`, not an ISO `YYYY-MM-DD` string.
3. Given the device is offline at save time, when connectivity returns, then
   the queued row drains into `sessions` with the same corrected shape (no
   separate bug surface from the queue path).
4. Given the insert fails for a reason other than being offline (e.g. RLS
   rejection, missing `user_id`), then the row is queued rather than dropped,
   and the UI communicates a "saved locally, will sync" state rather than
   claiming success.
5. Given `summary.avgWatts` or `summary.distance` is `null`/`undefined` (PM5
   disconnected mid-session or a zero-duration save), then the insert
   omits/null-safes those fields without throwing.
6. A test exists asserting the exact row shape passed to
   `supabase.from('sessions').insert(...)` matches the real column set —
   regression-proofing this bug class.

**Edge cases:** null PM5 summary fields; RLS rejection vs network failure;
queue draining twice (idempotency); malformed rows already sitting in the
local offline queue from before the fix (handle gracefully).

**Out of scope:** Concept2 auto-import (#56), ErgLiveView UI redesign,
backfilling historical bluetooth data (none exists — greenfield).

---

### T2 — Benchmark due/overdue indicator

**Size: M — Week 1** · Issue [#175](https://github.com/skizzy1986/erg-dashboard/issues/175) · ✅ **DONE — shipped in PRs #189 and #190.** Do not rebuild. The shipped design differs from the sketch below: matching is whole-token with a 14-day backward grace and claim-once assignment, not the scheme described here.

**Story:** As Scott, I want the app to tell me when a scheduled benchmark test
(CP retest, 5k, future 2k) is due or overdue, so that a test doesn't silently
slip the way the CP retest did in July.

**Acceptance criteria:**

1. Given an `EVENT_LADDER` entry with `kind: 'benchmark'` whose date has
   passed and whose linked calendar session (if any) is `planned`/`cancelled`
   or has no linked session, a visible "overdue" signal appears (exact
   surface — banner, Journal panel, or Erg tile — is a Stage 3 design
   decision).
2. Given a benchmark entry within the next 7 days, a visible "upcoming"
   signal appears, distinct from "overdue."
3. Given today (2026-08-18), the CP revalidation (last attempt cancelled 7/5,
   anchor still provisional) and the end-of-base 5k (was due ~early Aug, never
   logged) both show as overdue on first load — these are the concrete cases
   that must work.
4. Given a benchmark's linked session is later completed, the signal clears
   via the normal query-invalidation pattern.
5. Given `EVENT_LADDER` dates are free-text (`'~Early Aug 26'`), the indicator
   degrades gracefully ("upcoming, exact date TBD") rather than crashing or
   mis-flagging.

**Edge cases:** unparseable/approximate dates; benchmark with no linked
`sessions` row; a `cancelled` linked session must read as NOT done (the July
retest is the proof case); `MM/DD/YY` text-date comparison; year-on-year
repeated events — don't double-flag.

**Out of scope:** writes to `anchors`; redesigning `EVENT_LADDER`/`ANNUAL_ARC`
structures; the ProgramView split (#77/#114) — if the natural surface is
`ProgramYear.jsx`, prefer a small standalone component to avoid colliding with
the in-flight split.

---

### T3 — Reconcile displayed CP (190) with live anchor (205)

**Size: S — Week 2** · Issue [#176](https://github.com/skizzy1986/erg-dashboard/issues/176) · open

**Story:** As Scott, I want every screen that shows a CP/FTP number to match
the current live anchor, so that I'm not making training decisions off a
stale hardcoded estimate while a newer provisional number exists in the DB.

**Acceptance criteria:**

1. Static copy that currently contradicts the live anchor
   (`CRITICAL_POWER.cpEstimate = 190` at `trainingConfig.js:148`, the static
   `PACE_ZONES = derivePaceZones(CRITICAL_POWER.cpEstimate)` export at
   `trainingConfig.js:326` and its consumers, the `CALIBRATION_STATUS` "190W
   (untested)" row, `FTP_TEST`'s past-dated copy) is updated, made
   live-anchor-driven, or explicitly marked historical/superseded.
2. Given `useAnchors` is loading or unreachable, affected copy shows a neutral
   "unavailable" state — never a silent fallback to 190.
3. No new hardcoded numeric CP value is introduced — per the 2026-07-02 Coach
   decision, CP is read live from `anchors`.
4. Zero remaining instances of "190" presented as a current CP number in the
   affected files (kept historical references explicitly labeled).

**Edge cases:** React Query pending vs genuinely null anchor read differently;
future `confirmed` vs `provisional` status displays correctly without new
hardcoding; consumers of the static `PACE_ZONES` export must not silently
diverge from the live `derivePaceZones(cp)` path used in `ErgView`.

**Out of scope:** changing `useAnchors`; wiring CP into TSS/CTL/ATL (own
decision, see "Not building"); bike FTP parallel cleanup only if trivially the
same pattern.

---

### T4 — Refresh the Confidence Migration panel (JournalView)

**Size: M — Week 2 (after T3)** · Issue [#177](https://github.com/skizzy1986/erg-dashboard/issues/177) · open

**Story:** As Scott, I want the PENDING→MEASURED calibration panel in my
Journal to reflect what's actually true today, so that I stop seeing "CP test
~Jun 25 PENDING" for a test whose provisional result already exists.

**Acceptance criteria:**

1. Given `rowing_cp` is `status='provisional'` (still true as of 2026-08-18),
   the corresponding `CONFIDENCE_MIGRATION` entry reflects "provisional
   result in, pending revalidation" rather than a flat past-dated "PENDING."
2. The 5k benchmark is referenced by its actual/best-known date, not a
   hardcoded past date.
3. Given no anchor data is reachable, the panel falls back to a
   clearly-labeled last-known state without breaking the render.
4. `JournalView` tests cover the new live-driven states.

**Edge cases:** unexpected anchor status values; partial freshness (CP updated
but bike FTP still static — one anchor's freshness must not imply the
other's).

**Out of scope:** visual redesign of the panel; FTP/bike beyond trivial
parity.

---

### T5 — Pre-benchmark prep checklist tied to the overdue engine

**Size: S — Week 2/3 boundary (T2 is done, so this is unblocked)** · Issue [#178](https://github.com/skizzy1986/erg-dashboard/issues/178) · open

**Story:** As Scott, I want the test protocol (fresh, fueled, DF 125, gate
vitals, separate warmup) surfaced a few days before a benchmark, so that I
don't invalidate the result by testing under the wrong conditions.

**Acceptance criteria:**

1. Given T2's "upcoming" window triggers (benchmark within 7 days), a protocol
   checklist appears alongside it, sourced from existing protocol copy (e.g.
   `FTP_TEST.prereq`, the cancelled session 61's coach_note protocol) — no
   invented text.
2. The checklist is dismissible/acknowledgeable (doesn't nag once seen).
3. With no upcoming benchmark in the window, it doesn't render at all.

**Edge cases:** persistence of dismissed state (simplest that doesn't nag);
multiple benchmarks in the window at once (CP retest outstanding AND 5k
approaching) — per-benchmark checklists, not one merged list.

**Out of scope:** a general notifications system; push/out-of-app alerting.

---

### T6 — Wire ergTrend / HR130_POWER / deriveTargets off live data

**Size: L — Week 3 (candidate to split: chart data PR, then target-derivation PR)** · Issue [#179](https://github.com/skizzy1986/erg-dashboard/issues/179) · open

**Story:** As Scott, I want my aerobic trend chart and UT1/UT2 targets to
reflect my actual logged sessions and the live CP anchor, so that the numbers
I train against update as I log real data instead of staying frozen on a
hardcoded snapshot (now three months old).

**Acceptance criteria:**

1. The `ergTrend` chart renders from live `useErgSessions()` data rather than
   the hardcoded array at `ErgView.jsx:29`.
2. `deriveTargets()` derives UT1/UT2 targets from live data (recent sessions
   and/or `derivePaceZones(cp)`) — the two derivation paths must agree.
3. With fewer than N live points, chart/targets show a labeled "insufficient
   data" state rather than an empty or misleading render.
4. Sessions with null `avg_watts`/`avg_hr` are excluded, not corrupting.
5. `ErgView` and `analysis.js` tests cover live-driven behavior including
   insufficient-data and null-field cases.

**Edge cases:** sparse data (rowing largely paused since late July — the
insufficient-data state will be the FIRST state users see, not an edge);
mixed sources (`portal`, `coach`, `concept2`) with different field
completeness; query windowing if volume grows.

**Out of scope:** TSS/CTL/ATL model changes (stays sRPE-only this sprint); any
write back to `anchors`.

---

### T7 — Populate `POWER_DURATION.actualW` from the landed benchmark

**Size: M — Week 4 (depends on T1 + a logged benchmark session; Coach must
schedule the test — flagged above)** · Issue [#180](https://github.com/skizzy1986/erg-dashboard/issues/180) · open

**Story:** As Scott, I want my actual 5k result to show up next to the
predicted-watts table, so that I can see the test versus the projection
instead of a table whose "actual" column has always read null.

**Acceptance criteria:**

1. A completed session matching a `POWER_DURATION` format (label/distance/
   duration heuristic, display-side only) populates that row's `actualW` from
   logged `avg_watts`.
2. Formats with no matching session keep showing null/dash — no fabricated
   data.
3. Ambiguous matches resolve deterministically (most recent wins), testably.
4. Verified against a seeded fixture, not blocked on the real benchmark
   happening on schedule (July proved slippage is the norm, not the
   exception).

**Edge cases:** no match at all (must not crash); multiple candidates;
source-agnostic matching (`concept2`/`coach` rows count).

**Out of scope:** writing results back to `anchors`/`sessions` — read-only
display join. Auto-updating calibration from results = lane-change decision
for Scott, raised explicitly, never assumed.

---

### T8 — Post-benchmark calibration tier upgrade pass (display only)

**Size: M — Week 4 (depends on T3, T4, T7 — the capstone)** · Issue [#181](https://github.com/skizzy1986/erg-dashboard/issues/181) · open

**Story:** As Scott, I want the calibration confidence panels to actually
upgrade from PENDING to MEASURED once the 5k and CP revalidation land, so
that the "upgrades as benchmarks land" promise in the UI is true instead of
static copy.

**Acceptance criteria:**

1. Given a logged benchmark (via T1's fixed path) and/or a Coach-side anchor
   status change (`provisional` → `confirmed`), the relevant
   `CALIBRATION_STATUS` rows reflect the upgraded tier without a manual code
   edit.
2. With no benchmark landed, rows stay at their current accurate tier — no
   premature upgrades.
3. Unexpected anchor statuses fail safe to the lower-confidence display.
4. No writes to `anchors` or `coach_log` — anchor status stays Coach/MCP-owned;
   this only makes display logic responsive to what's already live.

**Edge cases:** benchmark landed but anchor not yet updated by Coach (show
partial progress, not all-or-nothing flip); late-sprint landing → verify
against a seeded fixture like T7.

**Out of scope:** changing who writes `anchors`; recalibrating TSS/CTL/ATL off
new CP; mobile calibration surface parity (zero benchmark UI on mobile today —
separate product decision).

---

## Sequencing Summary (weeks from 2026-08-18)

| Week | Task | Size | Dependencies | State |
|---|---|---|---|---|
| 1 (Aug 18–24) | T1 — Fix live capture bug | M | none | ✅ done (#174) |
| 1 (Aug 18–24) | T2 — Overdue/upcoming benchmark indicator | M | none | ✅ done (#175) |
| 2 (Aug 25–31) | T3 — Reconcile 190 vs live 205 display | S | none | open (#176) |
| 2 (Aug 25–31) | T4 — Refresh Confidence Migration panel | M | T3 | open (#177) |
| 2/3 boundary | T5 — Pre-benchmark prep checklist | S | T2 ✅ | open (#178) |
| 3 (Sep 1–7) | T6 — Live-wire ergTrend / HR130 / deriveTargets | L (splittable) | none | open (#179) |
| 4 (Sep 8–18) | T7 — Populate actualW from landed benchmark | M | T1 ✅ + logged benchmark | open (#180) |
| 4 (Sep 8–18) | T8 — Post-benchmark tier upgrade pass | M | T3, T4, T7 | open (#181) |

**Reasoning:** T1 and T2 must be true before the next benchmark attempt — a
broken capture path or an invisible schedule are the failure modes that lose
the whole benchmark (July demonstrated the second one for real). T3–T5 are
trust/visibility fixes that should also precede the test. T6–T8 land as real
benchmark data starts flowing, with T8 last.

**Both week-1 tasks are now done, which unblocks T5.** The remaining blocker on
T7/T8 is not code: it is that a benchmark still has to be *scheduled and
performed*. As of 2026-08-21 `anchors.rowing_cp` is still 205 W provisional,
untouched since 07-01, and no CP retest or 5k is on the calendar. T2 now
surfaces all three as overdue — which is the sprint working as designed, and
also a standing prompt for the Coach-lane decision below.

## What This Sprint Is Not Building

| Gap | Why deferred | Revisit condition |
|---|---|---|
| Concept2 auto-import | Scoped to Sprint 4 (#56/#116) | Sprint 4 kicks off |
| ProgramView further split | Owned by #77/#114 | #114 sprint |
| TSS/CTL/ATL incorporating CP | Load-model change, not display; needs its own decision | Scott asks for CP-driven load modeling |
| App writing to `anchors` | Lane boundary — Coach/MCP owns anchor writes | Only on Scott's explicit lane-change authorization |
| Mobile benchmark/calibration surface | Zero coverage today; real gap, undecided scope | Own opportunity assessment if Scott wants parity |
| Rescheduling the CP retest / 5k | Coach's prescription lane, not a Code task | Scott + Coach set the date; T2/T5 then surface it |

---

## Key file references (re-verified on main @ 514520d, 2026-08-18)

- `web/src/views/ErgLiveView.jsx:490-491` — the T1 bug (`watts`/`distance` +
  ISO date)
- `web/src/hooks/useOfflineQueue.js` — queue drain re-inserts the same shape
- `web/src/hooks/useAnchors.js` — live anchor read (no write path, by design)
- `web/src/constants/trainingConfig.js:148` — stale `cpEstimate: 190`;
  `:326` — static `PACE_ZONES` derived from it; `:44-206` —
  `CALIBRATION_STATUS`, `POWER_DURATION` (actualW always null), `FTP_TEST`
- `web/src/views/ErgView.jsx:29` (hardcoded ergTrend), `:222-223` (live CP),
  ~`:1083-1140` (calibration panel)
- `web/src/views/JournalView.jsx:284` — Confidence Migration panel render
- `web/src/constants/logs.js:454` — `CONFIDENCE_MIGRATION`
- `web/src/constants/schedule.js:313-386` — `EVENT_LADDER`
- `web/src/constants/program.js:347-411` — `ANNUAL_ARC`
- `web/src/views/program/ProgramYear.jsx` — renders schedule verbatim
  (mid-refactor, #77)
