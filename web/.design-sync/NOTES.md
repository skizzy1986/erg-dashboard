# design-sync notes — SplitIQ

Repo-specific gotchas for syncing this repo to claude.ai/design. Read this
before re-running the sync.

## Shape

- **This repo is an app, not a published component library.** There is no
  library build, no `dist/` entry, no `.d.ts`, and no Storybook. The synced
  design system is the app's shared UI layer: `web/src/components/**` plus the
  `THEME` tokens.
- Everything lives under `web/` because that is the npm package (`splitiq`).
  `.design-sync/`, `.ds-sync/` and `ds-bundle/` are all package-relative, and
  every command below is run from `web/`.

## Sync inputs this repo owns

| File | Why it exists |
|---|---|
| `.design-sync/entry.jsx` | The app's components are **default exports**; the converter's synth-entry uses `export *`, which does not re-export defaults. This barrel gives them stable named exports. **Add new components here** or they will not reach `window.SplitIQ`. |
| `.design-sync/gen-css.mjs` | Generates `base.css` from `src/constants/theme.js`. **Re-run it whenever THEME changes**: `node .design-sync/gen-css.mjs`. |
| `.design-sync/base.css` | Generated. The token layer (`--color-*`) plus the app ground. Wired as `cfg.cssEntry`. |
| `.design-sync/docs/*.md` | Per-component docs. Their `category:` frontmatter is what sets the DS pane groups (session / metrics / charts / tooltips / feedback / mobile) — without them everything lands in `general`. |
| `.design-sync/previews/*.tsx` | Authored preview stories, one file per component. |

## Gotchas

- **`cfg.tokensGlob` is inert without `cfg.tokensPkg`.** `copyTokens()` returns
  early when there is no tokens *package* in `node_modules`, so a glob pointing
  at a repo file silently copies nothing and `tokens/` ships empty. That is why
  the tokens are folded into `cssEntry` (`base.css`) instead — they reach
  designs through the `styles.css` @import closure either way.
- **The preview card template hardcodes `body{background:#fff}`** in an inline
  `<style>` that comes *after* the stylesheet links. SplitIQ is dark-only, so
  `base.css` sets `background`/`color` with `!important` to win that cascade.
  Without it every component renders on white and `done`-style opacity fades
  look broken. Do not remove the `!important`.
- **`.d.ts` props cannot be auto-extracted.** The source is plain JSX with no
  type annotations and no JSDoc `@param` types, so ts-morph emits
  `[key: string]: unknown` for every component. All 11 prop contracts are
  hand-written in `cfg.dtsPropsFor`, derived from the destructured params and
  their real usage. **If you change a component's props, update `dtsPropsFor`**
  — nothing will catch the drift for you.
- `[DTS_REACT] @types/react not found` prints on every build. It is expected and
  harmless here: installing it would not help, because there are no React
  utility types to resolve. Do not add it to the repo just to silence this.
- **`LogSessionForm` is deliberately excluded.** It imports `supabaseClient.js`,
  which calls `createClient(import.meta.env.VITE_SUPABASE_URL, …)` at module
  scope. In an IIFE bundle `import.meta.env` is undefined, so the client throws
  at load and takes the whole bundle down. To include it later, shim the client
  (e.g. a `cfg.provider` or a stub module via `cfg.extraEntries`) first.
- `PACE_ZONES` is exported from `entry.jsx` so `PaceTrendChart` previews use the
  real zone table rather than an inlined copy that would rot.

## Known render warns

- `[GRID_OVERFLOW]` on **LiveMetric** — fixed by `overrides.LiveMetric.cardMode
  = "column"`. It cannot re-flag; no action needed.
- **PaceTrendChart capture is stalled mid-animation.** `package-capture.mjs`
  pins a fixed clock (`page.clock.setFixedTime`), which stops Recharts'
  `react-smooth` line-draw animation partway, so the review sheet shows a
  partial path with disconnected dots. The card itself is fine — verified by
  rendering the same card under a live clock. There is no way to disable the
  animation from the preview, because `PaceTrendChart` hardcodes `<Line>`
  without `isAnimationActive` and the bundled Recharts' `Global` is not
  reachable. **Expect this on every sync; it is not a regression.**

## States that cannot render statically

Recorded so nobody re-litigates them:

- `LogEntry` and `WorkoutItem` are collapsed by `useState(false)`. The expanded
  bodies — the erg metric grid, the strength exercise table, and the workout
  note/fuel/meal detail — are click-gated and never appear in a card. They are
  described in the `.md` docs instead.
- `WorkoutTarget` is likewise collapsed; the duration / sRPE / notes body is
  behind the caret.

## Re-sync risks

- **`dtsPropsFor` is hand-maintained and has no drift detection.** A prop
  renamed or removed in a component leaves the uploaded contract silently wrong,
  and the design agent codes against that contract. Diff the components against
  the config when re-syncing.
- **`entry.jsx` is hand-maintained too.** A new component in
  `src/components/` will not sync until it is added there *and* to
  `cfg.componentSrcMap` *and* given a `.design-sync/docs/<Name>.md` (or it lands
  in the `general` group).
- **`base.css` is generated but not automatically regenerated.** If `THEME`
  gains or loses a colour and `gen-css.mjs` is not re-run, designs ship stale
  tokens. Re-run it as step one of every sync.
- **'DM Mono' is referenced but never served.** Several components set
  `fontFamily: "'DM Mono', monospace"`, but neither the app nor this bundle
  ships the face — `index.html` loads no webfont. Everything therefore renders
  in the Courier/monospace fallback, in the app and in designs alike. This is
  faithful to production, not a bug, but if SplitIQ ever adds DM Mono, wire it
  here via `cfg.extraFonts` so designs keep matching.
- **Toolchain assumptions:** the render check runs against **system Chrome**
  (`DS_CHROMIUM_PATH=/c/Program Files/Google/Chrome/Application/chrome.exe`)
  because no playwright browser is cached on this machine. `playwright` itself
  resolves from `web/node_modules`. If the check fails to launch, either install
  `npx playwright install chromium` or re-point `DS_CHROMIUM_PATH`.

## Commands

```sh
cd web
node .design-sync/gen-css.mjs                      # refresh tokens from THEME
node .ds-sync/package-build.mjs   --config .design-sync/config.json --node-modules ./node_modules --entry ./.design-sync/entry.jsx --out ./ds-bundle
DS_CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" \
  node .ds-sync/package-validate.mjs ./ds-bundle
```
