# SplitIQ product roadmap — Gate 1 packet

> Produced by `/orchestrate roadmap on future app development (3d modelling of strength
> movements for coaches, athletes etc) …` on 2026-11-07, `main` at `0d8c204`. Session:
> https://claude.ai/code/session_018vVjPyHefMYsT9ZqH876nK.
>
> The Research and Story stages were read-only and the working tree was verified clean
> after every agent. **No application code has changed.** This file and its two research
> appendices are the only changes on the branch:
> [`RESEARCH_CODEBASE_2026-11-07.md`](RESEARCH_CODEBASE_2026-11-07.md) (the asset
> register, cited below as "inventory §N") and
> [`RESEARCH_MARKET_2026-11-07.md`](RESEARCH_MARKET_2026-11-07.md) (the market research,
> cited as "research §N"). Read this with `VISION.md` (the authority) and
> [`coach/REORIENTATION_EPIC_2026-11-06.md`](../../coach/REORIENTATION_EPIC_2026-11-06.md)
> (the cull it sequences after).
>
> **Privacy.** Health data is described by shape only — never by value. Keep it that way
> in every issue and PR derived from this plan.

## Status

| | |
|---|---|
| **Pipeline position** | **Stage 2 (Story / Roadmap) at GATE 1.** Nothing past this gate runs until Scott decides D1–D11 (§7 below). |
| **Classification** | Strategy work, not a feature. Stages 3–7 of the chain (spec, build, review, ship) do not apply to this packet; they apply **per approved roadmap item** afterwards. |
| **How to continue** | Reply in the session, or comment on the draft PR with decisions by number ("D1 accept, D2 deadlift, …" and "go on R1–R18"). The next step after Gate 1 is: move the approved roadmap to its home (D11), open one roadmap epic issue plus one sub-issue per approved item, then `/orchestrate <item>` one at a time. |
| **Models** | Research stages on sonnet (skill pins); synthesis on sonnet (skill pins the Product Manager). The orchestrator amended, it did not rewrite. |

## Orchestrator amendments to the Product Manager's packet

The PM text below is verbatim. These corrections and additions are mine, with evidence.

