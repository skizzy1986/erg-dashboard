#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"

echo "[session-start] Installing npm dependencies..."
# The app is the web/ workspace child. The repo root package.json declares
# only husky, so a bare `npm install` here leaves web/node_modules absent and
# vitest/eslint/vite unavailable for the whole session.
#
# `ci`, not `install`: install REWRITES package-lock.json whenever the runner's
# npm differs from the one that generated it — here it stripped every "libc"
# field off the optional platform deps, which is a silent lockfile downgrade
# that then shows up as uncommitted changes in an otherwise untouched tree.
# `ci` installs strictly from the lockfile and never writes to it.
#
# It also fails loudly if package.json and the lockfile disagree, rather than
# quietly resolving something new. Under `set -e` that aborts the hook, which
# is the right outcome: a session built on a lockfile nobody committed is worse
# than a session that tells you to fix the lockfile.
npm ci --prefix web

echo "[session-start] Done. Run from web/: npm run lint | npm test | npm run build"
