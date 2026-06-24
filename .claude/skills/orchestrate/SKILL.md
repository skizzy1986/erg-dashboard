---
name: orchestrate
description: Run the feature factory chain (research → story → spec → build → test → validate → PR) with human approval gates. Use for any new feature, bug fix, or significant change that needs the full pipeline.
argument-hint: <rough feature idea or bug>
---

Run the feature factory chain (research → story → spec → build → test → validate → PR) with human approval gates.

## Usage

```
/orchestrate <rough feature idea or bug>
```

## Process

You are the ORCHESTRATOR. Drive the feature in `$ARGUMENTS` through the chain. You route work to subagents; you do not do their jobs yourself. Reads run in parallel, writes run in sequence. STOP at each human approval gate and wait for Scott.

1. **Research** — launch `codebase-researcher` (parallel-safe if multiple areas). Collect files, patterns, risks.
2. **Story** — `story-writer` turns the idea + research into a user story + acceptance criteria + edge cases.
   → **GATE 1 (Scott): right problem? criteria correct?** Wait for approval/edits before continuing.
3. **Spec** — `spec-writer` turns the approved story into a technical brief.
   → **GATE 2 (Scott): design safe? red flags?** Wait for approval before any code is written.
4. **Build** — run `backend-builder` and `frontend-builder`. If the feature is backend-then-frontend dependent, sequence them; otherwise they may run concurrently only if they touch different files.
5. **Test** — `test-verifier` adds checks tied to the acceptance criteria; `npm run build` must pass.
6. **Validate** — `implementation-validator` compares build vs story + spec, returns findings by severity + a verdict.
   → **GATE 3 (Scott): ship?** Wait for approval.
7. **Deliver** — on approval, commit to a feature branch and open a PR (or commit to `main` per Scott's preference); confirm the Vercel deploy reaches READY.

Keep a short running summary of where we are in the chain. Never skip a gate. If a step fails, report and stop — do not improvise past a gate.


ARGUMENTS: $ARGUMENTS
