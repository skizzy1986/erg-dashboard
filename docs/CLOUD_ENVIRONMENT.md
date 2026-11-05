# Cloud environment

This is enough to rebuild the claude.ai cloud environment for this repo from nothing.
Every setting carries its reason, so a later change can be judged against why it was made.

The environment itself is configured in claude.ai (the environment settings for Claude
Code on the web), not in the repo. Only two pieces live in git: the project permissions in
`.claude/settings.json` and the SessionStart hook in `.claude/hooks/session-start.sh`.

## Repository

One repository: `skizzy1986/erg-dashboard`. Because there is only one, the repo's
`.claude/settings.json` is the project settings for every cloud session.

## Setup script

```bash
curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh -s -- -y
```

**Why Deno.** The edge-function tests must run the way `.github/workflows/ci-functions.yml`
runs them: Deno v2.x, working directory `supabase/functions`.

```bash
cd supabase/functions
deno run --allow-env vitals-import/test.ts
deno run --allow-env vitals-import-api/test.ts
deno run --allow-env strava-import/test.ts
```

They are `deno run`, not `deno test`: the files are assertion scripts with their own
harness, and `deno test` would report a misleading "0 passed" (see the comment in that
workflow). Run them after `cd supabase/functions`, or the project allow rules (below) will
not match and each one prompts.

**Why no `npm ci`.** `.claude/hooks/session-start.sh` already runs `npm ci --prefix web`.
It is version-controlled, it lives in one place, and `ci` never rewrites the lockfile.
Running it again from the setup script installs twice and lets the two copies drift. The
hook also prints a warning if `deno` is missing, so a broken setup script shows up at the
start of the session rather than when a Deno test is first needed.

## Network

Access level **Limited**, with the package-manager defaults, plus:

| Host | Why |
|---|---|
| `swdrueaserjzhuxnzmeu.supabase.co` | Project API, for `npm run dev` against real data |
| `deno.land`, `dl.deno.land` | The setup script's Deno install |
| `de.sentry.io`, `*.ingest.de.sentry.io` | Sentry; the org is EU-region |
| `api.vercel.com` | Vercel API |
| `erg-dashboard-eight.vercel.app`, `*.vercel.app` | Production and preview deploys |

## Environment variables

Empty, or only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Both are public client
values; set them only if a session should run `npm run dev` against real data.

**Never** set the Supabase service-role key, `SENTRY_AUTH_TOKEN`, or `VITE_SENTRY_DSN`.

- Privileged access goes through connectors, which are scoped and revocable. An env secret
  is readable by every process and can land in any log in the VM.
- The e2e suite needs no real values: `web/playwright.config.js` lines 8–12 (`STUB_ENV`)
  inject fake Supabase values.
- The Sentry DSN is runtime-only and set in Vercel. Without it Sentry is a no-op, which is
  what a dev session wants.

No secret values appear in this document, and none should be added to it.

## Connectors

| Connector | Used for |
|---|---|
| Supabase | Schema reads and coach data. Writes stay behind permission prompts. |
| Vercel | Deploy status and logs |
| GitHub | Issues, PRs, Actions. Repo-scoped. |
| Context7 | Library docs; the Context7-first rule in `CLAUDE.md` depends on it |
| Slack | `#build` notifications |
| Sentry | Org `splitiq-29`. Every call needs `regionUrl: 'https://de.sentry.io'`. |
| Strava | Training data; future integration |

Switch off every connector unrelated to this repo. Each one adds tools to every session and
widens what a session can touch.

## Permission mode

**Auto** for normal work. **Plan** for any schema, migration or anchor change, so Scott
approves the plan before anything is written.

Bypass permissions is not offered in cloud sessions (Claude Code docs, permission-modes.md).

## Project permissions (`.claude/settings.json`)

Source for the rule semantics below: Claude Code docs, permissions.md and
permission-modes.md.

| List | Contents |
|---|---|
| allow: quality gates | `npm test *`, `npm run test *`, `npm run lint`, `build`, `size`, `format`, `format:check`, the four `check:` scripts by name, `test:e2e`, `npx vitest run *`, and the `npm --prefix web` forms of test/lint/build/format:check |
| allow: read-only git | `git status *`, `git diff *`, `git log *`, `git show *`, `git fetch *`, and `git branch` bare / `--list` / `--show-current` |
| allow: Deno tests | The three `deno run --allow-env <fn>/test.ts` commands, exactly |
| allow: MCP reads | Supabase `list_tables`, `list_migrations`, `get_advisors`; Context7 `resolve-library-id`, `query-docs`; GitHub `actions_list`, `actions_get`, `get_job_logs` |
| ask | `git push *`, `git reset *`, `rm *` |

Why each rule has the shape it does:

- **Exact forms for gates**, so a gate command cannot be allowed with extra arguments
  attached. The ` *` form is used only where arguments are useful (a test file, a git
  path); ` *` also matches the bare command.
- `npm run test *` does not match `test:e2e` or `test:visual*`: the colon is not a space.
- `git branch` is limited to the bare, `--list` and `--show-current` forms because
  `git branch *` would permit `-D`.
