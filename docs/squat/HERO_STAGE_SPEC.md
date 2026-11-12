# /squat hero stage, strain focus and director camera — approved spec

> Working record of an `/orchestrate` run, 2026-11-12. Gate 1 and Gate 2 approved by Scott.
> Spec by the Workflow Architect stage (read-only) against `main` at `17f43ef`; line numbers
> are hints. Three PRs, shipped in the order **C → (R11) → B → A**. This file travels with
> PR C so PRs B and A build against the same record. Where it conflicts with code on `main`
> at build time, re-verify and record the deviation in the PR body.

## Story

As Scott, I want the squat model shown with a documentary-style camera that follows each
phase of the rep, a heatmap that points at the muscles working hardest right now, and a
layout where the model fills the page with every control reachable in one view, so that a
viewer sees what the lift does without hunting through controls or scrolling.

## Decisions

**Gate 1:**

- One spec, three PRs: C (hero layout), then B (strain focus), then A (director camera).
- Director camera is the default.
- The rep autoplays on load: a dynamic Director "show-off" mode plus selectable fixed angles.
- Under `prefers-reduced-motion` there is no autoplay and no camera animation.
- Criterion 11 (list selection highlights on the model) is kept.

**Bundle rule** (replaces net-zero):

- Don't pad: replace, don't add alongside. Three.js and scene code stay out of `SquatApp`'s static graph.
- Each PR runs `npm run build && npm run size` and pastes the output into the PR body.
- If `SQUAT_ENTRY` exceeds its ceiling, raise `MAX_SQUAT_ENTRY_GZIP_KB` to the measured figure + ~2 KB, with a dated comment in that file's style, and update the bundle paragraph in `CLAUDE.md`.
- The dashboard entry budget (150 KB) is **not** relaxed. Flag anything that adds bytes to `main`; `constants/themeValues.js` and `constants/theme.js` are emitted from `main.jsx`.
- Caveat: #465 (the gate does not measure the production build) is open, so figures are indicative until it lands.

**Gate 2:**

