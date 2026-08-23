# SplitIQ light redesign — designs

Five self-contained HTML files, one per nav destination. Each opens in a browser
with no build step, no network, and no dependencies — double-click it.

| File | Screen | States drawn |
| --- | --- | --- |
| `today.html` | Today | Readiness, autoregulation signal, UT1/UT2 targets |
| `progress.html` | Progress | Load (session bars + fatigue ribbon), Erg, Strength, History |
| `train.html` | Train | Prescription, library sheet, live erg, strength logger, session complete |
| `body.html` | Body | Readiness with per-metric baseline confidence, sleep/RHR/HRV trends |
| `coach.html` | Coach | Signal card, 14-day roster wave, chat sheet |

Read `../HANDOFF.md` first. The token seam (§1) blocks consistent
implementation of everything else. `../conventions.md` carries the visual
rules; `../ISSUES-load-states.md` holds two issues ready to paste.

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
- The strength logger's exercise images are empty slots. Real demonstration
  photos or GIFs still need sourcing.
- Undrawn: load pending, load unavailable, readiness NO DATA, chat empty, chat
  error. A desktop pass is separate scope.
