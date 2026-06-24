#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"

echo "[session-start] Installing npm dependencies..."
npm install

echo "[session-start] Done. lint: npm run lint | test: npm test | build: npm run build"
