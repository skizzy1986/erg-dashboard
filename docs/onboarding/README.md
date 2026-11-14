# Welcome — onboarding for collaborators

> **New to GitHub or software development?** Start with
> [`START_HERE.md`](START_HERE.md) instead. It's five plain-English steps, and Claude Code
> does the technical parts. Then use the copy-paste prompts in [`PROMPTS.md`](PROMPTS.md)
> and the `/collaborate` mode. This page is the deeper technical guide for later.

You have **read access** to this repository. That means you can clone it, read
everything, open Discussions and issues, comment, and propose changes as pull
requests **from your own fork**. You cannot push to this repository; Scott reviews
and merges.

This guide gets you from zero to a running prototype of the **SplitIQ squat tool**
(`/squat`) in about fifteen minutes, explains how it was built, and shows where your
ideas should go.

> **Terms, in plain words.** The code is proprietary — all rights reserved (root
> [`LICENSE`](../../LICENSE)) — except where Scott has given written permission in
> [`PERMISSIONS.md`](../../PERMISSIONS.md). **If you're named there, that file is your
> licence** (for example, Paul may reuse and publish this work in his own personal,
> non-commercial projects). Everyone else: read, run and prototype on a fork to explore
> ideas with Scott, but please don't publish, redistribute or deploy it without asking.
> Either way, the anatomy geometry is separately licensed **CC BY-SA 2.1 JP**
> (BodyParts3D). Credit it and share alike — see [`NOTICE.md`](../../NOTICE.md).

---

## 1. What you're looking at

SplitIQ is one app: **a training app where the movements explain themselves.**
[`VISION.md`](../../VISION.md) says what it is for and what it deliberately won't do.

| Part | Route | Auth | What it is |
|---|---|---|---|
| **Anatomy engine** | — | — | [`web/src/anatomy/`](../../web/src/anatomy): a movement-neutral 3D runtime (posing, skinning, colour and camera maths). It is the spine: every movement is built on it. |
| **Squat tool** | `/squat` | **none** | The first product on the engine: a public, no-login, 3D modelled high-bar back squat with muscles, depth and time controls, a coaching guide and a form check. **This is the part you're here for.** |
| **Training log** | `/` | Supabase login | The context around the movements: sessions, strength logging and a load model that doesn't claim more than it can support. You need your own Supabase project to run it, and you don't need it for `/squat`. |

**Where it's going** lives in two places, so this page doesn't repeat it: the roadmap epic
[#432](https://github.com/skizzy1986/SplitIQ/issues/432), and the H1 table under
[The horizons](../ROADMAP.md#the-horizons) in `docs/ROADMAP.md`.

The issue and PR threads are the best history of *why* things are the way they are —
each PR description carries its decisions, review trail and follow-ups.

---

## 2. Run it (no secrets needed)

`/squat` never touches Supabase (a test pins this), so it runs with an empty `.env`.

```bash
git clone https://github.com/skizzy1986/SplitIQ.git
```

```bash
cd SplitIQ/web && npm ci
```

```bash
npm run dev
```

Open <http://localhost:5173/squat>. The anatomy data (`web/src/squat/assets/`,
~2.2 MB gzip) ships in the repo, so it works offline after install.

Useful commands (all from `web/`):

```bash
npm test                                # Vitest (unit + component)
npx vitest run src/anatomy src/squat    # just the squat tool + 3D runtime
npm run lint && npm run format:check
npm run build && npm run size           # production build + bundle budgets
npx playwright test e2e/squat.spec.js   # browser tests (needs Chromium)
```

The dashboard at `/` needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your
**own** Supabase project (`web/.env.example`). You don't need it to work on `/squat`.

---

## 3. How the squat tool works

```
pipeline/squat-anatomy (Python — see its README and NEW_MOVEMENT.md)
        │  writes
        ▼
web/src/squat/assets/squat-manifest.json   ← array index + all model metadata (meta)
web/src/squat/assets/squat-anatomy.bin     ← one gzip stream of typed arrays
        │  fetched + gunzipped in a module worker (squat/workers/)
        ▼
useAnatomyData → { manifest, buffer }      (squat/hooks/)
        │
        ├─► squat/ UI: guide, form check, metrics, depth controls  (React, inline styles)
        │
        └─► anatomy/utils/poseModel.createPoser(manifest, buffer)
                 │  pure maths: frames, curve skinning, trunk blend — no three.js
                 ▼
            anatomy/scene/createAnatomyScene   ← the ONLY code importing three.js,
                                                  loaded lazily via scene/loadScene.js
```

| Folder | Read this for |
|---|---|
| [`web/src/squat/`](../../web/src/squat) | The product: React shell (`SquatApp.jsx`), components, hooks, content constants (guide prose, metrics table, form check, sources), the decode worker. |
| [`web/src/anatomy/utils/`](../../web/src/anatomy/utils) | **Movement-neutral** posing maths. `poseModel.js` is the entry point; every function is pure and fixture-tested. |
| [`web/src/anatomy/scene/`](../../web/src/anatomy/scene) | three.js glue: geometry, materials, lights, OrbitControls, render-on-demand, dispose. |
| [`docs/squat/ARCHITECTURE.md`](../squat/ARCHITECTURE.md) | The data format: array layout, coordinate frames, geometry sets. |
| [`docs/squat/SKINNING.md`](../squat/SKINNING.md) | The exact runtime posing maths (verbatim from the source page) — read before touching `anatomy/utils`. |
| [`docs/squat/PROVENANCE.md`](../squat/PROVENANCE.md) | Where the data came from and how it was extracted. |
| [`docs/squat/RESEARCH_BRIEF.md`](../squat/RESEARCH_BRIEF.md) | The science plan: data strategy, calibration sources, known weak points, verification. |
| [`docs/squat/LAB_DATA.md`](../squat/LAB_DATA.md) | What's in the OpenCap lab-validation dataset and what it can (and can't) support. |

