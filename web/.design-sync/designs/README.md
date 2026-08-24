# SplitIQ light redesign — designs

Six self-contained HTML files. Each opens in a browser with no build step, no
network, and no dependencies — double-click it.

| File | Screen | States drawn |
| --- | --- | --- |
| `today.html` | Today | Readiness, autoregulation signal, UT1/UT2 targets |
| `progress.html` | Progress | Load (session bars + fatigue ribbon), Erg, Strength, History |
| `train.html` | Train | Prescription, library sheet, live erg, strength logger, session complete |
| `body.html` | Body | Readiness with per-metric baseline confidence, sleep/RHR/HRV trends |
| `coach.html` | Coach | Signal card, 14-day roster wave, chat sheet |
| `desktop-overview.html` | Desktop overview | 1920 combined overview. Two directions: **1b Ledger** is the chosen one; 1a Cockpit is kept below it for reference |

Read `../HANDOFF.md` first. The token seam (§1) blocks consistent
implementation of everything else — and §1 now carries three corrections from
`../CODE-TO-DESIGN.md`: the acceptance checkbox on tests is confirmed false, the
one-PR scope is split into four steps, and the ground is `#bcc5dd` (`#c3cade`
withdrawn). `../conventions.md` carries the visual rules and the nine token
values §1 left unspecified; `../splitiq-light-tokens.css` is the full
declaration list; `../ISSUES-load-states.md` holds two issues ready to paste.

## What these files are

Snapshots, not source. The editable designs live in the design project and are
the source of truth — these are compiled for reading and review in the repo.
Do not edit them; they will be overwritten on the next sync.

## What they are not

Not an implementation reference for markup or class names. The design project
uses inline styles throughout and has no relationship to the app's component
tree. Take values, layout and behaviour from them — not structure.

## Notes on fidelity

- Every number shown is computed from the sample data in the file, the same way
  the app computes it. Nothing is a typed literal.
- Form, CTL, ATL, readiness and baseline coverage come from one shared module,
  `../splitiq-load.js`, which the desktop overview and Coach both read. Any view
  in the app that cites those readings should read one `load.js` the same way —
  see `../HANDOFF.md` §5. `tsbBand()` lives there too: +10 / −10 / −30, so
  −8.9 is Neutral on every screen.
- Session type is one of the design system's nine type strings, and the accent
  follows from it. `erg`/`str`/`bike` is the equipment, not the type.
- Baseline coverage is counted from each series: sleep 28/28, RHR 17/28,
  HRV 10/28, with the charts drawing those gaps rather than interpolating.
- The strength logger's exercise images are empty slots. Real demonstration
  photos or GIFs still need sourcing.
- Undrawn: load pending, load unavailable, readiness NO DATA, chat empty, chat
  error.
