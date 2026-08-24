# SplitIQ — briefing for a design session

> Three documents brief a design session, and they do not overlap:
>
> - **`PROJECT-CONTEXT.md`** — the mechanics. Which side owns what, what neither container
>   can see, the standing rules. Read it for *how we work*.
> - **`conventions.md`** — the style guide. Tokens, type, layering, chart rules, and the
>   traps already paid for. Read it for *how it should look*.
> - **This file** — the subject matter. What a rower needs from the screen, what the words
>   mean, which numbers are trustworthy. Read it for *what you are designing*.
>
> A design session used to open with the style guide alone, so it knew the hex values but
> not what a UT2 piece is, which numbers are real, or who is looking at the screen. This
> is the missing half — and it is the one of the three the code side owns, because the
> domain lives in the code.

## What SplitIQ is

A personal training dashboard for **one rower** — Scott. Erg, strength and bike. It
replaces Strava, Garmin Connect, Concept2 Logbook and TrainingPeaks with one surface
tuned to a single athlete's actual programme.

That "one user" fact drives the design more than anything else here:

- **No onboarding, no empty-state marketing, no settings sprawl.** The user knows what
  every number means. Do not explain CTL in the UI.
- **Density is legitimate.** This is a data instrument, not a consumer app. But density
  is not an excuse for 9px type — see `conventions.md`.
- **Phone is primary.** Sessions are logged mid-workout, between intervals, with a heart
  rate still coming down. Depth is tolerated; breadth is not.

## The five destinations

The IA target is five, down from thirteen tabs today. Each answers one question:

| Destination | Answers |
|---|---|
| **Today** | What am I doing right now, and am I in any state to do it? |
| **Train** | The live session — prescription, logging, the set in front of me. |
| **Progress** | Is the training working? Load, erg, strength, history. |
| **Body** | Readiness and the readings behind it — sleep, RHR, HRV. |
| **Coach** | Why the plan says what it says, and the conversation about changing it. |

## Domain glossary

Terms that appear on screen. Get these wrong and the design is wrong.

- **CTL** — chronic training load, a 42-day exponential average of daily stress. Fitness.
  Moves slowly.
- **ATL** — acute training load, 7-day. Fatigue. Moves fast.
- **TSB** — CTL − ATL. Form. Positive is fresh, negative is buried. The app's own bands
  are +10 / −10 / −30.
- **sRPE** — how hard a session felt, 1–10. Subjective, and the only thing the athlete
  types after a session.
- **CP** — critical power, the wattage sustainable more or less indefinitely. ~205W,
  provisional. Every rowing zone derives from it.
- **UT2 / UT1 / AT** — aerobic training bands off CP: 113–144 / 144–164 / 164–185 W.
  Almost all rowing volume is UT1/UT2; there is no programmed threshold work right now.
- **Microcycle** — one week's pattern. **Home weeks** load, **FIFO weeks** deload.
- **Readiness** — a derived morning score from RHR, HRV and sleep against personal
  baselines. Returns *null* when RHR is missing — that is a real state and needs a design.

## Which numbers are real

This matters more than it sounds: the app currently renders decorative numbers that look
authoritative. Do not design a screen that implies more certainty than the data has.

- **Real:** vitals (RHR, HRV, sleep, bodyweight, steps — auto-synced daily), logged
  sessions, per-set strength data where it was logged in-app.
- **Derived and trustworthy:** CTL/ATL/TSB, readiness, the training zones, e1RM.
- **Not real yet:** `strengthTrend` in `App.jsx` is a hardcoded literal. Per-set strength
  history is sparse — most sessions have a container and no sets. Load has *pending* and
  *unavailable* states that are distinct from zero and must not render as zero.

**Baseline confidence is per metric, not global.** `computePersonalBaselines` already
reports it that way — RHR may be personal over 17 of 28 days while HRV falls back to a
population default over 6. A tile must say which it is. Implying one baseline quality
across all metrics is a lie the current UI tells.

## Chart rules — the ones most likely to be broken

A decorative line chart looks finished, which is why these get violated. From
`HANDOFF.md` §3:

- **A labelled axis in real units.** Not a bare sparkline.
- **Two groundings**: the metric's own recent history, *plus* a personal reference band
  with discriminating power. **Never** the min/max envelope of the window being plotted —
  that band always contains the data and therefore says nothing.
- **A score headline** with a plain-language label.
- **A caption naming what is measured versus modelled.** Bars that are sessions that
  happened and a ribbon that is estimated are not the same kind of thing and must not
  read as one.
- **Gaps, not interpolation.** A day that was never measured renders as a gap. Drawing a
  continuous line through unmeasured days invents data.

## The house rule on captions

**Any caption stating a count, rank or comparison is computed, never typed.** A hardcoded
"3rd best this month" is wrong the day after it is written. If a number cannot be derived
from the data on the screen, it does not go on the screen.

## Where to go next

- [`conventions.md`](conventions.md) — tokens, weights, layering, the styling idiom.
- [`HANDOFF.md`](HANDOFF.md) — the normative redesign spec and the order of work.
- [`DESIGN_BRIEF.md`](DESIGN_BRIEF.md) — the diagnosis and the IA reasoning.
