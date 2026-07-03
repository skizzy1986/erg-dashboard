# Project Management & Workflow Analysis — erg-dashboard

> Top-down, system-wide review of how work is planned, tracked, and shipped.
> Produced 2026-06-29 by the Project Management division. Read alongside
> `WORKFLOW.md` (the new standing process) and `CLAUDE.md` (project briefing).

> **Addendum 2026-07-02 — status update.** Three days of execution overtook
> several findings; treat the figures below as historical. Finding 1 (three
> disconnected trackers) and Finding 3 (agents documented-but-not-installed)
> are **resolved** — GitHub Issues/Projects is the single rail, 244 agents are
> installed. Finding 5 (stalled refactor) is **nearly resolved**:
> `erg-dashboard.jsx` is down from 9,733 to **~960 lines** (a shell/router;
> ~20 extraction PRs merged 2026-06-29 → 07-01); the endgame is tracked in
> issue #114. The CI coverage gate cited in Finding 7 now lives solely in
> `web/vite.config.js` (a ratchet — do not quote numbers in docs). Findings 6
> (dormant integrations) and the StrengthLogger test gap remain open, tracked
> in issues #116 and #114.

---

## Executive summary

erg-dashboard is a **functionally mature product with a fragmented operating
model**. It ships real features — AI coach, mobile app, offline sync, Bluetooth
erg live data, HRV analytics — on solid engineering rails (CI gates, pre-commit
hooks, an agent-driven build pipeline). But the way work is *governed* lags the
way it's *built*.

One theme runs through every finding: **the documentation describes a more
complete, more disciplined system than the one that exists on disk, and the work
itself is tracked across three disconnected rails that don't reference each
other.** The headline example: `CLAUDE.md` claimed "26 Agency agents installed"
across four divisions, but `.claude/agents/` held only the 12 pipeline agents,
and the installer it referenced (`scripts/install.sh`) was never in the repo.
(That gap is now closed — see Finding 3.)

**Core recommendation:** consolidate planning onto a single PR-centric rail —
**GitHub Issues = backlog, GitHub Projects = status board, branch → PR → CI →
main = the unit of work** — and **retire the bespoke work-order system**. This
trades a clever-but-drifting convention for the tool the team already runs CI on,
where the backlog lives next to the code and every change is already a PR.

---

## Current-state map

Work currently flows through **three rails that don't talk to each other**:

| Rail | Where | What it tracks | State |
|---|---|---|---|
| **Work orders** | `coach/work-orders/WO-NNN-*.md` | Coach-authored build specs, git-native, YAML front-matter | 5 IDs, already drifting (Finding 2) |
| **Software factory** | `.claude/agents/`, `.claude/commands/`, `FACTORY.md` | The build *pipeline* (research→spec→build→test→review) | Live, well-documented |
| **Roadmap** | `README.md` "Roadmap" + `CLAUDE.md` "Integration Roadmap" | Evergreen list of future integrations | Static, unprioritized |

Supporting infrastructure is genuinely strong and is **not** the problem:

- **CI gates** (`.github/workflows/ci-web.yml`): Lint & Format → Test & Coverage
  (70% lines/functions, 60% branches) → Build. Android APK pipeline in
  `ci-android.yml`.
- **Pre-commit** (Husky + lint-staged): `eslint --fix` + `prettier --write` on
  staged JS/JSX.
- **Branch protection** on `main`; **Dependabot** weekly grouped PRs.
- **PR template** (`.github/PULL_REQUEST_TEMPLATE.md`).

The gap is not delivery infrastructure. It's **the absence of a single backlog
and status view** that says, at a glance: what's planned, what's in flight, what
shipped, and what's next.

---

## Findings

### 1. Three disconnected tracking systems, no single backlog
Work orders, the factory pipeline, and the README roadmap each track a slice of
reality and none references the others. There is no one place that answers "what
are we doing next and why." *Impact: priorities live in Scott's head; nothing is
visibly sequenced; easy to lose threads.* **This is exactly what the Issues/PR
pivot fixes.**

### 2. The work-order system has already drifted
The WO convention's selling point was "source of truth = front-matter + git log,
no index to drift" (`coach/work-orders/WORK_ORDERS.md`). At just **five** work
orders it has already collided:
- **Two `WO-004`s:** `WO-004-ci-process.md` and `WO-004-strength-templates.md`
  (both `status: done`) share one ID.
- **Three `WO-005`s** for one feature (Google Health API): a `draft` in
  `work-orders/`, plus `coach/WO-005-session-handoff.md` and
  `coach/WO-005-cowork-deploy-handover.md` sitting loose in `coach/`.
- `WORK_ORDERS.md` itself still says *"awaiting Bridge ratification"* — the
  format was never formally adopted.

*Impact: a hand-rolled tracker needs hand-rolled discipline; it didn't scale past
N=5. GitHub Issues give unique IDs, state, and links for free.*

