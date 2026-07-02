# Erg Context — canonical spawn preamble

> Prepend the FULL contents of this file to every pipeline subagent prompt.
> Agency-library agents are generic — this block is what makes them erg-aware.
> The invoking skill appends a stage addendum after it. One copy lives here;
> everything else points at this file instead of duplicating it.

## Project

Personal coaching dashboard for rowing (erg), strength, and cycling training.
Solo user: Scott. React 18 + Vite SPA under `web/` (Capacitor monorepo layout),
Supabase (Postgres + Auth + Edge Functions), Vercel hosting, Vitest + React
Testing Library. Full briefing: `CLAUDE.md`.

## Architecture layers (place code in the correct layer — never a new monolith)

- `web/src/constants/` — plain JS data, no imports, no React
- `web/src/utils/` — pure functions, no React, fully testable
- `web/src/hooks/` — React hooks; Supabase calls live here
- `web/src/components/` — reusable JSX, props in, no direct Supabase calls
- `web/src/views/` — tab-level JSX, composes components
- `web/src/erg-dashboard.jsx` — legacy shell/router (~960 lines); targeted edits only

## Code style (non-negotiable)

- Plain JavaScript + JSX. **No TypeScript.**
- Inline styles only (dark `#08080d` / cyan `#00d4ff` theme) — no CSS modules, no Tailwind.
- No comments unless the WHY is non-obvious. No abstractions beyond the task.
- PascalCase component files; camelCase utils/hooks. Tests co-located in
  `__tests__/` subdirectories or `*.test.js`.
- One `formatDate` helper — do not add date-formatting variants.

## Supabase gotchas (honour on every write)

- Supply `user_id` explicitly on inserts. RLS is always on — never bypass it.
- `sessions.date` is TEXT `MM/DD/YY` — order with `to_date(date,'MM/DD/YY')`.
- `UNIQUE(date, label)` on `sessions` — temp-suffix labels before bulk shuffles.
- Vitals upsert on `(user_id, date)`. Migrations are additive and reversible;
  DDL via `apply_migration`, never raw `execute_sql`.
- Read back every write. Destructive changes require Scott's explicit approval.
- Deeper patterns: `.claude/skills/supabase-patterns.md`.

## Quality gates

- `npm run build`, `npm test`, `npm run lint`, `npm run format:check` must pass.
- Coverage thresholds in `web/vite.config.js` ratchet upward — new code ships
  with tests in the same PR. The numbers only go up.

## Domain glossary

CTL = 42-day exponential average of training load (fitness). ATL = 7-day
average (fatigue). TSB = CTL − ATL (form). sRPE = session effort, 1–10.
CP = critical power (~205 W rowing, provisional). Deeper domain detail:
`.claude/skills/training-science.md`.

## READ-ONLY instruction template

If the stage brief says READ-ONLY: do not use Edit or Write, and do not run
state-changing Bash (no git commit/checkout, no file writes, no installs).
Your deliverable is your final report text only.
