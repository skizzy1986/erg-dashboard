---
name: refactor
description: Extract one module from a named large file (erg-dashboard.jsx remainder, views/ProgramView.jsx, StrengthLogger.jsx) following the strangler-fig pattern. One safe extraction at a time; the app stays fully functional throughout. Never rewrites — only moves code.
argument-hint: <module-name>
---

Extract ONE module from a named large file, strangler-fig style.

> "Strangler fig" means extracting one small piece at a time while the app
> keeps working — the old code stays alive until the new structure is complete.

## Usage

```
/refactor <module-name>
```

Current extraction targets: the `web/src/erg-dashboard.jsx` shell remainder,
`web/src/views/ProgramView.jsx` (#77), `web/src/StrengthLogger.jsx` (#79).

## Process

1. Read `CLAUDE.md` and `.claude/skills/architecture.md` to confirm the target
   path and layer rules. Confirm the extraction with Scott before spawning.

2. Spawn `Minimal Change Engineer` (model: opus). Prepend the full contents of
   `.claude/skills/erg-context.md`, then this brief:
   - Extract exactly ONE module from the named source file into the target layer.
   - Move code VERBATIM — no renames, no restructuring, no logic changes, no
     TypeScript. Improving the logic is a separate task.
   - Extraction order (safest first): constants → utils → hooks → components → views.
   - Process: read the source region in full → identify its dependencies (what
     it imports, what must be passed in) → create the new file → update the
     import in the source file → run `npm run build` (must pass) → run
     `npm test` (must pass).
   - Tests for the extracted module land in the SAME change, and the new file
     is covered by the coverage gate in `web/vite.config.js` (the ratchet only
     goes up).

3. Report: new file path, lines removed from the source file, build PASS/FAIL,
   tests PASS/FAIL. If the build fails, stop — never commit red.

4. Ask Scott: "Ready to commit this extraction?" Commit message format:
   `refactor: extract <module> from <source-file>`.

## Rules

- One module per `/refactor` call.
- The app must build and work identically after every extraction.

ARGUMENTS: $ARGUMENTS
