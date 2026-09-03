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
- `web/src/App.jsx` — entry shell/router (~515 lines); targeted edits only

## Code style (non-negotiable)

- Plain JavaScript + JSX. **No TypeScript.**
- Inline styles only — no CSS modules, no Tailwind.
- **Read every colour from `THEME` (`web/src/constants/theme.js`) — never type a raw
  hex.** The palette is mid-migration from dark to light and the values will move; a
  literal is a defect even when it currently matches. See `DESIGN.md`.
- No comments unless the WHY is non-obvious. No abstractions beyond the task.
- PascalCase component files; camelCase utils/hooks. Tests co-located in
  `__tests__/` subdirectories or `*.test.js`.
- One `formatDate` helper — do not add date-formatting variants.

## Supabase gotchas (honour on every write)

- Supply `user_id` explicitly on inserts. RLS is always on — never bypass it.
- `sessions.date` is TEXT `M/D/YY` — **write** it, never order by it. Order by the
  generated `date_iso` date column (`nullsFirst: false` on desc). `date_iso` is
  read-only; an insert naming it is rejected.
- `UNIQUE(date, label)` on `sessions` — temp-suffix labels before bulk shuffles.
- Vitals upsert on `(user_id, date)`. Migrations are additive and reversible;
  DDL via `apply_migration`, never raw `execute_sql`.
- Read back every write. Destructive changes require Scott's explicit approval.
- Deeper patterns: `.claude/skills/supabase-patterns.md`.

## Library documentation — Context7 first

The Context7 MCP connector is live in every session. **Never answer a library
question from memory, and never reach for WebSearch first.** Look it up:

1. `resolve-library-id` (`libraryName`, `query`) → a `/org/repo` id
2. `query-docs` (`libraryId`, `query`, optional `tokens`) → the docs

This binds on any API surface, config key, or version-specific behaviour in
React, Vite, Vitest, `@supabase/supabase-js`, `@testing-library/react`,
Recharts, `@tanstack/react-query`, ESLint and Prettier. Fall back to WebSearch
only when `resolve-library-id` returns nothing, or for tooling unlikely to be
indexed (Husky, lint-staged, mathjs, vite-plugin-pwa).

**Name the source for every library claim you make** — "Context7" or the URL —
so a reader can tell a looked-up fact from a remembered one. An unsourced API
claim is a guess, and this repo has already shipped bugs from confident guesses
about library behaviour.

## Quality gates

- `npm run build`, `npm test`, `npm run lint`, `npm run format:check` must pass.
- Coverage thresholds in `web/vite.config.js` ratchet upward — new code ships
  with tests in the same PR. The numbers only go up.

## Error reporting

Errors go to Sentry. Org `splitiq-29`, **EU-region** — every Sentry MCP call needs
`regionUrl: "https://de.sentry.io"`, and the ingest host is `*.ingest.de.sentry.io`.
Projects: `erg-dashboard` (the app) and `erg-dashboard-functions` (edge functions).

- Report handled errors through `captureError()` in `web/src/utils/sentry.js`, and
  `captureFunctionError()` in `supabase/functions/_shared/sentry.ts`. Do not call the
  Sentry SDK directly from a hook or a function handler.
- Supabase failures raised through react-query are already captured by the
  QueryCache/MutationCache handlers in `web/src/utils/queryErrorHandlers.js`. Code
  that talks to supabase-js directly, outside react-query, must capture its own.
- **Never swallow an operational error silently.** A bare `catch {}` is only correct
  for genuinely expected non-events (a corrupt localStorage entry, a partial SSE
  line) — and those must say why in a comment.
- Adding a Sentry ingest host, or any new outbound host, means updating `connect-src`
  in `web/vercel.json` or the browser blocks it.

## Domain glossary

CTL = 42-day exponential average of training load (fitness). ATL = 7-day
average (fatigue). TSB = CTL − ATL (form). sRPE = session effort, 1–10.
CP = critical power (~205 W rowing, provisional). Deeper domain detail:
`.claude/skills/training-science.md`.

## READ-ONLY instruction template

If the stage brief says READ-ONLY: do not use Edit or Write, and do not run
state-changing Bash (no git commit/checkout, no file writes, no installs).
Your deliverable is your final report text only.
