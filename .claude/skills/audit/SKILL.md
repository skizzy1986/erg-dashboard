---
name: audit
description: Turn the Sentry issue stream into ranked, verified findings and GitHub Issues. Use when Scott asks what is actually breaking in production, wants to triage errors, or wants production defects pulled into the backlog.
argument-hint: [period, e.g. 7d — defaults to 7d]
---

Read what production is actually doing wrong, verify it against the code, and put
the real defects on the backlog. Read-only against the repo; the only writes are
GitHub Issues and Sentry annotations, both behind an approval gate.

> Error monitoring that nobody reads is a cost, not a control. This skill is the
> step that turns a Sentry issue into a tracked piece of work.

## Usage

```
/audit          # last 7 days
/audit 30d
```

## The Sentry facts you need every time

The org is **`splitiq-29`** and it is **EU-region**. Every MCP call must pass
`regionUrl: "https://de.sentry.io"` — omit it and you query the wrong region and
get an empty result that looks like "nothing is broken".

| Project | Covers |
|---|---|
| `erg-dashboard` | The React app (`web/src/**`) + the uptime monitor |
| `erg-dashboard-functions` | The four Deno edge functions + the `vitals-import` cron monitor |

**What the connector cannot do**, so don't try: create releases or deploys,
upload source maps, create alert rules, create cron monitors, delete projects.
Those live in `@sentry/vite-plugin`, the functions themselves, and the Sentry UI.

## Step 1 — Gather (read-only, run in parallel)

| Source | Call | Feeds |
|---|---|---|
| Sentry | `search_issues` `is:unresolved`, **both** projects | The candidate list |
| Sentry | `find_monitors` | Did the `vitals-import` cron miss or fail? |
| Sentry | `find_uptime_monitors` | Was the app down? |
| GitHub | `list_issues` open | So you don't file a duplicate |

A missed cron or a downtime window is a finding in its own right, not context.
Rank it with the errors.

## Step 2 — Rank

By blast radius, not recency:

1. **Silent data corruption** — a `vitals-import` / `vitals-sync` failure. Nothing
   visibly breaks; the numbers just quietly go wrong, which is worse.
2. **Errors that break a user action** — a failed mutation, a crashed tab.
3. **High-volume noise** — one bug firing hundreds of times. Often one fix.
4. **Single-occurrence errors** — usually last, and often not worth an issue.

## Step 3 — Verify before believing

For each candidate: `get_issue_details`, `get_event_stacktrace`,
`get_issue_breadcrumbs`. Stack frames resolve to real source files because the
Vercel build uploads source maps.

Then **read the named file**. An issue is a report, not a diagnosis.

- If the frames are minified, the release string and the uploaded artifacts have
  diverged — that is itself the finding, and it invalidates every other stack
  trace in the run. Report it first and stop trusting the rest.
- `analyze_issue_with_seer` is available for root-cause analysis. It is slow and
  may be metered, so run it only on findings that survive the read, and say when
  you are about to.
- The **Context7 first** rule binds the verification itself. If the cause turns
  on how a library behaves — a react-query cache eviction, a Recharts prop, a
  `supabase-js` error shape — resolve it through `resolve-library-id` →
  `query-docs` before naming it as the cause. A diagnosis from memory is the
  same guess as a diagnosis from the Sentry title, one level down.

Drop anything you cannot locate in the code. A finding you cannot point at is a
guess.

## Step 4 — Report

A ranked table: what, where (`file:line`), how many events, how many users, and
the Sentry permalink. Then, for the top findings only, a sentence on the actual
cause from the code.

State plainly when the stream is empty. Quiet is a valid result and does not need
padding with minor findings.

## Step 5 — File (only on explicit approval)

**Stop and ask before writing anything.** On approval, per confirmed defect:

1. `issue_write` a GitHub Issue: outcome-shaped title, the Sentry permalink, the
   stack excerpt, the file path, and acceptance criteria. Label per
   `WORKFLOW.md` (`P0`/`P1`/`P2` + area).
2. `add_issue_note` on the Sentry issue linking the GitHub issue, so the two
   systems point at each other.

Do not `update_issue` to resolve anything. An issue resolves when a fix ships,
which is a `Fixes #N` on a merged PR — not an audit decision.

## Rules

- **`regionUrl` on every call.** The most likely failure of this skill is a
  confident "nothing is broken" from querying the wrong region.
- **Verify against the code before filing.** Never open an issue from a Sentry
  title alone.
- Never file a duplicate — check open GitHub Issues in Step 1 and say so instead.
- Never file for a single-occurrence error with no code path behind it.
- Do not fix anything here. This skill produces the issue; `/orchestrate` builds
  the fix.
- If the free-tier quota is exhausted, the stream is truncated, not clean. Say
  so rather than reporting a quiet week.
