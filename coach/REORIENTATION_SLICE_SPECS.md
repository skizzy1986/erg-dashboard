# SplitIQ reorientation — per-slice specs (Stage 3 briefs and their gate verdicts)

> Companion to [`REORIENTATION_EPIC_2026-11-06.md`](REORIENTATION_EPIC_2026-11-06.md). Each slice's
> Stage 3 brief is appended here as the Workflow Architect delivered it (read-only stage), with the
> orchestrator's verification notes and the Gate 2 verdict, so a fresh session can build the slice
> from this file plus the epic plan. Proposed text is verbatim and is what Gate 2 approves.

---

## Slice 1 — #413 — land VISION.md, re-brief the agents

**Gate 2 status: AWAITING SCOTT** (brief delivered 2026-11-06 ~05:58 UTC; orchestrator verified the
`ci-web.yml` `web/**` filter, `config.json:58` `readmeHeader`, the current text of all three files,
`check-context7.mjs:33-34,73`, and that `VISION.md` is absent from `origin/main`).

**Orchestrator notes.** (1) The brief corrects the plan: criterion 6 ("no `web/` file changes, so the
web jobs skip") was wrong because `web/.design-sync/CLAUDE.md` is under `web/**`; amended to "nothing
under `web/src`, `web/scripts`, `supabase/` or `.github/` changes, and every triggered job passes".
(2) The branch it names (`housekeeping/vision-rebrief-agents`) is not this session's assigned branch;
pushing to it needs Scott's permission under the session rule, asked at Gate 2. (3) Edit 2b
(`AGENTS.md:53`, "the 13→5 nav cut") and risk 3 (slice 11 to retire the "still in the tree"
sentence) are put to Scott with the brief.

### The brief (Workflow Architect, verbatim)

The brief is ready for Gate 2. Two premises in the plan were wrong: acceptance criterion (6) is false, and `VISION.md` is not on `main`. Both are corrected below.

**Working tree:** I edited nothing. The only state-changing command was `git fetch origin main`, which updates remote-tracking refs only.

**Labels:** **V** means I checked it in the repo. **I** means I inferred it.

## Files read

- **V** Read in full:
  - the scratchpad `VISION.md`, which is byte-identical to `origin/claude/splitiq-vision:VISION.md`
  - `erg-context.md` (102 lines)
  - `web/.design-sync/CLAUDE.md` (106 lines)
  - `.claude/AGENTS.md`
  - epic §1–6 and §9, and research §C 3–4
  - `check-context7.mjs`, `check-zone-bands.mjs` and `ownership.json`
  - the path filters in `ci-web.yml`, `context7-rule.yml`, `zone-bands.yml` and `doctrine-sha-guard.yml`
- **V** All three target files match `origin/main` exactly.

## Corrections to the plan

1. **Criterion (6) is false.** `web/.design-sync/CLAUDE.md` sits under `web/**`, which is the filter `ci-web.yml` uses (lines 33–36, **V**). So Lint, Test, Build, e2e and lighthouse all run on this PR. That is harmless and useful, because Lint runs `check:design-sync`.
   - New criterion (6): *nothing under `web/src`, `web/scripts`, `supabase/` or `.github/` changes, and every triggered job passes.*
   - `ci-android` filters on `web/src/**`, so it skips.
2. **`VISION.md` is not on `main`.** `git ls-tree origin/main VISION.md` returns nothing (**V**). If this PR merged first, its "Read `VISION.md` first" line would point at a file that does not exist. No wording fixes that, because the pointer is the whole point. Enforce the merge order instead (see Dependency).

## Guards

| Guard | What must survive, or what is true | Status |
|---|---|---|
| `check-context7.mjs` | `erg-context.md` must still contain `## Library documentation — Context7 first` (`:33`, `:57`) and both `resolve-library-id` and `query-docs` (`:34`, `:63–69`). `CLAUDE.md` must still contain `### Context7` (`:73`), and this slice does not touch it. The rewrite only touches lines 10–13 and 95–96. Lines 48–65 stay byte-for-byte. | V |
| `ownership.json` | `CLAUDE.md` is **repo-owned and pushed**: it is the `readmeHeader` at `config.json:58`. Editing it from the code side is the correct lane. Consequence: the pointer reaches design sessions only after Scott re-syncs with `/design-login` (Risk 1). | V |
| Prettier | `.prettierignore` excludes `.design-sync/`, and `format:check` only covers `src/` and `scripts/`. Prettier never sees any of the three files. | V |
| `check:zones` | `erg-context.md` and `AGENTS.md` publish no zone band. `.design-sync/CLAUDE.md:55–57` publishes one, with CP quoted, and it passes today. It is left untouched until slice 12. None of the new text below contains `UT2`. | V |
| `doctrine-sha-guard` | It fires on push to `main` for the paths `CLAUDE.md` and `.claude/skills/training-science.md`. A bare `CLAUDE.md` pattern matches only the root file, so `web/.design-sync/CLAUDE.md` does not trigger it. The next-day check confirms this. | I (GitHub glob rules, not looked up) |

## Edit 1: `.claude/skills/erg-context.md`

**Lines 10–13: replace `## Project` with:**

```
SplitIQ — a training app where the movements explain themselves. A 3D anatomical
runtime (`web/src/anatomy/`; first product `/squat`) shows what a lift does, wrapped
around a training log with an honest load model. For anyone who lifts or rows; a hobby
built to a public-quality standard. User data is keyed on `user_id` under owner-only
RLS, the user taken from the verified JWT. No AI coach and no personal prescription
engine: the load model stays (CTL/ATL/TSB, `sessionLoad`, readiness,
`derivePaceZones(cp)` with calibration read from `anchors`). The LLM coach and the
one-athlete schedule/prescription code still in the tree are being removed (#412) —
do not extend them. React 19 + Vite SPA under `web/` (Capacitor monorepo layout),
Supabase (Postgres + Auth + Edge Functions), Vercel hosting, Vitest + React Testing
Library. Read `VISION.md` first (it wins where docs disagree), then `CLAUDE.md`.
```

Why the "still in the tree" sentence is there:
- Slices 2–10 are built by agents briefed with this file. They need to know the coach and prescription code exists so they can remove it.
- Describing that code as current would be false. Saying it is gone would also be false.
- So the sentence states what it is: present, being removed, do not extend.

Where the claims come from:
- **V** "keyed on `user_id`" covers user data only. VISION lines 104–106 list the user-keyed tables; `exercises` and `exercise_media` are reference data.
- **V** The JWT claim comes from `001_enable_rls.sql` (`auth.uid() = user_id`).
- **V** The CP-from-`anchors` claim comes from `trainingConfig.js:171` and `:303`.

**Lines 95–96: replace with:**

```
CP = critical power, the anchor every rowing zone derives from — read it from the
per-user `anchors` table (`rowing_cp`); never hardcode a value. Deeper domain detail:
`.claude/skills/training-science.md` (its prescription sections are superseded by
`VISION.md`).
```

Decision: replace the number. Four reasons:
- The preamble describes a multi-user product, and "~205 W" is one user's calibration.
- The code already reads CP from `anchors` (**V**, `trainingConfig.js:303`).
- Watt figures written into prose go stale. Three such copies went stale before anything caught them (#266, #268, #275).
- It matches D20.

The `training-science.md` caveat goes in because that file stays stale until slice 11 (D2). An agent following the pointer must not treat its race-target and microcycle sections as current.

**Lines I checked and left alone:**

| Line | Text | Why it stays |
|---|---|---|
| 1, 4 | "Erg Context", "erg-aware" | The filename is the inheritance key at `check-context7.mjs:105`. Renaming the heading is churn with no gain. |
| 45 | "Destructive changes require Scott's explicit approval" | Scott is the owner and the person who authorises changes. That is not the solo-user framing. |
| 75–77 | Sentry project names | These are the real project names. |

Not framing, but stale. These are parked, not folded in:
- line 22 says `App.jsx` is "~519 lines" (CLAUDE.md says ~447)
- line 60 says "mathjs", which was removed in #54

## Edit 2: `.claude/AGENTS.md`

**Lines 43–44** (the sentence wraps across both lines):

```
Only five divisions are high-value for a small React/Supabase training app. The rest
(game-dev, GIS, sales, real-estate, …) are noise here.
```

**Optional (2b, needs Scott's yes):** line 53 says "the 13→5 nav cut", which contradicts D3. The proposed replacement is "the mobile nav cut to four destinations". It is outside the line the slice named. If Scott says no, park it for slice 11.

## Edit 3: `web/.design-sync/CLAUDE.md`

**Insert after line 15** (the end of the opening blockquote), before `## What SplitIQ is`:

```
> **Superseded in part — read `VISION.md` (repo root) first.** As of 2026-11-06 SplitIQ is
> not a one-athlete dashboard and has no AI coach. In this file, "What SplitIQ is" (the
> single-user premise), the **Coach** destination, the **Microcycle** entry and the CP and
> zone figures (one athlete's calibration) are superseded, as are the Coach, roster,
> Planning and nutrition sections of `HANDOFF.md`, `DESIGN_BRIEF.md` and `conventions.md`.
> The mobile target is four destinations. Those lines are struck later (tracked in #412);
> until then, where they disagree with `VISION.md`, `VISION.md` wins — do not design them.
```

The pointer is plain text, not a relative link, because this file is pushed to the design project, where `../../VISION.md` resolves to nothing.

**Lines 42 and 59: change in slice 12, not now.** The pointer names both lines, so leaving them does not contradict it.

The plan's "Coach / roster / nutrition" list is too narrow:
- Lines 19–30 ("one rower — Scott", "replaces Strava…", "No onboarding") go further against VISION than lines 42 and 59 do.
- That is why the pointer names "What SplitIQ is" explicitly.
- Striking line 42 now would also leave a "five destinations" heading over four rows, and `HANDOFF.md` still says five.

## Acceptance criteria and their proof

| # | Criterion | Proof |
|---|---|---|
| 1 | `VISION.md` is on `main` | `git ls-tree origin/main VISION.md` is non-empty (after #410) |
| 2 | The old framing is gone and the file points to `VISION.md` | `git grep -n "Personal coaching dashboard\|Solo user: Scott\|~205" .claude/skills/erg-context.md` returns nothing, and `git grep -n VISION.md .claude/skills/erg-context.md` is non-empty |
| 3 | The Context7 rule is intact | `cd web && npm run check:context7`, plus the CI job `Context7 rule` (filter `.claude/skills/**` matches) |
| 4 | The design-sync and zone guards pass | `npm run check:design-sync` and `npm run check:zones`, plus CI `Lint & Format` (which runs `check:design-sync`) and `Zone bands` (filter `**/*.md` matches) |
| 5 | Neither doctrine file is touched, and no doctrine issue opens | `git diff --name-only origin/main` lacks `CLAUDE.md` and `training-science.md`. The day after merge, there is no new "chore(doctrine): supersede doctrine_sha" issue. |
| 6 (amended) | No code, migration or workflow changes | `git diff --name-only origin/main` is exactly the three files below. The `ci-web` jobs run and pass. |

## Dependency, branch and PR body

**Branch:**
- Cut from fresh `origin/main` as `housekeeping/vision-rebrief-agents`, not from `claude/splitiq-vision`. Cutting from that branch would put `VISION.md` into this diff.
- Open the PR as a **draft**.
- After #410 merges: rebase onto `origin/main`, confirm criterion 1, then mark the PR ready.

**PR body:**

- **First line:** `Closes #<slice-1 sub-issue>`, then `Part of #412`, then `Depends on #410 — do not merge before it; erg-context.md points readers at VISION.md.`
- **Under the template headings** (`## What changed and why`, `## How to test manually`, `## Checklist`), state:
  - The three files, and why each one changes.
  - The output of the guard runs.
  - Follow-up for Scott only: re-sync the design project with `/design-login` so the pointer reaches design sessions.
  - #306 and #308 are closed as not planned by Scott editing the issues. **No `Closes`/`Fixes` keyword for them anywhere in the body or commits.**
- **Title:** `docs: land VISION.md pointer and re-brief the agents (slice 1)`. `docs` is an allowed type at `pr-title-lint.yml:26` (**V**).

## Build stage

- **Who applies it:** the orchestrator applies the approved text directly, under Minimal Change Engineer discipline: verbatim, no paraphrase, no extra lines.
  - Why: the deliverable is wording that Gate 2 has already approved.
  - A Frontend Developer spawn adds paraphrase risk and no value.
  - Stage 5 reduces to the guard runs. Stage 6 still runs Code Reviewer and Reality Checker against this brief.
- **Before push, run from `web/`:**
  - `npm run check:context7`
  - `npm run check:design-sync`
  - `npm run check:zones`
  - `npm run lint`
  - `npm run format:check`
  - `npm test`
  - The last three are required by the CLAUDE.md safety rules. CI runs them anyway because a `web/` path changed.
- **Then run from the repo root:** `git grep -n -i "solo user\|solo dashboard\|personal coaching dashboard\|~205" -- .claude/skills/erg-context.md .claude/AGENTS.md`. It must return nothing.
- **`git diff --name-only origin/main` must be exactly:**

```
.claude/AGENTS.md
.claude/skills/erg-context.md
web/.design-sync/CLAUDE.md
```

## Risks

1. **The pointer does nothing for design sessions until Scott re-syncs.** It sits in the `readmeHeader` (`config.json:58`), and the claude.ai/design project keeps the old briefing until Scott runs `/design-login`. The PR body has to say this.
2. **Merge order.** If this merges before #410, `erg-context.md` points at a file that does not exist. The draft state, the "Depends on" line and a rebase-then-check step guard against it.
3. **The preamble's own sentence will go stale.** "The LLM coach… still in the tree are being removed (#412)" becomes false after slices 3 and 10. Recommend adding "update the `erg-context.md` §Project removal sentence" to slice 11's scope.
4. **Slices 2+ need the new preamble.** Any slice branch cut before this merges carries the old briefing, so cut slices 2+ only after this lands.

