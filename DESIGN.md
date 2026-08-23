# DESIGN — how SplitIQ's look is decided and where it is written down

> The design workstream produced a full UI & IA brief, a light redesign, a synced
> component library on claude.ai/design, and a sequenced plan to get there. All of it
> lived in a hidden dotfolder and was referenced from nowhere. This file is the front
> door. Read it before changing anything visual.

## The documents, in authority order

| Document | Kind | What it settles |
|---|---|---|
| [`web/.design-sync/HANDOFF.md`](web/.design-sync/HANDOFF.md) | **Normative** | The light redesign: palette, the `var(--color-*)` token seam, the role rename, Archivo weight 500, the component inventory, the order of work. Highest authority. |
| [`web/.design-sync/DESIGN_BRIEF.md`](web/.design-sync/DESIGN_BRIEF.md) | **Prescriptive** | Diagnosis and the IA target — 13 tabs → 5 destinations, the type and spacing scales, slices S-1…S7. Where the handoff is silent, this decides. |
| [`web/.design-sync/CLAUDE.md`](web/.design-sync/CLAUDE.md) | **Briefing** | What a Claude Design session needs to know about SplitIQ: the domain, the destinations, which numbers are real, the chart rules. The design-side mirror of the repo's `CLAUDE.md`. |
| [`web/.design-sync/conventions.md`](web/.design-sync/conventions.md) | **Descriptive** | How the app looks *today*, so a design agent can reproduce it. Inlined into the design agent's prompt. Not a statement of intent. |
| [`web/.design-sync/NOTES.md`](web/.design-sync/NOTES.md) | Runbook | Sync gotchas, the incident log, and the reconciliation of the handoff against the code. |
| [`web/.design-sync/STATE_OF_PLAY.md`](web/.design-sync/STATE_OF_PLAY.md) | Status | A dated snapshot. Goes stale fast — trust it least. |

**Prescriptive vs descriptive is load-bearing.** `conventions.md` is shipped to the
design agent as a description of reality. When it describes a target instead, every
generated design codes against a system that does not exist. That has happened once
already; see the reconciliation note in `NOTES.md`.

## Where the state actually is

The app is **dark today**. Light is the target, not the present tense.
`web/src/constants/theme.js` holds 23 colour-named hex tokens; the light,
role-named, `var(--color-*)` system described in the handoff has not shipped.
**Do not assume light until the flip lands.**

## The property boundary — the one hard rule

Three workstreams touch the same lines. They stay disjoint by *CSS property*, so they
can run in parallel without ever colliding:

| Workstream | Touches | Never touches |
|---|---|---|
| **#183** / the palette | colour hexes | any size |
| **S6** | `padding` `margin` `gap` `borderRadius` | any colour hex |
| **S-1 / TYPE** | `fontFamily` `fontSize` `fontWeight` `letterSpacing` `lineHeight` | colour hexes, box metrics |

Check your own diff before opening a PR. Keep this a human judgement — a moved line
legitimately shows both a colour and a padding, and a CI gate here would false-fail on
ordinary refactors.

## The machine contract

`web/.design-sync/` is not just docs. `config.json` reads `entry.jsx`, `base.css`,
`docs/` and `conventions.md` **by path**, and `npm run check:design-sync` guards them in
CI. Do not move these files. A new shared component reaches the design system only if it
is added to `entry.jsx` *and* `componentSrcMap` *and* `dtsPropsFor` *and* given a
`docs/<Name>.md`.

Re-syncing the project to claude.ai/design needs an interactive `/design-login` and can
only be done from a local session — never from a remote agent container.

## Working on design

Design is a lane on the normal rail: **Issue → branch → PR → CI → `main`** (see
[`WORKFLOW.md`](WORKFLOW.md)). Label it `design`. A PR that changes what the app looks
like carries a screenshot or a baseline diff.
