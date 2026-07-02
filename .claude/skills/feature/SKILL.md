---
name: feature
description: Alias for /orchestrate — runs the canonical factory pipeline (research → story → spec → build+test → verify → review+validate → PR) staffed by Agency-library agents, with three human approval gates. Use to build a new feature, fix a bug, or make any code change.
argument-hint: <description>
---

`/feature` is an alias for `/orchestrate`.

Read `.claude/skills/orchestrate/SKILL.md` — the single canonical pipeline
definition — and execute that process with the arguments below.

## Usage

```
/feature <description>
```

Examples:
- `/feature add Strava activity sync`
- `/feature connect Garmin HRV to vitals table`

If no description is given, ask for one before starting.

ARGUMENTS: $ARGUMENTS
