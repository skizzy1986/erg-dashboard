# SplitIQ — design workstream, state of play

_22 August 2026. Companion to [`DESIGN_BRIEF.md`](DESIGN_BRIEF.md) (the prescriptive
document) and [`conventions.md`](conventions.md) (the descriptive one). This file is
neither — it is a status check, and it goes stale quickly._

Rendered version: https://claude.ai/code/artifact/e16750c2-4d67-4bc2-99a3-7fae8ca450dc

> **Verdict.** The Claude Design project has never been opened. Separately, `main`
> moved underneath the synced design system and the design-sync build was
> **broken on `main`** — verified by reproduction, not inferred from a diff.
>
> **Update 2026-08-24:** both live defects in §2 are fixed and neither blocks a
> re-sync. The project still has not been opened.

---

## 1. The design project has never been opened

The upload's final step writes `_ds_needs_recompile`. The claude.ai/design app clears
that file the first time anyone *opens* the project, and replaces it with a generated
`_ds_manifest.json`. Both conditions still hold:

```
_ds_needs_recompile  -> present, {"by":"design-sync-cli"}   <- still ours, never cleared
_ds_manifest.json    -> absent                              <- self-check never ran
```

This is stronger than "no designs were made" — the project has not been opened at all
since upload, so nothing could have happened there.

Everything else checked, all negative:

| Checked | Result |
|---|---|
| Design-system files | All 61 identical to upload; project `updatedAt` still `2026-08-21T15:38` |
| Design projects | Only *SplitIQ Design System*; no new project |
| Artifact comments | None |
| Artifacts (owned + shared) | Nothing SplitIQ-related beyond the two written here |
| Repo | Zero commits touching `web/.design-sync/` since the sync merged |

**Blind spot, and the likely explanation:** the sync tooling can only enumerate
design-*system* projects. Designs built in an ordinary Claude Design project are
invisible to every check above — not missing, just out of view.

---

## 2. Live defects

### 2.1 ~~The design-sync build is broken on `main`~~ — **fixed**

