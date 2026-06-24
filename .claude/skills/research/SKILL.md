---
name: research
description: Deep-dive into a topic, API, or concept before writing any code. Use when the user wants to investigate an external service (Strava, Garmin, Concept2, Supabase), understand a library, explore training science concepts, or answer "how would we integrate X?" before committing to an approach.
---

Deep-dive into a topic, API, or concept before writing any code.

## What this command does

> Student note: Good software starts with understanding the problem.
> This command runs a focused research phase before any implementation.
> It prevents building the wrong thing by investigating first.

## Usage

```
/research <topic>
```

Examples:
- `/research Strava API` — how to connect Strava activity data
- `/research Garmin Connect OAuth` — Garmin authentication for health data
- `/research Concept2 Logbook API` — auto-importing erg sessions
- `/research React Query` — server state management library
- `/research CTL ATL TSB calculation` — training science validation

## Process

1. Spawn the **researcher** agent with the topic.

2. The agent will search official documentation, GitHub, and relevant sources.
   It returns a structured report:
   - What it found (with sources)
   - What is confirmed
   - What is uncertain
   - A recommendation

3. Present the full report to the user.

4. Ask: "Does this research answer your question?
   Next step: use /spec to turn this into a technical specification."

## Notes

- Research does NOT write code. It informs the next step (/spec).
- If the topic requires credentials (OAuth flows), the research phase identifies
  what credentials are needed and how to obtain them — not how to hardcode them.
- Research findings should be checked against the current date (June 2026) —
  APIs change and research should reflect current versions.


ARGUMENTS: $ARGUMENTS
