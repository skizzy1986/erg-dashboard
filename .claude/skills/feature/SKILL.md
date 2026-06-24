---
name: feature
description: Invoke the orchestrator agent to run the full software factory pipeline. When the user wants to build a new feature, fix a bug, or make any code change — use this skill. The orchestrator coordinates researcher → spec-writer → feature-builder → test-verifier → code-reviewer, gating on user approval at each stage.
---

Invoke the orchestrator agent to run the full software factory pipeline.

The orchestrator coordinates all specialist agents in sequence:
researcher → spec-writer → feature-builder → test-verifier → code-reviewer

It gates on your approval at every stage — research, spec, build, test,
review, and commit — so you stay in control of the process.

## Usage

```
/feature <description>
```

Examples:
- `/feature add Strava activity sync`
- `/feature connect Garmin HRV to vitals table`
- `/feature Concept2 Logbook session import`

If no description is given, the orchestrator will ask you for one.

## What happens

1. Orchestrator reads CLAUDE.md and classifies your request
2. Researcher agent investigates any APIs or patterns needed
3. You approve the research before spec writing begins
4. Spec-writer produces acceptance criteria and file targets
5. You approve the spec before any code is written
6. Feature-builder implements following the architecture
7. Test-verifier writes and runs tests
8. Code-reviewer gives APPROVE or REQUEST CHANGES
9. You decide whether to commit and push to a feature branch

The orchestrator never advances without your explicit go-ahead.


ARGUMENTS: $ARGUMENTS