### 3. The PM/Agency agents were documented but never installed *(now resolved)*
`CLAUDE.md` described 26 "Agency" agents across product / project-management /
support / testing, with a relevance map — but `.claude/agents/` contained only
the 12 erg-tailored pipeline agents, and the referenced `scripts/install.sh` did
not exist in the repo. **Resolved in this change:** the full upstream
`msitarzewski/agency-agents` package (16 divisions, 232 agents) is now installed
both globally (`~/.claude/agents/`) and committed into the project
`.claude/agents/` (244 total = 232 Agency + the original 12, none overwritten).

### 4. Documentation does not match the codebase
`CLAUDE.md` describes `src/` at the repo root and a "~3,900-line" monolith. In
reality the app lives under `web/`, and `web/src/erg-dashboard.jsx` is **9,733
lines** (plus an unextracted `web/src/StrengthLogger.jsx` at 1,665). No `App.jsx`
exists yet. *Impact: a new contributor — human or agent — is briefed against a
map that no longer matches the territory.* (Reconciled in this change; see
`CLAUDE.md`.)

### 5. The strangler-fig refactor has stalled and is invisible
The headline architectural goal (decompose the monolith) has moved ~1,000 lines
net in roughly five months, opportunistically, with no tracker, target, or
schedule. Because it isn't a backlog item, it never competes for time against
features. *Impact: the monolith is the main barrier to extending the app, and
nothing is applying pressure to it.* (Now a tracking issue — see backlog.)

### 6. Roadmap integrations have been dormant 12+ months
Strava, Garmin, and Concept2 OAuth imports are the README's flagship promises.
The schema is ready, the edge-function pattern exists — but there is **zero code
and no research commits** toward any of them. *Impact: the roadmap reads as
intent, not plan; nothing converts evergreen wishes into sequenced work.*

### 7. Test coverage is deep-but-narrow
Business logic (TSS/CTL/ATL, recovery analytics, offline queue) is well tested;
**mobile views and the 1,665-line `StrengthLogger.jsx` have no tests at all.**
Defensible for a solo project, but it's an unowned QA blind spot on the
largest untested surface.

---

## Recommendation: one PR-centric rail

Adopt GitHub-native project management and retire the work-order system.

| Element | Decision |
|---|---|
| **Backlog** | GitHub **Issues**, one per unit of work, labelled `P0/P1/P2` + division/area, grouped by **milestone** |
| **Status** | GitHub **Projects** board: Todo → In-progress → In-review → Done |
| **Unit of work** | A branch per issue → **PR** → the three CI gates → squash-merge to `main`; PR body uses `Closes #N` |
| **Work orders** | **Deprecated.** `done` records kept as history; the one open item (Google Health API) migrated to an issue; draft/duplicate files removed |
| **Factory pipeline** | Unchanged — it already ends in PR→CI→merge; `WORKFLOW.md` shows how the two compose |

Why this over the WO system: the team already runs every change through a PR and
CI; Issues/Projects put the backlog *in the same place*, give unique IDs and
state transitions for free, link issues↔PRs↔commits automatically, and need zero
bespoke discipline to stay consistent. The full process is specified in
`WORKFLOW.md`.

---

## Prioritized backlog (seeded as GitHub Issues)

| Pri | Item | Why | Effort |
|---|---|---|---|
| **P0** | Reconcile `CLAUDE.md` ↔ reality (paths, monolith size, agent inventory) | Every agent/contributor is briefed from it | S — done in this change |
| **P0** | Stand up Issues + Projects backlog; retire work orders | Single source of truth for all work | S — this change |
| **P1** | Deploy Google Health API vitals import (migrated WO-005) | Code already built; only deploy steps remain; Fitbit path sunsets Sep 2026 | M |
| **P1** | Refactor burndown — resume strangler-fig on the 9,733-line monolith | Primary barrier to extensibility | L (incremental) |
| **P2** | Test coverage for `StrengthLogger.jsx` + mobile views | Largest untested surface | M |
| **P2** | Strava / Garmin / Concept2 OAuth imports | Flagship roadmap promises, dormant 12+ mo | L each |

Priority rationale: P0 = make the system honest and give work a home (cheap,
unblocks everything). P1 = the one feature that's *built but not shipped* plus
the refactor that gates all future feature work. P2 = quality and the big new
integrations, sequenced after the foundation is visible and the monolith is
moving.

---

## What this change implements vs. leaves as recommendations

**Implemented now:**
- Installed the full Agency agent package (Finding 3).
- This report + `WORKFLOW.md` (the new standing process).
- Seeded the GitHub Issues backlog above + a Projects-board setup guide.
- Retired the work-order system (deprecated `WORK_ORDERS.md`, migrated the open
  item, removed draft/duplicate files, kept `done` history).
- Reconciled `CLAUDE.md` with reality.

**Left as recommendations (tracked as issues, not done here):**
- Actually deploying Google Health API, executing refactor extractions, writing
  the missing tests, building Strava/Garmin/Concept2 OAuth.
- Creating the Projects **board** itself — GitHub Projects boards can't be
  created through the available automation; `WORKFLOW.md` documents the ~2-minute
  manual setup.

---

*Authored by the Project Management division (Claude), 2026-06-29, on branch
`claude/project-mgmt-workflow-analysis-urdhms`.*
