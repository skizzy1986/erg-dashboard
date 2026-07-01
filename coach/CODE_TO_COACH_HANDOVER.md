# Code → Coach Handover — Coordination (2026-07-01)

*Reciprocal of `claude_code_handover_v2.md`. Paste into Coach chat when you want the
two interfaces re-synced. This is about **how Code and Coach stay on the same page**,
not training content.*

---

## What Code just did

Reconciled `CLAUDE.md` (repo root) to current reality and opened it as a PR. Facts
were verified read-only against the live DB (`swdrueaserjzhuxnzmeu`) before writing —
not taken from the handover text alone. Changes:

- **Model** reverted from polarised → **pure base + strength** (bike is complementary
  Z1/Z2 only; 2 Upper + 2 Lower per week; Lowers ≥3 days apart).
- **CP anchor** ~190W → **~205W provisional (rowing)** + zones UT2 113–144 /
  UT1 144–164 / AT 164–205 W. Revalidate via rested 1-min + 4-min.
- **Supabase Schema** section rewritten to the real **13 tables / 22 migrations**
  (the whole strength subsystem), with corrected `sessions` columns (`date` is text
  `MM/DD/YY`, targets live in `label` + `coach_note`), corrected `vitals`, the
  strength-logging convention, and the data-layer gotchas.
- **Vitals source**: Google Health **CSV → API** auto-sync.
- **Coaching data model** recorded: Coach writes to the DB via the Supabase MCP
  connector (`source='coach'`); the `coach_messages` in-app path is legacy/experimental.

## Corrections to the handover's assumptions (please update your mental model)

The handover was right about the *facts* but wrong about the *document*:

1. **`CLAUDE.md` is not a §-numbered doctrine doc.** There is no §0 bootstrap, §3.6/3.7,
   §7, or §8 in this repo. It's a software-engineering briefing whose *Training Science
   Domain*, *Supabase Schema*, and *Integration Roadmap* sections carried the stale
   facts. Those are the sections that changed — by name, not by number.
2. **The three-party governance model (Coach / System / Bridge) is deprecated.** It
   lived in `coach/work-orders/`, retired 2026-06-29 in favour of GitHub Issues/Projects.
   Don't ask Code to "rewrite §7" — there's nothing to rewrite.
3. **The `[C Art. X]` "Constitution" is not in this repo.** If it's authoritative, it
   lives in your context, not the codebase. Code can't reconcile against something it
   can't see — cite the actual text if you want it honoured here.

## Coordination model going forward

**`CLAUDE.md` (repo root) is the single shared source of truth for both interfaces.**
Claude Code auto-loads it every session; keep it correct and neither side drifts.

- **Code owns**: the repo, schema **migrations** (`apply_migration`), deploys, and PRs.
- **Coach owns**: training inputs/assessment and directing what to build; operates on
  the DB via the Supabase MCP connector, writing training rows with `source='coach'`.
- **Keeping in sync**:
  - *Schema change* → flows through Code: `apply_migration` (named) **and** update the
    *Supabase Schema* section in the **same** change. Never let the DB and the doc diverge.
  - *Model / anchor change* (CP, zones, base-vs-polarised, strength split) → update the
    *Training Science Domain* section.
  - *Integration change* → update *Integration Roadmap* / *MCP Servers*.
- **Bridge discipline persists**: Scott authorises consequential/destructive/schema
  changes; review structure before material writes; **read back every write**. Honour
  the data-layer gotchas (explicit `user_id` UUID — `auth.uid()` doesn't resolve through
  the connector; `sessions.date` is text, order via `to_date(...,'MM/DD/YY')`;
  `UNIQUE(date,label)`; vitals upsert on `(user_id,date)`).

## Deferred / open items (not done this session)

- **Task 2** — wire native slash-commands + SessionStart "where are we" / SessionEnd
  "wrap up" hooks. No command list is defined in the repo yet; Scott needs to specify.
- **Task 3** — bring `workout_assignments` + per-set `strength_sets` into the flow once
  the app logger is fit-for-purpose. **Prune the abandoned `in_progress`
  `strength_workouts` shells (0 sets, no `session_id`)** — destructive, so it's parked
  until Scott explicitly OKs it. Coach flagged this correctly; Code will execute on his word.
- **Task 4** — APK / Capacitor packaging.
- **Task 5** — revalidate rowing CP (rested 1-min + 4-min) when the block allows.

## Known infra gap (for a later PR)

The SessionStart hook installs npm deps at the **repo root only**, but the app and its
tests live in `web/`. The pre-push hook (`cd web && npx vitest run`) needs `web/`
dependencies, so a fresh remote session must `npm install` inside `web/` before it can
push. Worth folding a `web/` install into the SessionStart hook.