**Key facts that will save you time**

- **Everything is indexed by depth `S`** (0 = standing, 1 = bottom), 41 samples in the
  current data — but code reads the count from `meta.S.length`, never hard-codes 41.
- **The right side is stored; the left is the same mesh mirrored** (`scale.z = -1`).
- **Activation values are modelled estimates, not EMG.** The research brief flags the
  activation model as the weakest part; labelling is deliberately honest
  ("Modelled, not measured", "estimated, not EMG").
- **Colours come from theme tokens only** (`web/src/constants/themeValues.js`); a CI
  check (`npm run check:colours`) rejects raw hex and `0xRRGGBB` literals.
- **three.js is pinned at exactly `0.187.0`**, while the source page used r128 —
  colour management is switched off and lights scaled by π to match (see
  SKINNING.md §7).
- **Bundle budgets are enforced in CI** (`npm run size`). three.js lives in its own
  lazy chunk and must never reach either product's first paint.

---

## 4. How it was developed

Most of this repo was built with **Claude Code** running a gated "software factory":
Research → Story → **Gate 1** → Spec → **Gate 2** → Build + tests → Test verification →
Review (two independent judges) → **Gate 3** → PR. Scott approves at each gate. The
pipeline is defined in [`.claude/skills/orchestrate/SKILL.md`](../../.claude/skills/orchestrate/SKILL.md)
and explained in [`FACTORY.md`](../../FACTORY.md) and [`WORKFLOW.md`](../../WORKFLOW.md).

Read [`VISION.md`](../../VISION.md) first: it says what SplitIQ is for.
[`CLAUDE.md`](../../CLAUDE.md) is the project briefing every agent session reads, and it
is authoritative on how the repo *works*: architecture, CI gates, the agent pipeline.
Where the two disagree on what SplitIQ is for, `VISION.md` wins.

If you use Claude Code yourself, it will pick up `CLAUDE.md` and the skills in
`.claude/skills/` automatically when you open your fork.

Conventions you'll be held to in review: plain JS + JSX (no TypeScript), inline styles,
tests in the same PR as the code, coverage only goes up, lint/format/build green.

---

## 5. Prototyping and sharing ideas

**Ideas first, code second.** Scott wants to hear what you come up with — that's the
main point of your access.

1. **Have an idea?** Open a Discussion in **💡 Ideas**
   (<https://github.com/skizzy1986/SplitIQ/discussions/categories/ideas>).
   The form asks for the problem, the idea, who it's for, and how big it is. Rough is
   fine. Good ideas get promoted to issues on the project board.
2. **Built something to show?** Post it in **🙌 Show and tell** with a link to your
   fork/branch and a screenshot or short clip.
3. **Want it merged?** Open a PR **from your fork** against `main`. Expect the normal
   bar (tests, CI green, the PR template). Small, focused PRs land faster. A Vercel
   preview for a fork PR may need Scott's authorisation first, so include
   screenshots.
4. **Questions** → Discussions **🙏 Q&A**.

Please don't open issues directly for ideas — the Issues list is the live backlog.

**Where good ideas would land.** [`docs/ROADMAP.md`](../ROADMAP.md) is the map:

- **H2 and H3**, under [The horizons](../ROADMAP.md#the-horizons): further flagship
  movements, and the coach and athlete surfaces.
- **"Parked, signal needed"**, the paragraph straight after the H3 table: ideas held
  until there is evidence someone wants them. **This is where your ideas count as
  signal.** If you would use one of them, say so in 💡 Ideas.
- **[What we are not building](../ROADMAP.md#what-we-are-not-building)**, and why. Worth
  a read before you sketch something big.

**New movements** are welcome: see [`NEW_MOVEMENT.md`](NEW_MOVEMENT.md).
<!-- TODO(R12, #440): point to the movement-config doc here once it lands. -->

---

## 6. Things not to do

- Don't commit secrets, `.env` files or personal data. The git pre-commit hook only
  lints and formats; the secret check (`.claude/hooks/block-secret-commit.sh`) runs
  only inside Claude Code sessions, so be careful by hand.
- Don't add anything from the OpenCap lab dataset to the repo — its licence terms
  aren't verified yet (see `docs/squat/LAB_DATA.md`).
- Don't touch `web/src/constants/themeValues.js` hex values or the coverage thresholds
  to make a check pass; fix the code instead.
