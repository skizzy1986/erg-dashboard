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
# Guards against a repeat: CLAUDE_PROJECT_DIR is validated before use, a failing
# `git status` is reported rather than read as "clean", and the count must be all
# digits before it is compared or printed.
#
# Output channel (#482): plain stdout from a Stop hook goes to the debug log, so
# the old echo reached nobody. The warning is a JSON `systemMessage`, which is
# shown to the user. It carries no `decision`, `continue` or
# `hookSpecificOutput`, so it never continues the turn.
# https://code.claude.com/docs/en/hooks
#
# In a cloud session (CLAUDE_CODE_REMOTE=true) this exits 0 silently, before the
# project-dir check: there is nobody at that tree to warn, and the branch is
# committed by the session itself. Doing nothing there is the specified
# behaviour, not a #295-style silent failure.
#
# stdin, and with it `stop_hook_active`, is deliberately NOT read. Do not "fix":
#  (a) a bare systemMessage cannot continue the turn, so this hook cannot cause
#      or prolong a Stop loop — which is the only thing stop_hook_active is for;
#  (b) it is true only when ANOTHER Stop hook continued the turn; gating on it
#      would suppress the warning on the final stop, the one Scott sees last;
#  (c) not parsing stdin removes the malformed-payload failure mode entirely.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  exit 0
fi

root="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$root" ] || [ ! -d "$root" ]; then
  echo "[HOOK] warn-uncommitted: CLAUDE_PROJECT_DIR unset or not a directory (${root:-<unset>})" >&2
  exit 1
fi

if ! status="$(git -C "$root" status --porcelain 2>/dev/null)"; then
  echo "[HOOK] warn-uncommitted: git status failed in $root" >&2
  exit 1
fi

# `grep -c .` rather than `wc -l`: wc pads its output with whitespace on some
# platforms. grep exits 1 on a zero count, hence `|| true`.
changes="$(printf '%s\n' "$status" | grep -c . || true)"
case "$changes" in
  '' | *[!0-9]*)
    echo "[HOOK] warn-uncommitted: could not count changed files (got '$changes')" >&2
    exit 1
    ;;
esac

[ "$changes" -gt 0 ] || exit 0

# printf, not a JSON encoder: the only interpolated value is the digit-validated
# count, and the rest is a literal with no quote or backslash in it.
printf '{"systemMessage":"[HOOK] %s file(s) changed and uncommitted. Run: git add -p && git commit when ready."}\n' "$changes"
exit 0
