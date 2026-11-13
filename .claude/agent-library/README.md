# Agency agent library (parked)

The 208 agents of the [Agency library](https://github.com/msitarzewski/agency-agents)
that this repo does not use, moved unchanged from `.claude/agents/` (#483). **Claude
Code does not load this directory** — only `.claude/agents/` and `~/.claude/agents/`,
both scanned recursively (code.claude.com/docs/en/sub-agents), which is why this is a
sibling and not a subfolder. Parking them saves every request the cost of their
descriptions.

## Re-promote one

`git mv .claude/agent-library/<file>.md .claude/agents/`, add its route to
`.claude/AGENTS.md`, update the 24/208 counts in `CLAUDE.md`, `FACTORY.md` and
`.claude/AGENTS.md`, and land it as a PR. Never edit these files.

## Optional: trim a local global install

Only matters for Claude Code run **locally**. SplitIQ cloud sessions have no
`~/.claude/agents/` (the environment's setup script installs none —
`docs/CLOUD_ENVIRONMENT.md`). If the upstream installer has filled `~/.claude/agents/`
on your machine, every local session loads all 232. Run from this repo's checkout:
a dry run by default; `APPLY=1` moves files to a dated backup dir. It only touches
files named in this directory **and** identical to the copy here, so your own agents
are never moved. `BYNAME=1` matches on filename alone if the global copy is a
different upstream version.

```bash
( REPO="$(git rev-parse --show-toplevel)"
  SRC="$HOME/.claude/agents"; DEST="$HOME/.claude/agents-parked-$(date +%Y%m%d)"
  for p in "$REPO"/.claude/agent-library/*.md; do f=$(basename "$p"); [ "$f" = README.md ] && continue
    g="$SRC/$f"; [ -e "$g" ] || continue
    if [ "${BYNAME:-0}" = 1 ] || cmp -s "$p" "$g"; then echo "park $f"
      [ "${APPLY:-0}" = 1 ] && { mkdir -p "$DEST"; mv -n "$g" "$DEST/"; }
    else echo "SKIP $f (differs from repo copy)"; fi; done
  echo "left in $SRC: $(find "$SRC" -name '*.md' 2>/dev/null | wc -l)" )
```

Undo: `mv -n ~/.claude/agents-parked-*/*.md ~/.claude/agents/`. A full upstream
re-install refills `~/.claude/agents/` with all 232 — run the trim again.
