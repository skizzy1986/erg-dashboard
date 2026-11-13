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

**This is the whole script. Paste it entire** — it has two independent parts, and on
2026-11-05 editing one of them out took the other with it, leaving a container with no Deno
and no trust flag. The trust block is explained under *Project permissions*; it lives last
because it must not be able to affect the Deno install above it.

```bash
curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh -s -- -y

trust_root=""
if t="$(git rev-parse --show-toplevel 2>/dev/null)"; then trust_root="$t"; fi
if [ -z "$trust_root" ]; then
  for d in /home/user/*/; do
    [ -f "${d}.claude/settings.json" ] && trust_root="${d%/}"
  done
fi
if [ -n "$trust_root" ] && [ -f "$trust_root/.claude/settings.json" ]; then
  node -e 'const f="/root/.claude.json",fs=require("fs"),root=process.argv[1];
const d=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8").replace(/^\uFEFF/,"")):{};
(d.projects??={})[root]??={};
d.projects[root].hasTrustDialogAccepted=true;
fs.writeFileSync(f,JSON.stringify(d,null,2));' "$trust_root"
  echo "trust-flag: trusted $trust_root"
else
  echo "trust-flag: WARNING no checkout with .claude/settings.json found; permissions and hooks will be ignored" >&2
fi
```

Confirm both halves took, in a new session: `deno --version` prints 2.x, and
`claude doctor` does not print `Ignoring 36 permissions.allow entries`. The script's own
output is at `/root/.claude/environment-manager/setup-script-output`; **that file not
existing at all means the script did not run** — on 2026-11-05 its absence, together with a
missing `deno`, was how an emptied setup script was found.

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

> **This rationale holds only once the workspace is trusted, measured 2026-11-05.** Until
> the trust flag is in this setup script, the hook has never run in a cloud session —
> settings-defined hooks are gated behind workspace trust, which no cloud container grants
> by default. `web/node_modules` arrives some other way and the `deno` warning never fires.
> With the flag in place the hook does run, the `npm ci` above is the one that counts, and
> this note is accurate again. See *Project permissions* for the flag and for the install
> race it introduces.

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

**Confirmed 2026-11-05: none of this file's rules apply in a cloud session, and neither do
the hooks, until the workspace is trusted.** The previous version of this section called
the permission question "unconfirmed" and asserted that "the repo's hooks do run in a plain
cloud session (the SessionStart install and the Stop hook fire)". Both are wrong. In a
cloud container `claude doctor` reports:

```
Ignoring 36 permissions.allow entries from .claude/settings.json: this workspace has not
been trusted. Run Claude Code interactively here once and accept the trust dialog, or set
projects["/home/user/erg-dashboard"].hasTrustDialogAccepted: true in /root/.claude.json.
```

`/root/.claude.json` ships with `projects: {}` and the container is rebuilt per session, so
the allowlist is discarded every time. The hooks go with it: a `Write` to a `web/src/*.js`
file carrying a lint error that `eslint --max-warnings=0` does flag produced **no**
`PostToolUse` output, and `session-start.sh` never ran. There is no trust dialog to accept
in a cloud session.

**The fix belongs in the setup script**, which runs before the session and outside the
gate. A `SessionStart` hook cannot do it — hooks are themselves gated by trust, so the hook
that would grant trust is the one trust is blocking:

```bash
trust_root=""
if t="$(git rev-parse --show-toplevel 2>/dev/null)"; then trust_root="$t"; fi
if [ -z "$trust_root" ]; then
  for d in /home/user/*/; do
    [ -f "${d}.claude/settings.json" ] && trust_root="${d%/}"
  done
fi
if [ -n "$trust_root" ] && [ -f "$trust_root/.claude/settings.json" ]; then
  node -e 'const f="/root/.claude.json",fs=require("fs"),root=process.argv[1];
const d=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8").replace(/^﻿/,"")):{};
(d.projects??={})[root]??={};
d.projects[root].hasTrustDialogAccepted=true;
fs.writeFileSync(f,JSON.stringify(d,null,2));' "$trust_root"
  echo "trust-flag: trusted $trust_root"
else
  echo "trust-flag: WARNING no checkout with .claude/settings.json found; permissions and hooks will be ignored" >&2
fi
```

