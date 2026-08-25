# SplitIQ light redesign — designs

Eight self-contained HTML files. Each opens in a browser with no build step, no
network, and no dependencies — double-click it.

## Mobile

| File | Screen | States drawn |
| --- | --- | --- |
| `today.html` | Today | Readiness, autoregulation signal, UT1/UT2 targets |
| `progress.html` | Progress | Load (session bars + fatigue ribbon), Erg, Strength, History |
| `train.html` | Train | Prescription, library sheet, live erg, strength logger, session complete |
| `body.html` | Body | Readiness with per-metric baseline confidence, sleep/RHR/HRV trends |
| `coach.html` | Coach | Signal card, 14-day roster wave, chat sheet |

## Desktop

| File | Screen | Notes |
| --- | --- | --- |
| `desktop-overview.html` | Combined overview | Two directions; **1b Ledger** is the chosen one, 1a Cockpit kept below for reference |
| `desktop-progress.html` | Progress deep dive | Load, Erg, Strength, History as four panes; the four tooltip components live here |
| `desktop-body.html` | Body deep dive | Readiness waterfall, 28-day reconstruction, per-metric baselines and coverage |

**Mobile does the doing; desktop does the understanding.** Live surfaces —
prescription, watt band, set logger, rest timer, sRPE — are mobile-only. Desktop
is the analytical layer. A desktop screen named after a mobile destination is the
analysis behind it, not the same screen at a wider width; Train has no desktop
counterpart by decision. See `../HANDOFF.md`, "Desktop scope — no live surfaces".

Read `../HANDOFF.md` first. The token seam (§1) blocks consistent
implementation of everything else. `../conventions.md` carries the visual rules,
the eight-size type ladder, the six-zone table and the icon decision;
`../splitiq-light-tokens.css` is the full token list;
`../ISSUES-load-states.md` holds two issues ready to paste.

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
- Form, CTL, ATL, readiness, zone bands, erg watts and splits, e1RM and per-day
  readiness all come from one shared module, `../splitiq-load.js`. Any view in
  the app that cites those readings should read one `load.js` the same way —
  see `../HANDOFF.md` §5. `tsbBand()` lives there too: +10 / −10 / −30, so
  −8.9 is Neutral on every screen.
- Zone bands derive from CP at render time, all six named — Recovery, UT2, UT1,
  AT, TR, AN. The bundled `PACE_ZONES` watt bounds are frozen at CP 190 and are
  not used; only its names and fractions are.
- Session type is one of the design system's nine type strings, and the accent
  follows from it. `erg`/`str`/`bike` is the equipment, not the type.
- Baseline coverage is counted from each series: sleep 28/28, RHR 17/28,
  HRV 10/28, with the charts drawing those gaps rather than interpolating. The
  11 RHR-less days carry no readiness score at all — stubs, not zeroes.
- Type is **Archivo + IBM Plex Mono**, self-hosted. `STATE_OF_PLAY.md` §4.1
  proposed Plex Sans + Plex Mono; design overruled it on 2026-08-25 — §4.1 is
  superseded on the typeface, and issue `#254` (Archivo self-host) stands as
  written. All eight files are exported on Archivo.
- The strength logger's exercise images are empty slots. Real demonstration
  photos or GIFs still need sourcing.
- Undrawn: load pending, load unavailable, chat empty, chat error. Readiness
  NO DATA is drawn on desktop; the mobile card still needs it.
