# Erg Coaching Dashboard — External Deployment

A standalone React app version of the training dashboard. Unlike the Claude
artifact, this runs as a real web app: any npm library works, it can be hosted
at a permanent URL, and it can grow a backend later.

---

## WHAT THIS IS

- **Framework:** React 18 + Vite (fast modern build tool)
- **Dependencies:** recharts (charts), mathjs (trend regression)
- **Output:** a static site (`dist/`) you can host anywhere

The dashboard code is one file: `src/erg-dashboard.jsx`. Everything else is
scaffolding.

---

## STEP 1 — INSTALL NODE (one-time, on your computer)

You need Node.js (v18 or newer). Check if you have it:

```
node --version
```

If that errors or shows < v18, install the LTS version from https://nodejs.org
(the "LTS" button). On Windows, the installer handles everything. Restart your
terminal after installing.

---

## STEP 2 — RUN IT LOCALLY (see it on your machine)

From inside this folder:

```
npm install      # one-time: downloads dependencies (~30s)
npm run dev      # starts the app
```

It prints a local URL (usually http://localhost:5173). Open that in your
browser. The app hot-reloads when you edit `src/erg-dashboard.jsx`, so changes
appear instantly.

To see it on your **phone** while developing: run `npm run dev -- --host`, then
open the "Network" URL it prints from your phone (same wifi).

Stop the server with Ctrl+C.

---

## STEP 3 — BUILD FOR PRODUCTION

```
npm run build
```

This creates a `dist/` folder — a self-contained static site. That folder is
what gets hosted.

Preview the production build locally before deploying:

```
npm run preview
```

---

## STEP 4 — DEPLOY (pick ONE)

### Option A — Vercel (recommended, easiest)

1. Push this folder to a GitHub repo (see STEP 5).
2. Go to https://vercel.com, sign in with GitHub.
3. "Add New Project" → import your repo.
4. Vercel auto-detects Vite. Leave defaults (build: `npm run build`,
   output: `dist`). Click Deploy.
5. ~1 minute later you get a permanent URL. Every git push auto-redeploys.

`vercel.json` is already included so this is zero-config.

### Option B — Netlify

Same as Vercel: push to GitHub, connect at https://netlify.com, it detects
Vite. Build command `npm run build`, publish directory `dist`.

### Option C — Drag-and-drop (no git)

After `npm run build`, go to https://app.netlify.com/drop and drag the `dist/`
folder onto the page. Instant URL, no account setup. (Downside: no auto-deploy;
you re-drag after each change.)

---

## STEP 5 — GIT (for auto-deploy)

```
git init
git add .
git commit -m "Initial dashboard"
```

Then create an empty repo on GitHub and follow its "push existing repo"
instructions (two commands it gives you). After that, `git push` deploys.

---

## UPDATING THE DASHBOARD

The dashboard is `src/erg-dashboard.jsx`. Edit it, then:

- **Local check:** `npm run dev` (instant preview)
- **Deploy:** `git add . && git commit -m "..." && git push` (Vercel/Netlify
  auto-rebuild), or `npm run build` + re-drag `dist/` for the drag-drop route.

---

## WHERE THIS CAN GO NEXT (optional, bigger projects)

This static version unlocks but does not yet include:

- **Self-logging** (a backend + database so the app writes its own session
  history instead of being a static snapshot). Needs a real backend build.
- **Direct Strava/Drive pulls** (the app fetching your data itself). Needs API
  auth + key handling — non-trivial, do deliberately.

These are legitimate next steps but each is a real project. The static deploy
is the foundation they'd build on.