**Put this block at the END of the setup script**, after the Deno install, and note that it
never exits non-zero — a trust flag that cannot be set must not take the rest of the
environment down with it.

**The setup script's working directory is `/home/user`, not the checkout** (measured
2026-11-05, the hard way: a first version of this block derived the root from `pwd` and
failed the whole setup script with `trust-flag: '/home/user' has no .claude/settings.json`).
The `cd supabase/functions` lines under **Setup script** are how a *session* runs the Deno
tests, not setup-script content, and reading them as the latter is what produced the wrong
assumption. So the block does not trust `pwd`: it takes `git rev-parse --show-toplevel` when
that resolves, and otherwise finds the one directory under `/home/user` holding
`.claude/settings.json`. Tested from `/home/user`, from the repo root and from `/tmp` —
all three resolve to `/home/user/erg-dashboard`, exit 0.

**Trust is keyed on the exact directory and is not inherited** (measured 2026-11-05:
trusting `/home/user` leaves the warning in place; trusting `/home/user/erg-dashboard`
clears it). The path is therefore derived rather than written literally — a hardcoded
`/home/user/erg-dashboard` is correct in today's containers and fails silently the day the
platform changes the checkout path, which is the same defect `test-hooks.sh` carried for
months (#398).

Because trust is per-directory, a **git worktree is not covered** by trusting the main
clone — each `.claude/worktrees/<name>` is its own key. That only bites a local session;
cloud sessions have their own VM and do not use worktrees.

**Status: in the setup script and confirmed live, 2026-11-05.** A session started after the
paste reported `deno 2.9.8` and a `claude doctor` with no `Ignoring 36 …` line — both halves
of the script took. Treat that line reappearing as a regression to investigate, not as setup
still outstanding.

**Hooks execute too, confirmed 2026-11-05 by side effect rather than by output.** A session
with the flag live showed `web/node_modules` restamped at session start, which only
`session-start.sh`'s `npm ci --prefix web` does — so `SessionStart` fired.

Note how that was established, because the obvious test does not work. Hook output reaches
the agent only through specific channels ([hooks reference](https://code.claude.com/docs/en/hooks)):
plain stdout on exit 0 reaches Claude only for `UserPromptSubmit`, `UserPromptExpansion`,
`SessionStart` and `PostModelSwitch`, and for every other event goes to the debug log;
stderr from a hook that exits 0 is never seen; Claude sees stderr on exit 2 (where the event
supports it) and JSON `hookSpecificOutput.additionalContext`; and a JSON `systemMessage` is
shown to the user. The former `[HOOK] Bash command about to run …` echo was `PreToolUse`
exit-0 stdout, so it never reached anyone — which is why two sessions concluded "hooks are
not firing" from its absence, and after the flag was set a third did the same while the
hooks were in fact running. It was removed in #482.

Since #482 the lint hook returns findings as `additionalContext`, so a lint finding does
reach the agent. A clean edit is silent **by design**, though, so missing lint output still
proves nothing on its own. And in an untrusted workspace hooks do not run at all. Test a hook
by what it *changes* — `node_modules` restamped, a `PreToolUse` exit 2 blocking a tool call
(`block-secret-commit.sh`) — or by deliberately provoking a finding, never by the absence of
output.

Three `claude doctor` warnings are unrelated environment plumbing and predate this work
(observed 2026-11-05 in a container booted before any of it): config install method
`unknown`, a broken `claude` at `/root/.local/bin/claude`, and a leftover npm global at
`/opt/node22/bin/claude`. They are not symptoms of the trust flag.

Verify in a new session with `claude doctor`: the "Ignoring 36 …" line disappears when it
has taken. Setting the flag mid-session does clear that warning but does **not** activate
the hooks — trust is read once at startup (measured 2026-11-05: the same `Write` probe
still produced no hook output after the flag was set).

**Decided 2026-11-05: trust is granted, and the full `npm ci` is wanted.** `session-start.sh`
runs `npm ci --prefix web`, which has never actually executed here — `web/node_modules` is
present from the platform's own dependency install or the image, not from the hook (the
setup-script log contains only the Deno install). Once trust is set the hook fires and the
install runs every session, deliberately: a lockfile-exact `ci` is the thing the quality
gates are supposed to run against, and the alternative is trusting an install nobody in this
repo controls. Do not "optimise" it away. The *Why no `npm ci`* note under **Setup script**
is therefore correct again from the moment trust is set, and false before it.

**It does not block the session.** The hook declares `{"async": true, "asyncTimeout":
300000}` (`session-start.sh:9`), so the install runs in the background with a five-minute
budget and the session is usable immediately.

**That asynchrony is the one real hazard, and it is a race, not a delay.** `npm ci` deletes
`node_modules` before installing (npm's documented behaviour), so a session whose first
action is `npm test`, `npm run lint` or `npm run build` can hit the window where the
platform's modules have been removed and the lockfile install has not finished. The failure
looks like a broken checkout rather than a race.

**The window is about 24 seconds** (measured 2026-11-05: `web/node_modules` restamped at
10:51:18, `.bin/eslint` present at 10:51:42, install otherwise clean). That number is the
reason to leave `"async": true` alone rather than remove it. Dropping it buys a closed
window at the price of a guaranteed ~25-second block on *every* session start, which is
close to a wash — and it is not the one-line change it looks like, because a synchronous
hook is then subject to a hook timeout (`HOOK_TIMEOUT_MS`, and the per-hook `timeout` field
in `settings.json`) that nobody here has established. Set it too low and `npm ci` is killed
mid-install, leaving a broken `node_modules` and no async budget to finish under: strictly
worse than the race. Revisit only if the install gets materially slower, e.g. on a cold npm
cache.

The operational rule in the meantime: if a gate fails at the very start of a session with
missing modules, re-run it before diagnosing anything.

The docs also say that in a cloud thread started inside a claude.ai **Project**, the repo's
`.claude/settings.json` permission rules and hooks do not apply, so this whole file is inert
there regardless.

## The Split IQ board from a cloud session

A cloud session cannot reach the board directly:

- GraphQL is blocked: "GitHub GraphQL is not available from Claude Code sessions".
- User-scoped REST is refused: "sessions are bound to their configured repositories".
- The session's `gh` proxy also refuses `/actions` REST paths.

**Workaround: `.github/workflows/project-board.yml`.** Dispatch it with the GitHub MCP
`actions_run_trigger` (workflow `project-board.yml`, ref `main`) and inputs:

| Inputs | Effect |
|---|---|
| `action=list` | Prints the board as a table, in column order, with the Horizon / Size / Start / Target columns |
| `action=move item=<n> status=<column>` | Adds issue/PR `<n>` to the board if needed and sets its Status |
| `action=fields` | Creates the roadmap fields (Horizon, Size, Start, Target) if missing; idempotent |
| `action=set assignments=<lines>` | One line per item, `433\|Horizon=H0 Foundations\|Size=S\|Start=2026-11-07\|Target=2026-12-19\|Status=Ready`; sets any field by name in one run |

Read the result with `actions_list`, `actions_get` and `get_job_logs`. The table is in the
job log and in the job summary.

**Dispatch one run at a time.** The workflow's concurrency group keeps only one *pending*
run: eight `move` dispatches queued together on 2026-11-07 ran two and cancelled six
(runs 34–39). Wait for each run to finish, or put every change in one `set` run. A
background `until` loop polling `gh api repos/<owner>/<repo>/actions/workflows/project-board.yml/runs?per_page=1`
works for the wait (that read path was reachable on 2026-11-07, despite the caveat below).

The board's built-in workflows handle every automatic move (see `WORKFLOW.md`). This
workflow exists so a session can read the board and make the two manual moves: to Ready,
and to In progress.

Verified 2026-11-05: `action=list` (run 41988480375) printed the full board with real
Status values, so the token, the `@me` owner and the `gh project` JSON shapes
(`.items[].status`, `.items[].content`, `.fields[].options[]`) all hold. Verified
2026-11-07: `move` (runs 33–44, Backlog → Ready) and `fields` (run 45, created Horizon,
Start and Target; Size already existed) both work, so `item-add` → `.id` and
`field-create` hold too.

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

## Posting a Discussion from a cloud session

A cloud session can read Discussions but cannot write to them:

- `gh api "repos/skizzy1986/erg-dashboard/discussions?per_page=30"` lists them over REST,
  and `.../discussions/<n>/comments` lists a thread's comments (both verified 2026-11-12).
  Both need the repository attached to the session; without it they return 403.
- GraphQL is blocked, and REST has no write route: `POST /repos/{owner}/{repo}/discussions`
  returned 404 on 2026-11-12. The `gh api graphql` recipe in the `/collaborate` skill works
  from a collaborator's own machine, not from here.

**Workaround: `.github/workflows/post-discussion.yml`.** Dispatch it with
`actions_run_trigger` (workflow `post-discussion.yml`, ref `main`). It has two modes:

| Inputs | Effect |
|---|---|
| `category=<slug> title=<text> body=<markdown>` | Creates a Discussion. Slugs: `announcements`, `ideas`, `show-and-tell`, `q-a`. A title matching one of the 50 newest is refused. |
| `reply_to=<number> body=<markdown>` | Posts a top-level comment on that Discussion (in Q&A, that is an answer). A body matching one of the thread's 50 newest comments is refused, and so is a locked thread. |
| either, plus `dry_run=true` | Runs every check and posts nothing. |

Read the result back from the REST calls above: the new post's `html_url`, or the reply's
text in the thread's comments, is the receipt.

**Approval lives with the caller, not the workflow.** A Discussion is public and cannot be
unposted cleanly, so a session shows Scott the exact text and where it will go, and
dispatches only on his reply. The weekly *SplitIQ Discussion drafts* scheduled task is the
standing caller.

**The one automatic writer.** `.github/workflows/discussion-shipped.yml` is not dispatched
by a session. It runs when a PR merges into `main` and posts a fixed "Shipped: #PR closed
#issue" reply on the Discussion an issue names with a `Discussion:` line. It is the only
Discussions write with no approval step; `WORKFLOW.md`, *Ideas that start in Discussions*,
has the convention.

**Author.** With no extra setup the post is authored by `github-actions[bot]`. To post as
Scott, add the repo secret `DISCUSSIONS_PAT`: a fine-grained PAT limited to this repository
with **Discussions: read and write**. The workflow prefers it when present.

Verified 2026-11-12: a `dry_run=true` create (run 43277118289) resolved `ideas` and posted
nothing, and two real creates with `GITHUB_TOKEN` produced Discussions 476 (`q-a`) and 478
(`announcements`), both authored by `github-actions[bot]`. A real reply has not been posted
yet; only its dry run is verified (see the pull request that added reply mode).

## Releases from a cloud session

The session's proxy refuses the release API (`gh release create` → 403), so a cloud
session can't create a release directly. Adding a token doesn't help, because the refusal
comes from the proxy, not from GitHub.

**Workaround: `.github/workflows/release.yml`.** Dispatch it with `actions_run_trigger`
(workflow `release.yml`, ref `main`). It runs with `GITHUB_TOKEN` and the `contents: write`
permission, so no secret is needed.

| Inputs | Effect |
|---|---|
| `tag` (+ `title`, `notes`, `target`, default `main`) | Creates the release at `target`. If the tag already has a release, it replaces that release's title and notes. |
| `assets=true` | Attaches every file in the `release-assets/` folder of branch `release-assets/<tag>`, then deletes that branch. `release-assets/NOTES.md`, if present, becomes the notes. |

Steps to attach files:
1. Commit them to a branch `release-assets/<tag>` that has a `release-assets/` folder at
   its root. Branch from `main`, so the rest of the tree is ordinary.
2. Push the branch.
3. Dispatch with `assets=true`.

Files go up with `--clobber`, so a re-run replaces a file of the same name. The job summary
lists each asset's size and the sha256 of the file it uploaded. Git caps each file at
100 MB.

The workflow never deletes a release or a tag; Scott does that. It only reads or deletes
branches named `release-assets/*`.

## Rebuild checklist

1. Create the environment with the repository `skizzy1986/erg-dashboard`.
2. Paste the setup script — **including the trust-flag block** under *Project permissions*,
   without which none of `.claude/settings.json` applies.
3. Set network access to Limited and add the hosts above.
4. Leave environment variables empty, or add only the two `VITE_` values.
5. Enable the connectors above and disable unrelated ones.
6. Set the permission mode to Auto.
7. Start a session and confirm:
   - `node -v` prints 22.x
   - `deno --version` prints 2.x
   - `web/node_modules` exists
   - the three Deno tests pass
   - `claude doctor` does **not** print `Ignoring 36 permissions.allow entries` — if it
     does, the trust flag did not take and the allowlist and all four hooks are inert