- The Deno rules mirror CI exactly. `--allow-env *` was rejected because it would admit
  `-A`.
- `npm run check:*` is deliberately not used. Per the docs, `:*` is a trailing
  word-boundary wildcard, so it would not match `npm run check:zones`. Each check is
  named instead.
- GitHub Actions read tools are allowed; `actions_run_trigger` is not, because the board
  `move` action writes.
- No Supabase write tools, no Vercel or Sentry writes, no server-wide MCP wildcards.

**Ask rules win.** Rules are evaluated deny, then ask, then allow, so `git push`,
`git reset` and `rm` prompt even under a broader allow. Ask rules are also evaluated before
the Auto-mode classifier, so they prompt in Auto mode too.

**Where the allowlist matters.** In Auto mode, read-only commands and in-directory edits
are auto-approved anyway, and broad package-manager run rules are dropped. The allowlist
mostly matters in Accept-edits mode.

**Accepted residual risks.**

- `git diff`, `git log` and `git show` accept `--output=<file>`, which writes a file.
- `git fetch <src>:<dst>` can move a local ref.
- `npm run format` and `npm run size` write inside the project. `size` writes the
  gitignored `web/dist/bundle-size.json`.
- `npm test *`, `npm run test *` and `npx vitest run *` forward arguments, so
  `--config <file>` can run arbitrary JS and `-u` rewrites snapshots. Both stay inside the
  repo and show up in `git status`.
- The ask rules match the command as written. Per the docs they do not catch `/bin/rm`,
  `bash -c '…'`, `git -C . push` or `git -c … push`; those fall through to the mode and
  the other rules. Branch protection on `main` still blocks a direct push.

**Unconfirmed: whether project allow rules apply in cloud sessions.** One-line check: in a
cloud session in Accept-edits mode, run `npm run check:zones` from `web/`. No prompt means
they applied. Record the result here when known. The repo's hooks do run in a plain cloud
session (the SessionStart install and the Stop hook fire). The docs also say that in a
cloud thread started inside a claude.ai **Project**, the repo's `.claude/settings.json`
permission rules and hooks do not apply, so this whole file is inert there.

## The Split IQ board from a cloud session

A cloud session cannot reach the board directly:

- GraphQL is blocked: "GitHub GraphQL is not available from Claude Code sessions".
- User-scoped REST is refused: "sessions are bound to their configured repositories".
- The session's `gh` proxy also refuses `/actions` REST paths.

**Workaround: `.github/workflows/project-board.yml`.** Dispatch it with the GitHub MCP
`actions_run_trigger` (workflow `project-board.yml`, ref `main`) and inputs:

| Inputs | Effect |
|---|---|
| `action=list` | Prints the board as a table, in column order |
| `action=move item=<n> status=<column>` | Adds issue/PR `<n>` to the board if needed and sets its Status |

Read the result with `actions_list`, `actions_get` and `get_job_logs`. The table is in the
job log and in the job summary.

The board's built-in workflows handle every automatic move (see `WORKFLOW.md`). This
workflow exists so a session can read the board and make the two manual moves: to Ready,
and to In progress.

Verified 2026-11-05: `action=list` (run 41988480375) printed the full board with real
Status values, so the token, the `@me` owner and the `gh project` JSON shapes
(`.items[].status`, `.items[].content`, `.fields[].options[]`) all hold. `move` has not run
yet; its `item-add` → `.id` step is the one part still unconfirmed.

Caveats:

- The owner is `@me` (the PAT's owner), not the login `skizzy1986`. Given a login, `gh`
  first asks whether it is a user or an org, and failed with "unknown owner type".
- `move` on an item not yet on the board races the board's own *Item added to project →
  Backlog* rule, so the item can land in Backlog. Run the same `move` again.
- `list` reads up to 1,000 items and warns in the log if the board holds more.

**Scott's one-time setup.** Add the repo secret `ADD_TO_PROJECT_PAT`: a classic PAT with
exactly these scopes: `project`, `read:org` and `read:discussion`. `gh project` refuses to
run without the two read scopes ("your authentication token is missing required scopes
[read:org read:discussion]"). No `repo` scope is needed, because this repo is public. Set
an expiry (90 days) and rotate it before then. An expired token shows up as `Bad
credentials` in `add-to-project`. It is the same secret `add-to-project.yml` uses.
`GITHUB_TOKEN` cannot reach a user-owned project. Without the secret the workflow fails with
a clear error.

## Rebuild checklist

1. Create the environment with the repository `skizzy1986/erg-dashboard`.
2. Paste the setup script.
3. Set network access to Limited and add the hosts above.
4. Leave environment variables empty, or add only the two `VITE_` values.
5. Enable the connectors above and disable unrelated ones.
6. Set the permission mode to Auto.
7. Start a session and confirm:
   - `node -v` prints 22.x
   - `deno --version` prints 2.x
   - `web/node_modules` exists
   - the three Deno tests pass
   - the one-line check under *Project permissions*
