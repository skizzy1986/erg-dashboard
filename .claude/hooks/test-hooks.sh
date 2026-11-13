#!/usr/bin/env bash
# Smoke test for the hooks in .claude/settings.json.
#
# The PostToolUse and Stop hooks were broken from the day they were written and
# nobody noticed for months, because both exited 0 while doing nothing (#295).
# The fix is only half the job; this is the half that keeps them fixed.
#
#   bash .claude/hooks/test-hooks.sh
#
# Exits 0 if every case passes, 1 otherwise.
#
# stdout and stderr are captured SEPARATELY, because since #482 the channel is
# the contract: findings are JSON on stdout with exit 0, and "lint did not run"
# is stderr with exit 1 and an EMPTY stdout (a hook that exits non-zero but
# prints valid JSON is read by Claude Code as a success).
#
# Every Stop case sets CLAUDE_CODE_REMOTE explicitly — the hook no-ops when it is
# "true", which it is in every cloud session, so a case that inherited it would
# silently test the remote path.
#
# Not tested here: a real eslint crash through a broken eslint.config.js (the
# stub in L8 drives the same branch without touching the real config);
# concurrency; and the wiring in .claude/settings.json (the known gap
# hook-smoke-test.yml documents).
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
pass=0
fail=0

tmpd="$(mktemp -d)" || exit 1
trap 'rm -rf "$tmpd"; rm -f "$root"/web/src/utils/__hooktest*.js' EXIT

# A path that cannot exist in any environment, local or cloud. The sentinel used
# to be the literal /home/user/erg-dashboard the old hook hardcoded, which is
# exactly where a cloud session checks the repo out — a test against hardcoded
# paths must not hardcode one.
missing="$root/.hook-missing-dir-probe-does-not-exist"

# ---- harness -----------------------------------------------------------------
rc=0 out="" err="" why=""

run() { # run <stdin> <command...>   sets rc, out (stdout), err (stderr)
  printf '%s' "$1" > "$tmpd/in"
  shift
  out="$("$@" < "$tmpd/in" 2> "$tmpd/err")"
  rc=$?
  err="$(cat "$tmpd/err")"
}

begin() { why=""; }
bad() { why="${why}${why:+; }$1"; }
done_case() { # done_case <name>
  if [ -z "$why" ]; then
    echo "ok    $1"
    pass=$((pass + 1))
  else
    echo "FAIL  $1 — $why"
    echo "      exit: $rc"
    echo "      stdout: $out"
    echo "      stderr: $err"
    fail=$((fail + 1))
  fi
}

expect_exit() { [ "$rc" = "$1" ] || bad "expected exit $1, got $rc"; }
expect_stdout_empty() { [ -z "$out" ] || bad "expected empty stdout"; }
expect_stderr_empty() { [ -z "$err" ] || bad "expected empty stderr"; }
expect_stderr_has() { printf '%s' "$err" | grep -qF -- "$1" || bad "stderr lacks: $1"; }
expect_stderr_line1_has() { printf '%s\n' "$err" | head -n 1 | grep -qF -- "$1" || bad "stderr line 1 lacks: $1"; }

# expect_json <dotted.path> <substring>: stdout must be exactly one JSON object
# and the selected string field must contain the substring.
expect_json() {
  printf '%s' "$out" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let o;
      try { o = JSON.parse(s); } catch { process.exit(2); }
      if (!o || typeof o !== "object" || Array.isArray(o)) process.exit(2);
      const v = process.argv[1].split(".").reduce((a, k) => (a == null ? a : a[k]), o);
      process.exit(typeof v === "string" && v.includes(process.argv[2]) ? 0 : 1);
    });
  ' "$1" "$2"
  case $? in
    0) ;;
    2) bad "stdout is not exactly one JSON object" ;;
    *) bad "JSON $1 lacks: $2" ;;
  esac
}

expect_json_absent() { # top-level key must not exist
  printf '%s' "$out" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try { process.exit(Object.hasOwn(JSON.parse(s), process.argv[1]) ? 1 : 0); } catch { process.exit(2); }
    });
  ' "$1" || bad "JSON has key $1 (or is not JSON)"
}

ctx() { # the additionalContext string, for line counting
  printf '%s' "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).hookSpecificOutput.additionalContext)}catch{}})'
}

stop() { env "$@" bash "$here/warn-uncommitted.sh"; }
lint() { CLAUDE_PROJECT_DIR="$1" bash "$here/lint-edited-file.sh"; }
payload() { printf '{"tool_input":{"file_path":"%s"}}' "$1"; }

# ---- fixtures ----------------------------------------------------------------
fx_git="$tmpd/git"
mkdir -p "$fx_git"
git -C "$fx_git" init -q
git -C "$fx_git" -c user.name=t -c user.email=t@example.invalid commit --allow-empty -qm init

fx_nogit="$tmpd/nogit"
mkdir -p "$fx_nogit"

