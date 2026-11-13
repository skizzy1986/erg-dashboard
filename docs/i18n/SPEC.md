# Spanish (es-CO) across SplitIQ — approved story and spec

> Pipeline record for the i18n work (`/orchestrate`, 2026-11-13).
> **Gate 1** approved by Scott: scope = whole app (/squat + dashboard + APK), Lingui, es-CO,
> Latin American, **tú only (never usted)**, English first-visit default (no detection),
> decimal point, Colombian native-speaker review on each Vercel preview before merge.
> **Gate 2** approved by Scott 2026-11-13 ("approve, start with PR-M"), including:
> dashboard ENTRY budget may rise above 150 KB (measured + ~2 KB, dated comment);
> untranslated #412 views stay whole-English in Spanish mode; mobile Settings is its own PR.
>
> **PR sequence and status**
>
> | PR | Scope | Status |
> |---|---|---|
> | PR-M | Mobile Settings screen (gear in Today header, reuses SettingsView) | shipped to PR #508 — awaiting baseline + merge |
> | PR-1 | Lingui foundation (spike first) + dashboard Phase 1 | not started |
> | PR-2 | /squat chrome on Lingui | not started |
> | PR-3 | /squat prose overlay | not started |
> | Phase 2+ | one PR per #412 slice (#419–#423) after it lands | not started |

---

## Approved story (revised, Gate 1)

### Story (revised): Spanish (es-CO) across the whole app, phased

This replaces the earlier /squat-only story. Scott's decisions are fixed and not re-argued here:
- Library: Lingui.
- Locale: es-CO, Latin American, tú only (never usted).
- First-visit default: English, no browser detection.
- Decimal point everywhere.
- A Colombian native-speaker friend reviews on the Vercel preview before merge.

#### Story
As a Spanish-speaking lifter or rower, I want to switch the whole app to Spanish once and have /squat and the dashboard (web and Android) both remember it, so that I can use SplitIQ end to end in my language.

#### Phasing rule
- **Phase 1** ships the Lingui foundation, the shared preference and the controls. It translates /squat plus every dashboard surface that no open #412 slice touches (listed in AC 9).
- **Phase 2+** follows one rule. A dashboard view is translated in the same PR that lands its #412 slice, or after it. Views still pending a #412 slice stay English in Spanish mode, and nobody spends translation effort on code about to be deleted. No ticket list is kept here, because it would rot.
- Spanish mode can therefore be partly English on the dashboard after Phase 1. That is accepted (see open question 2).

#### Acceptance criteria

**Preference and control**
1. One localStorage key holds the language (`en` or `es`). /squat and the dashboard both read and write it, so a switch in one is honoured in the other on next load.
2. A language control is present in the /squat header (beside the theme toggle) and in the desktop Settings tab. On mobile, where there is no settings surface, it sits in a reachable place that Scott picks at Gate 2. It is keyboard-operable and its accessible name is in the active language.
3. English is the default for a first-time visitor, with no `navigator.language` use. The choice persists across reloads.
4. When storage is blocked or throws, the switch works for the session only, and nothing throws or logs to Sentry.
5. `<html lang>` is `en` or `es-CO` to match the active language and updates on switch without a reload. Screen readers must not announce twice on a switch.
6. /squat never imports `supabaseClient.js`, and `RouteRoot.test.jsx` stays green. See AC 22 for the server-preference trade-off.

**Phase 1 coverage**
7. In Spanish, all /squat UI chrome, aria-labels, offline message, guide, form check, metrics, method, phases, muscle names and synonyms, share strings, `repSummary.js` strings and `useStrainAnnouncement` live announcements render in Spanish.
8. The offline first-visit message in `RouteRoot` and the AuthGate loading and error text read the stored language before any chunk loads.
9. In Spanish, these dashboard surfaces render in Spanish:
   - shell and nav, and desktop tab labels;
   - mobile `BottomTabBar`;
   - AuthGate login and sign-up screens, including validation and error messages;
   - the Settings tab and `StravaConnectPanel`;
   - shared error, empty and loading states.
10. Any dashboard view not covered by AC 9 and not yet through its #412 slice renders English in Spanish mode, with no raw ids and no mixed half-translated sentences. Each string is either whole in Spanish or whole in English.

**Correctness and safety**
11. A string missing in Spanish falls back to English. A raw message id or `undefined` never appears on screen.
12. A test fails if any translatable string touched in Phase 1 has no Spanish counterpart. This makes the fallback a safety net, not a way to ship gaps.
13. English strings are unchanged. The existing tests (~970 text-coupled RTL queries, Playwright specs, English visual snapshots) pass unedited.
14. The honesty scan in `content.test.js` runs over the Spanish prose with Spanish equivalents of the banned "measured" phrasings. The build fails if a modelled value is presented as measured.
15. Model-derived numbers and units are identical in value in both languages. The decimal separator is a point everywhere.
16. Citations and reference titles are not translated. The CC BY-SA and licence text stays in its original language, with surrounding labels translated.
17. Share links remain language-free. The recipient sees their own stored language, falling back to English.
18. All Spanish copy uses tú. A mechanical check fails on usted forms (for example a list of banned `usted`, `su `-as-formal and `-e`-imperative patterns, scoped to a short reviewable word list). The list is a guard, not proof, so human review still decides.
19. A Colombian native-speaker friend reviews the Spanish on the Vercel preview before merge. The PR cannot merge without that review recorded in the PR body.

**Dashboard data and formatting**
20. Dashboard dates and numbers shown on screen follow the active language, including the sites that hardcode `en-GB`, `en-AU`, `en-CA` or `undefined` locales. Stored formats are untouched. `sessions.date` stays text `M/D/YY` on write, `date_iso` remains the sort key, and `vitals.date` is unchanged. English output stays identical to today (AC 13).
21. User-entered and data-sourced strings render as entered and are never translated. This covers session labels and notes, exercise library names, `sessions.status` and `type` values, and `duration.js` parsing of `h`, `m` and `min`. Labels that the UI derives from data (for example `classifyZone` text) are translated only if they are UI strings, and that decision is made explicitly per label.

