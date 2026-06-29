# ROADMAP — One-Month Plan (2026-06-30 → 2026-07-27)

> A sequenced, week-by-week plan over the existing GitHub Issues backlog.
> Strategy: **foundation first, integration research in parallel.** Capacity
> assumption: **6+ PRs/week** (solo + Claude factory). Every line item is an
> existing issue — this doc sequences them; it does not replace the backlog.
> The standing process is unchanged (`WORKFLOW.md`): Issue → branch → PR → CI → `main`.

## Strategy in one paragraph

The P1 stack is foundation work — CI hardening (`#61`) and the monolith refactor
(`#52`) — and it has a hard ordering constraint: **the coverage keystone (`#62`)
must merge before any extraction PR**, because today coverage passes by accident
(the 8,715-line monolith is invisible to the gate). So week 1 lands the keystone
and the E2E safety net, then the refactor burns down the monolith view-by-view
across weeks 2–4. In parallel — not competing for the critical path — the three
dormant integrations (Strava → Garmin → Concept2) each get a `/research` pass so
that **specs are ready to build the moment the foundation is solid**. Net result
for the month: an honest, enforced quality gate; the monolith materially
decomposed (target: `App.jsx` milestone in reach); and Strava scoped well enough
to start building in week 4.

## The dependency spine (read this before resequencing)

```
#62 (C1 coverage keystone)  ─── MUST merge first ───┐
                                                     ▼
#67 (H0 docs)  ──▶  #68 #69 #70 #71  ──▶  #72 #73 #74 #75 #76  ──▶  #77 #78 #79  ──▶  App.jsx (#52)
  (no app code)     (constants/utils)      (view extractions)        (big seams + close-out)
#63 #64 #65 (C2/C3/C4 — config + E2E, land early so each extraction re-runs smoke)
#66 (C5 bundle/Lighthouse — once the build is stable)
```

**Rules that keep this safe:**
- `#62` is the keystone — nothing under `#52` extracts before it merges.
- `#65` (Playwright smoke) should be green early; **re-run it after every view extraction** — it's the net that catches integration breakage unit tests miss.
- One extraction per PR. Each extraction PR removes its file(s) from the coverage `exclude` list **in the same PR**, proving ≥70% — the ratchet enforces "test every extraction."
- Integration research is off the critical path: a slow research week never blocks a refactor PR.

---

## Week 1 — Jun 30 → Jul 6 · "Make the gate honest + safety net"

**Theme:** land the coverage keystone, reconcile docs, stand up CI hardening and the E2E net, begin the zero-risk extractions. Kick off Strava research.

| Issue | Title | Type | Notes |
|---|---|---|---|
| **#62** | C1 — coverage scope + ratchet (keystone) | `P1` | **Day 1. Blocks every extraction.** Sets the real baseline. |
| #67 | H0 — reconcile CLAUDE.md + architecture.md | `refactor` | No app code; clears doc drift before burndown. |
| #63 | C2 — workflow hygiene (PR-title lint, dep-review, SHA-pin, auto-merge) | `P1` | Config only. |
| #64 | C3 — pre-push test hook + CodeQL SAST | `P1` | Config only. |
| #65 | C4 — Playwright E2E smoke (assert each tab renders) | `P1` `testing` | Land early; becomes the per-extraction safety net. |
| #68 | PR1 — extract logs + coaching data → `constants/` | `refactor` | Data-only, zero render risk (~900 lines). |
| #69 | PR2 — extract pure formatters → `utils/formatting.js` + tests | `refactor` | First tested extraction off the ratchet. |
| ⟳ #54 | **Strava /research** (OAuth2, rate limits, activity/stream endpoints) | `integration` | Parallel track. Strava MCP is connected — validate API calls live. |

**Exit criteria:** coverage gate measures the real file set and is green at baseline; CodeQL + smoke tests run on PRs; `constants/` + `formatting.js` extracted; Strava research summary posted to `#54`.

---

## Week 2 — Jul 7 → Jul 13 · "Pure-function extractions + finish CI"

**Theme:** extract the high-value pure logic (the adaptive engine), land the last CI add-on, start the self-contained views. Garmin research.

| Issue | Title | Type | Notes |
|---|---|---|---|
| #66 | C5 — bundle-size budget + Lighthouse/a11y CI | `P1` | Closes the C-series → **`#61` closes here.** |
| #70 | PR3 — extract schedule/roster helpers → `utils/schedule.js` + tests | `refactor` | FIFO-vs-home + date edge-case tests. |
| #71 | PR4 — extract adaptive decision engine → `utils/analysis.js` + tests | `refactor` | **Highest domain value.** Push hard on branch coverage (R1–R11). |
| #72 | PR5 — extract Journal tab → `views/JournalView.jsx` + test | `refactor` `testing` | First view extraction (~334 lines). |
| #73 | PR6 — extract Recovery tab → `views/RecoveryView.jsx` + test | `refactor` `testing` | ~781 lines, self-contained analytics. |
| ⟳ #55 | **Garmin /research** (auth/partner API, HRV/RHR/sleep access) | `integration` | Parallel track. Flag any partner-access prerequisites. |

