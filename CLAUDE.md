# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Single-athlete rowing + strength training dashboard. React SPA on Supabase, deployed on Vercel.
This file is the durable "knowledge layer" Claude Code inherits every session. Keep it short and true.

## Stack
- **Vite 5 + React 18 — plain JavaScript / JSX (NO TypeScript).** This is deliberate; do not introduce TS without an explicit decision.
- **Supabase** (Postgres + Auth + Edge Functions/Deno) — project ref `swdrueaserjzhuxnzmeu`.
- **Vercel** — auto-deploys on push to `main`.
- recharts, mathjs, @supabase/supabase-js.

## Commands
- Node 18+ required.
- `npm install` — deps. Run in a LOCAL clone, **never in the Drive-mirrored folder** (Drive would thrash syncing node_modules).
- `npm run dev` — local dev server.
- `npm run build` — production build (`vite build`). **Must pass before every commit.**
- Edge function unit tests: `cd supabase/functions/vitals-import && deno test test.ts`
- Edge function secrets (set in Supabase Dashboard → Project Settings → Edge Functions → Secrets): `SHEET_CSV_URL`, `VITALS_USER_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `SLACK_BUILD_WEBHOOK_URL`

## Architecture
- `src/main.jsx` — entry + Supabase email/password auth gate.
- `src/erg-dashboard.jsx` — the main app. Large single-file component; nav tabs: overview / calendar / program / plan / erg / strength / logger / mobility / recovery / log / journal.
- `src/StrengthLogger.jsx` — the Logger tab: full strength app (templates, coach assignments, rest timer, exercise picker, muscle-heatmap + animated demos, history/PRs). Scoped vanilla-JS mounted in a React container.
- `src/supabaseClient.js` — shared client (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
- `supabase/functions/` — Deno edge functions (e.g. `vitals-import`).
- No `supabase/migrations/` directory — schema has been applied directly to the DB; migrations directory does not exist yet.
- Data (Supabase, RLS ON, rows carry `user_id`): `sessions`, `vitals`, `strength_workouts`, `strength_sets`, `templates`, `template_exercises`, `workout_assignments`, `exercise_prefs`, `exercises` (873 reference rows), `exercise_media`, `backup_snapshots`.

## Conventions
- Dates render AND parse **d/m/y**; a single `formatDate` helper is the only date renderer.
- **Never hardcode the user** — read `user_id` from auth; keep RLS correct. The app is already multi-tenant-shaped.
- Idempotent ingestion: upsert on a natural key (see `vitals` `(user_id, date)`).

## Testing
- No formal test runner yet. Verify with `npm run build` passing, plus targeted logic tests via esbuild + node for pure functions (parsers, mappers) before relying on them.

## Don't do
- Don't introduce TypeScript (JS by design).
- Don't commit secrets / `.env` / service-role keys.
- Don't run `npm install` in the Drive-mirrored clone.
- Don't bypass RLS; don't run destructive SQL without a fresh backup + explicit approval.
- Large edits to `src/erg-dashboard.jsx` can truncate on the Drive mount — after editing, verify with `npm run build`.
- A `PreToolUse(Bash)` hook (`.claude/hooks/block-secret-commit.sh`) blocks `git commit` when a secret-looking file (`.env`, `*.pem`, `id_rsa`, `service_role`, etc.) is staged — unstage it rather than working around the hook.

## Backups & safety
- Free Supabase tier → no PITR. Daily in-DB snapshots (`backup_snapshots`, pg_cron 18:00 UTC) + weekly off-site to Drive `backups/`. Before any destructive migration, confirm a fresh snapshot exists.

## Deploy
- Commit to `main` → Vercel auto-builds. After a deploy, confirm it reaches READY — don't assume.

## How we work (the factory)
This repo uses the agent-factory model — see `FACTORY.md`. Feature work flows: research → story → spec → build → test → validate → PR, with human approval after the story, after the spec, and after validation. Specialized agents live in `.claude/agents/`; the chain is `.claude/commands/orchestrate.md`.

## Work-orders
`coach/work-orders/` is the git-native handover rail for Coach-authored build specs:
- `WORK_ORDERS.md` — convention doc (schema, flow, rules).
- `WO-NNN-slug.md` — one file per order; status in YAML front-matter (`draft | ready | in_progress | done | reverted`).
- Flow: Coach authors + sets `status: ready` → Bridge commits the file (the authorization gate) → Cowork implements → advances status.
- Cowork never self-authorizes. The Bridge commit is the gate.
- Active orders: WO-001 (vitals import), WO-002 (Slack build read-out), WO-003 (done), WO-004 (done).