fx_lint="$tmpd/lint"
mkdir -p "$fx_lint/web/src"
printf 'export const a = 1;\n' > "$fx_lint/web/src/a.js"
install_stub() { # install_stub <body>
  mkdir -p "$fx_lint/web/node_modules/.bin"
  printf '#!/usr/bin/env bash\n%s\n' "$1" > "$fx_lint/web/node_modules/.bin/eslint"
  chmod +x "$fx_lint/web/node_modules/.bin/eslint"
}

# ---- warn-uncommitted.sh (Stop) ----------------------------------------------
# A missing or unset project dir must fail loudly, not exit 0 — the defect in
# #295 was a hook that cd-ed to a path off its own sandbox and reported success.
begin
run '' stop -u CLAUDE_CODE_REMOTE CLAUDE_PROJECT_DIR="$missing"
expect_exit 1; expect_stderr_has "CLAUDE_PROJECT_DIR unset or not a directory"; expect_stdout_empty
done_case "W1 warn-uncommitted: missing dir fails loudly"

begin
run '' stop -u CLAUDE_CODE_REMOTE -u CLAUDE_PROJECT_DIR
expect_exit 1; expect_stderr_has "<unset>"; expect_stdout_empty
done_case "W2 warn-uncommitted: unset var fails loudly"

# GIT_CEILING_DIRECTORIES stops git walking up into an enclosing repo, so the
# fixture really is "not a repo" wherever the temp dir lives.
begin
run '' stop -u CLAUDE_CODE_REMOTE CLAUDE_PROJECT_DIR="$fx_nogit" GIT_CEILING_DIRECTORIES="$tmpd"
expect_exit 1; expect_stderr_has "git status failed"; expect_stdout_empty
done_case "W3 warn-uncommitted: git failure is not read as clean"

# Dirty a fixture repo deliberately rather than assert against whatever state
# the working copy happens to be in.
: > "$fx_git/dirty"
dirty_stop() { # dirty_stop <stdin> <name>
  begin
  run "$1" stop -u CLAUDE_CODE_REMOTE CLAUDE_PROJECT_DIR="$fx_git"
  expect_exit 0
  expect_json systemMessage "file(s) changed and uncommitted"
  expect_json_absent decision; expect_json_absent continue; expect_json_absent hookSpecificOutput
  expect_stderr_empty
  done_case "$2"
}
dirty_stop '' "W4 warn-uncommitted: dirty tree -> systemMessage, turn not continued"

rm -f "$fx_git/dirty"
begin
run '' stop -u CLAUDE_CODE_REMOTE CLAUDE_PROJECT_DIR="$fx_git"
expect_exit 0; expect_stdout_empty; expect_stderr_empty
done_case "W5 warn-uncommitted: clean tree is silent"

: > "$fx_git/dirty"
begin
run '' stop CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR="$fx_git"
expect_exit 0; expect_stdout_empty; expect_stderr_empty
done_case "W6 warn-uncommitted: cloud session is silent on a dirty tree"

begin
run '' stop CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR="$missing"
expect_exit 0; expect_stdout_empty; expect_stderr_empty
done_case "W7 warn-uncommitted: cloud check runs before the dir check"

# stdin is deliberately not read (see the hook's header); these pin that.
dirty_stop '{"stop_hook_active":true}' "W8 warn-uncommitted: stop_hook_active does not suppress the warning"
dirty_stop 'not json' "W9 warn-uncommitted: malformed stdin does not matter"

# ---- lint-edited-file.sh (PostToolUse) ---------------------------------------
begin
run '{}' lint "$missing"
expect_exit 1; expect_stderr_has "CLAUDE_PROJECT_DIR unset or not a directory"; expect_stdout_empty
done_case "L1 lint: missing dir fails loudly"

begin
run 'not json at all' lint "$root"
expect_exit 1; expect_stderr_has "could not parse the hook payload"; expect_stdout_empty
done_case "L2 lint: unparseable payload fails loudly"

silent_lint() { # silent_lint <project-dir> <payload> <name>
  begin
  run "$2" lint "$1"
  expect_exit 0; expect_stdout_empty; expect_stderr_empty
  done_case "$3"
}
silent_lint "$root" '{"tool_input":{}}' "L3 lint: no file_path is a quiet no-op"
silent_lint "$root" "$(payload "$root/CLAUDE.md")" "L4 lint: non-JS file is a quiet no-op"
silent_lint "$root" "$(payload "$root/web/vite.config.js")" "L5 lint: JS outside src/ and scripts/ is a quiet no-op"
silent_lint "$root" "$(payload "$root/web/src/utils/__hooktest_absent__.js")" "L6 lint: a file deleted before the lint is a quiet no-op"

begin
run "$(payload "$fx_lint/web/src/a.js")" lint "$fx_lint"
expect_exit 1; expect_stderr_has "eslint not installed"; expect_stdout_empty
done_case "L7 lint: missing eslint is visible"