1. **Bundle figures are re-measured, not quoted.** The PM could not run a build; I ran
   `npm run build && npm run size` on 2026-11-07 at `0d8c204`:

   | Budget | Measured | Ceiling | Spare |
   |---|---|---|---|
   | Dashboard entry | 146.8 KB | 150 KB | 3.2 KB |
   | Dashboard total | 382.0 KB | 400 KB | 18.0 KB |
   | Squat entry | 116.4 KB | 117 KB | **0.6 KB** |
   | Squat total | 27.6 KB | 30 KB | 2.4 KB |
   | Squat 3D | 138.2 KB | 145 KB | 6.8 KB |
   | Squat data | 2,202,168 B | 2,300,000 B | ~98 KB |

   The script-comment figures the PM carried are therefore current. **R7's intent stands**
   (re-measure in every PR that touches `/squat`'s static graph); this table is the
   baseline, and squat entry at 0.6 KB spare is the number that binds R8–R11.
2. **R4 cites the wrong issue.** #429 is *"merged migrations are not applied to production —
   nothing detects it"* (migration-drift detection), not the `exercises` seed. The seed and
   the three un-migrated views are #222 item 3 plus a new issue. #429 stays an H0 blocker in
   its own right: until it is closed, any migration this roadmap lands (R4, R31) can merge
   and silently never apply.
3. **D11 — I verified no repo-root `docs/ROADMAP.md` exists** (only
   `pipeline/squat-anatomy/docs/ROADMAP.md`, the squat candidate-PR list). This packet sits in
   `docs/roadmap/` as a *proposal*; the approved roadmap becomes `docs/ROADMAP.md` after
   Gate 1, which keeps "ROADMAP.md" meaning "decided". Reversible if D11 goes the other way.
4. **Research network limits are fixed for next time.** The researcher's WebFetch was blocked
   by the SplitIQ cloud environment's host allowlist. During this session Scott approved
   adding the ten blocked hostnames (`trainingpeaks.com`, `muscleandmotion.com`,
   `workout-anatomy.com`, `visualbody.net`, `smpl-x.is.tue.mpg.de`, `smpl.is.tue.mpg.de`
   and their `www.` forms) to that environment. For open-ended research, start the session
   on the unrestricted **Full** environment instead; SplitIQ stays exact-host for build work.
   The primary-page re-check addendum is in §6a below.
5. **The PM did not read `docs/squat/RESEARCH_BRIEF.md` §6** (its search tool was
   unavailable). R12's "movement config object" therefore rests on `NEW_MOVEMENT.md`'s
   one-line summary. The Spec stage for R12 must read §6 first.
6. **R3's precache claim is inferred and untested** by both agents. Before promoting
   `/squat` beyond Paul, someone fetches `sw.js` unauthenticated and checks whether
   `logs-*.js` is listed. That is a five-minute check, and slice 4a (#416) removes the
   chunk regardless.

---

# Product Manager packet (verbatim)

# SplitIQ roadmap: Gate 1 packet (Stage 2, Story / Roadmap)

Today is 2026-11-07. Australian English, metric. No AUD figures appear because the research gave none that I could trust (research Method and limits).

## 0. Status block

| | |
|---|---|
| Pipeline position | Stage 2 (Story / Roadmap) at **Gate 1**. Nothing past this gate runs until you decide D1 to D11 (section 7). |
| Inputs used | `VISION.md`; Stage 1 inventory (all 650 lines, HEAD `0d8c204`); Stage 1 market research (all of it); reorientation epic §4 and the sections around it; `docs/onboarding/NEW_MOVEMENT.md`; `pipeline/squat-anatomy/docs/ROADMAP.md`; `pipeline/squat-anatomy/CLAUDE.md`. |
| Not read | `docs/squat/RESEARCH_BRIEF.md` §6. My search tool was unavailable and I did not open it. I used `NEW_MOVEMENT.md`'s one-line summary of the movement-config shape (skeleton, reference curves, phases, targets, faults, cues, sources). Also not read: the bodies of #407, #408, #428 and #429. I took their scope from your brief. |
| Verified by me | Only that the inputs say what I quote. Every code and DB fact is Stage 1's, as of `0d8c204`. |
| Assumed | I ran nothing, queried no GitHub or Supabase state, and re-measured no bundle figure. The headroom figures below are the script's dated comments and are **not re-measured**. Items I infer are marked "inferred". |
| Caveat that matters most | **No coach or lifter has been observed using `/squat`, and the research found no study of 3D activation visualisation for lifters** (research §7). All persona and love/hate evidence is vendor blogs, review sites and search summaries, and no primary page was fetched. The roadmap therefore treats H2 and H3 as hypotheses gated on five real walkthroughs (R1). |

## 1. Positioning

SplitIQ is the tool a coach opens on a phone or tablet beside the rack to show a lifter what a squat does. They can orbit a 3D skeleton with 118 muscles, scrub to any depth, see which muscles are working and roughly how hard, and see what the bottom position is doing. The athlete gets the same view, then logs the session in the same place against a load model that doesn't claim more than it can support. The anatomy engine is the product. The log is the context around it. This follows VISION.md, "the movements explain themselves", and its shape of a handful of flagship movements, not a catalogue.

**Why anyone would love it.** I found no other product that shows modelled muscle activation through the full range of motion, with its sources and limits on the page, free in a browser (research §Uncovered 1–2, seen via search summaries only). The EMG-validation literature supports labelling activation as a band, not a number: agreement is at pattern level, and rectus femoris was missed in squat (research §3).

**What it is not**
- **Not a logger with videos.** That is Hevy, Strong and JEFIT (research §1).
- **Not a catalogue.** Muscle & Motion has 1,200+ exercises (research §1). A hobby cannot match that, and VISION rules it out.
- **Not a coaching-business platform.** TrueCoach, Trainerize and Hevy Coach own programme delivery, billing and messaging (research §2). VISION says this is not a business.
- **Not a load dashboard competing with Intervals.icu.** Intervals.icu is free and complete (research §5). The load model stays as honest context only.

## 2. Who it is for

### (a) The coach explaining a lift to a group or client
- **Job:** make a lifter understand a position in one pass, on a phone or tablet, in seconds.
- **Market evidence on what they love:** ease of use, adherence and progress views, and a free client side (research §2, Capterra and G2 summaries).
- **Market evidence on what they hate:** crashes and buggy updates, weak mobile editing, per-client pricing, and juggling several platforms (research §2). Their adoption barriers are time, expertise and resources (research §7). That evidence is football- and collegiate-heavy, so it is indirect for S&C.
- **Today (inventory §2):** orbit, depth scrub, 118-muscle list with cards, guide, form check, metrics, deep links via `#m=`, an accessible muscle list.
- **Missing (inventory §12):** playback, charts, any share action beyond copying the URL, print, present mode.
- **What would make them return:** a link they can send, and a view that works on a gym-floor phone, including offline after first visit.

### (b) The athlete learning or re-learning a movement
- **Job:** understand why a position feels the way it does and what "correct" looks like.
- **Market evidence:** people abandon apps from boredom and manual entry (research §7). Muscle & Motion's praise is content depth, and its complaints are crashes and paywalls (research §1). Interactive 3D helps spatial learning in medical-student RCTs, most for low spatial ability, with no lifter outcome data (research §7). Make no learning-gain claim.
- **Today:** depth scrub, phase chips, form check labelled "Reference ideal, modelled", and the guide.
- **Missing:** time playback, faults against the ideal, a second movement.
- **What would make them return:** contrast. A fault shown against the ideal (roadmap item 7 in the pipeline docs) and a second lift to learn.

### (c) The self-coached lifter or rower who wants to understand their own log
- **Job:** record sessions and understand what the numbers and the movement mean.
- **Market evidence:** they love their own progress charts and prefilled last-session weights. Trainerize users complain that prefilled weights are missing (research §2). Hevy and Fitbod muscle maps are black boxes (research §1). The ACWR meta-analysis says ratio-style load is not a stand-alone predictor (research §5), so the load model is descriptive context, never a verdict.
- **Today (inventory §6):** `StrengthLogger` with a 2D tagged-muscle heatmap, last-performance and PR views, the load model, PM5 Bluetooth. StrengthView takes a hardcoded trend literal, and only 2 `strength_sets` rows exist live.
- **Missing:** any link from a logged exercise to the 3D model (`model_3d_key` is unread, `exercise_media` has 0 rows), and sign-up.
- **What would make them return:** logging "Back Squat" and getting a one-tap "see this modelled".

## 3. Asset and gap register

Personas: **C** coach, **A** athlete, **S** self-coached.

| Capability | Status | Evidence | What "done" would mean | For |
|---|---|---|---|---|
| Anatomy runtime, posing maths | **Have** | inventory §1; fixture-tested to 1e-5 m; per-file gate 95/95/90 | Unchanged. Already movement-neutral. | C A S |
| Anatomy runtime, scene | **Partial** | inventory §1: always builds a barbell on hard-named `thorax` (`createAnatomyScene.js:284-315`); coverage-excluded, tested only by source-text parity and e2e | Equipment and attach frame come from data. | C A |
| `/squat` product | **Have** (minus charts and playback) | inventory §2: shell, guide, form check, metrics, muscle list, hash deep links, axe-clean, 21 test files, 20 e2e | Still the reference implementation. | C A |
| Data pipeline | **Partial** | inventory §3: byte-reproducible decompressed output; needs STL fetch; **59% of payload from a lost v1 generator** | A second movement does not depend on the lost generator. | C A |
| Cost of a second movement | **Missing** (an estimate) | inventory §3 and `NEW_MOVEMENT.md` list blockers, not a cost | A written spike result with a size (R19). | C A |
| Movement config / multi-movement loading | **Missing** | inventory §12: grep finds no config object; only sketched in RESEARCH_BRIEF §6 | One config object per movement carries phases, regions, bands, bar, prose and route. Squat output unchanged. | C A |
| Time-based playback (#407) | **Missing** | inventory §12; `meta.rep` (dt 0.02 s) exists, UI drives depth only | Play, pause, scrub and speed over time. Reduced-motion honoured. | C A |
| Charts (angles, moments, force, activation, length) | **Missing** | inventory §12: `GRAPH_TAB_IDS` is hash-validation data only | Five tabs with a data-table alternative for each. | C A |
| Variants and faults | **Missing** | inventory §12; pipeline ROADMAP items 6–7 | Low-bar variant, a fault ghost overlay, targets cited per variant. | C A |
| Measured-rep importer | **Missing** | `MEASURED_PANE.comingSoon`; OpenCap terms unverified (inventory §4) | Parked until demand and licence are known. | A S |
| 2D heatmap in StrengthLogger | **Have** (untested) | inventory §6: SVG, three colour tokens, source-text test only, excluded from coverage | Still correct; labelled as tagged muscles, not modelled. | S |
| exercises to anatomy link | **Missing** | inventory §6: `model_3d_key` exists, nothing reads it, 0 `exercise_media` rows | Linked exercises show "see it modelled". Others stay plain text. | A S |
| Exercise library reproducibility | **Partial** | inventory §6: 873 rows live, text ids; migration 000 has uuid; 3 views have no migration | A fresh project reproduces the seed and views from the repo (#429, #222 item 3). | S |
| Strength logging and views | **Partial** | inventory §6: `strengthTrend` literal, name mismatches, no per-set history in StrengthView | DB-driven, empty-state safe (epic slice 10). | S |
| Load model | **Have** | inventory §11; VISION keeps it | Unchanged. Wording stays descriptive (research §5). | S |
| Sharing and embedding of a view | **Partial** | inventory §12: `#m=`, `#guide/t/tab/paused` exist; no share action, image or embed | Copy-link, image capture, embed mode. | C A |
| Coach–athlete relationship, roles | **Missing** | inventory §7: grep finds none | Mostly **not wanted**. VISION excludes the platform. The link-based channel is enough. | C |
| Auth flows | **Partial** | inventory §7: password sign-in only; no sign-up, reset or OAuth; `vitals-*` pinned to `VITALS_USER_ID` | Only built if D3 opens sign-up. | S |
| Per-user anatomy (anthropometry) | **Missing** | inventory §12: `bw=85`, `mbar=100` baked in | Parked. Any scaling must be labelled as modelled. | C |
| PWA / APK / iOS | **Partial** | inventory §8: PWA Have; APK is debug-only and strips `/squat`; no iOS project | `/squat` works offline in the PWA. Native stays out. | C A |
| Licensing | **Partial** | inventory §4: BodyParts3D attribution and share-alike satisfied; **SimTK terms unread**; OpenCap unverified | R2 closes the SimTK read before wider promotion. | all |
| Accessibility | **Have** for the muscle list; **Partial** for charts and other movements | inventory §2; research §8 (text-alternative pattern) | Each chart ships its data table. | A |
| Test and CI discipline | **Have** | inventory §11: 123 files and 1549 tests pass; ratchets; e2e | Ratchet not lowered. Scene and StrengthLogger stay weak spots. | all |
| Bundle budgets | **Have**, tight | inventory §5 (not re-measured): squat entry 116.4 of 117 KB; squat total 27.6 of 30; 3D 138.2 of 145; data 2,202,168 of 2,300,000 bytes; second `.bin` blocked structurally | A budget per movement, re-measured first (R7, R15). | all |
| Docs, onboarding, collaborators | **Partial** | inventory §10: onboarding README stale (PR2b "next", "AI coach"); `NEW_MOVEMENT.md` is good; one named collaborator | Refreshed. | all |

## 4. The roadmap

Sizes: **S** ≤ half a day, **M** ≈ a day, **L** 2+ days. Sizes are mine, not engineering's, and are all assumptions. "Existing issue" is by your brief. Every item honours VISION's rule: **never present modelled values as measured, activation as a band never a number, no unsourced range, and no cull-list file.** Items with extra constraints say so.

Success is qualitative because this is not a business:
- **H1 done** when a coach can send a link that opens at a chosen depth, time and selected muscle, and every chart is readable by keyboard.
- **H2 done** when a second dataset ships with the prose scan green.
- **H3 done** when a coach can use `/squat` on a phone without Scott present.

Owner for every item is Scott, with agents staffing the pipeline stages.

### H0: Foundations (in flight)

| # | What | Why | Depends on | Size | Issue | VISION constraint |
|---|---|---|---|---|---|---|
| R1 | Five coach/athlete walkthroughs of `/squat`. Record what they touch, ask for and mistake. | The research found no lifter-outcome evidence (research §7). PM rule: validate before building. Gates H2. | none | S (your time) | new issue | Show the modelled label as shipped; do not coach them toward answers. |
| R2 | Read the SimTK / OpenSim model terms (Rajagopal, Lai, Uhlrich) and OpenCap terms | `/squat` is already public, and NOTICE says OpenSim paths shaped the baked-in curves (inventory §4). VISION: open item before wider distribution. | none | S | new issue | NOTICE.md open item |
| R3 | Land epic slice 4a, health data out of source and bundle | The epic found `logs-*.js` in the public precache manifest (epic §2). Inferred: a service worker at root scope may precache it for any `/squat` visitor. Not tested. | none | S | #416 | VISION: health records not in tracked source |
| R4 | Migration for the `exercises` seed and the three views (`exercise_with_media`, `exercise_last_performance`, `exercise_prs`) | Inventory §6: a fresh project cannot be built from the repo. Blocks R22. | none | M | #429 and #222 item 3. I assume #429 covers the seed; not read. | additive and reversible migrations; Scott authorises schema |
| R5 | Backup gaps | The epic found `backup_snapshot()` names eight tables and never included `coach_messages`. Blocks any real-user data. | none | M | #428 | Scott authorises |
| R6 | Slices 4b to 12 proceed per the epic | They remove cull-list code and reduce the dashboard entry | per epic table | per epic | #417 to #425 | Only slice 11 may edit `CLAUDE.md` or `training-science.md` |

**What the roadmap cannot start until each lands, and what runs in parallel**
- **R3 (4a)** blocks every item that promotes or shares `/squat` more widely: R11, R26 to R28, and any invite beyond Paul.
- **R2** blocks the same promotion items, and R21 (a second dataset built from the same OpenSim-influenced curves).
- **R4** blocks R22 (the exercise link).
- **R5** blocks R31 (sign-up).
- **Slices 5 to 10** are mostly disjoint from `web/src/squat/`, `web/src/anatomy/` and `pipeline/`, so R7 to R11 can run beside them. Shared files that can conflict:
  - `web/vite.config.js` (coverage keys)
  - `web/scripts/check-bundle-size.mjs`
  - e2e and visual snapshots
  - `RouteRoot.jsx`
- **Slice 11** is the single doctrine PR. I ask it to carry one line pointing at the product roadmap. No roadmap PR edits `CLAUDE.md`.

### H1: Make the squat the product it claims to be (about 3 months of hobby time)

| # | What | Why | Depends on | Size | Issue | VISION constraint |
|---|---|---|---|---|---|---|
| R7 | Re-measure `npm run build && npm run size` and record a headroom table in the PR | Dated comments say squat entry has 0.6 KB spare and squat total 2.4 KB (inventory §5). CLAUDE.md says never quote a bundle figure. | none | S | new issue | bundle gates unchanged |
| R8 | Time axis: play, pause, scrub, speed, mapping time to depth and phase via `meta.rep`. The `paused` hash key already exists. | The data exists but the UI is depth-only (inventory §12). A coach shows a rep, not a depth. | R7 | M | #407 | derived timing is modelled and labelled as the reference rep; honour reduced motion |
| R9 | Charts: angles, moments, force, activation, length. Lazy chunk, each with a data-table alternative. Hand-drawn SVG, not Recharts (a ~90 KB shared chunk). | `GRAPH_TAB_IDS` is pre-wired (inventory §2). Table-as-alternative is the pattern in research §8 (inference, not a WCAG ruling). | R7, R8, D9 | L | new issue under #382 | no `EMG` in prose; activation shown as band; every reference range cited |
| R10 | "How this was modelled and what it cannot say": audit the existing `method` pane against research §3 (rigid-tendon static-optimisation bias; rectus femoris missed in squat). Make it linkable and legible as a standalone page. | Research §Recommendation 6. A `method` pane already exists, so this is Partial. | none | S | new issue | `METHOD.modelled[5]` must still say "Estimated, not measured."; no learning-gain claim |
| R11 | Share-a-view v1: copy-link button over the existing hash state, plus camera in the hash | A link is the only coach to athlete channel VISION permits. `#m=`, `guide`, `t`, `tab` and `paused` already exist (inventory §12). | R3, R8 | S–M | new issue | `/squat` must never import `supabaseClient.js`; no personal data in a link |
| R12 | Movement config object. Design first: carry phases, region map, bands, bar, prose and route. Extract squat behind it with no behaviour change. | `NEW_MOVEMENT.md` calls this the first design exercise. Today's squat-specific list is in inventory §3 and §12. | R7 | M | new issue | squat output unchanged; fixture pins hold |
| R13 | Data-driven barbell and attach frame (optional equipment) | Scene hard-names `thorax` and always builds a bar (inventory §1) | R12 | M | new issue | `anatomy/scene/**` is the only three.js importer (ESLint). The scene is coverage-excluded, so add e2e. |
| R14 | Generalised phases: `derivePhase` and `PHASE_CHIPS` come from config | Thresholds and chip names are squat vocabulary (inventory §1) | R12 | S–M | new issue | `anatomy/utils/**` gate 95/95/90 not lowered |
| R15 | Multi-dataset bundle rule: per-movement budgets, `SQUAT_DATA` as one of N, **and generalise chunk naming** | The script asserts exactly one `.bin` (`check-bundle-size.mjs:260`). The `squat-` prefix is only given to chunks wholly under `squat/`, `anatomy/` or `three` (inventory §5). A new movement outside `src/squat/` would be precached and shipped in the APK unless naming and the `globIgnores` and APK strip are generalised. Inferred from the script's description. | R12 | M | new issue | precache exclusion, 2 MiB Workbox ceiling and APK strip invariants keep passing |
| R16 | Generalise the prose scan (`content.test.js`) over per-movement content | It is hardwired to squat constants and 118 muscles (inventory §13.4). It is the mechanical guard for "modelled, never EMG". | R12 | M | new issue | golden rules 3 and 4 enforced for every movement |
| R17 | Measure real phone performance (a mid-range Android and an iPhone, Safari) for the 3D chunk plus 2.2 MB data | Coaches use phones. Only a 390 px layout is tested (inventory §11). No frame-rate figure exists. | R7 | S | new issue | WebGL path stays; no WebGPU dependency (research §6, unconfirmed) |
| R18 | Refresh `docs/onboarding/*` (PR2b "next", "AI coach", solo framing) | Inventory §10. Collaborators read these first. | none | S | new issue | do not touch `CLAUDE.md` |

### H2: Second and third flagship movements

| # | What | Why | Depends on | Size | Issue | VISION constraint |
|---|---|---|---|---|---|---|
| R19 | **Feasibility spike**, deadlift data route. Question: are the curve definitions, static matrices and leg frames body-intrinsic, so a new movement only needs new joint trajectories? If yes, the lost v1 generator is not blocking. Also measure how much of the 3.45 MB is shared geometry versus per-movement motion. | v1 supplies 62 of 71 arrays, 59% of payload, including frames, 43 curve definitions and statics (inventory §3). `NEW_MOVEMENT.md` says a new movement "would need its own route". The "intrinsic" claim is my inference and untested. | R2, R7 | L | new issue | BodyParts3D share-alike applies to any derived data (inventory §4) |
| R20 | Pipeline generalisation: parameterise `BW=85`, `MBAR`, `bar_seat`, `META.frames` and the STL id list. Optionally split a shared **body pack** (geometry) from a per-movement **motion pack**. | A second whole dataset of similar size would exceed the 2.3 MB cap (inferred, inventory §5). A split also makes a side-by-side view cheap. | R19 | L | new issue | the split moves every sha pin together (inventory §13.7) |
| R21 | Second flagship dataset end to end: data, content, references, prose-scan coverage, tests | VISION names deadlift, bench, row and press as obvious candidates | R12 to R16, R20 | L (several) | new issue | every reference range sourced; modelled labels throughout |
| R22 | exercises to anatomy link, squat first. Start with a small code map from exercise id to movement key, not DB writes. A "see it modelled" link from `StrengthLogger`. | `model_3d_key` is unread (inventory §6). The dashboard may link to `/squat`; `/squat` may not import Supabase. | R4 | S–M | new issue | VISION: library links to a dataset where one exists, plain text elsewhere |
| R23 | Movement index page plus a side-by-side view of two movements | "Coaching is comparative" (pipeline ROADMAP item 7). Evidence is the roadmap's own logic, not market data. | R20, R21 | M–L | new issue | two WebGL contexts and two loads on a phone; check against R17 |
| R24 | Within-movement contrasts on the squat: low-bar variant, then fault ghost overlay | Pipeline ROADMAP items 6 and 7. A low-bar variant may be a cheaper rehearsal for R20. | R12, R20 | L each | new issue | fault perturbations are modelled, never a recording |
| R25 | Third movement, chosen after R1 and the second ship | No evidence yet to choose between bench, row and press. Bench changes body orientation. | R1, R21 | L | new issue | flagship, not catalogue |

### H3: Coach and athlete surfaces

| # | What | Why | Depends on | Size | Issue | VISION constraint |
|---|---|---|---|---|---|---|
| R26 | Share-a-view v2: image capture of the canvas and one static social preview image | A coach sends an image to an athlete. No `toBlob` or capture exists today (inventory §12). Per-view previews are impossible without server rendering (inferred). | R3, R11 | M | new issue | image is labelled modelled |
| R27 | Embed mode: iframe with `?embed=1` and minimal chrome | A club site. **Not verified:** `vercel.json` frame headers. | R3, R11 | M | new issue | no Supabase on `/squat` |
| R28 | Printable coaching card: print CSS for phase cues, form check labelled "Reference ideal, modelled", sources and link | `docs/onboarding/README.md` lists it as an idea (inventory §10) | R10 | M | new issue | citations printed |
| R29 | Present mode: large controls, panels hidden, offline after first visit | Gym floor and projector use. The first-visit offline message exists (inventory §8). | R8, R17 | M | new issue | accessible list must remain reachable |
| R30 | Annotation: pinned muscles plus a short note encoded in the URL hash | Evidence: none in the research. Hash-only, no server. | R11 | M | new issue, parked | no personal data in a link |
| R31 | Sign-up, password reset, remove `VITALS_USER_ID` pinning | Only if D3 opens sign-up. Health-data obligations are contested (research §8). | R3, R5, D3 | L | new issue | owner-only RLS; get proper advice before holding health data |
| R32 | Rowing stroke anatomy feasibility note (research only, no build) | Research found no 3D rowing stroke anatomy, but absence is not proof (research §4, §Uncovered 4). Coaches' pain is team data admin, not stroke understanding. | D5 | S | new issue | do not drift into team logging |

**Parked, signal needed (no number):** measured-rep importer and OpenCap overlay (pipeline ROADMAP items 2 and 3; needs OpenCap terms and evidence that athletes hold `.mot` files), kinetics upgrade, OpenSim API muscle mechanics, load/tempo and grip controls, per-user anthropometry, a clothed body with x-ray mode.

## 5. What NOT to build

| Not building | Reason |
|---|---|
| Exercise catalogue | VISION: "Five done well beats eight hundred stubbed." A catalogue of 1,200+ is Muscle & Motion's ground (research §1). |
| AI or LLM anything | VISION "No AI coaching". `check:no-llm` guards it. The coach was removed in slices 2 and 3. |
| Prescription engine | VISION "No personal prescription engine". Cull list: `schedule.js`, `program.js`, `coaching.js`. |
| Coaching-business features: messaging, billing, client management | VISION "not a business". TrueCoach, Trainerize and Hevy Coach own this (research §2). |
| A load-dashboard feature race with Intervals.icu | Free and complete (research §5). VISION: free tiers set a price floor a load dashboard cannot clear. |
| SMPL-based bodies | The model licence is non-commercial by default. Commercial use goes through Meshcapade (research §6; the licence text itself not read). |
| Z-Anatomy parts | Inner ear is CC BY-NC-SA and kidney CC BY-NC (research §6). NC parts would break the data licence. |
| Video or pose form-check | Accuracy is unvalidated: 0% to 95.5% by camera placement (research §3). It would blur modelled and measured, which VISION forbids. |
| Team logging | Research §4: team erg data admin is a different product. Out of scope per VISION. |
| Reintroducing any cull-list file | VISION cull table. |

## 6. Market research: what is solid and what must be re-run

**Solid (corroborated, secondary sources)**
- Intervals.icu is free.
- Garmin announced its TrainingPeaks and TrainHeroic acquisition on 22 July 2026.
- Static-optimisation activation agrees with EMG only at pattern level.
- A 2026 meta-analysis says ACWR is not a stand-alone predictor.
- The Privacy Act small-business exemption does not cover health-service providers (secondary source; the timing of reform is contested).

**Limits.** WebFetch was blocked for every host tried (research Method and limits), so everything comes from search summaries. No Reddit threads surfaced. Prices conflict across comparison sites. Evidence on 3D learning is medical-student only. Rowing absence is not proof.

**Blocked primary checks, and what each would change**

| Blocked check | Decision it would change if the answer differed |
|---|---|
| Muscle & Motion methodology page | If it publishes sourced activation, the "provenance gap" in section 1 weakens and D1 changes. |
| Workout Anatomy and VisualBody Lab sourcing | Same. |
| Reddit and coach threads | Persona love/hate in section 2. R1 replaces it. |
| Apple 1.4.1 and Google Play health policy text | Matters only if D3 or a store release is chosen. |
| OAIC primary position on health data | R31 and D3. |
| SMPL licence text | Nothing, since SMPL is rejected. |
| TrainingPeaks pricing and any Garmin-driven coach migration | Only a commercial lens (D4). |
| Targeted search for rowing stroke 3D tools | D5. |
| Strava terms on showing a user's data to others | Any coach view of an athlete's Strava data (not on this roadmap). |

## 7. Decisions for Scott (Gate 1)

| # | Question and options | Recommendation (confidence) | Unblocks |
|---|---|---|---|
| D1 | Accept the positioning in section 1? Options: accept; amend wording; reject. | Accept (80%). It matches VISION. The "no other product found" claim rests on search summaries. | Everything |
| D2 | Which movement is second? Options: deadlift; low-bar squat variant as a rehearsal first; bench; overhead press; row. | Deadlift, conditional on the R19 spike (55%). It shares the leg and trunk frames and gives the natural hinge-versus-squat comparison. If the spike shows high new-route cost, do the low-bar variant first. Bench changes orientation. | R19 to R21 |
| D3 | Do "real users" mean sign-up now, or invite-only? | Invite-only through H2 (75%). `/squat` is already public with no auth, so coaches and athletes can use the product that matters without an account. Sign-up needs reset flows, removing `VITALS_USER_ID`, backups (R5) and a health-data opinion. | R31 |
| D4 | Allow a commercial lens in a later research pass, or keep "not a business" absolute? | Keep it absolute for this roadmap (80%). Licences, privacy and store rules are obligations and stay in scope. | Scope of research passes |
| D5 | Is rowing stroke anatomy on the roadmap? | Not as a build. Allow R32 as a research note after the second movement ships (65%). A new pipeline route would be needed (the squat chain does not model a seated stroke; inferred). | R32 |
| D6 | May H1 run beside reorientation slices 4a to 12? | Yes, with fences (70%): R3 first; no `CLAUDE.md` edits; at most two open PRs, one cull and one roadmap; rebase on shared config files. | H1 start |
| D7 | Retire the 2D StrengthLogger heatmap in favour of the anatomy runtime, or keep both? | Keep both (70%). The 2D map covers the 873-row tail that 3D never will. Relabel it as tagged muscles, not modelled. Touch it minimally, since the file is untested. | R22 |
| D8 | SimTK and OpenSim terms: Scott reads them, or delegate to a research pass? | Scott reads (75%). Hosts were blocked for the research agents, and accepting licence terms is an owner call. | R2, R21 |
| D9 | Authorise a raise to `SQUAT_TOTAL` (30 KB) for charts, while holding `SQUAT_ENTRY` (117 KB)? | Yes to raising total to the re-measured figure plus about 2 KB, and charts must be lazy (70%). Precedent: total was raised 26 to 30 before (CLAUDE.md). | R9 |
| D10 | Gate H2 on R1 (five walkthroughs)? | Yes (85%). H1 does not need it, since H1 finishes the existing squat. | R19 onward |
| D11 | Where does the roadmap doc live? | Repo-root `docs/ROADMAP.md` (75%). `coach/` is excluded from the PERMISSIONS.md grant and from the `/collaborate` lane, so collaborators could not read it. Leave the pipeline's `docs/ROADMAP.md` as candidate PRs and link both ways. I did not check whether a repo-root `docs/ROADMAP.md` already exists. | Roadmap publication |

## 8. Acceptance criteria for the roadmap itself

1. The roadmap lives at repo-root `docs/ROADMAP.md` (D11), with the existing pipeline roadmap cross-linked, and slice 11 carries a pointer to it.
2. Every item approved by number gets a GitHub issue carrying `Part of #<roadmap epic>`, an owner, a horizon and a size.
3. No item re-adds a cull-list file; a review checks each PR against VISION section "The cull list".
4. Every evidence claim in the doc carries a source (inventory §N or research §N or a URL), and secondary-only claims are marked.
5. Before any item that touches `/squat`'s static graph, bundle figures are **re-measured** with `npm run build && npm run size`, and the PR reports entry, total, 3D and data figures. No dated figure from docs is quoted.
6. No roadmap PR edits `CLAUDE.md` or `training-science.md`.
7. Every new movement's content passes the generalised prose scan (R16): no `\bEMG\b` in muscle roles, no "measured activation", bands not numbers, every number matching `REFERENCES.md`.
8. R3, R2 and R1 are closed or explicitly waived by Scott before any item in R11 or R26 to R28 is promoted beyond Paul.
9. Coverage thresholds and bundle ceilings are not lowered. Any raise needs Scott's recorded approval (D9).
10. `/squat` still never imports `supabaseClient.js` (`RouteRoot.test.jsx` pin).

## 9. Out of scope for this packet

- No specs, no code and no files written.
- No GitHub issue creation yet. Items R1 to R32 are proposals until you approve by number.
- No commercial model, pricing or revenue plan (VISION: not a business, D4).
- No re-derivation of the inventory or re-run of the market research. Both are carried as-is with their stated limits.
- No legal advice on privacy, health data or app-store policy. Those need a primary source or a professional if real users arrive.