1. **Top-N counts regions, not muscles.** Activation curves tie heavily (51 distinct curves across 116 muscles), so a literal top-3 by muscle reads as tie artefacts. Show the top 3 regions (`REGION_NAMES`), each naming its leading muscle and band, e.g. "Knee extensors: Vastus medialis (High)". This amends criterion 8.
2. Manual Play loops too: one playback behaviour. The e2e "runs to lockout and stops" is rewritten in PR A.
3. Autoplay is suppressed when the hash carries `t` or `cam`. An `m=`-only link still autoplays.
4. A shared camera is R11's numeric `cam=az,pol,dist`. Absent `cam` opens the default view (Director, or three-quarter under reduced motion). A named `view=` key is a possible additive v2.
5. Sequence: **PR C now**, then R11 (#439) into C's Share slot, then B, then A. R33 (#467, squat-entry trim) becomes optional under the bundle rule and is judged on its own merits.

## Acceptance criteria (approved)

**A. Cinematic camera (PR A)**

1. A pure function maps (frame, shot config) to a camera pose (azimuth, polar, distance, target). It is deterministic.
2. The Director shot defines a pose per phase (brace, lowering, bottom, drive, lockout) and eases between them, with no hard cuts. It is continuous across phase boundaries and across the loop point (184 → 0).
3. The pose is a function of the playhead, not the wall clock: scrub, step and pause show the same shot as playback.
4. The target tracks the body (pelvis), so the lifter stays framed through full depth. Tested at the bottom frame and at standing frames.
5. Drag, zoom or a preset hands control to the user at once, with no snap-back. A visible control returns to Director.
6. Manual presets and arrow-key orbit keep working.
7. The Director shot includes at least one frontal-plane view (at the bottom). Tested on the shot config.

**B. Phase-aware strain focus (PR B)**

8. A pure function returns the top-N (N=3) *regions* by activation for a frame, each with its leading muscle. The tie-break is deterministic; muscles without data are excluded. (Amended at Gate 2.)
9. With the heatmap on, the current top-N shows next to the stage, updates with the playhead, and carries a Low/Moderate/High band in text, not colour alone.
10. The top-N are emphasised on the model. This is a visual check; a unit test covers the emphasis input.
11. Selecting a muscle in the list or card highlights it on the model.
12. The legend and "Indicative estimate, not EMG" are in the same view as the model whenever the heatmap is on.
13. Heatmap off means no overlay and no readout. The default stays off.
14. The bottom phase straddles the turn. At frames 101–115 the readout uses that frame's direction, with no flicker.

**C. Model as hero (PR C)**

15. On desktop the stage dominates: at least 60% of viewport width at 1280, filling the available viewport height, never shorter than 520 px.
16. Play/pause, scrubber, step, phase pills, camera presets and the heatmap toggle are reachable without scrolling at 1280×720 and 390×844. This is a committed e2e test.
17. Controls are docked to the stage, not stacked as separate full-width cards. Hit targets are at least 44 px.
18. Non-tool content (muscle list, phase strip, disclaimer, attribution, FormCheck) may sit below the fold. It stays in the DOM and keyboard-reachable.
19. On a phone (≤760 px) the stage stays the hero, the controls collapse into a compact bar, and nothing is hover-only.

**D. Cross-cutting (every PR, as applicable)**

20. Under reduced motion, Director does not animate and autoplay does not start.
21. With WebGL unavailable or a failed load, the layout, muscle list, top-N text readout and controls still work. The readout and the list are the accessible substitute and are not lazy-loaded.
22. Light and dark themes both work. Colours come only from theme tokens (`check:colours`), and new contrast pairs are tested.
23. The top-N readout is announced politely, never on every frame during playback.
24. Bundle per the rule above, re-measured, with the output shown.
25. `/squat` must not import `supabaseClient.js`.

**Out of scope:** new movements; anatomy data or activation-model changes; measured EMG; camera pan or free-fly; video export; accounts, saving or sharing shots (beyond R11); the dashboard; #412; FormCheck redesign beyond relocating it.

---

## PR C — model as hero (criteria 15–19, 21, 22, 24, 25)

### Layout

**Desktop (≥761 px)**

`SquatHeader` is unchanged (minHeight 56). Below it a **hero section** sits outside the 1200 px `main`:

- width 100%, maxWidth 1600, gutter `SPACE.xl`
- grid `minmax(0,1fr) clamp(260px, 26vw, 320px)`, gap `SPACE.md`
- height `calc(100svh - 56px - ${2*SPACE.lg}px)`, minHeight 520 (where `svh` is unsupported, the declaration drops and minHeight applies)
- at 1280 the stage is about 880 px (69%); at 1600 about 76%

Left: **`SquatStage`** fills its cell and keeps the canvas host, the "Modelled, not measured" chip and the load/error overlays.

- `<h1>High-bar back squat</h1>` moves into the stage's top-left overlay on an opaque `THEME.surface` chip, replacing the "3D model" micro-label.
- `section aria-label="3D model"` stays.
- The h1 remains the first heading in DOM order.

Right: the **`StageControls` rail**, one card at full hero height. It is a flex column with no internal scroll, in this order:

1. Transport: Play/Pause, Step back, Step forward
2. Slider and the `depth-readout`
3. Phase pills
4. Camera group (reset/presets + zoom; the Director selector arrives in PR A)
5. Show switches
6. **Share slot** (empty until R11)
7. Footer row: "Coaching guide" and "Metrics and targets", moved from the intro

Below the fold, inside `main` (max 1200): the intro sentence as a lead paragraph, then FormCheck full-width, MuscleSection, PhaseStrip, the disclaimer and AttributionFooter. Their content is unchanged; only their position moves.

**Phone (≤760 px)**

- The hero is a column. The stage is `calc(100svh - 56px)` tall, minHeight 460.
- The rail becomes a **compact bar docked inside the bottom of the stage section**: in flow, below the canvas, not floating over it.
  - Row 1: Play/Pause, slider (flex 1), with the readout underneath at 12 px.
  - Row 2: disclosure buttons **Rep | View | Show | Share** (Share appears only when the slot has content), each with `aria-expanded` and `aria-controls`. One is open at a time; Rep is open by default.
  - Row 3: the open group.
- Targets are at least 44 px, there is no hover-only control, and hidden groups use the `hidden` attribute.

**Why a rail, not a bottom bar, on desktop:** at 1280×720 a bottom bar needs about three rows (about 170 px). That leaves about 494 px of canvas, below criterion 15's 520 floor.

**Accepted gap:** between 761 and ~1000 px the stage falls under 60% of the width (about 57% at 761). Criterion 15 is evidenced at 1280.

### Files

New `squat/components/StageControls.jsx` is the only controls container; it replaces the three stacked cards. Props:

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `view` | object | yes | `useAnatomyViewState` result |
| `camera` | object | yes | `scene.camera` |
| `cameraDisabled` | bool | yes | |
| `sceneBlocked` | bool | yes | omits the camera group and layer switches; the Share slot then renders after the time controls |
| `wide` | bool | yes | |
| `onGuide(pane)` | func | yes | |
| `share` | node | no | R11's Share control |
| `children` | node | no | slot for PR A's camera-mode selector |

It owns the phone disclosure state with `useState('rep')`.

Modified files:

- **`TimeControls.jsx`, `CameraControls.jsx`, `ViewOptions.jsx`**:
  - Drop the `card` wrapper and its padding.
  - Keep all logic, ARIA, ids and exports (`valueText`, `readoutText`, `WAITING_TEXT`, `toggle`, `cameraKey`, `CAMERA_WAITING`, `LAYERS_WAITING`).
  - Add an optional `compact` (bool).
  - Their `<h2>` labels become `<h3>` under one rail `<h2>Controls</h2>`. Keep them: e2e uses the group names.
- **`SquatStage.jsx`**:
  - New optional `title` (node) for the top-left overlay.
  - New optional `children` (overlay nodes after the chips; PR B's strain panel goes here).
  - `minHeight` becomes `height: '100%'` with a 520 / 460 floor.
- **`SquatApp.jsx`**: restructured per the layout. The intro's duplicate buttons are deleted (they move to the rail footer). MuscleSection and PhaseStrip are unchanged.

### Bundle

PR C is mostly a move. It adds the rail and the phone disclosure, and removes three card wrappers, the intro button row and the old stage grid. Expect about ±0.5 KB; measure it against a fresh `origin/main` baseline. Nothing new is imported from shared `src/constants`/`src/utils`, so the dashboard entry should be unchanged; confirm from `size`.

### Tests

| Criterion | Test |
| --- | --- |
| 15 | `SquatApp.test.jsx` (mocked matchMedia): wide layout puts the stage in the first grid column and the rail beside it. e2e at 1280×720: stage width ≥ 0.6·1280 and height ≥ 520. |
| 16 | New e2e loop over 1280×720 and 390×844. For Play, slider, Step back/forward, each phase pill, each camera preset and the Heatmap switch, assert visible, `bottom ≤ innerHeight` and `scrollY === 0`, after opening the matching disclosure on phone. |
| 17 | The same e2e asserts each target is ≥ 44×44. RTL: no control group carries the old card style. |
| 18 | RTL: muscle list, FormCheck, PhaseStrip, disclaimer and footer are in the DOM. e2e: Tab reaches the muscle listbox. |
| 19 | RTL on phone: Rep/View/Show toggle `hidden` and `aria-expanded`; no `onMouseEnter` handlers. |
| 21 | The blocked-capability tests are updated: the rail renders the time controls without the camera group. |
| 22 | `check:colours` passes; no new tokens. |
| 24 | `size` output in the PR. |
| 25 | `RouteRoot.test.jsx` unchanged. |
| Visual | Screenshots at both viewports in the PR; update the visual snapshots if they cover `/squat`. |

### Risks

- `svh` falls back to minHeight on older Safari.
- Moving the h1 into an overlay could upset the heading order the axe e2e checks.
- e2e selectors use group names, which are preserved.
- Rollback is a plain revert: layout only, no data.

**Not in PR C:** the strain readout, the director camera, autoplay, looping, and FormCheck content.

---

## PR B — phase-aware strain focus (criteria 8–14, 21–25)

**Pure: `squat/utils/strainFocus.js`**

- `topActivated(muscles, s, direction, n = TOP_N)` ranks *regions* (Gate 2 decision 1).
  - Per region, take the leading muscle by `activationOf` (`activation.js:27`), excluding nulls (no `act`, tendons).
  - Sort regions by that value, descending. Ties break by region order, then by manifest index ascending.
  - Return `[{ region, i, name, value, band }]`.
- `focusKey(list)` gives the change-detection key.
- `focusMask(n, topIdx, selectedIdx)`:
  - heatmap on: the top-N leading muscles (or every muscle in those regions; the builder picks the clearer visual and records it) ∪ the selected muscle
  - heatmap off: the selected muscle only
  - neither: null
- `TOP_N = 3` lives in `squat/constants/activationBands.js`.

**UI: `squat/components/StrainPanel.jsx`**

- Props: `items`, `phase`, `announce`, `compact`.
- Content:
  - a "Working hardest now" heading
  - an `<ol>` of region, leading muscle and band as **text**
  - the compact legend
  - `ACT_NOTE`
- Placement:
  - desktop: overlay at the bottom-left of the stage (opaque `THEME.surface`, maxWidth 260, `pointerEvents: 'none'`)
  - phone: compact overlay at the top of the stage
  - when the scene is blocked or failed: in the rail, or above the phone bar, so it never covers `CapabilityNotice` or `SceneError`
- It is a static import, never lazy.
- `HeatmapLegend` gains `compact` and moves into StrainPanel; it is removed from MuscleSection.

**Announcements: `squat/hooks/useStrainAnnouncement.js`**

- Signature: `{ key, text, playing, userPlayed, minMs = 3000 }`, returning the live string for a visually hidden `role="status"` element.
- When paused: update on any key change.
- While playing: update only on a phase change, at most once per `minMs`, and never during autoplay.
- Otherwise: return the previous string.

**Heatmap gating**

- `ViewOptions` gets `heatmapDisabled`, separate from `disabled`.
- The heatmap switch is enabled on `view.ready`, so the readout works without WebGL. The layer switches stay scene-gated.

**Emphasis on the model (one mechanism)**

- Pure `emphasise(muscleCols, mask, { dim, focusColour })` in `anatomy/utils/sceneColours.js`:
  - Non-focus muscles move toward their own luma grey by `focusDim` (0.65, in `sceneStyle.js`).
  - Focus muscles keep their ramp colour under the heatmap.
  - With the heatmap off, the selected muscle takes `focusColour`.
- Scene: `setFocus(mask | null)`, guarded by `sameWeights`, sets `pendingHeat` and calls `invalidate()`. `writeColours()` applies it before `writeVertexColours`.
- Cost is per-muscle only, with no extra vertex writes or draw calls; about +0.2 KB to the 3D chunk.
- `useAnatomyScene` takes `focus` (`{ top, selected }`).
- New token `anatomyFocus` (LIGHT and DARK, plus `scenePalette`). It adds about 40 B to the dashboard entry via `themeValues.js`; measure it, and if that is unacceptable, alias `accent` inside `scenePalette` instead.

**Bottom phase:** the readout uses `view.direction` (`directionAt` by frame), so frames 101–115 follow their own side of the turn.

**Tests**

| Area | Coverage |
| --- | --- |
| `strainFocus.test.js` | count, deterministic ties, exclusions, `n`, `focusMask` unions |
| `StrainPanel.test.jsx` | band shown as text |
| `SquatApp.test.jsx` | a step changes the list; legend and `ACT_NOTE` in the stage section; none with the heatmap off |
| `sceneColours.test.js` | `emphasise` |
| `SquatScene.test.jsx` | `setFocus` called for selection and for top-N; the fake controller gains `setFocus` |
| Frames 101–115 | match `directionAt`, with no oscillation |
| Blocked capabilities | the panel renders in the rail |
| `useStrainAnnouncement` | fake timers |
| `tokens.test.js` | the new token |
| `sceneParity.test.js` | new pin for `setFocus` with a `sameWeights` guard; existing pins untouched |

**Not in PR B:** picking on the model; activation data changes.

---

## PR A — director camera and autoplay (criteria 1–7, 20, 21, 24)

> **Pending amendment (2026-11-12, after Scott tried the #469 prototype).** Relayed by
> the partner session, not yet confirmed in Scott's own words, so confirm at PR A's gate
> before building. The rest of this section was written before it and is superseded where
> they conflict.
>
> 1. **Two modes only, Director and Fixed.** The show-off mode is dropped.
> 2. **Director becomes a slow drift, not per-phase keyframes.** Scott called the
>    keyframed cut "too schizophrenic": no per-phase reframing, no cuts. The prototype
>    (`web/src/squat/lab/directorShot.js` at `f1e7da6` on
>    `claude/wizardly-turing-x66gd8`) is a pure `directorView(info, frame, loops)` with
>    one drift every 3 reps (~11 s). It wanders ±0.32 rad in azimuth around three-quarter
>    front, ±0.05 in polar and ±0.25 in radius, with peak orbit about 10°/s (the test
>    holds it under 15°/s). `loops` carries the drift across the 184 → 0 loop. The
>    look-at point follows the hips only partway (0.80 → 0.64 m).
> 3. **Criteria 2, 4 and 7 need rewording.** Criterion 2 becomes "continuous drift" in
>    place of per-phase poses. Criterion 7's frontal view at the bottom either moves to a
>    Fixed preset or to muscle focus, or is dropped. That is Scott's call.
> 4. **Candidate additions, in PR A or a follow-up (Scott to choose):**
>    - Damped follow (`smoothDamp`, 0.5 s smooth time; snaps under reduced motion).
>    - Muscle focus (`focusOf`/`framedOn`). Director pushes in on the selected muscle;
>      Fixed gets a "Frame muscle" button.
>    - Tap-to-pick through three's Raycaster. Only a drag over 6 px, a pinch or a wheel
>      hands the camera to the user, which refines criterion 5's trigger.
>    - `OrbitControls.zoomToCursor` (built into r187).
> 5. **Libraries were weighed and none imported.** camera-controls is 12.3 KB gzipped
>    against ~7 KB spare in the 3D chunk. A BokehPass depth of field is too heavy for
>    phone GPUs. The prototype costs +1.4 KB on SQUAT_3D (139.6 / 145).
> 6. **Open detail:** whether the drift keeps moving through the 0.7 s lockout hold.
>
> `cam` and the autoplay rules are unchanged.

### Camera API: a superset of R11's (#439), nothing parallel

R11 defines the following (R11 spec L287-297, on `claude/gallant-lovelace-dlozfp`):

- `createAnatomyScene({ initialPose?, onUserCamera? })`
- `camera.pose()` returns `{ radius, polar, azimuth, home }`
- `camera.setPose(pose | null)`
- `reset/preset/orbit/zoom` and the controls' `'start'` all call `onUserCamera`
- the `home` flag

PR A adds only:

- **`setFrame(frame)`**: the director's playhead, coalesced into the rAF `frame()` with the pose.
- **`camera.direct(shot | null)`**:
  - with a shot: start directing, tween in from the current pose (or jump under reduced motion), `home = true`
  - with `null`: stop and leave the camera where it is, `home = false`
- **`pose()` gains `director: boolean`**: while directing it returns the current director pose with `home: true`, so a copied link omits `cam` and opens in Director.
- **Every user path ends directing:** `setPose`, `reset`, `preset`, `orbit`, `zoom` and `'start'`. The takeover signal is R11's `onUserCamera`.

Target tracking moves `controls.target.y`. On takeover the target stays where it is; `setPose` and `reset` restore the base target, and the internal tween lerps `targetY`.

### Shot model

**Config: `squat/constants/directorShot.js`**

```
{ track: 'pelvis_rest', trackGain: 0.65,
  keys: [{ phase, u, azimuth, polar, distanceScale, lift }] }
```

- `u` is 0–1 within the phase, resolved against `repInfo.starts`.
- `distanceScale` multiplies the aspect-aware `homeView().radius`.
- `lift` is a metres offset to the target's y.

Constraints, asserted by test:

- ≥ 5 keys, at least one per phase
- the bottom key is frontal (within 10° of front or back)
- consecutive keys turn ≤ 0.8π
- polar within [0.15, 1.62]
- `distanceScale` within [0.8, 1.2]

Suggested arc: brace three-quarter → lowering sagittal right → bottom front (polar 1.40) → drive rear three-quarter → lockout back toward the brace view.

**Evaluator: `anatomy/utils/cameraShot.js`** (movement-neutral, pure)

- `resolveShot(shot, info)`.
- `shotPoseAt(resolved, frame, { baseRadius, baseTargetY, trackDelta })` returns `{ radius, polar, azimuth, targetY }`.
- Interpolation is **cyclic**: the last key wraps to the first, so the loop point is continuous.
- Easing uses the exported `cameraMath` `ease`, which has zero slope at the keys, so velocity is continuous. Azimuth turns by `shortestTurn`.
- Only `createAnatomyScene.js` imports it, so it lands in the 3D chunk (about +0.8 KB).

**Driving the camera:** the scene owns the camera; React passes the frame and the mode. In `frame()`:

1. Apply the pending pose.
2. If directing, compute `trackDelta = poser.matrixFor('pelvis_rest')[13] − trackY0` (`trackY0` is sampled at s=0 during the build).
3. Call `controls.update()` first, then `place()` the director pose.
4. Do **not** count `update()`'s return toward `more` while directing. OrbitControls 0.187.0 `update()` re-reads the externally placed camera and reports a change once (`OrbitControls.js` L697-705, L905-916). The loop must still idle when paused.

Parity pins (`autoRotate=false`, `enablePan=false`, `enableDamping=!reducedMotion`, no `listenToKeyEvents`) stay. Add a pin that `'start'` clears directing.

### React

`useAnatomyScene` takes R11's `pose`, `arrival` and `onUserCamera`, plus `frame`, `directorShot` and `focus`.

New **`squat/hooks/useCameraMode.js`**: `useCameraMode({ reducedMotion, linkPose })` returns `{ mode, select, onUserCamera }`.

- Modes: `'director' | 'threeQuarter' | 'front' | 'back' | 'left' | 'right' | 'free'`.
- Initial mode: `'free'` if `linkPose` is set, else `'threeQuarter'` under reduced motion, else `'director'`.
- `select()` sets a `programmatic` ref around its own reset/preset calls, so their synchronous `onUserCamera` does not flip the mode to free.
- Any other `onUserCamera` sets `'free'`. It is composed with R11's `clearCam`.
- R11 arrival with `cam`: `setPose`, mode free. Without `cam`: `select(defaultMode)`.

New **`squat/components/CameraModeSelect.jsx`**, props `mode`, `onSelect`, `disabled`:

- A `role="radiogroup"` labelled "Camera", with **Director** plus Three-quarter, Front, Back, Left and Right.
- In free mode no radio is checked. Director is always visible as the return control.
- It replaces CameraControls' reset and preset buttons. Zoom and the arrow keys stay.

**Autoplay and looping** (`useAnatomyViewState`):

- New `autoplay` action: `playing: true` and **not** `moved`, so the URL stays untouched.
- `tick` wraps (`next % frames`).
- The interval skips ticks while `document.hidden` and re-bases on return.
- `SquatApp` autoplays once, latched by a ref, when `view.ready && scene.status === 'ready' && !reducedMotion && hash.t === undefined && hash.cam === undefined`. It does not resume after the user pauses.
- WCAG 2.2.2 is met by the always-visible Pause.
- Memoise `MuscleSection` and `PhaseStrip`, because playback becomes the resting state.

**Reduced motion:** no autoplay; the initial mode is three-quarter. If the user picks Director, the camera jumps with the playhead and does not tween.

### Tests

| Area | Coverage |
| --- | --- |
| `cameraShot.test.js` | determinism; per-frame Δ bounds, including the wrap 184→0; equals the key at key frames |
| `directorShot.test.js` | frontal bottom and every constraint |
| `poseModel.test.js` | pelvis y at s=1 is ≥ 0.3 m below s=0 |
| Scene | `'start'` ends directing and calls `onUserCamera`; `setFrame` afterwards does not move the camera; the target follows the pelvis |
| `SquatScene.test.jsx` | fake controller gains `pose`, `setPose`, `direct`, `setFrame`; `pose()` while directing returns `home: true, director: true`; `select('front')` does not end free |
| Reducer | `autoplay` leaves `moved` false; wrap; hidden-tab skip |
| `SquatApp` | autoplays once; not with `t` or `cam`; not under reduced motion |
| e2e | settle-based tests load paused; L301 rewritten to loop; new: a plain load autoplays, a drag stops the director, Director resumes it |
| R11 | golden G1 (bare `/squat`) expectation updated for autoplay |

### Risks

- The render loop never idling (frame-counter and hidden-tab e2e cover this).
- Perpetual 50 Hz React re-render on phones (hidden-tab skip and memoised sections mitigate it).
- R11 file contention in `createAnatomyScene.js`, `useAnatomyScene.js` and `SquatScene.test.jsx`: keep A's diff additive.
- A view copied after takeover mid-squat reopens up to ~0.2 m off vertically (fixing it needs a v2 `cam` field).

**Not in PR A:** pan, free-fly, shots in the hash, extra shots, video export.