# The scope check runs before the binary check, so an out-of-scope edit with no
# node_modules stays silent (pins the guard order).
printf 'export default {};\n' > "$fx_lint/web/vite.config.js"
silent_lint "$fx_lint" "$(payload "$fx_lint/web/vite.config.js")" "L16 lint: out-of-scope edit is silent even without eslint"

install_stub 'printf "\nOops! Something went wrong! :(\n\nESLint: 10.14.0\n\nNo files matching the pattern \"x\" were found. CRASHPROBE\n" >&2; exit 2'
begin
run "$(payload "$fx_lint/web/src/a.js")" lint "$fx_lint"
expect_exit 1; expect_stderr_line1_has "eslint failed to run (exit 2)"; expect_stderr_line1_has "CRASHPROBE"; expect_stdout_empty
done_case "L8 lint: eslint crash reads as a tooling failure"

install_stub 'echo "not json"; exit 1'
begin
run "$(payload "$fx_lint/web/src/a.js")" lint "$fx_lint"
expect_exit 1; expect_stderr_has "could not read eslint output"; expect_stdout_empty
done_case "L9 lint: unreadable eslint output is a tooling failure"

if [ -x "$root/web/node_modules/.bin/eslint" ]; then
  utils="$root/web/src/utils"

  begin
  run "$(payload "$utils/formatting.js")" lint "$root"
  expect_exit 0; expect_stdout_empty; expect_stderr_empty
  done_case "L10 lint: clean file in web/src is silent"

  # no-unused-vars is a WARNING in web/eslint.config.js; it is reported only
  # because of --max-warnings=0. Its message contains ' and /^_/u, so parsing
  # the JSON also covers escaping.
  printf 'const unused = 1;\n' > "$utils/__hooktest__.js"
  begin
  run "$(payload "$utils/__hooktest__.js")" lint "$root"
  expect_exit 0
  expect_json hookSpecificOutput.hookEventName PostToolUse
  expect_json hookSpecificOutput.additionalContext "no-unused-vars"
  expect_json hookSpecificOutput.additionalContext "web/src/utils/__hooktest__.js:1:7"
  expect_json hookSpecificOutput.additionalContext ":1:7 warning"
  expect_json_absent decision
  expect_stderr_empty
  done_case "L11 lint: warnings-only file reaches Claude as additionalContext"

  begin
  run "$(payload "$utils/__hooktest__.js")" lint "$root/"
  expect_exit 0
  expect_json hookSpecificOutput.additionalContext "no-unused-vars"
  done_case "L17 lint: trailing slash on CLAUDE_PROJECT_DIR still lints"

  printf 'undefinedFn();\n' > "$utils/__hooktest_err__.js"
  begin
  run "$(payload "$utils/__hooktest_err__.js")" lint "$root"
  expect_exit 0
  expect_json hookSpecificOutput.additionalContext "no-undef"
  expect_json hookSpecificOutput.additionalContext ":1:1 error"
  expect_json hookSpecificOutput.additionalContext ":1:1"
  done_case "L12 lint: error-severity finding is reported"

  printf 'const = ;\n' > "$utils/__hooktest_parse__.js"
  begin
  run "$(payload "$utils/__hooktest_parse__.js")" lint "$root"
  expect_exit 0
  expect_json hookSpecificOutput.additionalContext "parse-error"
  expect_json hookSpecificOutput.additionalContext "Parsing error"
  done_case "L13 lint: parse error is a finding, not a crash"

  for i in $(seq 1 30); do printf 'const u%s = 1;\n' "$i"; done > "$utils/__hooktest_many__.js"
  begin
  run "$(payload "$utils/__hooktest_many__.js")" lint "$root"
  expect_exit 0
  expect_json hookSpecificOutput.additionalContext "10 more problem(s) not shown"
  n="$(ctx | grep -c '__hooktest_many__.js:' || true)"
  [ "$n" = 20 ] || bad "expected 20 finding lines, got $n"
  len="$(ctx | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(String(s.length)))')"
  [ "$len" -le 4000 ] || bad "additionalContext is $len chars, cap is 4000"
  done_case "L14 lint: output is capped at 20 findings and 4000 chars"

  # A Windows payload escapes its separators; only a real JSON parse recovers
  # the path. If this regressed to string-munging, the path would not match
  # web/src/ and the case would pass as a silent no-op — so assert a finding.
  printf 'const unused = 1;\n' > "$utils/__hooktest__.js"
  escaped="$(printf '%s' "$utils/__hooktest__.js" | sed 's#/#\\/#g')"
  begin
  run "$(payload "$escaped")" lint "$root"
  expect_exit 0
  expect_json hookSpecificOutput.additionalContext "no-unused-vars"
  done_case "L15 lint: escaped payload path is JSON-parsed"
else
  echo "skip  lint: eslint cases (run 'npm install' in web/)"
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
