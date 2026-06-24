#!/usr/bin/env bash
# PreToolUse(Bash) guard: block a `git commit` if secret-ish files are staged.
# Reads the tool input JSON on stdin; only acts on git commit commands.
input="$(cat)"
cmd="$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')"
case "$cmd" in
  *"git commit"*)
    staged="$(git diff --cached --name-only 2>/dev/null)"
    if printf '%s\n' "$staged" | grep -E '(^|/)\.env($|\.)|service[_-]?role|secrets?\.(json|ya?ml|txt)|id_rsa|\.pem$' >/dev/null; then
      echo "BLOCKED: a secret-looking file is staged. Unstage it before committing." >&2
      exit 2   # exit 2 = block the tool call in Claude Code
    fi
    ;;
esac
exit 0
