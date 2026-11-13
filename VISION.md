# SplitIQ — what this is

> Read this before `CLAUDE.md`. `CLAUDE.md` describes how the repo works; this
> describes what it is for, and it is the authority when the two disagree.
>
> Decided by Scott on 2026-11-06, in a session that inventoried the whole repo
> first. Where a line below is a decision rather than a fact, it says so.
>
> **Amended 2026-11-13** (#511). Three things widened: a coach can work with the
> training their athletes choose to share; a generic deterministic planner is in;
> and every surface reads at a simple depth or an expert one. Nothing on the cull
> list comes back. Amended passages carry the date.

## The one sentence

**A training app where the movements explain themselves.**

A 3D anatomical runtime shows what a lift actually does — which muscles work, how
hard, through the whole range — wrapped around a training log that models load
honestly, plans deterministically, and reads as simply or as deeply as its user
wants. Not a logger with a video link next to "Back Squat".

## Who it is for

Anyone who trains and wants to understand it, not just record it (widened
2026-11-13). Three people use the same app:

- **Someone who wants to track workouts** and think no further about it. The simple
  depth (below) is complete for them; it is not a teaser for the rest.
- **An athlete who wants the detail**: load, zones, the movement modelled, why the
  bottom of a squat feels like that.
- **A coach working with their athletes**: explaining a lift, as before, and now
  also reading the training an athlete has chosen to share and setting their plan.

"Coach" in this document means a person. The `coach_log` table and the
`source = 'coach'` / `origin = 'coach'` values predate that meaning: there, "coach"
was Claude writing through the database connector. That clash of names is settled
when coach access is specified.

It is built as a **hobby and a learning exercise, to a public-quality standard**.
That is not a contradiction: building it properly is the interesting way to build
it. The widened audience makes other users a design requirement, where it used to be
an option left open: nothing may assume an audience of one. Opening sign-up is a
separate decision, and the roadmap's invite-only rule (D3) holds until it is changed.

It is still **not a business**, and no decision here should be read as planning for
one (roadmap D4). The coach capability does not change that. Any account can be a
coach, an athlete or both; there is no billing, no tier, no seat licence and no
organisation account.

## What it deliberately will not do

Each of these is a decision, not an oversight. They exist so future work does not
quietly reintroduce them.

- **No AI coaching.** Recommendations and plans are algorithmic — deterministic,
  parameterised, and testable. The LLM coach (`supabase/functions/coach-chat/`, the
  Coach tab, `coach_messages`) is removed, not fixed. It also sidesteps per-user
  inference cost and two external constraints a public AI feature would have had to
  answer for — the EU AI Act's chatbot disclosure duty and Strava's API terms on
  using its data in AI models. Both were read from secondary sources only; they are
  a bonus of this decision, not its basis. A person coaching through the app is not
  AI coaching, and neither is the planner below: it is ordinary, tested code.
- **No prescription fitted to one person in the source.** Nothing in the code
  prescribes one athlete's season. Microcycles, roster regimes, event ladders and
  adaptive rules fitted to one person's June numbers are gone, and they stay gone.
  Load modelling stays, and a generic planner is in (both below, amended 2026-11-13).
- **No attempt to replace Strava, Garmin, TrainingPeaks, Ergzone or Concept2
  Logbook.** That claim was written for an audience of one. Those products own
  device ecosystems, social graphs and sensor partnerships that are not code
  problems, and their free tiers set a price floor a load dashboard cannot clear.
  SplitIQ imports from them where it is useful and competes with none of them.
  Coach access does not reopen this. It is not a coaching-business platform: no
  billing, no messaging, no client onboarding, no programme marketplace.
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

### Load stays, one-athlete prescription goes, generic planning is in

This is the fork, and it is decided. **Keep** the load model — CTL, ATL, TSB,
`sessionLoad`, readiness scoring, `derivePaceZones(cp)`. It is general, it takes its
inputs as parameters, it reads calibration from the per-user `anchors` table, and it
is well tested. **Cull** the layer that told one athlete what to do today.

**Add** a generic planner (decided 2026-11-13). What separates it from the layer
that was culled is where the specifics live:

- **In the source:** rules and templates that hold for any user, written as pure
  functions. The same inputs give the same plan. No randomness, no model inference,
  and tests cover every rule.
- **In the database, per user:** everything that makes a plan one person's.
  Calibration (`anchors`), availability, the goal, and the chosen template with its
  parameters are rows, set by the user or by a coach they have accepted.
- **The output:** `sessions` rows with `status = 'planned'`, the same rows the
  calendar already renders (reorientation decision D14). A plan is not a second
  data model.

A literal that names a person, a date in one person's season, or a number fitted to
one person's results is the defect the cull removed. It does not return as a
"default".

A planned session is never shown or counted as a completed one. The load model
counts completed sessions only, and that stays true whoever wrote the plan.

### One dataset, two depths

Decided 2026-11-13. Every surface shows the same data at a simple depth and an
expert depth, and the user chooses which.

- **The simple depth is the default, and it is complete.** Someone who never leaves
  it has a working training log.
- **The expert depth adds detail and never contradicts the simple one.** Both come
  from the same functions: the simple readout is a summary of the expert numbers,
  not a second calculation.
- **A metric says what it means before it says its number.** At the simple depth
  that is plain words that describe; at the expert depth it is the figure and how it
  was derived. Neither depth turns a load figure into a verdict or an instruction.
- **Depth is a preference, not a tier.** Nothing is locked.
- **The four destinations are the simple depth's structure on every screen size:**
  Today, Train, Progress, Body (`web/src/constants/destinations.js`). The desktop
  tab row predates them and folds into them once the cull has landed.

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

### A coach sees what an athlete shares, and nothing else

Decided 2026-11-13 that coaches work with athletes' data. The rules below are the
principle that work is specified against. None of it is built: every user table is
owner-only today, and there is no sign-up path.

- **Owner-only stays the default.** Coach access is added policy on top of it. No
  existing policy is loosened to make room.
- **The athlete grants and the athlete revokes.** A coach can invite; nothing is
  readable until the athlete accepts, and revoking ends access at once.
- **Sharing is by category, and health records never ride along.**
  - The relationship itself covers the training log and calibration: sessions,
    strength workouts and sets, `anchors`. A coach cannot do the job without them.
  - Daily vitals are a separate grant.
  - Each health-record category (blood pressure, medication, blood panels, injury
    history) is its own grant, off by default. It is never implied by the
    relationship or by any other grant.
- **A coach reads what is shared and writes only plans.** What the athlete did is
  the athlete's record, and a coach never edits or deletes it. Health records are
  never writable by a coach.
- **A grant is to one named coach** and cannot be passed on.
- **The database enforces it.** Access is row-level security, tested as denied by
  default. Hiding something in the UI is not access control.

Open before this is specified: the sign-up path (roadmap R31), the privacy reading
under *Obligations* below, and athletes under 18, whose consent is not theirs alone
to give.

## What stays, unchanged

Easy to undersell while culling. All of this serves any user as-is:

- The data model. `sessions`, `vitals`, `anchors`, `coach_log`, the strength tables
  and the Strava tables are all keyed on `user_id` with owner-only RLS. Strava is
  already properly multi-user — it takes the user from the verified JWT subject.
  Coach access (above) adds to this model and does not replace it.
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

The 2026-11-13 amendment takes nothing off this list. The generic planner is new
code written to the rule under *The shape*, not a revival of these files.

## Obligations that outlive any plan

- The anatomy geometry is derived from **BodyParts3D © DBCLS, CC BY-SA 2.1 JP**.
  Distributing the data requires attribution, a statement that changes were made,
  and the same licence on the derived data. Share-alike applies to the data files,
  not to the code that reads them. See `NOTICE.md` and
  `web/src/squat/assets/LICENSE.md`.
- The OpenSim / SimTK model terms are recorded but **not yet read**
  (`NOTICE.md`). That is an open item before any wider distribution.
- The code is proprietary (`LICENSE`), with named exceptions in `PERMISSIONS.md`.
- **Other people's data** (added 2026-11-13). Holding a second person's training or
  health data may bring privacy-law duties with it, business or not. That has
  **not yet been read**. It is an open item before any coach reads an athlete's
  row, and before a second person's health records are stored at all.

## How to read this against the rest of the docs

`CLAUDE.md` still opens by describing a personal coaching dashboard with a solo
user, and names replacing commercial apps as the vision. **That framing is
superseded by this file** and needs rewriting; until it is, prefer this document.
That rewrite (#424) now also carries the 2026-11-13 amendment, as does the project
paragraph in `.claude/skills/erg-context.md`.

`docs/ROADMAP.md` was decided on 2026-11-07, before the amendment, and now
disagrees with this file in the places below. This file wins until the roadmap
records new decision rows.

| Roadmap line | What the amendment changes |
|---|---|
| D1 positioning: "the anatomy engine is the product; the log is the context around it" | The anatomy engine is still the spine, but the log is no longer only context: it plans and it is shared with a coach |
| Not building "a prescription engine" | Still true of one-athlete prescription; the generic planner is in |
| Not building "client management" and "team logging" | Billing, messaging and team logging stay out; a coach's list of the athletes who shared with them is in |
| H3 "done when a coach can use `/squat` on a phone" | Coach surfaces now include the athlete's shared log, not only `/squat` |
| D3 invite-only through H2, and R31 sign-up after H2 | Unchanged here, but coach access cannot ship without a sign-up path, so the sequence needs a decision |

Roadmap D4 ("not a business" is absolute) is unchanged and is relied on above.

`CLAUDE.md` remains correct and authoritative on how the repo *works* — the
architecture layers, the Supabase gotchas, the CI gates, the agent pipeline.
