---
id: WO-003
title: Render planned sessions + fix erg renderer + cycling type
status: done            # shipped in cfd2e7d, live on d737d07; verified 2026-06-22 (code + data + all 6 acceptance checks)
author: coach
created: 2026-06-22
targets: [react-ui]
schedule: null
notify: null            # the deploy surfaces in #build via the Vercel->Slack integration (WO-002)
reversible: true
depends_on: []
acceptance:
  - planned erg card renders with null metrics -> shows targets from label + coach_note, no NaN / blank / crash
  - planned strength and cycling cards render
  - status='planned' rows appear in an Upcoming / Plan view, visually distinct from actual
  - completed Log + analytics exclude planned rows (no double-count)
  - when an actual row exists for the same date+type, the matching planned card shows done / is hidden
  - legacy dashboard_seed rows still render (no regression)
---

# WO-003 · Render the plan + fix the erg renderer

## Goal
Surface the 15-day program that's already in Supabase but invisible. 25 planned rows (`sessions` ids **41–65**, `status='planned'`, `source='coach_plan'`) are live, but the app only knows `status='actual'`, the erg renderer still filters on a removed `splits` field, and `cycling` is an unhandled type. This WO makes the plan render and fixes the erg bug in one pass.

## Scope
- **In:** sessions fetch/mapping fix; erg-card null handling; an Upcoming/Plan view; `cycling` type handling; planned-vs-actual reconciliation in list + analytics.
- **Out:** schema changes — none needed for v1 (reconciliation matches on `date`+`type`). A future `planned_id` FK linking planned→actual is deferred to a later WO.
- **Test data already present:** planned rows 41–65, `actual` rows, and legacy `dashboard_seed` rows — exercise all three.

## Schema
None. (v1 reconciliation is a `(date, type)` match; `planned_id` FK deferred.)

## Implementation
1. **Fetch / mapping.** In the sessions fetch block, map `distance_m`, `avg_watts`, `avg_hr` (currently unmapped). Remove the dead `splits` filter/reference — that field no longer exists and is what breaks the erg renderer.
2. **Erg card.** Render from the flat fields; handle null (planned rows carry null metrics) → show the prescription from `label` + `coach_note` instead of blanks/NaN. Never throw on null.
3. **Planned view.** Render `status='planned'` rows in an Upcoming/Plan section (Today and/or Program tab), visually distinct from `actual`. Surface `coach_note` as the prescription text.
4. **Cycling type.** Add `cycling` to the type → icon/label/colour map alongside `erg`/`strength`. The default case must not throw or render "unknown".
5. **Reconciliation.** Planned rows are forward-looking — exclude them from the completed Log and from analytics aggregates. When an `actual` row exists for the same `(date, type)`, mark the matching planned card done (or hide it) so the Plan view doesn't carry stale future items.

## Schedule
None.

## Notify
None directly — the deploy itself surfaces in `#build` via the Vercel → Slack integration (WO-002). No per-job webhook needed for a UI deploy.

## Secrets / env
None.

## Acceptance
1. A planned erg card (e.g. id 45, the CP test) renders with null metrics — shows targets from `label` + `coach_note`, no NaN/blank/crash.
2. Planned strength (e.g. id 43) and cycling (e.g. id 48) cards render.
3. `status='planned'` rows appear in an Upcoming/Plan view, visually distinct from `actual`.
4. Completed Log + analytics exclude planned rows — totals unchanged vs before this WO.
5. Mark one planned row's date+type as also having an `actual` → the planned card shows done / hides.
6. Legacy `dashboard_seed` rows still render (no regression).

## Rollback
`git revert` the commit (or Vercel → redeploy previous). Pure render change — no data touched; planned rows remain in Supabase regardless.

## Authority notes
All reversible (frontend code + deploy). No schema, no destructive ops, no Bridge handover beyond committing this WO. Push `main` → Vercel auto-deploys.
