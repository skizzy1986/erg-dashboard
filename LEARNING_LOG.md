# Learning Log — erg-dashboard

A running record of concepts covered, Scott's glossary, open questions, and next steps.
Updated at the end of each session so learning compounds.

---

## Session 2026-06-24

### What we built
- **WO-001 complete**: vitals auto-import live — 25 rows, 23 Mar → 24 Jun, zero errors.
- **Parser rewrite**: stacked single-CSV → three separate tab CSVs (Vitals, Sleep, Body Measurements).
- **Merge conflict**: resolved Claude Code's factory restructure into main; kept their agent rewrites, restored our secret-commit hook.

### Concepts covered

**Date parsing / regex**
The old `isoDate()` only matched `YYYY-MM-DD`. The Health Data Export sheet outputs `DD/MM/YYYY` (Australian). We extended it to try both patterns:
```js
m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
if (m) return `${m[3]}-${m[2]}-${m[1]}`;
```
Rule of thumb: always check what format your data source actually uses before writing a parser.

**Deno edge functions**
An edge function is a short-lived server function that runs on Supabase's infrastructure on demand. Analogue: a scheduled routine / job on a timer — except ours also responds to manual HTTP calls for testing. Deployed with `supabase functions deploy`; the `--no-verify-jwt` flag means it handles its own auth (via `x-cron-secret`) rather than requiring a Supabase user token.

**`Promise.all` — parallel fetch**
Instead of fetching Vitals then Sleep then Weight one-after-another (sum of delays), we fire all three at once and wait for the slowest:
```js
[vitalsCsv, sleepCsv, weightCsv] = await Promise.all([fetchCsv(vitalsUrl), fetchCsv(sleepUrl), fetchCsv(weightUrl)]);
```
Analogue: starting three separate comms reads simultaneously rather than polling them in sequence.

**Postgres upsert counting**
`ON CONFLICT DO UPDATE` counts every row it touches as "affected" — even if the data didn't change. So running the import twice shows `upserted:25` both times. That's not a bug; idempotency means the *data* is unchanged, not the *counter*. Verify idempotency by checking row count, not the upserted number.

**Merge conflicts**
A merge conflict happens when two branches both modified the same file. Git marks the divergence with `<<<<<<<`, `=======`, `>>>>>>>` markers. Resolution: pick one side (`git checkout --theirs` or `--ours`), or manually combine, then `git add` the resolved file. The merge commit isn't created until all conflicts are resolved and staged.

**Git index.lock**
A stale `.git/index.lock` file means a previous git process crashed mid-operation. Safe to delete with `Remove-Item .git/index.lock`, then retry.

**Google Sheets "Publish to web"**
Publishing as HTML (pubhtml) and publishing as CSV are separate actions. Each tab must be published individually as CSV to get a stable, auth-free URL. The URL pattern: `...pub?gid=XXXXXXXX&single=true&output=csv`. Tabs that aren't published return 403.

### Glossary (Scott's words)
- **Edge function** = scheduled routine running on Supabase's servers, not mine
- **Upsert** = "insert if new, update if exists" — like a tag write that won't create duplicates
- **Idempotent** = running it twice gives the same result as running it once
- **Merge conflict** = two branches edited the same file; git can't auto-decide which is right
- **Promise.all** = fire multiple async operations simultaneously; wait for all to finish

### Open questions
- WO-002 (Slack readout) still `ready` — straightforward, no external blockers.
- Cron job for WO-001 not yet registered (runs manually for now). Needs pg_cron entry at `0 3 * * *`.
- Monorepo branch (`refactor/extract-training-load`) on other workstation — needs push to origin before continuing. Two pending actions: Vercel root directory → `web`; copy `.env` to `web/.env`.

### Next session
1. Push `refactor/extract-training-load` from the other workstation, then fetch here.
2. Complete Step 3 (test fixtures JSON) onward per the handover notes.
3. Two manual actions: Vercel root dir + .env copy.
4. WO-002 (Slack) can be threaded in any time — quick win.