> **Resolved.** `85eab51` (#224) repaired the barrel and #225 added the CI guard this
> section asks for at the end. Re-verified at `ad2a8bd`: `entry.jsx` exports
> `derivePaceZones`, `previews/PaceTrendChart.tsx` derives locally from it, the bundle
> builds (esbuild, 963 kb), and `npm run check:design-sync` passes. **A re-sync is no
> longer blocked by this.** Kept below for the record.


`d15d334` (#203) removed the static `PACE_ZONES` export from `trainingConfig.js`,
deliberately, so a seed-derived second set of zone bands cannot diverge from the live
CP anchor. That change is correct. But `web/.design-sync/entry.jsx:20` still
re-exports the symbol, and `previews/PaceTrendChart.tsx` still consumes it.

Reproduced against the exact `origin/main` sources:

```
$ esbuild .design-sync/entry.jsx --bundle
x No matching export in "src/constants/trainingConfig.js" for import "PACE_ZONES"
```

**Fix:** export `derivePaceZones` from the barrel instead, and have the preview call
it with a CP value.

This is the first item in `NOTES.md`'s *Re-sync risks* — "a hand-maintained barrel
with no drift detection" — coming true within a day of being written down. The note
was not sufficient; the barrel wants a CI guard that builds `entry.jsx` on any
`web/src` change, because the same failure recurs whenever a synced export is renamed
or removed.

### 2.2 ~~`conventions.md` ships a contrast failure into every generated design~~ — **fixed**

> **Resolved by #262's rewrite**, which drops the `THEME.muted` recommendation
> entirely: section labels are now `#43485a`, which measures 5.26 on the light ground
> `#bcc5dd` and 9.08 on a white card — both pass AA. Note this was also fixed once in
> `85eab51` (#224) and then reverted by `e61092c` (#240), so it has now been closed
> twice; `npm run check:design-sync` verifies the published ratios from here on.


The synced conventions file recommends `THEME.muted` at `fontSize: 9` on
`surface`/`raised` panels. Both pairings fail WCAG AA (this is §1.6 of the brief,
re-verified):

```
muted      #7e7e9a on raised  #2a2a48 -> 3.50  FAIL AA
muted      #7e7e9a on surface #1a1a2e -> 4.34  FAIL AA
textSubtle #aaaacc on raised  #2a2a48 -> 6.13  pass
```

`conventions.md` was the `readmeHeader` at the time, so the failure reproduced in every
mockup built from it. `textSubtle` is a clean swap. (Since #258, `readmeHeader` points at
`CLAUDE.md` and `conventions.md` is design-owned — see `ownership.json`.)

---

## 3. Drift check — everything else is still accurate

Diffing the sync commit `6dae5c1` against `main` across `web/src/components/`,
`theme.js` and `ui.js`: two test files, plus `LogSessionForm.jsx` — which is the one
component deliberately excluded from the sync (it builds a Supabase client at module
scope). So it changed, and it does not matter here.

**All eleven synced components, all 23 tokens, and the accent->meaning mapping are
unchanged.** The uploaded bundle is still a faithful mirror apart from §2. `main` has
moved quickly — several commits since the sync, many branches active — but none of it
touches the synced surface.

---

## 4. Questions closed since the brief was written

Three of §8's open items are no longer open.

### 4.1 Typeface — decided: IBM Plex Sans + IBM Plex Mono

Self-hosted. Sans for chrome and prose, mono kept for figures. The deciding argument
was metric compatibility rather than taste: Plex Sans and Plex Mono share vertical
metrics and x-height, so a sans label sitting directly above a mono figure aligns
without optical fudging — which is the entire `LiveMetric` construction, repeated on
every screen.

### 4.2 The styling seam — approved

The ten layout primitives merge a `style` prop last. Domain components (`LogEntry`,
`WorkoutItem`, `LiveMetric`) keep their closed contracts. Density resolves through the
token module rather than being drilled as a prop.

The asymmetry decided it: approving is reversible — a seam can be tightened later —
while declining is not a deferral but permanent structural closure, and retrofitting
one costs another full sweep. The consistency the no-escape-hatch rule was protecting
is already gone; ~1,000 loose hex literals are the proof.

### 4.3 `rowing_cp` 205W vs displayed 190 — resolved, but not either way §8.3 predicted

§8.3 framed this as a binary: a display bug to fix in S2, or a deliberate conservative
floor that S2 must not "fix". PR #203 did neither. It removed the hardcoded mirror
entirely — `trainingConfig.js` no longer carries a CP number at all, and
`deriveCalibrationStatus()` resolves it from the live anchor at render time, saying so
explicitly when the anchor is unavailable rather than falling back to a stale value.

Better than either option on the table — and the same commit is what broke the sync.

---

## 5. Queued

| Priority | Work |
|---|---|
| ~~Do first~~ | ~~Repair the barrel and fix the `muted` contrast in `conventions.md`~~ — **both closed** (§2.1, §2.2). The barrel landed in `85eab51` (#224) with a guard in #225; the contrast landed there too, was reverted by `e61092c` (#240), and is closed again by #262's rewrite. |
| **Do first** | Open the project. Every remaining item in §1 needs an interactive `/design-login`, which no agent session can do. |
| Record | Two couplings into `NOTES.md`: `dtsPropsFor` must document `style` once the primitives ship, or the design agent codes against a contract that denies the seam exists; `cfg.extraFonts` must carry the Plex woff2 files once self-hosted, or generated designs keep rendering in fallback after the app is fixed. |
| Coordinate | Close §8.1 and §8.2 in `DESIGN_BRIEF.md` — both decided but still written as open. Fix the numbering while there: §8 currently reads 1, 2, 2, 3, 4, 5, 6, 7. |
| Consider | A CI guard that builds `entry.jsx`, per §2.1. |

---

## How this was verified

Verified at `origin/main` `8ef673d`. The `PACE_ZONES` break was reproduced by
extracting the exact `origin/main` sources into a scratch tree and running esbuild
against them — not inferred from reading the diff. Contrast ratios computed from
`src/constants/theme.js` using the WCAG 2.x relative-luminance formula. Drift measured
as `git diff 6dae5c1..origin/main` scoped to the synced surface. Design-project state
read from the live file listing, not a cached copy.
