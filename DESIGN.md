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
| [`web/.design-sync/conventions.md`](web/.design-sync/conventions.md) | **Style guide** | Tokens, accent pairs, type, layering, chart rules, and the gotchas the design side has already paid for. Light-primary. Inlined into the design agent's prompt, so it is the one file guaranteed to be read. Mirror — the project holds the source. |
| [`web/.design-sync/designs/`](web/.design-sync/designs/) | **The designs** | Eight self-contained HTML artboards — five mobile destinations, three desktop deep dives. Open in a browser, no build step. Compiled snapshots — the editable `.dc.html` source lives in the design project. Do not edit; they are overwritten on sync. |
| [`web/.design-sync/splitiq-load.js`](web/.design-sync/splitiq-load.js) | **The model** | The one module every artboard reads for form, CTL/ATL/TSB, `tsbBand()`, readiness and `readinessSeries()`, the six-zone table, erg watts/splits and e1RM. `HANDOFF.md` §5 asks the app for the same single `lib/load.js`. Numbers that are matched rather than derived drift. |
| [`web/.design-sync/splitiq-light-tokens.css`](web/.design-sync/splitiq-light-tokens.css) | **The tokens** | The full light declaration list with every contrast ratio measured. What the flip (`#251`) implements. |
| [`web/.design-sync/PROJECT-CONTEXT.md`](web/.design-sync/PROJECT-CONTEXT.md) | Mechanics | The design project's own briefing: which side owns what, and what neither side can see. Mirror — the project holds the source. |
| [`web/.design-sync/ISSUES-load-states.md`](web/.design-sync/ISSUES-load-states.md) | Spec | The load pending and unavailable states, written as two ready-to-open issues. |
| [`web/.design-sync/CODE-TO-DESIGN.md`](web/.design-sync/CODE-TO-DESIGN.md) | Handover | The reciprocal of `HANDOFF.md` — what the code side did, where the spec meets reality, and what each side still owes the other. Paste into a design session to re-sync. |
| [`web/.design-sync/NOTES.md`](web/.design-sync/NOTES.md) | Runbook | Sync gotchas, the incident log, and the reconciliation of the handoff against the code. |
| [`web/.design-sync/STATE_OF_PLAY.md`](web/.design-sync/STATE_OF_PLAY.md) | Status | A dated snapshot. Goes stale fast — trust it least. |

**Prescriptive vs descriptive is load-bearing.** `conventions.md` is shipped to the
design agent as a description of reality. When it describes a target instead, every
generated design codes against a system that does not exist. That has happened once
already; see the reconciliation note in `NOTES.md`.

## Where the state actually is

The app is **dark today**. Light is the target, not the present tense.

**Dark is retained as a second theme, not deleted.** `HANDOFF.md` §1 says dark is
"dropped"; the design project's own `conventions.md`, revised 2026-08-22, overturns that
in review — the erg room is dark at 5am and the live screen wants it. Light is primary and
new work is designed on the light ground, but the dark values stay. Where the two
disagree, `conventions.md` is newer.
`web/src/constants/theme.js` holds 23 colour-named hex tokens; the light,
role-named, `var(--color-*)` system described in the handoff has not shipped.
**Do not assume light until the flip lands.**

## The platform split — mobile does the doing, desktop does the understanding

Decided 2026-08-24, and it decides what gets built where. Sessions are logged
mid-workout with a heart rate still coming down, so every **live** surface is
mobile-only: the prescription card, the watt band gauge, the set logger, the rest
timer, the sRPE prompt. Build each of those once, for the phone.

Desktop is the analytical layer — long windows, many series at once, the full zone
table, sortable logs, periodisation, the reasoning behind a call. **The five
destinations are the mobile IA.** A desktop screen named after one of them is the
analysis *behind* that destination, not the same screen at a wider width — and
**Train has no desktop counterpart at all**, which is why the desktop nav rail
carries five chips rather than six. A nav rail lists destinations that exist;
a destination that does not exist on a platform is omitted, not dimmed.

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

## Which side owns what

`PROJECT-CONTEXT.md` sets the direction and it matters more than it looks:

| | Design project | This repo |
|---|---|---|
| The designs, `conventions.md`, `HANDOFF.md`, `ISSUES-load-states.md` | **source of truth** | mirror |
| Component source, hooks, maths, tests | — | **source of truth** |

**Do not hand-edit the mirrored files** — `conventions.md` above all. Edits are overwritten
on the next sync. Anything that has to reach a design session gets added on the project
side; anything that has to reach a code session gets committed here. Neither container can
see the other.

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
