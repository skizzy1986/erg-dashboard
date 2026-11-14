# SplitIQ product roadmap

> The decided roadmap. `VISION.md` is the authority where they disagree. Tracked by epic
> [#432](https://github.com/skizzy1986/SplitIQ/issues/432). The evidence behind
> every line is the Gate 1 packet,
> [`roadmap/ROADMAP_PACKET_2026-11-07.md`](roadmap/ROADMAP_PACKET_2026-11-07.md), with its
> two research appendices. The squat tool's own candidate-PR list is
> [`../pipeline/squat-anatomy/docs/ROADMAP.md`](../pipeline/squat-anatomy/docs/ROADMAP.md);
> this file sequences it, it does not replace it.
>
> Approved by Scott at Gate 1 on 2026-11-07: D1–D11 as recommended, R1–R18 to proceed.
> H2 and H3 are hypotheses until the walkthroughs (R1) and the second movement decide them.
>
> Amended 2026-11-13 after the `VISION.md` amendment (#515): D13–D18, and a second track
> for the log (L1–L3), tracked by epic
> [#511](https://github.com/skizzy1986/SplitIQ/issues/511). D19 records an intention
> to deepen the squat tool; it approves nothing.

## What SplitIQ is

A training app where the movements explain themselves. A coach opens it on a phone beside
the rack to show a lifter what a squat does: orbit a skeleton with 118 muscles, scrub to
any depth, see which muscles work and roughly how hard, and see what the bottom position is
doing. The athlete gets the same view, then logs the session in the same place against a
load model that does not claim more than it can support. The anatomy engine is the spine.
The log around it is a product in its own right: it plans deterministically, reads at a
simple or an expert depth, and can be shared with a coach (D13, 2026-11-13).

**Why anyone would love it.** No other product found shows modelled muscle activation
through the full range of motion, with its sources and limits on the page, free, in a
browser. The closest paid product publishes no methodology for its activation display;
the free web atlases make no activation claim at all (packet §6a, read directly). The
EMG-validation literature supports showing activation as a band, not a number: agreement
is pattern-level, and rectus femoris was missed in squat simulation (research §3).

**What it is not.** Not a logger with videos (Hevy, Strong, JEFIT). Not a catalogue
(Muscle & Motion has 1,200+ exercises; five done well beats eight hundred stubbed). Not a
coaching-business platform (TrueCoach, Trainerize, Hevy Coach own programme delivery,
billing and messaging). A coach reading the log an athlete shares is in (L3); the business
around it is not. Not a load dashboard competing with Intervals.icu, which is free
and complete.

## Who it is for

| Persona | Job | Comes back for |
|---|---|---|
| **The coach** explaining a lift to a group or a client | Make a lifter understand a position in one pass, on a phone, in seconds | A link they can send; a view that works on a gym-floor phone, offline after first visit |
| **The athlete** learning or re-learning a movement | Understand why a position feels the way it does and what correct looks like | Contrast: a fault shown against the ideal, and a second lift to learn |
| **The self-coached lifter or rower** | Record sessions and understand what the numbers and the movement mean | Logging "Back Squat" and getting a one-tap "see this modelled" |
| **Someone who just wants to track workouts** (added 2026-11-13) | Record training without learning the model | A log that is complete at the simple depth |

From L3, the coach also reads the training an athlete has chosen to share and sets their
plan. That is the same person as the first row, not a fifth persona.

No coach or lifter has yet been observed using `/squat`, and no study exists of 3D
activation visualisation for lifters. R1 fixes the first; nothing fixes the second, so no
learning-gain claim is made anywhere.

## The horizons

Sizes: **S** ≤ half a day, **M** ≈ a day, **L** 2+ days of pipeline time. Every item runs
through `/orchestrate <item>` with its own Gate 2 and Gate 3, one PR per item, `Part of
#432`, `Closes #<its issue>`.

### H0 — Foundations (in flight)

| # | Item | Issue | Size | Blocks |
|---|---|---|---|---|
| R1 | Five coach/athlete walkthroughs of `/squat`. Also ask each coach whether they would want an athlete's shared log here: the only evidence L3 will have before it is built | [#433](https://github.com/skizzy1986/SplitIQ/issues/433) | S | All of H2 (D10) |
| R2 | Read the SimTK/OpenSim model terms and OpenCap terms (Scott, D8) | [#434](https://github.com/skizzy1986/SplitIQ/issues/434) | S | R11, R26–R28, R21, any invite beyond Paul |
| R3 | Health data out of source and bundle (reorientation slice 4a) | [#416](https://github.com/skizzy1986/SplitIQ/issues/416) | S | R11, R26–R28, any invite beyond Paul |
| R4 | Migration for the `exercises` seed and the three un-migrated views | [#435](https://github.com/skizzy1986/SplitIQ/issues/435) | M | R22. **#429 first**, or the migration can merge and never apply |
| R5 | Backup gaps | [#428](https://github.com/skizzy1986/SplitIQ/issues/428) | M | R31 |
| R6 | Reorientation slices 4b–12 | [#417–#425](https://github.com/skizzy1986/SplitIQ/issues/412) | per #412 | — |
| R33 | Privacy research note (D17): what holding another person's training and health data requires, from primary sources (the Privacy Act, OAIC guidance), marked as not legal advice. Scott decides after it whether a professional opinion is needed | — | S | R37, all of L3, R31 |

H1 may run beside slices 4b–12 under D6's fences: #416 first; no `CLAUDE.md` edits outside
slice 11 (#424); at most two open PRs, one cull and one roadmap; rebase on the shared files
(`web/vite.config.js`, `web/scripts/check-bundle-size.mjs`, e2e and visual snapshots,
`RouteRoot.jsx`). The log track (L1–L3) takes turns with H1 in the one roadmap slot; it is
not a third stream (D16).

### H1 — Make the squat the product it claims to be (about three months of hobby time)

Done when a coach can send a link that opens at a chosen depth, time and selected muscle,
and every chart is readable by keyboard.

| # | Item | Issue | Size | Depends on |
|---|---|---|---|---|
| R7 | Bundle headroom baseline and per-PR re-measure convention | [#436](https://github.com/skizzy1986/SplitIQ/issues/436) | S | — |
| R8 | Time axis: play, pause, scrub, speed via `meta.rep` | [#407](https://github.com/skizzy1986/SplitIQ/issues/407) | M | R7 |
| R9 | Charts: angles, moments, force, activation, length, each with a data table | [#437](https://github.com/skizzy1986/SplitIQ/issues/437) | L | R7, R8, D9 |
| R10 | "How this was modelled and what it cannot say" page | [#438](https://github.com/skizzy1986/SplitIQ/issues/438) | S | — |
| R11 | Share-a-view v1: copy-link over hash state, camera in the hash | [#439](https://github.com/skizzy1986/SplitIQ/issues/439) | S–M | R3, R8 |
| R12 | Movement config object; extract the squat behind it, no behaviour change | [#440](https://github.com/skizzy1986/SplitIQ/issues/440) | M | R7 |
| R13 | Data-driven barbell and attach frame | [#441](https://github.com/skizzy1986/SplitIQ/issues/441) | M | R12 |
| R14 | Generalised phases from config | [#442](https://github.com/skizzy1986/SplitIQ/issues/442) | S–M | R12 |
| R15 | Multi-dataset bundle rule and generalised `squat-` chunk naming | [#443](https://github.com/skizzy1986/SplitIQ/issues/443) | M | R12 |
| R16 | Generalise the prose scan over per-movement content | [#444](https://github.com/skizzy1986/SplitIQ/issues/444) | M | R12 |
| R17 | Measure real phone performance for the 3D chunk and data | [#445](https://github.com/skizzy1986/SplitIQ/issues/445) | S | R7 |
| R18 | Refresh `docs/onboarding/*` | [#446](https://github.com/skizzy1986/SplitIQ/issues/446) | S | — |

### H2 — Second and third flagship movements (not yet approved; gated on R1)

Done when a second dataset ships with the prose scan green. D2: the deadlift, conditional
on the R19 spike; the low-bar variant first if the new-route cost is high.

| # | Item | Size | Depends on |
|---|---|---|---|
| R19 | Feasibility spike, deadlift data route: are the curve definitions, static matrices and leg frames body-intrinsic, so a new movement needs only new joint trajectories? 59% of the squat payload comes from a lost v1 generator (inventory §3); whether that blocks a second movement is the question. Also measure shared geometry vs per-movement motion. | L | R2, R7 |
| R20 | Pipeline generalisation: parameterise `BW`, `MBAR`, `bar_seat`, `META.frames`, the STL list; optionally split a shared body pack from a per-movement motion pack (a second whole dataset would exceed the 2.3 MB cap) | L | R19 |
| R21 | Second flagship dataset end to end: data, content, references, prose-scan coverage, tests | L (several) | R12–R16, R20 |
| R22 | Exercises → anatomy link, squat first: a small code map from exercise id to movement key, a "see it modelled" link from `StrengthLogger`; `exercise_media.model_3d_key` stays unread until there is more than one movement | S–M | R4 |
| R23 | Movement index page and a side-by-side view of two movements | M–L | R20, R21, R17 |
| R24 | Within-movement contrasts on the squat: low-bar variant, then a fault ghost overlay (pipeline roadmap items 6–7) | L each | R12, R20 |
| R25 | Third movement, chosen after R1 and the second ship | L | R1, R21 |

### H3 — Coach and athlete surfaces on `/squat` (not yet approved)

Done when a coach can use `/squat` on a phone without Scott present. A coach reading an
athlete's shared log is a different surface and lives in L3.

| # | Item | Size | Depends on |
|---|---|---|---|
| R26 | Share-a-view v2: canvas image capture and one static social preview image | M | R3, R11 |
| R27 | Embed mode: iframe with minimal chrome (check `vercel.json` frame headers first) | M | R3, R11 |
| R28 | Printable coaching card: phase cues, form check labelled "Reference ideal, modelled", sources and link | M | R10 |
| R29 | Present mode: large controls, panels hidden, offline after first visit | M | R8, R17 |
| R30 | Annotation: pinned muscles plus a short note in the URL hash (parked, no evidence yet) | M | R11 |
| R31 | Open sign-up, password reset, remove `VITALS_USER_ID` pinning — **only if D3 is revisited after H2**; needs a health-data opinion first (R33 is its first step). L3's invite path (R41) is separate and stays invite-only | L | R3, R5, R33 |
| R32 | Rowing stroke anatomy feasibility note, research only (D5): no 3D stroke anatomy was found anywhere, and rowing coaches' stated pain is team data admin, not stroke understanding | S | after R21 |

**Parked, signal needed:** measured-rep importer and OpenCap overlay (pipeline roadmap
items 2–3; needs OpenCap terms and evidence that athletes hold `.mot` files), kinetics
upgrade, OpenSim-API muscle mechanics, load/tempo and grip controls, per-user
anthropometry, a clothed body with x-ray mode (SMPL-X Body is CC BY 4.0 but has no
muscles and carries a patent note).

### Squat depth — intention recorded 2026-11-13 (D19), nothing approved

Scott's intention: make the squat tool the best it can be before the product spreads
wider. The UI is not polished to the standard he wants, and the candidates below are his.
Nothing here is sized or approved. R44 runs first and its Gate 1 decides what is built and
in what order; until then H1 and H2 stand as written.

| # | Item | Size | Depends on |
|---|---|---|---|
| R44 | Squat deep dive: usability, usefulness and feature candidates for `/squat`. A design critique and accessibility review of the tool as shipped, a scan of what comparable tools do, and a ranked candidate list with the evidence for each. R1's walkthroughs are the only observed-user evidence and fold in when they exist. Ends at a Gate 1 packet | M | — (R1 feeds it) |

| Candidate | What is already known | Needs first |
|---|---|---|
| UI polish pass | Scott's judgement is that it is well short of the standard he wants. No item above covers visual polish as such | R44 |
| Variants: low-bar, front squat, sumo stance | The pipeline roadmap's item 6 already scopes low-bar, front squat and stance as presets (bar seat, grip, trunk solve, an optional femur-to-torso scale) with cited targets per variant, and R24 already holds low-bar. A second whole dataset would exceed the 2.3 MB data cap (R20) | R12, R19, R20 |
| Female model | The kinetics use male segment parameters (de Leva 1996, 85 kg) and the geometry is one BodyParts3D body. It needs a geometry source with muscles under a licence compatible with CC BY-SA, female segment parameters, and reference ranges re-checked for the new body. Per-user anthropometry is parked above | A research spike |
| Skinned body, and avatars as brand representatives | A skin surface over the muscle model. SMPL-based bodies are ruled out on licence, and SMPL-X Body is parked above (no muscles, a patent note). Anything derived from BodyParts3D carries CC BY-SA, so anyone may reuse an avatar built on it; a brand-exclusive avatar needs its own mesh source | R2, a research spike |

This deepens H1 and H2. Coach access is built after H2 (D14), so every item approved here
moves L3 further out. R44's Gate 1 is where that trade is made.

## The log track (added 2026-11-13, D13–D18)

The horizons above sequence the anatomy half. This track sequences the log half that
`VISION.md` widened on 2026-11-13: one coherent dashboard, a deterministic planner, and a
coach working with what an athlete shares. It is tracked by epic
[#511](https://github.com/skizzy1986/SplitIQ/issues/511), whose item letters are
given in brackets. Each item still runs through `/orchestrate` with its own gates, and
takes the roadmap PR slot in turn with H1 (D16).

### L1 — One coherent log (runs beside H1)

Done when every user-visible name says SplitIQ, the desktop uses the four destinations with
URLs, and the dashboard has a light/dark/auto control.

| # | Item | Size | Depends on |
|---|---|---|---|
| R34 | One name everywhere (B): user-visible self-names, the APK display name and `applicationId` (a new Android identity, accepted at #511's Gate 1), version read from `package.json`, a phase-free eyebrow, a PWA description from `VISION.md`, and a guard test. The README title belongs to #424 | S–M | — |
| R35 | Residue the cull misses (C): the unowned list in #511 §5. May ship with R34 | S | — |
| R36 | Dashboard theme control honouring `splitiq.theme` (F). `StrengthLogger.jsx` stays light until #79. Re-measure the dashboard entry budget first | M | — |
| R37 | Coach access **spec only** (D): relationship and consent, per-category grants, RLS read policies, the plan-write policy, the invite path, and how the `coach_log` / `source = 'coach'` names are reconciled. Runs to Gate 2 and stops (D14) | M | R33 |
| R38 | Desktop adopts the four destinations with URL routing and one session hook (E) | L | R6 slices #420–#423, R37 |
| R39 | Depth preference: simple or expert per user, simple by default (`VISION.md`, *One dataset, two depths*). Not in #511; added here so the principle has an item | M–L | R38 |

### L2 — Deterministic planning (after the cull)

Done when a user sets their own parameters and gets planned sessions on the calendar, and
the same inputs always give the same plan.

| # | Item | Size | Depends on |
|---|---|---|---|
| R40 | Planner v1, self-serve (D15): per-user parameter rows (availability, goal, template), pure planner functions, output as `sessions` rows with `status = 'planned'`. No coach involvement | L | R6 complete |

### L3 — Coach access (not before H2, D14)

Done when an invited coach can read exactly what one athlete has granted, and nothing else.

| # | Item | Size | Depends on |
|---|---|---|---|
| R41 | Invite path for a second account. Invite-only, so D3 holds; scope settled by R37 | M | R5, R33, R37 |
| R42 | Coach–athlete relationship, grants and RLS, built to R37's spec, with every policy tested as denied by default | L | R37, R41, H2 done |
| R43 | Coach view in the four destinations, and coach-set plans through the planner | L | R38, R40, R42 |

## What we are not building

| Not building | Why |
|---|---|
| An exercise catalogue | `VISION.md`: five done well beats eight hundred stubbed. The 1,200-exercise catalogue is Muscle & Motion's ground. |
| AI or LLM anything | `VISION.md`: no AI coaching. `check:no-llm` guards it; the coach was removed in #427 and #430. |
| A one-athlete prescription engine | `VISION.md`: no prescription fitted to one person in the source. The cull list (#412) removes the last of it. The generic planner (L2) is in (D18). |
| Coaching-business features: messaging, billing, client onboarding, a programme marketplace | Not a business (D4). TrueCoach, Trainerize and Hevy Coach own this. A coach's list of the athletes who shared with them is in (L3, D18). |
| A load-dashboard feature race | Intervals.icu is free and complete; the load model stays as honest context. The 2026 ACWR meta-analysis says ratio-style load is not a stand-alone predictor, so the wording stays descriptive, never a verdict. |
| SMPL-based bodies | The model licence is non-commercial and forbids making the data available to third parties at all, which a public web app does. Read directly, packet §6a. |
| Z-Anatomy parts | Its inner-ear and kidney parts are NC-licensed; NC parts would break the CC BY-SA data licence. |
| Video or pose form-check | Accuracy is unvalidated (0–95.5% by camera placement) and it would blur modelled and measured, which `VISION.md` forbids. |
| Team logging | A different product (team erg data admin). Coach access is one coach reading one athlete's grant; no squad or crew aggregate (D18). |
| Anything on the `VISION.md` cull list | By definition. |

## Obligations that travel with every item

- Never present modelled values as measured. Activation is a band, never a number. Every
  reference range has a source in `docs/squat/REFERENCES.md`. No `EMG` in muscle-role
  prose. `web/src/squat/__tests__/content.test.js` is the mechanical guard, and R16
  generalises it.
- BodyParts3D is CC BY-SA 2.1 JP: attribution on every screen that can show the anatomy,
  a statement that changes were made, and the same licence on every derived data file,
  including any second movement's. The code that reads the data stays under the root
  `LICENSE`.
- The SimTK/OpenSim and OpenCap terms are not yet read (R2). Nothing is promoted beyond
  the current collaborator until they are.
- Coverage thresholds and bundle ceilings never go down. The one granted raise is D9
  (`SQUAT_TOTAL` for charts, with `SQUAT_ENTRY` held at 117 KB).
- `/squat` never imports `supabaseClient.js`. No personal data in a shareable link.
- Health data lives in the database behind owner-only RLS, never in tracked source or a
  public chunk. Before any real user beyond invitation, get a proper read on the Privacy
  Act's health-service position (secondary sources only so far). R33 is the first step,
  and no coach reads an athlete's row before it (D17). Coach access adds per-category
  grants on top of owner-only RLS; it never loosens it.

## Bundle baseline — measured 2026-11-07 at `bdac9fb` (after slice 4a, #447)

Re-measure with `npm run build && npm run size` before any PR that touches `/squat`'s
static graph; never quote this table as current. The PR template asks for the five squat
figures in the body of every such PR (R7, #436).

| Budget | Measured | Ceiling | Spare |
|---|---|---|---|
| Dashboard entry | 146.8 KB | 150 KB | 3.2 KB |
| Dashboard total | 377.5 KB | 400 KB | 22.5 KB |
| Squat entry | 116.4 KB | 117 KB | **0.6 KB** |
| Squat total | 27.6 KB | 30 KB | 2.4 KB |
| Squat 3D | 138.2 KB | 145 KB | 6.8 KB |
| Squat data | 2,202,168 B | 2,300,000 B | ~98 KB |

## Decisions record

| # | Decided 2026-11-07 |
|---|---|
| D1 | Positioning as above |
| D2 | Second movement: deadlift, conditional on R19; low-bar variant first if the route is expensive |
| D3 | Invite-only through H2 |
| D4 | "Not a business" is absolute; licences, privacy and store rules stay in scope as obligations |
| D5 | Rowing stroke anatomy: research note only (R32), after the second movement |
| D6 | H1 runs beside reorientation slices 4b–12 under the fences above |
| D7 | Keep the 2D StrengthLogger heatmap and the anatomy runtime; relabel the 2D map as tagged muscles |
| D8 | Scott reads the SimTK/OpenSim and OpenCap terms |
| D9 | `SQUAT_TOTAL` may rise to measured + ~2 KB for lazy charts; `SQUAT_ENTRY` held |
| D10 | H2 is gated on R1 |
| D11 | This file is the roadmap; the pipeline's `docs/ROADMAP.md` stays as the squat candidate-PR list |
| D12 | 2026-11-13: Docs-only PRs sit outside D6's two-open-PR fence |
| D13 | 2026-11-13: Positioning amended with `VISION.md` (#515). The anatomy engine stays the spine; the log plans, reads at two depths and can be shared with a coach. Replaces D1's "the log is the context around it" |
| D14 | 2026-11-13: Coach access is specified now (R37) and built after H2 (L3). D3 holds: it is invite-only, and open sign-up (R31) stays parked |
| D15 | 2026-11-13: The self-serve deterministic planner ships before coach-set plans (L2 before R43) |
| D16 | 2026-11-13: The log track (L1–L3) is on this roadmap and takes turns with H1 in the one roadmap PR slot. D6's two-open-PR fence holds |
| D17 | 2026-11-13: Privacy read starts with a `/research` note from primary sources (R33). Scott decides after it whether a professional opinion is needed. No coach reads an athlete's row before then |
| D18 | 2026-11-13: "Not building" narrowed to match `VISION.md`. One-athlete prescription, coaching-business features and team logging stay out; the generic planner and a coach's list of athletes are in. D4 is unchanged |
| D19 | 2026-11-13: Intention recorded, nothing approved: a deeper pass on the squat tool (UI polish, variants, a female model, a skinned body and brand avatars). R44's deep dive runs first and its Gate 1 decides the build |

A changed decision is a new row here with the date, not an edit to the old one.
