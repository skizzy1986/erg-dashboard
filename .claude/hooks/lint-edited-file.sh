#!/usr/bin/env bash
# PostToolUse(Edit|Write): lint the file Claude just edited.
#
# Three things this gets right that the previous inline one-liner did not:
#
# 1. `$CLAUDE_PROJECT_DIR`, not a hardcoded /home/user/erg-dashboard. The old
#    path does not exist outside the original Linux sandbox, so the hook `cd`
#    failed and — because the failure exited 0 — reported success while doing
#    nothing. It also follows the session into its worktree, which matters now
#    that each session gets its own checkout.
# 2. It lints the file named in the tool call. The old form linted whatever the
#    first five entries of `git diff --name-only HEAD` happened to be, which
#    need not include the file that triggered the hook.
# 3. It invokes web/node_modules/.bin/eslint directly. The old form ran bare
#    `npx eslint` from the repo root, whose package.json declares only husky —
#    so npx cannot see the project's eslint and downloads one on demand
#    (observed: 10.9.1 fetched against the 10.8.1 the lockfile pins). That is a
#    network round-trip per edit and a version that drifts from the lockfile.
#    Flat-config lookup is not the problem: eslint resolves eslint.config.js
#    upward from the file being linted, so web/eslint.config.js is found from
#    anywhere in the repo.
#
# Advisory by design: lint findings print but exit 0, so a warning never blocks
# an edit. A misconfigured hook, by contrast, exits non-zero and says so — the
# whole point of this fix is that a broken hook must not look like a clean one.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$root" ] || [ ! -d "$root" ]; then
  echo "[HOOK] lint-edited-file: CLAUDE_PROJECT_DIR unset or not a directory (${root:-<unset>})" >&2
  exit 1
fi

# The hook payload arrives as JSON on stdin. Parsed with node rather than the
# sed approach used by block-secret-commit.sh: a Windows path arrives as
# "C:\\Users\\scott\\..." and only a real JSON parser unescapes it correctly.
#
# node exits 3 if the payload will not parse, so an unreadable payload is
# reported rather than swallowed — a silent no-op here would be the same defect
# this hook is being fixed for.
if ! file="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s)?.tool_input?.file_path??""))}catch{process.exit(3)}})')"; then
  echo "[HOOK] lint-edited-file: could not parse the hook payload as JSON" >&2
  exit 1
fi

# Parsed, but no file path — e.g. a tool call this matcher does not care about.
[ -n "$file" ] || exit 0

case "$file" in
  *.js | *.jsx) ;;
  *) exit 0 ;;
esac

web="$root/web"
eslint="$web/node_modules/.bin/eslint"

if [ ! -x "$eslint" ]; then
  echo "[HOOK] eslint not installed — run 'npm install' in web/ to enable edit-time linting." >&2
  exit 0
fi

# Mirror `npm run lint`, which covers only src/ and scripts/ under web/.
case "$file" in
  "$web"/src/* | "$web"/scripts/*) ;;
  *) exit 0 ;;
esac

cd "$web" || exit 1
"$eslint" --max-warnings=0 "$file" 2>&1 | tail -20
exit 0