**Exit criteria:** `#61` tracking issue closed (all C1–C5 merged); adaptive engine extracted with strong branch coverage; Journal + Recovery views live and smoke-green; Garmin research summary posted to `#55`.

---

## Week 3 — Jul 14 → Jul 20 · "The big view extractions"

**Theme:** take down the largest remaining tabs. Concept2 research. By end of week the monolith is materially thinner.

| Issue | Title | Type | Notes |
|---|---|---|---|
| #74 | PR7 — extract Overview/home tab → `views/OverviewView.jsx` + test | `refactor` `testing` | **Second-largest tab (~1,370 lines).** Mock or test its chart children in-PR (folds in part of #53). |
| #75 | PR8 — extract Strength tab → `views/StrengthView.jsx` + test | `refactor` `testing` | ~271 lines. |
| #76 | PR9 — extract Mobility tab → `views/MobilityView.jsx` + test | `refactor` `testing` | ~320 lines. |
| ⟳ #56 | **Concept2 /research** (Logbook OAuth, results endpoints) | `integration` | Parallel track. Completes the integration research trio. |

**Exit criteria:** Overview/Strength/Mobility extracted and smoke-green; coverage ratchet stepped up; all three integration research summaries done — Strava is the highest-confidence build candidate.

---

## Week 4 — Jul 21 → Jul 27 · "Largest seam, close-out, first feature build"

**Theme:** decompose the Program tab (the single biggest seam), extract the last small tabs, relocate StrengthLogger, and reach for `App.jsx`. Begin the first integration build now that research is in hand.

| Issue | Title | Type | Notes |
|---|---|---|---|
| #77 | Decompose Program tab → `views/program/*` (~3 PRs) | `refactor` | Largest seam (~3,071 lines); split per the H0 architecture decision. |
| #78 | Extract remaining small tabs — Calendar / Plan / Log | `refactor` | One PR each (or batched), each with a render test. |
| #79 | Relocate `StrengthLogger.jsx` → `views/` + tests; mobile-view tests | `refactor` `testing` | **Closes the testing gaps in `#53`.** |
| #53 | Test coverage for StrengthLogger + mobile views | `P2` `testing` | Completed by #79; closes here. |
| #52 | Refactor burndown — **reach `App.jsx` milestone** | `P1` `refactor` | After #77/#78 the monolith is thin enough to attempt the entry-point rename. |
| ▶ #54 | **Strava /orchestrate** — spec → build the OAuth2 import | `integration` | Foundation is solid; convert the week-1 research into the month's first new feature. |

**Exit criteria:** Program tab decomposed; Calendar/Plan/Log + StrengthLogger relocated with tests; `#53` closed; `App.jsx` milestone attempted (or the remaining gap to it documented in `#52`); Strava import spec'd and building.

---

## The research track (parallel, off the critical path)

| Week | Research | Issue | Why this order |
|---|---|---|---|
| 1 | Strava API (OAuth2, streams, rate limits) | #54 | Strava MCP is connected this session — can validate calls live. Most mature API; best first feature. |
| 2 | Garmin Connect (auth/partner API) | #55 | May have partner-access gating — surface prerequisites early so they don't block later. |
| 3 | Concept2 Logbook (OAuth, results) | #56 | Complements the live PM5 Bluetooth path; backfills the logbook. |

Each research pass ends with a findings summary + confidence level posted to its
issue (via `/research`). The deliverable is a **spec-ready** integration, not code —
building begins only after the foundation is solid (Strava starts week 4).

## What's intentionally NOT in this month

- **Building Garmin / Concept2 imports** — research only this month; build next month after Strava proves the pattern.
- **TrainingPeaks / Ergzone** — replaced by the native plan engine; no integration work.
- Anything not already an issue. New ideas → new issue first (`WORKFLOW.md`).

## Tracking

- **Weekly buckets** are applied as `week-1`…`week-4` labels on each issue (filterable on the *Split IQ* board). GitHub milestones would be the cleaner home, but the available GitHub tooling has no milestone-creation API — see note below.
- Move issues across **Todo → In-progress → In-review → Done** on the board as branches/PRs open and merge (`WORKFLOW.md` §status board).
- The two tracking issues (`#52` refactor, `#61` CI) stay open until their checklists are complete — `#61` closes in week 2, `#52` targets week 4.

> **Upgrading weekly labels → real milestones:** create four milestones in the
> GitHub UI (*Issues → Milestones → New milestone*) named `Week 1`…`Week 4` with
> the dates above (~2 min). Tell Claude when they exist and the issues can be
> reassigned from labels to milestones programmatically.

---

*Authored 2026-06-29. Sequences the backlog seeded the same day; see
`coach/PROJECT_MANAGEMENT_ANALYSIS.md` and `WORKFLOW.md`.*
