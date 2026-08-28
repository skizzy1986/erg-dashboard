---
name: research
description: Deep-dive into a topic, API, or concept before writing any code. Use when the user wants to investigate an external service (Strava, Garmin, Concept2, Supabase), understand a library, explore training science concepts, or answer "how would we integrate X?" before committing to an approach.
argument-hint: <topic>
---

Deep-dive into a topic, API, or concept before writing any code.

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

1. Spawn `Trend Researcher` (model: sonnet, READ-ONLY — write no files).
   Prepend the full contents of `.claude/skills/erg-context.md`, then reframe
   the persona:

   > You are doing TECHNICAL research, not market intelligence. Investigate the
   > topic against official documentation. The **Context7 first** rule in the
   > preamble above is the hard floor for this stage: `resolve-library-id` then
   > `query-docs` for every stack library, WebSearch only for what Context7
   > cannot resolve, and every claim carries its source. For APIs report: auth
   > method, the specific endpoints this project needs, rate limits, data
   > formats, and whether a Supabase Edge Function or client-side fetch fits.
   > For libraries report: React 18 + Vite compatibility, bundle-size impact,
   > and alternatives considered. For training science: cite sources and note
   > evidence vs convention. Check findings against the current date — APIs
   > change. If credentials are needed, identify what and how to obtain them —
   > never how to hardcode them.

2. The report must be structured:
   - **What I found** (with sources)
   - **Confirmed**
   - **Uncertain**
   - **Recommendation**

3. Present the full report to Scott.

4. Ask: "Does this answer your question? Next step: `/orchestrate` to turn it
   into a spec'd feature."

## Notes

- Research does NOT write code or files. It feeds the pipeline's Spec stage.

ARGUMENTS: $ARGUMENTS
