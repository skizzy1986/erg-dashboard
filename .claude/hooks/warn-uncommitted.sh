#!/usr/bin/env bash
# Stop: warn when a turn ends with work still uncommitted.
#
# Previously this `cd`-ed to a hardcoded /home/user/erg-dashboard. Off that one
# Linux sandbox the `cd` failed, the `&&` short-circuited so CHANGES was never
# assigned, and the `;` that followed ran the comparison against an empty string
# anyway — `[: : integer expected`. The whole thing still exited 0, so the
# warning silently never fired. It is the warning that would have flagged the
# uncommitted work left sitting in a shared checkout during the 2026-08-25
# three-session collision (see #294).
#
# Two guards against a repeat: CLAUDE_PROJECT_DIR is validated before use, and
# the count defaults to 0 so the comparison can never see an empty operand.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$root" ] || [ ! -d "$root" ]; then
  echo "[HOOK] warn-uncommitted: CLAUDE_PROJECT_DIR unset or not a directory (${root:-<unset>})" >&2
  exit 1
fi

cd "$root" || exit 1

# `grep -c .` rather than `wc -l`: wc pads its output with whitespace on some
# platforms, which is what the old `tr -d ' '` was working around.
changes="$(git status --short 2>/dev/null | grep -c . || true)"
changes="${changes:-0}"

if [ "$changes" -gt 0 ]; then
  echo "[HOOK] $changes file(s) changed and uncommitted. Run: git add -p && git commit when ready."
fi
exit 0
