> ## ⚠️ DEPRECATED (2026-06-29)
>
> The work-order system is **retired**, superseded by the GitHub PR-centric
> workflow defined in [`WORKFLOW.md`](../../WORKFLOW.md): **GitHub Issues =
> backlog, Projects = status, branch → PR → CI → `main` = the unit of work.**
>
> Why: even at five work orders this convention drifted (duplicate `WO-004` and
> `WO-005` IDs; files scattered outside `work-orders/`). GitHub Issues give
> unique IDs, state, and issue↔PR links for free. See
> [`coach/PROJECT_MANAGEMENT_ANALYSIS.md`](../PROJECT_MANAGEMENT_ANALYSIS.md).
>
> The remaining `WO-00*` files are kept **as historical record** of shipped
> work. The one open item (Google Health API, formerly WO-005) was migrated to
> GitHub issue #51; its draft/handover files were removed. Do not author new
> work orders — open an Issue instead.

---

# Coach → System Work-Orders — convention

*How Coach-authored build specs reach Cowork in a form it can read and implement without hand-relay, while the Bridge gate stays intact. One parseable format replaces ad-hoc spec dumps. This is the **git-native** handover rail — not a live Supabase command channel. State lives in Supabase; build instructions live in the repo and pass through a human commit.*

> **STATUS (2026-06-22):** convention authored by Coach, **awaiting Bridge ratification**. Once ratified: commit `coach/work-orders/` into `skizzy1986/erg-dashboard` and this becomes the standing handover format.

---

## Where they live

`coach/work-orders/` in the repo:
- `WORK_ORDERS.md` — this file (the contract).
- `WO-NNN-slug.md` — one file per work-order.

Source of truth for status = each file's front-matter + `git log`. No separate index to drift out of sync.

---

## The flow (and where the gate is)

1. **Coach** authors `WO-NNN`, sets `status: ready`. Delivered as a file for the Bridge to land.
2. **Bridge** commits the file — *this commit is the authorization*. Then points Cowork at it: "implement WO-NNN" (or "implement all `status: ready`").
3. **Cowork** implements as reversible increments [C Art. 8], registers any schedule the WO declares, runs the **Acceptance** gate before deploy, and advances `status: in_progress → done` via its own commits.
4. **Bridge** confirms. If wrong, revert per the WO's **Rollback**; set `status: reverted`.

Coach never pushes. Cowork never self-authorizes. The commit is the human gate. **Schedules are implemented by Cowork from the WO — never run by Coach.**

---

## Front-matter schema (YAML — the part Cowork parses)

```yaml
---
id: WO-001
title: <short imperative>
status: draft         # draft | ready | in_progress | done | reverted
author: coach
created: 2026-06-22
targets: []           # supabase-migration | edge-function | cron | react-ui | data
schedule: null        # cron in UTC, e.g. "0 3 * * *"; null if none
notify: null          # Slack channel for the result post, e.g. "#build"; null if none
reversible: true
depends_on: []        # [WO-000, ...]; external prereqs go in Scope
acceptance:           # the smoke gate as checkable lines
  - <check 1>
---
```

---

## Body sections (fixed order — deterministic parse)

1. **Goal** — one paragraph.
2. **Scope** — in / out; external prerequisites (e.g. a published CSV URL the Bridge must create).
3. **Schema** — exact DDL, or `None`.
4. **Implementation** — exact code / function / steps.
5. **Schedule** — the cron + how to register it (pg_cron or scheduled function), or `None`. **Must match the `schedule:` field.**
6. **Notify** — the Slack post on success/failure (channel + message shape), or `None`. **Must match the `notify:` field.**
7. **Secrets / env** — names + where set, or `None`.
8. **Acceptance** — the smoke checks (mirror front-matter).
9. **Rollback** — the exact revert.
10. **Authority notes** — which steps are reversible vs irreversible; anything irreversible/destructive stays an explicit Bridge handover [C 0.4 / 3.2], not an auto-apply.

---

## Notify standard

Every automated WO (cron / edge function) reports to Slack so the Bridge sees state without prompting — the swing read-out. One-way **System → Slack**: jobs *post*; nothing reads commands back.

- **Channel:** `#build` for cron / deploy / errors; `#coach` for training traffic. Declared per-WO in `notify:`.
- **Transport:** a shared incoming webhook, secret `SLACK_BUILD_WEBHOOK_URL` (provisioned by WO-002).
- **Best-effort:** a notify failure must never fail or block the job. Guard on the secret; wrap in try/catch.
- **Message shape (terse, phone-glanceable):**
  - success → `WO-NNN OK · <job>: <key result>` e.g. `WO-001 OK · vitals: 1 new date (2026-06-23)`
  - failure → `WO-NNN FAIL · <job>: <short error>`
  - (swap `OK`/`FAIL` for status glyphs if you prefer — your call.)

---

## Rules

- One WO = one cohesive change. Split if it spans unrelated targets.
- **Schedules are declared, never implied.** If `schedule:` is set, §Schedule gives the exact cron + registration.
- Irreversible steps (drops, destructive migrations, deletes) are flagged in **Authority notes** and are **not** auto-applied — the Bridge hands them over explicitly.
- Keep the WO to what Cowork executes. Longer rationale lives in the rules docs (e.g. `VITALS_IMPORT.md`) and is referenced, not duplicated.

---

*Authored 2026-06-22 by Coach (Claude). Awaits Bridge ratification. Amend per Constitution Art. 7; log the why to DECISION_LOG.*