**Android and persistence**
22. The Android APK shows the language control, because it ships the dashboard, and honours the stored preference. APK system strings (`app_name`, launcher, permissions) are out, and the recommendation is to keep them English. The cost of in is native resource files per locale plus a Capacitor config path, for a name that is the same word in both languages. **Preference storage: localStorage only for v1.** A server-stored preference would sync across devices for authed users, but it needs a schema change, makes the dashboard flash in English until the profile loads, and cannot serve /squat. I recommend against it for v1, and the preference stays per-device. In the APK's WebView, localStorage persists with app data, so the choice survives restarts, and AC 4 covers cleared storage.

**Bundle**
23. The dashboard entry stays under 150 KB gzip, and that ceiling is never raised. Measured by re-running `npm run build && npm run size` and quoting the fresh figure. Squat budgets may rise only under Scott's Gate-2 rule (measured + ~2 KB, whole KB, dated comment). English users do not download Spanish message catalogues. The bundle is re-measured before Gate 2, because Lingui's ~3.6 KB gzip runtime already exceeds the ~3.1 KB dashboard-entry spare and the 0.4 KB squat-entry spare (both documented 2026-11-13).

#### Edge cases
- **Mid-session switch.** Open modals, forms and live-region announcements update in place without losing in-progress input, such as a half-filled login form or strength log.
- **Auth screens before sign-in.** The language control must be reachable on the login screen (AC 9 and 2), or a user can't change language before signing in. The control also needs to be reachable from there without an account.
- **Long Spanish strings.** Spanish runs roughly 20–30% longer. Check the BottomTabBar, header, Settings and login controls at the narrowest mobile width in ES with a visual test.
- **Pluralisation and interpolation.** Counts such as "3 sets" and "1 set" use proper plural forms in Spanish. Interpolated values like `{k:'key'}` placeholders keep their order-safe form, and a translator can reorder them.
- **Offline first visit and cached SW.** Spanish catalogues for the active language must be available offline once the app has loaded, with the same caching treatment as other chunks. A cache that serves stale English after a switch is a failure.
- **Locale-formatted dates/numbers in tests.** English test output stays pinned (AC 13), and any Intl-dependent assertion avoids machine locale.
- **Share link opened by a Spanish-stored user.** See AC 17.

#### Out of scope
- PWA manifest.
- Sentry messages.
- Edge functions and their responses.
- Docs, `NOTICE.md`, licence text.
- Exercise library (873 rows), session and vitals data translation.
- Browser-language detection.
- Languages beyond EN and ES.
- Server-stored preference (AC 22).
- Android system strings (AC 22).
- Spanish for any dashboard view with an unlanded #412 slice (Phase 2+ rule).
- Regional variants other than es-CO, and usted register.

#### Open questions for Scott (max 3) — answered at Gate 2: (1) raise the limit; (2) partial English accepted; (3) mobile Settings as its own PR.
1. **Reclaim the Supabase `RealtimeClient` from the entry first, in its own PR?** It would free budget before Lingui lands. The Lingui runtime exceeds the dashboard entry's current spare by ~0.5 KB, so without a precursor the build will fail the 150 KB gate. Do you want that precursor, or a different way to buy the room? I haven't designed it, and Gate 2 should size it.
2. **Is a partly-English dashboard in Spanish mode acceptable between phases?** It's the cost of not translating #412 cull targets. The alternative is gating the control in the dashboard until the remaining slices land, so Spanish users get a consistent experience at the cost of a later launch. I recommend shipping and accepting the gap. My confidence is ~65%.
3. **Where does the mobile language control live?** Mobile has no settings surface. Options are a header or avatar menu, a new minimal Settings entry in the mobile shell, or the login screen only, which would be too hidden. I lean to a minimal mobile Settings entry, since it will also host later preferences, but it adds a nav item to the BottomTabBar and is Scott's call at Gate 2.

Confidence: about 70% that this phasing is achievable. Largest risk is the bundle budget (AC 23). Second is translation review depending on one volunteer (AC 19).

---

## Approved spec (Gate 2)

### Re-spec: Spanish (es-CO) across SplitIQ on Lingui — Stage 3, READ-ONLY

I made no repo writes and ran no build. The one exception: an in-memory measurement script written to my scratchpad, which produced no build output. Every file:line below I read in this session. Library claims name their Context7 source. Bundle figures are **estimates** unless marked measured.

**Recommendation in one paragraph:**
- Use Lingui for all UI chrome on both products, with its macros transformed by `@lingui/vite-plugin`'s native transform, so no Babel plugin is needed on plugin-react 6.
- Ship two Spanish catalogs, one per product. Each is loaded only for Spanish visitors and named so Workbox never precaches it.
- /squat's *prose* stays an id-keyed overlay, as in my first spec. Lingui fits that content badly, and forcing it would require editing `content.test.js`.
- Five PRs: mobile Settings (independent) → Lingui foundation with the dashboard Phase-1 surfaces → /squat chrome → /squat prose → Phase 2+ alongside #412.
- The first commit of the foundation PR is a spike that proves four library behaviours before anything else is built.

### Scott's final decisions (from the coordinator; built into everything below)
1. **Dashboard ENTRY may rise above 150 KB.** Same discipline as squat: measured + ~2 KB, whole KB, dated comment in `check-bundle-size.mjs`, applied in the PR that needs it. Lingui sits in the entry. Reclaiming RealtimeClient is an *optional later cleanup*, not a prerequisite.
2. **Untranslated #412 views stay whole-English in Spanish mode.** This is accepted.
3. **Mobile Settings is its own PR (PR-M).** It is specced in §11.
4. **Register: tú only, never usted** (from the earlier round). This is a hard rule with a test (§10).

### 0. What carries over from my /squat spec, and what changes

