# Unification — Gate 1 packet (2026-11-13)

`/orchestrate "unify the disparate elements of this app into a coherent product with a
sound philosophy"`. Stages 1 (research) and 2 (story) done, both read-only, tree clean
after each. **Waiting on Scott at Gate 1.** Nothing is built.

## Framing

The philosophy is not missing: `VISION.md` (2026-11-06) is it, and the #412 cull
(slices 4b–12) is executing it. This run targets what the cull does not: the seams
that make SplitIQ read as two apps by two authors.

## What research found (main @ d3153d7)

- **Two products, one-way link.** `/squat` links to the dashboard
  (`SquatHeader.jsx:235`); nothing in the dashboard links to `/squat`.
- **Two muscle vocabularies.** `StrengthLogger.jsx` draws its own 2D heatmap
  (`normalizeMuscle`, `:1077-1231`) with no shared ids with the 118-muscle model.
  `exercise_media.model_3d_key` exists and is unread.
- **Two IAs.** Desktop: 11 local-state tabs, no URLs. Mobile: 4 hash-routed
  destinations (`constants/destinations.js`), whose comment says desktop would adopt
  them "in S3". Different session hooks per surface (`useSessionLog` vs `useSessions`).
- **Four names.** SplitIQ (web, PWA, login); "Erg Dashboard" (APK `appName`,
  `strings.xml`, README); "v1.2 beta" vs package 1.3.0; eyebrow "ERG + STRENGTH ·
  BASE". PWA description "Performance intelligence for serious athletes." matches
  nothing in VISION.
- **One theme, two behaviours.** `/squat` has Light/Dark/Auto (`splitiq.theme`); the
  dashboard is light-only and ignores the key.

## Candidate stories, after checking overlap against issue bodies

| #   | Story                                                                                                                                                                                                   | Status after overlap check                                                                                                                                                                                     | Scott decision                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | **One name everywhere** — every user-visible self-name says SplitIQ; version from `package.json`; phase-free eyebrow; PWA description from VISION's sentence; a guard test stops regressions            | **Unowned.** README title belongs to #424                                                                                                                                                                      | APK: display name only, or `applicationId` too?                        |
| 2   | **Residue the cull misses** — `STRENGTH_TEMPLATES`/`PREHAB_NOTE` injury/FIFO copy; `App.jsx:33-52` dead roster banner; `destinations.js`/`MobileTrain.jsx` "prescription"/`PrescriptionCard` references | **Unowned** (Gate 2 packet line 1366 parks the templates as a follow-up). Dropped from the PM's draft: ErgView `'2026/'` (#422), phase/block display (#421 AC1 keeps it anchor-driven), `strengthTrend` (#423) | none                                                                   |
| 3   | One strength history source                                                                                                                                                                             | **Dropped** — #423 + #222 own it, and it is blocked on data, not code                                                                                                                                          | —                                                                      |
| 4   | Bridge dashboard → `/squat`                                                                                                                                                                             | **Is R22** (roadmap: "see it modelled" link from `StrengthLogger`, after R4/#435). Fold in, do not duplicate                                                                                                   | none here                                                              |
| 5   | **Shared theme** — dashboard honours `splitiq.theme`                                                                                                                                                    | Unowned. `StrengthLogger` (vanilla DOM, own CSS) would stay light in dark mode                                                                                                                                 | Control now / control excluding logger / defer / light-only by design? |
| 6   | **One IA** — desktop adopts the destinations, hash routing, one session hook                                                                                                                            | Unowned, but **must wait for slices 7–10**, which delete several desktop tabs                                                                                                                                  | Desktop adopts the 4 destinations / shared names only / neither?       |

## Out of scope

The cull slices (#420–#425, PRs #500, #506); R4/#435 seeding; R22's exercise→dataset
mapping; new anatomy movements; a `StrengthLogger` rewrite; replacing the 2D heatmap
with the 3D model (park until R22); anything LLM or prescription.

## Recommendation

Spec **1 + 2 together** as one PR ("coherence pass: names and residue") — both are
string/copy-level, independent of the cull, low risk, and visible on every surface.
Answer the decisions on 5 and 6 now so they are queued, not blocking; 6 cannot start
before #423 lands regardless.

## Gate 1 response (Scott, 2026-11-13)

**Not an approval of 1 + 2 — a widened vision:**

> SplitIQ as both a professional tool that coaches can use with their athletes, and
> approachable for anyone who wants to track workouts, with deterministic session
> planning and fitness metrics represented meaningfully, as granular or as
> straightforward as each user wants.

Decisions recorded:

- **APK:** rename the display name **and** `applicationId`. Accepted cost: a new
  Android identity, so existing installs do not upgrade in place.
- **Theme:** full light/dark/auto control on the dashboard now, accepting that
  `StrengthLogger` stays light until it is rewritten (#79).
- **IA:** after the cull, desktop adopts the four destinations with URL routing.

### Where this departs from `VISION.md` (which is the authority until amended)

1. **Coaches with athletes.** VISION's audience includes "coaches explaining a
   lift", not coaches holding athletes' data. Every user table is owner-only RLS.
   A coach seeing an athlete's sessions means a relationship table, consent, and
   new read policies on `sessions`, `vitals`, `strength_*`, `anchors`, plus a
   sign-up path (none exists). Health records now moving into the DB (slice 4b,
   #500) are the sharpest case: they need an explicit per-category share scope,
   not inherited access.
2. **Deterministic planning.** VISION already allows "plans are algorithmic —
   deterministic, parameterised, testable" but says "no personal prescription
   engine". The new line is a **generic** planner parameterised per user (or set
   by a coach), never rules fitted to one athlete. The cull is still right: it
   deletes one-athlete literals, not a generic engine. D14 (planned sessions as DB
   rows) is the foundation a planner would write to.
3. **Granular or straightforward.** Progressive disclosure — the same data at a
   simple and an expert depth — is a design principle VISION does not state yet.
   It also settles the IA question: four destinations at the simple depth.

### Proposed sequence

1. **Amend `VISION.md`** with the three points above. Scott's decision, one docs PR.
2. **Stories 1 + 2** (names, residue). Neutral to the new vision; can run now.
3. **Coach ↔ athlete** gets its own `/orchestrate` run. It is a data-model and
   RLS epic, not a UI change, and it should be specified before the four-destination
   IA so the IA has a coach view to place.
4. Theme and IA queue behind the cull, as decided.
