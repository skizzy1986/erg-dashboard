Extract one module from src/erg-dashboard.jsx following the strangler-fig pattern.

## What this command does

> Student note: "Strangler fig" is a pattern for safely refactoring large files.
> Instead of rewriting everything at once (risky), you extract one small piece
> at a time and keep the app working throughout. Like a fig vine gradually
> replacing a tree — the old code stays alive until the new structure is complete.

## Usage

```
/refactor <module-name>
```

Examples:
- `/refactor constants/colors` — extract color constants to src/constants/colors.js
- `/refactor utils/formatting` — extract formatting functions to src/utils/formatting.js
- `/refactor views/OverviewView` — extract the Overview tab to src/views/OverviewView.jsx

## Process

1. Read CLAUDE.md to confirm the target file path and layer rules.

2. Spawn the **refactor-agent** with the specific module to extract.
   The agent will:
   - Read the relevant lines in erg-dashboard.jsx
   - Create the new file
   - Import it back into erg-dashboard.jsx
   - Run `npm run build` to confirm success

3. After extraction, run `npm test` to confirm no regressions.

4. Report:
   - New file created: [path]
   - Lines removed from erg-dashboard.jsx: [count]
   - Build: PASS / FAIL
   - Tests: PASS / FAIL

5. Ask: "Ready to commit this extraction?"

## Rules

- One module per /refactor call
- The app must build and work after every extraction
- Do not refactor or improve the logic during extraction — move it verbatim
- Follow the extraction order: constants → utils → hooks → components → views
