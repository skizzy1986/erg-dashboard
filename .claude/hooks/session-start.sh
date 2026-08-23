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
npm install --prefix web

echo "[session-start] Done. Run from web/: npm run lint | npm test | npm run build"
