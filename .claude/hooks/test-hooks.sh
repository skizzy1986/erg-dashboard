#!/usr/bin/env bash
# Smoke test for the hooks in .claude/settings.json.
#
# The PostToolUse and Stop hooks were broken from the day they were written and
# nobody noticed for months, because both exited 0 while doing nothing (#295).
# The fix is only half the job; this is the half that keeps them fixed.
#
#   bash .claude/hooks/test-hooks.sh
#
# Exits 0 if every case passes, 1 on the first failure.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
pass=0
fail=0

check() { # check <name> <expected-exit> <expected-substring|-> <actual-exit> <output>
  local name="$1" want_exit="$2" want_text="$3" got_exit="$4" got_out="$5"
  if [ "$got_exit" != "$want_exit" ]; then
    echo "FAIL  $name — expected exit $want_exit, got $got_exit"
    echo "      output: $got_out"
    fail=$((fail + 1))
    return
  fi
  if [ "$want_text" != "-" ] && ! printf '%s' "$got_out" | grep -qF "$want_text"; then
    echo "FAIL  $name — expected output to contain: $want_text"
    echo "      output: $got_out"
    fail=$((fail + 1))
    return
  fi
  if [ "$want_text" = "-" ] && [ -n "$got_out" ]; then
    echo "FAIL  $name — expected no output, got: $got_out"
    fail=$((fail + 1))
    return
  fi
  echo "ok    $name"
  pass=$((pass + 1))
}

run_lint() { # run_lint <project-dir> <stdin-payload>
  printf '%s' "$2" | CLAUDE_PROJECT_DIR="$1" bash "$here/lint-edited-file.sh" 2>&1
}

# ---- warn-uncommitted.sh -----------------------------------------------------
# The exact path the old hook hardcoded. It must now fail loudly, not exit 0.
out="$(CLAUDE_PROJECT_DIR=/home/user/erg-dashboard bash "$here/warn-uncommitted.sh" 2>&1)"
check "warn-uncommitted: missing dir fails loudly" 1 "CLAUDE_PROJECT_DIR unset or not a directory" "$?" "$out"

out="$(env -u CLAUDE_PROJECT_DIR bash "$here/warn-uncommitted.sh" 2>&1)"
check "warn-uncommitted: unset var fails loudly" 1 "<unset>" "$?" "$out"

out="$(CLAUDE_PROJECT_DIR="$root" bash "$here/warn-uncommitted.sh" 2>&1)"
rc=$?
if printf '%s' "$out" | grep -qE '^\[HOOK\] [0-9]+ file\(s\) changed|^$'; then
  check "warn-uncommitted: runs against a real repo" 0 "-" "$rc" ""
else
  check "warn-uncommitted: runs against a real repo" 0 "[HOOK]" "$rc" "$out"
fi

# ---- lint-edited-file.sh -----------------------------------------------------
out="$(run_lint /home/user/erg-dashboard '{}')"
check "lint: missing dir fails loudly" 1 "CLAUDE_PROJECT_DIR unset or not a directory" "$?" "$out"

out="$(run_lint "$root" 'not json at all')"
check "lint: unparseable payload fails loudly" 1 "could not parse the hook payload" "$?" "$out"

out="$(run_lint "$root" '{"tool_input":{}}')"
check "lint: no file_path is a quiet no-op" 0 "-" "$?" "$out"

out="$(run_lint "$root" '{"tool_input":{"file_path":"'"$root"'/CLAUDE.md"}}')"
check "lint: non-JS file is a quiet no-op" 0 "-" "$?" "$out"

# A Windows payload escapes its separators; only a real JSON parse recovers the
# path. If this regressed to string-munging, the path would not match web/src/
# and the case would silently pass as a no-op — so assert on a real lint result.
if [ -x "$root/web/node_modules/.bin/eslint" ]; then
  out="$(run_lint "$root" '{"tool_input":{"file_path":"'"$root"'/web/src/utils/formatting.js"}}')"
  check "lint: clean file in web/src reports nothing" 0 "-" "$?" "$out"

  tmp="$root/web/src/utils/__hooktest__.js"
  printf 'const unused = 1;\n' > "$tmp"
  out="$(run_lint "$root" '{"tool_input":{"file_path":"'"$tmp"'"}}')"
  rc=$?
  rm -f "$tmp"
  check "lint: catches a real lint error" 0 "unused" "$rc" "$out"
else
  echo "skip  lint: eslint cases (run 'npm install' in web/)"
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