**Still valid, kept unchanged:**
- **Manifest identity.** The 118 English `meta.muscles[].name` values are identities: `slugify` → `#m=` (`squat/utils/muscleIndex.js:16-20,71`), `repSummary.js:47` (`mi`), and `LEN_SHOW` at `:21-28`. The manifest is sha-pinned (`constants/dataAsset.js:19-22`). Spanish names and roles therefore go in an index-keyed overlay.
- **Announcement fix.** `useStrainAnnouncement` receives `phase: view.phaseCode`, because `useAnatomyViewState.js:226` uses the English name as identity.
- **Direction tokens.** `'lowering'`/`'driving'` are mapped to words at render (`activation.js:48-59`; printed in `MuscleCard.jsx:126,144` and `TimeControls.jsx:13,184`).
- **Share links.** The hash is language-free already (`squatHash.js:118-130`).
- **Pre-chunk offline message.** `RouteRoot.jsx:55-63` renders it with a `lang` attribute on the element.
- **Hold-render** with `use(promise)` under RouteRoot's existing Suspense (`RouteRoot.jsx:67-75`).
- **The `squat-` chunk rule.** `scripts/squatChunks.mjs:7-29`: every module of the chunk must be under `/src/squat/`.
- **No `import()` of Spanish from RouteRoot.** `prefixMismatch`/`onlyReachableVia` walk `dynamicImports` from the entry (`scripts/entry-graph.mjs:115-123,186-196`).
- **The 360 px compact-header risk**, plus the e2e suite at `e2e/squat.spec.js:575-590`.
- **Translation rules** (es-CO, tú only, untranslated citations and licence, honesty wording) and **T-USTED**.
- **The reviewer sheet.**

**Changes in this re-spec:**
- The pre-chunk module is no longer `utils/squatLang.js`. It becomes the shared `src/i18n/lang.js`, because both products now read the one key.
- Chrome moves to Lingui.
- The squat budget gains Lingui's runtime.

### 1. Toolchain

**Packages.** Pin exact versions after the spike; the coordinator reports npm current is `@lingui/*` 6.12.0.
- Runtime deps: `@lingui/core`, `@lingui/react`.
- Dev deps: `@lingui/cli`, `@lingui/vite-plugin`, `@lingui/conf`.
- **No** `@lingui/babel-plugin-lingui-macro`, **no** `@rolldown/plugin-babel`, **no** SWC plugin.

Why no Babel or SWC plugin: `@lingui/vite-plugin` with `lingui({ macroTransform: true })` transforms macros natively through `@lingui/native-tools`. Per the docs it "works with `@vitejs/plugin-react`, `@vitejs/plugin-react-swc` and Vite 8+ with Rolldown", and it is now the recommended setup (Context7 `/lingui/js-lingui`: `website/docs/installation.mdx` "Build Tools > Vite"; `ref/vite-plugin.md` "Native Macro Transform"). That makes the plugin-react 6 Babel question moot: `react({ babel })` versus `@rolldown/plugin-babel` is not needed. Context7's indexed docs are v5.9.5, so the spike must confirm this on v6.

**Module format.** `web/package.json` has `"type": "module"` (`:5`) and all scripts are `.mjs`, so ESM-only Lingui fits. `lingui.config.js` is ESM.

**Node.** Lingui 6 needs ≥ 22.19 (Context7 library rules). Local is 22.23. CI `node-version: 22` resolves the latest 22.x, which is fine. **The Vercel project's Node version must be checked by the Build**; I cannot see it from the repo. Add `"engines": { "node": ">=22.19" }`.

**`web/lingui.config.js`:**
```
sourceLocale 'en', locales ['en','es'], fallbackLocales { default: 'en' },
format po (origins + lineNumbers on — translator context),
catalogs: [
  { path: '<rootDir>/src/squat/locales/{locale}', include: ['<rootDir>/src/squat', '<rootDir>/src/anatomy'] },
  { path: '<rootDir>/src/locales/{locale}', include: ['<rootDir>/src'],
    exclude: ['<rootDir>/src/squat/**', '<rootDir>/src/anatomy/**', '**/__tests__/**', '**/*.test.*'] },
]
```
Source for the catalog `path`/`include`/`exclude` semantics, and the `<rootDir>` prefix being needed on `exclude`: Context7 `/lingui/js-lingui` `ref/conf.md#catalogs`, and the monorepo guide's Troubleshooting section.

**`vite.config.js`:** `plugins: [react(), lingui({ macroTransform: true }), …]`, with `lingui()` placed right after `react()` (`vite.config.js:74-75`). Vitest reads the same config, so tests get the same transform. The spike proves this.

**npm scripts:**
- `i18n:extract` → `lingui extract --clean`
- `i18n:check` → `lingui check sync --clean && lingui check missing --mode catalog --locale es`

`check sync` and `check missing --mode catalog` exist in the current CLI docs (Context7 `ref/cli.md`). There is **no** compile step: the Vite plugin compiles `.po` on import (`ref/vite-plugin.md`), so no compiled output is committed and none can go stale.

**CI.** Add `npm run i18n:check` to the `Lint & Format` job in `.github/workflows/ci-web.yml`.
- It fails if the source has a message the catalogs lack (AC: "a Phase-1 string lacking Spanish fails").
- `--mode catalog` makes an empty `es` `msgstr` fail even though `fallbackLocales` would paper over it at runtime.

