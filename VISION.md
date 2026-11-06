# SplitIQ — what this is

> Read this before `CLAUDE.md`. `CLAUDE.md` describes how the repo works; this
> describes what it is for, and it is the authority when the two disagree.
>
> Decided by Scott on 2026-11-06, in a session that inventoried the whole repo
> first. Where a line below is a decision rather than a fact, it says so.

## The one sentence

**A training app where the movements explain themselves.**

A 3D anatomical runtime shows what a lift actually does — which muscles work, how
hard, through the whole range — wrapped around a training log that models load
honestly. Not a logger with a video link next to "Back Squat".

## Who it is for

Anyone who lifts or rows and wants to understand a movement, not just record it.
Coaches explaining a lift, athletes learning one, people who want to know why the
bottom of a squat feels like that.

It is built as a **hobby and a learning exercise, to a public-quality standard**,
with the option of real users left open. That is not a contradiction: building it
properly is the interesting way to build it. It is not a business, and no decision
here should be read as planning for one.

## What it deliberately will not do

Each of these is a decision, not an oversight. They exist so future work does not
quietly reintroduce them.

- **No AI coaching.** Recommendations and plans are algorithmic — deterministic,
  parameterised, and testable. The LLM coach (`supabase/functions/coach-chat/`, the
  Coach tab, `coach_messages`) is removed, not fixed. It also sidesteps per-user
  inference cost and two external constraints a public AI feature would have had to
  answer for — the EU AI Act's chatbot disclosure duty and Strava's API terms on
  using its data in AI models. Both were read from secondary sources only; they are
  a bonus of this decision, not its basis.
- **No personal prescription engine.** Nothing in the app prescribes one athlete's
  season. Microcycles, roster regimes, event ladders and adaptive rules fitted to one
  person's June numbers are gone. Load modelling stays (below); prescription does not.
- **No attempt to replace Strava, Garmin, TrainingPeaks, Ergzone or Concept2
  Logbook.** That claim was written for an audience of one. Those products own
  device ecosystems, social graphs and sensor partnerships that are not code
  problems, and their free tiers set a price floor a load dashboard cannot clear.
  SplitIQ imports from them where it is useful and competes with none of them.
- **Never present modelled values as measured.** The anatomy data is a model. It is
  labelled as modelled everywhere it appears, activation is shown as a band and never
  a number, and no reference range is published without a source. This rule predates
  this document (`pipeline/squat-anatomy/CLAUDE.md`, golden rules 3 and 4) and is
  mechanically guarded by the prose scan in `web/src/squat/__tests__/content.test.js`.

## The shape

### The anatomy engine is the spine

`web/src/anatomy/` is a movement-neutral runtime: posing, skinning, colour and
camera maths, fixture-tested against the source page. `web/src/squat/` is the first
product built on it. The per-movement **data pipeline**
(`pipeline/squat-anatomy/`) is therefore not housekeeping — it is the engine that
decides whether this is one feature or a product. The package refactor and test
suite that landed in #402 / #406 are the most strategically important work in the
repo for that reason.

### Flagship movements, not a catalogue

One movement is a feature; a catalogue is a product. But every movement costs a
pipeline run, and `exercises` holds 873 rows, so a dataset for each is never
happening.

The shape is **a handful of compound movements done properly** — the high-bar back
squat ships today; deadlift, bench press, row and overhead press are the obvious
candidates. The exercise library links to an anatomy dataset where one exists and
stays plain text where it does not. Five done well beats eight hundred stubbed.

### Load stays, prescription goes

This is the fork, and it is decided. **Keep** the load model — CTL, ATL, TSB,
`sessionLoad`, readiness scoring, `derivePaceZones(cp)`. It is general, it takes its
inputs as parameters, it reads calibration from the per-user `anchors` table, and it
is well tested. **Cull** the layer that told one athlete what to do today.

### Personal data belongs in the database, not the source

The repo is public, deliberately — public CI, CodeQL, Dependabot and collaborators
are worth more than the privacy of a hobby project's internals. That is a decision,
and it holds.

It does **not** extend to health records. Blood pressure, medication, blood panels
and injury history move into Supabase behind the same row-level security that
already protects `vitals` and `anchors`, and out of tracked source. A public repo
and health records in constants files are separable problems, and only the second
one is a mistake.

Note that git history retains what has already been committed. Removing the files
going forward is the fix for the deployed app and for new readers; it is not
retroactive.

## What stays, unchanged

Easy to undersell while culling. All of this serves any user as-is:

- The data model. `sessions`, `vitals`, `anchors`, `coach_log`, the strength tables
  and the Strava tables are all keyed on `user_id` with owner-only RLS. Strava is
  already properly multi-user — it takes the user from the verified JWT subject.
- `/squat` and `web/src/anatomy/` entire. No personal data, no Supabase import.
- The pure utilities: load maths, pace, duration, dates, formatting, stats.
- The design system and its gates — the light/dark palettes, the token pointer
  table, and the colour, contrast and design-sync checks.
- The CI and test discipline: the bundle budgets, the ratcheting coverage gates, the
  zone-band and Context7 guards, the e2e suite, SHA-pinned actions.

## The cull list

Concrete, so it can be worked through and so nothing creeps back.

| What | Where |
|---|---|
| The LLM coach | `supabase/functions/coach-chat/`, the Coach tab, `coach_messages` |
| Microcycles, roster regimes, session overrides, the annual arc | `web/src/constants/schedule.js`, `web/src/utils/schedule.js` (`getRosterMode`) |
| Athlete background, race target, event pathway, build sessions | `web/src/constants/program.js` |
| Adaptive rules and thresholds fitted to one athlete | `web/src/constants/coaching.js` |
| Personal calibration, HR bands in absolute bpm, power-duration table | `web/src/constants/trainingConfig.js` (keep `derivePaceZones`) |
| Macro targets and per-weekday meal programme | `web/src/constants/nutrition.js` |
| Health logs, decision log, hypotheses, niggles | `web/src/constants/logs.js` → `health_markers` rows |
| Rehab-specific routines | `web/src/constants/mobility.js` → generic routines + per-user assignment |
| Inline medication and weight-loss content | `web/src/views/RecoveryView.jsx` |

The views that consume these change with them: Calendar, Overview, Program,
Journal, Recovery and the strength logger all read the constants above.

Open issues that only serve one athlete's season close with the cull. The backlog
audit (`coach/BACKLOG_AUDIT_2026-11-05.md`) classified them; roughly eight of about
thirty are in that bucket.

## Obligations that outlive any plan

- The anatomy geometry is derived from **BodyParts3D © DBCLS, CC BY-SA 2.1 JP**.
  Distributing the data requires attribution, a statement that changes were made,
  and the same licence on the derived data. Share-alike applies to the data files,
  not to the code that reads them. See `NOTICE.md` and
  `web/src/squat/assets/LICENSE.md`.
- The OpenSim / SimTK model terms are recorded but **not yet read**
  (`NOTICE.md`). That is an open item before any wider distribution.
- The code is proprietary (`LICENSE`), with named exceptions in `PERMISSIONS.md`.

## How to read this against the rest of the docs

`CLAUDE.md` still opens by describing a personal coaching dashboard with a solo
user, and names replacing commercial apps as the vision. **That framing is
superseded by this file** and needs rewriting; until it is, prefer this document.

`CLAUDE.md` remains correct and authoritative on how the repo *works* — the
architecture layers, the Supabase gotchas, the CI gates, the agent pipeline.
