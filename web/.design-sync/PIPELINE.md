# The design → code pipeline

How design work reaches the repo. This is the codified version of the route used
on 2026-08-25; it replaces "hand the file over for download" wherever that phrase
appears in older docs.

Design owns this file.

## The shape of it

```
design project  ──▶  Drive folder            ──▶  web/.design-sync/  ──▶  app
  (source)            (SplitIQ design handoff)     (read-only mirror)

                      docs: land as text
                      designs: land as expiring URLs, fetched by curl
```

Three properties hold at every step, and every rule below follows from them:

1. **One direction.** Design owns the docs; the repo mirrors them; nothing pushes
   back. A correction made in the repo is lost on the next drop.
2. **Neither side can see the other's container.** A code session is cloned from
   git. Nothing in the design project is visible to it until it is fetched.
3. **The Drive folder is a courier, not a home.** It holds the current drop. It is
   not a version history and nothing should be read from it that has already
   landed in `web/.design-sync/`.

## The folder

**`SplitIQ design handoff`** —
https://drive.google.com/drive/folders/1i5EXypka1ihAmgT0cjfMYxCleR-eQZoN

Flat, no subfolders. Filenames match their `web/.design-sync/` destinations
exactly, so a drop is a copy and never a rename.

| In the folder | Lands at |
| --- | --- |
| `HANDOFF.md` | `web/.design-sync/HANDOFF.md` |
| `conventions.md` | `web/.design-sync/conventions.md` |
| `ISSUES-load-states.md` | `web/.design-sync/ISSUES-load-states.md` |
| `PROJECT-CONTEXT.md` | `web/.design-sync/PROJECT-CONTEXT.md` |
| `splitiq-light-tokens.css` | `web/.design-sync/splitiq-light-tokens.css` |
| `splitiq-load.js` | `web/.design-sync/splitiq-load.js` |
| `PROMPT-FOR-CODE.md`, `FETCH-DESIGNS.md`, `README.md` | briefing only — not committed |
| *(the nine designs)* | `web/.design-sync/designs/*.html`, by curl |

## What triggers a drop

A drop is warranted when any of these changed since the last one:

- a design-owned doc (`HANDOFF.md`, `conventions.md`, `ISSUES-*.md`,
  `PROJECT-CONTEXT.md`, this file)
- the load model (`splitiq-load.js`) or the token list
- any `.dc.html` design, in a way that changes a decision code would act on

Cosmetic edits to a design do not warrant a drop on their own. A new screen, a
changed number, a reversed decision, or a new rule always does.

## The design side, in order

1. **Re-export the designs.** Every changed `.dc.html` recompiles to
   `design-sync-docs/designs/<slug>.html`. Stale snapshots are worse than absent
   ones — a snapshot that predates a re-seed shows numbers the model no longer
   produces.
2. **Refresh the staged mirror.** `design-sync-docs/` holds exactly what a drop
   contains, so the drop is a copy of a directory rather than a judgement call.
3. **Update `github.md`.** Move the previous `## Last sync` into
   `## Sync history`, write a new one with the real timestamp, and add a screen-map
   row for any new screen. Never delete history.
4. **Land the docs in Drive.** Text files go up whole. Filenames as above.
5. **Mint the design URLs and write `FETCH-DESIGNS.md`.** One URL per compiled
   design, the curl block, the expiry timestamp, and the size check. Mint these
   **last**, immediately before handing over — they are the perishable part.
6. **Refresh `PROMPT-FOR-CODE.md`** so the briefing matches the drop, and upload
   it with the rest.

## The code side, in order

1. **Run `FETCH-DESIGNS.md` first**, while the URLs are alive.
2. **Verify each file** — 0.7–1.7 MB, starts with `<!DOCTYPE html>`. Anything
   under 10 KB is an error page. Delete it; do not commit it.
3. **Copy the docs from Drive into `web/.design-sync/`** and commit, as one
   change, before doing any implementation work. The mirror is then current and the
   next session need not touch Drive.
4. **Read `HANDOFF.md` §1 before anything else.** The token seam blocks consistent
   implementation of the rest of §6.
5. **Report disagreements rather than fixing them.** A wrong value in a
   design-owned doc goes back to design in your reply.

## Failure modes and what they mean

| Symptom | Cause | Do this |
| --- | --- | --- |
| A design URL 403s or 404s | The URL expired, or was fetched too many times | Ask design to mint a fresh set. One turn. Never conclude the design is gone. |
| A design file is a few KB | An error page was saved | Delete and refetch. Never commit it. |
| A doc in the repo contradicts one in Drive | The mirror is stale | Drive wins. That is the definition of the direction. |
| `conventions.md` describes a dark-only system | That is the pre-drop mirror | Replace wholesale. `HANDOFF.md` §3. |
| A design cites numbers no screen produces | A stale snapshot got dropped | Re-export and re-drop. Do not hand-correct the digits. |
| Two screens cite one reading differently | A view carries its own copy of the maths | `HANDOFF.md` §5. Extract the module; do not reconcile digits. |

## What this pipeline is not

- **Not two-way.** There is no path from the repo into the design project except a
  person reading and relaying. Repo-owned files (`CLAUDE.md`,
  `CODE-TO-DESIGN.md`, component docs, preview stories) travel the other way and
  are read from `web/.design-sync/` on `main`, never uploaded.
- **Not automatic.** Every drop is deliberate. Nothing watches a folder.
- **Not a place to keep things.** Once a drop is committed, the Drive copy is
  spent. The next drop overwrites it, and no one should be reading it after the
  mirror is current.
- **Not a route for the compiled designs as text.** They are 0.8–1.6 MB with
  fonts and the design-system bundle inlined. URLs and curl, or a zip by hand —
  those are the two options, and the first is the default.

## The zip fallback

If the URL window closes and there is no code session ready, the designs can be
handed over as a zip of `design-sync-docs/designs/` and dropped into the repo by
hand. Same destination, same filenames. Use it when timing has already failed —
not as the plan.