### The spike: first commit of PR-1. Nothing else is built until all four pass.
1. **Build.** `macroTransform` works on Vite 8.3.6 / plugin-react 6.2.1 for both `vite build` and `vitest run`. Look at the emitted JS: macros are gone, and descriptors are id-only in production.
2. **English in production with id-only descriptors.** Docs: production emits `id`-only descriptors (`ref/vite-plugin.md`). So English needs a compiled `en` catalog loaded; without one, `i18n._` has no source text. Prove that a statically imported `en.po` renders English in `vite preview`.
3. **Missing-ES fallback.** An `es.po` with an empty `msgstr` imported through the plugin renders the English text, not an id, given `fallbackLocales.default = 'en'`. If the plugin does not apply fallbacks, CI's `check missing --mode catalog` is the guarantee instead, and a test asserts no rendered text equals a catalog id.
4. **Rendering without a provider.** Without `I18nProvider`, `useLingui`/`Trans` throw ("…used without I18nProvider", per the monorepo guide's Troubleshooting), and `i18n._` throws if no locale is active (`packages/core/src/i18n.ts`, Context7). This drives §6.

### 2. Catalogs

| Catalog | Loaded how | Chunk / name | Where it ships |
|---|---|---|---|
| `src/locales/en.po` | **static** import in `src/i18n/dashboard.js`, which `AuthGate` imports | in the dashboard entry | everyone on the dashboard (English source text moves here from the components; net ≈ neutral) |
| `src/locales/es.po` | `import('../locales/es.po')` inside `ensureLocale('es','dashboard')` | `assets/i18n-es-[hash].js` (new rule, below) | Spanish users only; never precached; **kept in the APK** so Spanish works offline on Android |
| `src/squat/locales/en.po` | static import in `src/squat/i18n/setup.js` | squat chunk | /squat |
| `src/squat/locales/es.po` + `src/squat/i18n/prose.es.js` (overlay) | dynamic, inside `ensureLocale('es','squat')` | `squat-*` (module ids are under `/src/squat/`) | Spanish /squat users only; never precached; stripped from the APK |

**Does English need its catalog?** Yes, in production, because descriptors are id-only (spike 2).

The alternative is `descriptorFields: "message"` plus `i18n.setMessagesCompiler(compileMessage)` (Context7 `guides/optimizing-bundle-size.md`). It keeps English inline but ships the message compiler to every visitor. **I reject it.**
- The `en` catalog costs roughly what it saves in the components.
- The compiler is pure overhead in the entry.

**Phase 2+ watch item.** As views are translated, `src/locales/en.po` grows, and its *static* import is in the entry. Each view's English strings would move from that view's lazy chunk into the entry. The Phase-2 rule is: when a #412 view is translated, give it its own catalog with `{name}`, `path: '<rootDir>/src/views/{name}/locales/{locale}'`, and import its `en` catalog statically from the view module, so it stays in the view's lazy chunk. Phase 1 does not need this: shell, auth and settings are already in, or next to, the entry.

**New chunk rule** in `scripts/squatChunks.mjs`, or a sibling `i18nChunks.mjs` with the same shape and unit tests:
- A chunk whose `moduleIds` are all `/locales/es.po` (non-squat) is named `assets/i18n-es-[hash].js`.
- Add `**/assets/i18n-*.js` to `globIgnores`.
- Add a `CacheFirst` `i18n-code` runtime route copied from `SQUAT_CODE_ROUTE` (`squatChunks.mjs:41-52`).

This is required because Workbox otherwise precaches every JS asset, and every English install would then download Spanish (AC). The squat Spanish chunk gets the existing `squat-` prefix, because the squat check runs first.

### 3. Bundle placement (estimates)

**Measured in memory with rolldown, minified, gzip:** `createClient` = 54.1 KB; auth-js + postgrest-js + functions-js only = 28.3 KB; realtime-js alone = 16.2 KB. That puts a possible later RealtimeClient/storage reclaim at **≈ 20–26 KB** (estimate). It is **optional, post-i18n**. It needs a hand-built client facade that reproduces `createClient`'s auth-header wiring into PostgREST and Functions. The app uses `supabase.functions.invoke` in `hooks/useVitalsSync.js:8`, `useStravaSync.js:17` and `useStravaConnect.js:20,39`, and no `.storage`/`.channel`.

**Dashboard entry.** Lingui runtime 3.56 KB (coordinator, measured), plus `src/i18n/*` and the toggle (~0.8 KB), plus `en.po` replacing inline literals (~net +0.3 KB). Estimate **+4.5–5.5 KB**: 146.9 → ~152 KB, so expect the budget raised **150 → ~154–155** in PR-1 under the rule.

**Squat entry.** `@lingui/core`/`react` are imported by AuthGate's graph *and* SquatApp's, so rolldown puts them in a shared chunk that counts in **both** entries. Squat entry: **+4.5–5.5 KB** (runtime, provider, squat `en.po`, lookups), so expect **122 → ~129** in PR-2 (where squat first imports Lingui).
- Can Lingui sit lazily on /squat without a flash? **No.** Every chrome string goes through Lingui, so a lazy runtime would hold the whole tool or show raw text.

**New budget lines**, each = measured + ~2 KB, each also asserted on neither first paint via `firstPaintLeaks` (`entry-graph.mjs:161-180`):
- `SQUAT_ES`: files reachable only via `src/squat/locales/es.po` + `prose.es.js`. Estimate 16–21 KB once the prose lands.
- `DASH_ES`: files reachable only via `src/locales/es.po`. Estimate ~2–3 KB in Phase 1, growing per phase.

Both are subtracted from their product's TOTAL, the way `SQUAT_3D` is. Each figure stays honest about its own growth, and a language never shows up as "the tool grew".

### 4. Runtime and first paint

**`src/i18n/lang.js` (pre-chunk, plain, no Lingui)** replaces the earlier `utils/squatLang.js`:
- `LANG_KEY = 'splitiq.lang'`. That name is already product-neutral, so no rename is needed, and it is the **one key shared by both products**.
- `LANGS`, `LANG_TAG = { en: 'en', es: 'es-CO' }`.
- `readLangPref(storage)` and `initialLang(win)`: `safeStorage` from `utils/squatTheme.js:39-46`, try/catch, default `en`, no detection.
- `OFFLINE_TEXT {en, es}`.
- `LANG_UI = { label: {en:'Language', es:'Idioma'}, native: {en:'English', es:'Español'} }`.

Why the toggle's few strings sit here rather than in a catalog: the toggle is shared by both products, and it would otherwise need a third catalog loaded by both.

**`src/i18n/locale.js`:**
- Imports the global `i18n` from `@lingui/core`.
- `ensureLocale(lang, product)` keeps a cache map keyed by `lang:product`, created **lazily on first call**, never at module evaluation.
- It loads the ES catalog(s), then `i18n.load('es', messages)` once per catalog (the plugin does not merge; per the monorepo guide, `load` merges same-locale messages).
- **It never rejects.** On failure it calls `captureError(err, { where:'i18n', product })`, resolves to `false`, and drops the cache entry so the next attempt retries.
- `__resetLocaleCacheForTests()`.

**Each product's English bootstrap** (`src/i18n/dashboard.js`, `src/squat/i18n/setup.js`) does `i18n.load('en', enMessages)` synchronously at import and activates `en` if no locale is active. It is synchronous with no fetch, so it is safe at module scope.

**`src/i18n/LanguageProvider.jsx`** takes a `product` prop.
- **Stored `es`:** it calls `use(ensureLocale('es', product))`, which suspends into RouteRoot's existing Ground fallback. Then it activates `es` if that returned true, and renders `<I18nProvider i18n={i18n}>`. React docs: `use(promise)` shows the nearest Suspense fallback while pending, and the promise must be stable (Context7 `/websites/react_dev_reference_react`, react.dev/reference/react/use).
  - **Hold rather than flash:** the visitor sees one continuous themed ground, then Spanish, with no English-then-Spanish double read for screen readers.
  - The cost is one round trip to a small `CacheFirst` file.
- **Runtime switch:** it never suspends, because suspending would unmount the tree and rebuild the 3D scene. It awaits `ensureLocale`, then `i18n.activate('es')`; `I18nProvider` re-renders consumers on change (Context7 `ref/react.md#i18nprovider`).
  - It persists only on success.
  - On failure it stays English and shows a polite status from `LANG_UI`, in English.
- It owns `<html lang>`: an effect sets `LANG_TAG[lang]`, saves the previous value on mount, and restores it on unmount. The dashboard and /squat each mount their own provider.
- It exposes `useLanguage() → { lang, setLang, pending, failed }`.

**Mounting points:** `AuthGate` (dashboard; wraps Login, App and MobileApp, so the login screen is covered before sign-in) and `SquatApp`'s root. RouteRoot stays Lingui-free.

**Blocked storage:** read and write are wrapped in try/catch, with no `captureError` (not an operational error; AC: no Sentry noise), and the choice holds for the visit.

### 5. /squat under Lingui: a hybrid

**Where Lingui fits badly:**
1. `content.test.js` imports the constants and asserts their exact prose, for example `expect(ACT_NOTE).toBe('Indicative estimate, not EMG.')` (`content.test.js:224-239`) and the `SHARE` string iteration at `:363-374`. Turning those constants into `msg` descriptors makes them objects and breaks the "unedited" AC.
2. The rich-text segment format (`guide.js:1-11`) would have to become Lingui `<0>…</0>` messages rendered by the runtime `Trans`. That is a rewrite of `RichText.jsx` and of every prose assertion.
3. 118 manifest names and roles cannot carry macros at all.

**Hybrid:**
- **Inline JSX literals** in `src/squat/**` (the chrome inventory in my first spec, §3e: `SquatHeader`, `SquatApp`, `TimeControls`, `CameraControls`, `StageControls`, `ViewOptions`, `CapabilityNotice`, `SceneError`, `LoadStatus`, `SquatStage`, `MuscleList`, `MuscleCard`, `HeatmapLegend`, `FormCheck`, `GuideDialog`, `GuidePanes` "Used for:", `useAnatomyData.js:10`) become `<Trans>` and `useLingui().t` macros in the squat catalog.
  - Where an exported constant exists *and* is imported by a test (`WAITING_TEXT`, `LAYERS_WAITING`, `CAMERA…`, `PAGE_TITLE`), the constant stays an English string, and the component renders `t(msg)` from a co-located `msg` descriptor.
  - A test asserts `descriptor.message === CONSTANT`, which works because tests run in dev mode where descriptors keep `message`. That stops drift.
- **Exported prose constants, the manifest overlay, synonyms and summary templates** stay on the id-keyed overlay `src/squat/i18n/prose.es.js` (no imports), merged by `localise()`.
  - This covers `guide.js`, `formCheck.js`, `metricsTable.js`, `method.js`, `references.js` (`usedFor`/link labels only), `phases.js`, `activationBands.js`, `muscleRegions.js`, `share.js`, `ATTRIBUTION.sources`, the 118 names and roles, ES synonyms, and the `repSummary` words.
  - It keeps the parity test, the `{k}`/segment placeholder-parity test, the index-keyed name/role arrays and the decimal-point setting exactly as in my first spec.
  - It is read through `useSquatProse()`, whose default is English, so components and tests without a provider get today's constants.
- **Pure builders take words as parameters with English defaults:** `summariseRep(meta, words = EN_SUMMARY)`, `strainLine(r, text)`, and `buildMuscleIndex`/`filterMuscles` with an optional overlay. Existing tests are unaffected.
- **Frankly:** the overlay is still the hand-rolled part Scott rejected, but only for content Lingui cannot take without breaking the "unedited tests" AC. The alternative is all-Lingui prose, which means editing `content.test.js`, `repSummary.test.js` and `RichText`. If Scott prefers that, it is a Gate-2 trade; it costs the "unedited" AC for those files.

### 6. Test harness: the existing tests stay unedited

Lingui hooks throw without a provider, and `i18n._` throws without an active locale (sources in §1, spike 4).

**Plan:**
1. In `web/src/test-setup.js`, import `src/i18n/dashboard.js` and `src/squat/i18n/setup.js`. Their side effects load both English catalogs into the global `i18n` and activate `en`. That makes bare `i18n._` in utilities safe.
2. Add a test-only Vite alias in `vite.config.js` `test`: `{ find: /^@testing-library\/react$/, replacement: 'src/test/rtl.js' }`.
   - The shim re-exports `@testing-library/react/pure`, registers `afterEach(cleanup)` (reproducing RTL's auto-cleanup), and overrides `render`/`renderHook` so the default `wrapper` is `<I18nProvider i18n={i18n}>` composed with any caller-supplied wrapper.
   - This is Lingui's own recommended RTL pattern of `I18nProvider` as `wrapper` (Context7 `guides/testing.md`), applied globally without touching ~130 files.
   - **The spike verifies** that `@testing-library/react/pure` exists in RTL 16.3 and how it composes with `act`.
3. `beforeEach` calls `act(() => i18n.activate('en'))` and `__resetLocaleCacheForTests()`, so Spanish tests cannot leak into English ones.

Playwright and the dashboard visual snapshots render the real app in English, so they are unchanged by construction. **The exception is PR-M**, which deliberately adds a gear button (§11).

### 7. Dates and numbers (dashboard)

There is no shared `formatDate` export. The display sites are:

| Site | Locale today |
|---|---|
| `views/mobile/MobileSessionLog.jsx:20` | `'en-GB'` |
| `MobileRecovery.jsx:45` | `'en-GB'` |
| `MobileAnalytics.jsx:80` | `'en-GB'` |
| `MobileToday.jsx:144` | `'en-GB'` |
| `StrengthLogger.jsx:816` (date) | **`undefined`** (the browser's locale) |
| `StrengthLogger.jsx:1553` (date) | **`undefined`** |
| `StrengthLogger.jsx:989` (`toLocaleString()`) | **`undefined`** |
| `utils/schedule.js:149` | `'en-AU'` (#420 slice) |

Not display: `StrengthLogger.jsx:167` (`en-CA`) is an ISO generator and is not touched. `utils/stravaStatus.js:50-66` hand-rolls relative time and HH:MM so CI output is locale-stable.

**New `src/utils/displayLocale.js`:** `dateLocale(lang, enLocale) => lang === 'es' ? 'es-CO' : enLocale`.
- Each site passes **its current English argument**, including `undefined`, so English output is byte-identical to today.
- **Correction to the story:** the StrengthLogger sites are not `en-GB` today.
- Components read `lang` from `useLingui().i18n.locale`, so they re-render on a switch.
- **This is the one helper.** It decides the locale; each site keeps its own format options.

**Phasing:** with the whole-English rule, a Spanish date inside an English view is a mixed sentence. So each site converts **in the PR that translates its view**, not in Phase 1. In Phase 1 only `stravaStatus.js` converts, because the Strava panel is in Phase 1:
- Its strings become `i18n._(msg…)`/`plural` inside the functions (never at module level).
- With the global `en` active in tests, its outputs and tests are unchanged.
- HH:MM stays hand-rolled.

`classifyZone` and other derived labels are decided with their #412 view (#422).

### 8. Controls

**One `src/components/LanguageToggle.jsx`.** It takes a `variant` prop: `segmented` (wide) or `cycle` (44 px, compact).
- Visible text is `EN`/`ES`.
- In the segmented variant, each button's name is the code plus the native name with `lang` set ("ES, Español", `lang="es-CO"`). That satisfies WCAG 3.1.2, and 2.5.3 because the visible text starts the name.
- The group name, or the cycle-button name ("Language: English (EN). Switch to Spanish"), is in the active language, from `LANG_UI`.
- It uses inline `THEME` styles and the 44 px targets the e2e checks.

**Placements:**
- `SquatHeader`: wide segmented, compact cycle. The **360 px risk stands**: estimated ~287 px of 328 px usable before the toggle, ~339 px after. The ladder from my first spec is unchanged (tighten compact gaps; else drop "/ Squat" in compact). It is a Gate-2 item, and the 360 px ES e2e test decides.
- Desktop `views/SettingsView.jsx`: a "Language" section above `StravaConnectPanel` (`:58`).
- `AuthGate.jsx` Login (`:19-…`): a cycle variant at the top of the card, reachable before sign-in.
- Mobile: in the new Settings screen (§11).

**Login strings and errors:**
- "Sign in to continue", labels, the button, and the validation "Enter email and password." (`AuthGate.jsx:30`) all become macros.
- Supabase errors are mapped on `error.code`. `AuthError.code` is verified (Context7 `/supabase/supabase-js`, `auth-js/src/lib/errors.ts` and `error-codes.ts`): `invalid_credentials`, `email_not_confirmed`, `over_request_rate_limit`, `user_banned`, `request_timeout`, and no-code (network).
- **In English, `error.message` is shown exactly as today** (`AuthGate.jsx:40`, byte-identical). In Spanish, a mapped message; for unknown codes, a generic "No pudimos iniciar sesión. Inténtalo de nuevo."
- **There is no sign-up flow in the code.** I grepped `signUp`/"Sign up" and found nothing, so the story's "sign-up" has nothing to translate.
- **Brand tagline "Entrena con cabeza"** (Login, below SPLITIQ; splash on every device, below the wordmark) is a brand line, Spanish for every locale, marked `lang="es"`. PR-1 must not blindly extract it as an English source string. Whether an English locale shows a variant ("Train smart") is PR-1's decision once the switch exists.

### 9. Reviewer artefact

1. **PO files are the canonical translator format** (Poedit-ready).
   - Every non-obvious message gets a translator comment (`msg({ message, comment })` / `<Trans comment="…">`) saying where it appears: "screen reader only", "error state", "button", "live announcement".
   - Use `msgctxt` via `context` where one English string needs two Spanish ones.
   - PO origins show file:line (Context7 `guides/translator-friendly-messages.md`).
2. **`web/scripts/i18n-review-sheet.mjs`** produces `docs/i18n/REVIEW-es-CO.md`, checked in, with `--html` to a path of Scott's choosing for a non-GitHub reviewer.
   - It is side-by-side EN | ES | context | id, covering **both** PO catalogs and the squat prose overlay.
   - A test regenerates it in memory and fails if it is stale.
   - The script parses PO with a minimal reader (`msgctxt`/`msgid`/`msgstr`/`#.`). The Build may use a Lingui formatter API instead **only after verifying it exists in v6 via Context7**.
3. **Corrections:** the reviewer replies with row ids. Claude edits the `msgstr`/overlay at that id, re-runs the sheet, and records "es-CO review: <date>, reviewer" in the PR body (AC). The overlay keeps the `review: { status, reviewedOn, corpusSha }` stamp from my first spec, and a test fails if the corpus changes after sign-off.

### 10. Test plan (one or more per AC)

| AC | Test file | Asserts |
|---|---|---|
| English first visit, no detection | `src/i18n/__tests__/lang.test.js` | No key → `en`, even with `navigator.language='es-CO'`; a garbage value → `en` |
| Persistence and one shared key | same + `LanguageProvider.test.jsx` | Toggling on /squat writes `splitiq.lang`; a dashboard mount reads it |
| Blocked storage | `LanguageProvider.test.jsx` | A throwing `localStorage` (getter and `setItem`) → holds for the visit, no throw, `captureError` **not** called |
| `<html lang>` | same | `en` ↔ `es-CO` without remount; restored on unmount |
| No double announcement | `squat/__tests__/useStrainAnnouncement.test.jsx` (add cases) | Same `key`/`phaseCode` with new text → `live` unchanged |
| /squat never imports supabaseClient | `__tests__/RouteRoot.test.jsx` (existing, untouched) + `src/i18n/__tests__/noSupabase.test.js` | Static scan: no `src/i18n/*` or `src/squat/i18n/*` file imports `supabaseClient` |
| Fallback is English, never ids | `src/i18n/__tests__/fallback.test.jsx` + CI `i18n:check` | With an `es` catalog missing a message, the rendered text equals the English; no rendered text node equals any catalog id |
| Missing Spanish fails | CI `lingui check missing --mode catalog --locale es` + `squat/__tests__/i18n.parity.test.js` (overlay) | Any empty `msgstr` or missing overlay leaf fails |
| English unchanged | every existing test, unedited; Playwright; visual | Pass. The only snapshot change is PR-M's, by design |
| ES honesty scan | `squat/__tests__/content.es.test.js` | The rules from my first spec, run over the squat `es.po` msgstrs + `prose.es.js` |
| Numbers/units identical, decimal point | `content.es.test.js` + `repSummary.es.test.js` | Numeric tokens per message pair are equal; no `\d,\d` |
| Citations/licence untranslated | `content.es.test.js` | Citation segments and `ATTRIBUTION.anatomy/musclePaths` are identical |
| Share links language-free | `squat/__tests__/shareLinks.golden.test.jsx` (add) | Byte-equal URLs in EN and ES |
| tú only (**T-USTED**) | `src/i18n/__tests__/register.test.js` | Over **all** `es` msgstrs (both catalogs) + the overlay: no `ustedes?`, no `vosotros/vuestr*`, no `coger/ordenador/móvil/zumo`, no formal imperative at a cue start (the list from my first spec), no `su(s) <body part>` |
| Dashboard Phase-1 surfaces render ES | `src/i18n/__tests__/dashboard.es.test.jsx` | Login (incl. validation and mapped errors), desktop nav (`App.jsx:349-362`), `BottomTabBar` labels (`constants/destinations.js:15-20` via `msg`), Settings, Strava panel states, shared error/empty/loading states |
| Untranslated views stay whole-English | `dashboard.es.test.jsx` | In ES, an untranslated view (e.g. Overview) renders its English heading and **no** ES string inside it |
| Dates follow language (per phase) | `src/utils/__tests__/displayLocale.test.js` | `dateLocale('en', x) === x` (incl. `undefined`); `dateLocale('es', x) === 'es-CO'` |
| Catalogs not on first paint; product isolation | `scripts/check-bundle-size.mjs` + `scripts/__tests__/entry-graph.test.*` | `firstPaintLeaks` for both ES roots against both boot keys; `SQUAT_ES` files all `squat-*`; `DASH_ES` files all `i18n-*` and not reachable from `SQUAT_ROOT`; `precachedSquat` plus a new `precachedI18n` check that `sw.js` holds no `assets/i18n-` file |
| APK | `.github/workflows/ci-android.yml` (add a step) | `dist/assets/i18n-es-*.js` **present**, `squat-*` absent; the toggle renders in the native shell (RTL test with `Capacitor.isNativePlatform` mocked true) |
| Reviewer record | `content.es.test.js` (sha stamp) + `i18n-review-sheet` freshness test | As in §9 |
| Runtime failure | `LanguageProvider.test.jsx` | A rejected catalog import → English, one `captureError`, status shown, nothing persisted; the initial-load failure renders English with no error boundary |
| 3D/hash unaffected | `squat/__tests__/SquatScene.test.jsx` (add) | A language switch creates no new scene and makes no `setHash` call |
| Width | `e2e/squat.spec.js` (add ES cases at 360/390) and a new `e2e/i18n.spec.js` (login toggle, persist across reload, `html[lang]`, blocked catalog → English) | No horizontal scroll, 44 px targets, axe clean |

### 11. PR-M: mobile Settings (its own deliverable)

**Constraint.** Mobile navigation is fixed at four destinations. `constants/destinations.js:1-20` cites DESIGN_BRIEF §2.2, and `.claude/AGENTS.md:56` routes "the mobile nav cut to four destinations" to IA review. A fifth BottomTabBar item breaks that IA; reject it.

**Entry point (recommended):** a 44 px gear button in the **Today** header, next to the date line (`views/mobile/MobileToday.jsx:144`).
- It navigates to a `settings` route that is **not** a destination.
- `MobileApp.jsx:62-73` gains a branch, `isDestination` is untouched, and `BottomTabBar` stays visible with no active tab.
- The screen has a back control that returns to Today.

Alternatives:
- A gear in every destination header: four views to edit, three of them in open #412 slices (#421/#423 territory), so merge conflicts.
- A shell-level top bar in `MobileApp`: overlays every view and changes all four mobile snapshots.

The Today entry touches one view and one snapshot (`mobile-today-visual-linux.png`), updated in PR-M **as its own approved visual change**.

**v1 hosts:**
- (a) The existing `SettingsView` component, reused as-is, which gives Strava parity with desktop at zero duplication. `SettingsView.jsx:10-62` is thin and self-contained.
- (b) A "Language" slot that PR-1 fills.

Kept minimal on purpose; it is the host for future preferences. Sign-out is not moved in v1. A sign-out control lives in `AuthGate.jsx:191`; whether it belongs in Settings is a later IA call.

**Ordering:** PR-M can land before or alongside PR-1. If it lands first, PR-1 adds the toggle there. If not, PR-1 ships web and desktop placements, and the mobile toggle follows in PR-M.

### 12. PR sequence

1. **PR-M: mobile Settings screen.** Independent; one approved snapshot update.
2. **PR-1: Lingui foundation and dashboard Phase 1.**
   - The spike commit first (§1).
   - Config, plugin and CI `i18n:check`; `src/i18n/*`; LanguageToggle; RouteRoot offline message.
   - Dashboard surfaces: nav, tab bar, login with errors, Settings, Strava with `stravaStatus`, shared states.
   - The `i18n-` chunk rule plus Workbox; the `DASH_ES` line.
   - **Dashboard ENTRY raise** (measured + ~2).
   - The test shim; T-USTED.
   - **Why first:** it proves the toolchain on the surface with the most test coupling (~970 text queries) and the smallest copy.
3. **PR-2: /squat chrome on Lingui.**
   - Squat catalog; provider in SquatApp; header toggle with the 360 px ladder; phaseCode/direction fixes; the `SQUAT_ES` line.
   - **Squat ENTRY raise.**
   - The overlay mechanism with the short constants: phases, regions, bands, share, the 118 names, synonyms, summary words.
4. **PR-3: /squat prose.**
   - Guide, form check, metrics, method, references labels, and the 118 roles in the overlay.
   - The review sheet; the honesty scan at full coverage.
   - Pure data, about 85% of the words.
5. **Phase 2+: one PR per #412 slice** (#419–#423), each translating its view after its slice lands, with its own `{name}` catalog and its date sites (§7).

Each of PR-1 to PR-3 gets a native-speaker review on its Vercel preview before merge, recorded in the PR body. **Optional later:** the RealtimeClient/storage reclaim (≈ 20–26 KB, estimate) as its own PR.

### 13. Files

**Create:**
- `web/lingui.config.js`
- `web/src/locales/{en,es}.po`
- `web/src/squat/locales/{en,es}.po`
- `web/src/i18n/{lang.js, locale.js, dashboard.js, LanguageProvider.jsx}`
- `web/src/squat/i18n/{setup.js, prose.en.js (re-export assembler only), prose.es.js}`
- `web/src/squat/utils/{localise.js, fill.js}`
- `web/src/squat/hooks/useSquatProse.js`
- `web/src/components/LanguageToggle.jsx`
- `web/src/utils/displayLocale.js`
- `web/src/test/rtl.js`
- `web/scripts/i18n-review-sheet.mjs` and `docs/i18n/REVIEW-es-CO.md`
- `web/scripts/i18nChunks.mjs` (or extend `squatChunks.mjs`)
- `web/src/views/mobile/MobileSettings.jsx` (PR-M)
- The tests named in §10

**Modify:**
- `web/package.json`: deps, `engines`, the `i18n:*` scripts.
- `web/vite.config.js`: plugin, test alias, chunk rule, Workbox `globIgnores`/route.
- `web/src/test-setup.js`: English bootstrap, activate/reset.
- `web/scripts/check-bundle-size.mjs`: `DASH_ES`/`SQUAT_ES` lines and leak checks; the ENTRY raise in PR-1 and the SQUAT_ENTRY raise in PR-2, each with a dated comment.
- `web/scripts/entry-graph.mjs`: `precachedI18n`.
- `.github/workflows/ci-web.yml`: `i18n:check`.
- `.github/workflows/ci-android.yml`: assert the ES catalog is present.
- `web/src/RouteRoot.jsx`: offline message only.
- `web/src/AuthGate.jsx`: provider, Login strings, error map, toggle.
- `web/src/App.jsx:349-362`: tab labels.
- `web/src/constants/destinations.js`: labels via `msg`; ids untouched.
- `components/mobile/BottomTabBar.jsx`
- `views/SettingsView.jsx`
- `components/StravaConnectPanel.jsx`
- `utils/stravaStatus.js`
- The shared error/empty/loading components (the Build inventories them)
- `views/mobile/MobileApp.jsx` and `MobileToday.jsx` (PR-M)
- In PR-2 and PR-3: the squat components, `SquatApp.jsx`, `repSummary.js`, `muscleIndex.js`, `StrainPanel.jsx`, as in my first spec

**Not touched:**
- `squat-manifest.json` and `.bin`.
- Every existing `src/squat/constants/*.js`; English stays byte-identical.
- `src/anatomy/**` (no text).
- `supabaseClient.js`, `main.jsx`, `index.html` (`lang="en"` stays the dashboard default).
- `StrengthLogger.jsx:167`.
- Untranslated #412 views and their date sites until their phase.
- User data strings: session labels and notes, exercise names, status/type enums, duration parsing.
- `NOTICE.md`/licences, Sentry messages, the APK's Android system strings.

### 14. Risks
1. **The spike could fail on v6.** Context7 indexes v5.9.5 docs against an npm-current 6.12.0. If `macroTransform` misbehaves on Vite 8 plus Vitest, the fallback is `@rolldown/plugin-babel` with `@lingui/babel-plugin-lingui-macro`, which the Build must verify against the plugin-react 6 README before using.
2. **Static `en` catalogs pull view strings into the entry** in Phase 2 unless each translated view gets its own catalog (§2).
3. **360 px /squat header.** Gate-2 ladder.
4. **The RTL alias shim** has to reproduce auto-cleanup exactly, or tests leak DOM. The spike covers it.
5. **Two mechanisms on /squat** (Lingui chrome plus the prose overlay) mean two parity paths. The shared review sheet and T-USTED/honesty tests span both.
6. **Workbox:** if the `i18n-` naming rule misses, English installs precache Spanish. `precachedI18n` fails the build instead.
7. **Supabase error codes** are not exhaustive; unknown codes get a generic Spanish line and keep the raw message in English.

### 15. What I think is wrong or under-specified in the story
- **"Dates follow the language" conflicts with "no mixed sentences" for #412-pending views.** The four Mobile*.jsx sites and StrengthLogger sit inside views not translated in Phase 1. Convert them per phase, as specced.
- **The StrengthLogger date and number sites use `undefined` (the browser's locale), not `en-GB`.** "English identical to today" means keeping `undefined` for English.
- **There is no sign-up flow** to translate.
- **"English users never download Spanish catalogs" needs the Workbox rule in §2.** Vite's default precache would break it for the dashboard catalog. The APK deliberately *does* carry the dashboard ES catalog so Spanish works offline on Android; that is correct for a native install, but it is a download every APK user pays (~2–3 KB in Phase 1, estimate).
- **"Existing tests pass unedited" holds for /squat prose only because of the hybrid.** A pure-Lingui /squat would force edits to `content.test.js`, `repSummary.test.js` and `RichText` tests.
- **The register rule is folded in:** tú only, never usted, is a hard rule enforced by T-USTED over every Spanish string in the repo.

