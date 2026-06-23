Run the full software factory pipeline for a new feature.

## What this command does

> Student note: This command orchestrates the full development pipeline.
> It stops at each gate and shows you results before moving forward.
> You stay in control — Claude runs the agents, you make the decisions.

## Pipeline

```
1. Understand  →  Clarify what the feature is
2. Research    →  researcher agent investigates APIs and patterns
3. Spec        →  spec-writer produces a technical specification
4. Build       →  feature-builder implements the spec
5. Test        →  test-verifier writes and runs tests
6. Review      →  code-reviewer checks the result
7. Commit      →  user decides whether to commit
```

## Steps (run in this order, pause for user confirmation between each)

1. If the feature is not already described, ask: "Describe the feature in one sentence."

2. Spawn the **researcher** agent with the feature as context.
   Ask: "Does the research look right? Should I proceed to spec?"

3. Spawn the **spec-writer** agent with the feature description and research.
   Show the full spec. Ask: "Is this spec correct? Any changes before we build?"

4. Spawn the **feature-builder** agent with the approved spec.
   Report: files created, files modified, build status.

5. Spawn the **test-verifier** agent.
   Report: tests written, pass/fail status.

6. Spawn the **code-reviewer** agent.
   Report: APPROVE or REQUEST CHANGES with findings.

7. Ask: "Ready to commit? I'll create a branch and commit with a descriptive message."
   If yes: create a feature branch, commit the changes, push to origin.

## Skipping steps

If the user says the feature is simple (e.g., a UI label change), confirm before
skipping research. Always run spec → build → test → review even for small changes.
