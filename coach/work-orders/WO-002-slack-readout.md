---
id: WO-002
title: Slack read-out — Vercel deploy + edge-function/cron notifications
status: ready
author: coach
created: 2026-06-22
targets: [vercel-integration, slack-webhook, config]
schedule: null
notify: null            # this WO provisions the notify channel; it does not self-report
reversible: true
depends_on: []
acceptance:
  - a test POST to the webhook lands in #build
  - a Vercel deploy (success and failure) posts to #build
  - after the secret is set, a WO-001 run posts "WO-001 OK" to #build
---

# WO-002 · Slack read-out

## Goal
Stand up a one-way **System → Bridge** Slack feed so automated state — deploys, cron results, errors — is visible on Scott's phone without prompting Coach. This is the swing read-out: when he's away and not prompting, Slack is how he learns the import broke on day 2 instead of twelve days later. **Not a command rail:** jobs post to Slack; nothing reads commands from Slack and executes them.

## Scope
- **In:** slack channels; an incoming webhook → `#build`; the webhook stored as Supabase secret `SLACK_BUILD_WEBHOOK_URL`; the Vercel → Slack integration on the `erg-dashboard` project.
- **Out (explicitly excluded):** any Slack → system read or command path. Slack is a sink, not a source. Re-opening that is a separate WO and a Constitution question.

## Schema
None.

## Implementation

**Bridge steps (account / integration — human only, not Coach or Cowork):**
1. In Slack: create `#build` (and `#coach` if you want training traffic separated).
2. Create a Slack **incoming webhook** pointed at `#build` (Slack → Apps → Incoming Webhooks → Add). Copy the URL.
3. Connect **Vercel → Slack**: Vercel dashboard → the project → Integrations → Slack (or install the Vercel app in Slack) → route this project's deploy events (success + failure) to `#build`.

**Cowork / config steps:**
4. Store the webhook URL as a Supabase secret: `SLACK_BUILD_WEBHOOK_URL = <url>`. This is what WO-001 (and every future automated WO) reads.
5. Optional: add a shared `notify(text, channel?)` helper module in the functions codebase so all jobs post with one consistent shape (matches the Notify standard in `WORK_ORDERS.md`).

## Schedule
None — event-driven (deploys + per-job posts).

## Notify
None for this WO itself. Optionally post a one-time `WO-002 OK · Slack read-out live` line once step 4 completes, to prove the path end to end.

## Secrets / env
- `SLACK_BUILD_WEBHOOK_URL` — created here; consumed by WO-001 and future jobs.
- `SLACK_COACH_WEBHOOK_URL` — optional, only if `#coach` later receives automated posts.

## Acceptance
1. `curl -X POST -d '{"text":"test"}' $SLACK_BUILD_WEBHOOK_URL` → "test" appears in `#build`.
2. Trigger a Vercel deploy → a deploy line appears in `#build`; force a failed build → a failure line appears.
3. With the secret set, run WO-001 once → `WO-001 OK · vitals: …` appears in `#build`.

## Rollback
Delete the Slack incoming webhook; remove `SLACK_BUILD_WEBHOOK_URL`; disconnect the Vercel → Slack integration. No data, schema, or app code depends on it — WO-001's notify simply no-ops once the secret is gone.

## Authority notes
- Steps 1–3 are **Bridge-only**: creating a Slack app/webhook and granting the Vercel ↔ Slack OAuth are account/integration actions — the human does them in the UI. Coach and Cowork do not create accounts or grant OAuth.
- The webhook is a **write-only egress sink** (it posts *to* Slack). It ingests no commands; nothing in the system reads from Slack. This is the property that keeps Slack off the command-rail and out of the injection surface.
- Fully reversible; nothing destructive.
