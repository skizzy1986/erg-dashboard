import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { DEFAULT_THEME } from './src/constants/themeValues.js';

// The ground was written down in five places — index.html twice, two PWA
// manifests and the Android launch theme — each with a "keep in sync" comment
// and no way to enforce it (#253). It is now derived from the palette. The
// Android resource cannot be, so a unit test asserts it instead.
const GROUND = DEFAULT_THEME.bg;

const substituteGround = {
  name: 'splitiq-ground',
  transformIndexHtml: (html) => html.replaceAll('%GROUND%', GROUND),
};

// Upload source maps to Sentry only on release builds that carry an auth token
// (the deploy workflow supplies one). Without the token the plugin is omitted
// and local and CI builds are untouched.
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

// The release name must be IDENTICAL on both sides — the string the SDK reports
// at runtime and the string the artifacts are uploaded under. If they diverge,
// Sentry silently serves minified frames instead of failing loudly. Reading the
// one env var on both sides is what keeps them identical. Vite only exposes
// VITE_*-prefixed vars to client code, so it is injected via `define` below.
//
// The deploy workflow sets it to splitiq@<commit sha>. It used to be derived
// here from VERCEL_GIT_COMMIT_SHA; nothing outside Vercel sets that, so the
// value is now passed in explicitly by whatever is doing the building.
const sentryRelease = process.env.VITE_SENTRY_RELEASE || undefined;

// `vite build` sets MODE=production for every build, preview deploys included,
// so MODE alone cannot tell a preview from production and preview errors would
// file under `production`. Same injection route as the release: read here,
// passed through `define`, because Vite only exposes VITE_*-prefixed vars to
// the client. Unset locally and in CI, where MODE is the right answer.
const sentryEnvironment = process.env.VITE_SENTRY_ENVIRONMENT || undefined;

// The org is EU-region. @sentry/vite-plugin defaults to sentry.io and will not
// find splitiq-29 without this.
const sentryUrl = process.env.SENTRY_URL || 'https://de.sentry.io';

// Each key is present only when its value exists. `define` is a literal text
// substitution that also applies under Vitest, where a defined key would defeat
// the vi.stubEnv() the sentry tests rely on.
const sentryDefine = {
  ...(sentryRelease
    ? { 'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease) }
    : {}),
  ...(sentryEnvironment
    ? {
        'import.meta.env.VITE_SENTRY_ENVIRONMENT':
          JSON.stringify(sentryEnvironment),
      }
    : {}),
};

export default defineConfig({
  plugins: [
    react(),
    substituteGround,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /supabase\.co\/rest/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: {
        name: 'SplitIQ',
        short_name: 'SplitIQ',
        description: 'Performance intelligence for serious athletes.',
        theme_color: GROUND,
        background_color: GROUND,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    // Keep last so it sees the final built assets. No-op without an auth token.
    ...(uploadSourceMaps
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            url: sentryUrl,
            ...(sentryRelease ? { release: { name: sentryRelease } } : {}),
          }),
        ]
      : []),
  ],
  base: './',
  // Makes the computed release and environment visible to utils/sentry.js. The
  // release must match what the plugin uploaded under, or Sentry serves
  // minified frames without erroring.
  ...(Object.keys(sentryDefine).length ? { define: sentryDefine } : {}),
  // 'hidden' emits source maps for Sentry upload without referencing them from
  // the shipped bundles, so production source stays out of the browser.
  build: { sourcemap: uploadSourceMaps ? 'hidden' : false },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    // Playwright E2E specs live in e2e/ and must not be collected by Vitest.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    // JUnit XML is the only format Sentry Test Analytics ingests. `default`
    // is kept first so local and CI console output is unchanged.
    reporters: ['default', 'junit'],
    outputFile: { junit: './test-results/junit.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      // Make scope explicit. Without `include` + `all`, v8 only counts files a
      // test happens to import, so the untested monolith is invisible and the
      // gate passes by accident. `all: true` counts every in-scope src file.
      all: true,
      include: ['src/**'],
      // Excluded from the coverage denominator (documented why each is here).
      // The former monolith (now App.jsx) is fully included in coverage; each
      // extraction PR removes the file(s) it extracts from this list in the
      // same PR, so a file cannot leave `exclude` without hitting threshold.
      //  - StrengthLogger.jsx: large untested component, extraction tracked (#79).
      //  - main.jsx: auth/bootstrap entry point, not unit-testable in jsdom.
      //  - constants/**: pure data tables — no logic to cover; counting them
      //    only distorts the denominator.
      //  - test-setup.js: the test harness itself.
      exclude: [
        'src/StrengthLogger.jsx',
        'src/main.jsx',
        'src/constants/**',
        'src/test-setup.js',
      ],
      // Baseline measured 2026-06-29 after making scope explicit (was passing
      // by accident at ~74% because only test-imported files counted). These
      // are the honest starting numbers — RATCHET THEM UP as each extraction
      // PR removes a file from `exclude` and lands its tests. Never lower them.
      //   measured: lines 48.98 / functions 46.81 / branches 40.38
      thresholds: {
        // Global floor — ratcheted up as extractions land tests (measured
        // lines 88.96 / functions 83.21 / branches 80.65 on 2026-08-25, after
        // Phase B's five mobile destinations landed with useHashRoute,
        // MobileToday, MobileApp and tsbBand tests; ~4 points headroom for
        // denominator drift, same margin as the 2026-08-22 ratchet which read
        // lines 84.31 / functions 79.33 / branches 76.31 and set 80/75/72).
        lines: 85,
        functions: 79,
        branches: 76,
        // Commercial-baseline gate (80/80/70) for new/extracted code, applied
        // per-file as it lands. The global floor above ratchets toward this as
        // the monolith is decomposed and its exclusions fall away.
        'src/utils/sentry.js': { lines: 80, functions: 80, branches: 70 },
        'src/utils/queryErrorHandlers.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/utils/eventWindow.js': { lines: 80, functions: 80, branches: 70 },
        'src/utils/benchmarkStatus.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/hooks/useBenchmarkStatuses.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/components/BenchmarkBadge.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/components/BenchmarkLinkControl.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/hooks/useLinkBenchmarkSession.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/utils/dateFormat.js': { lines: 80, functions: 80, branches: 70 },
        'src/utils/invalidateSessionQueries.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/utils/sessionStatus.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/hooks/useSessions.js': { lines: 80, functions: 80, branches: 70 },
        'src/hooks/useCoach.js': { lines: 80, functions: 80, branches: 70 },
        'src/hooks/useTSSHistory.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/hooks/useErgSessions.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/hooks/useBenchmarkSessions.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/components/ErrorFallback.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/components/WorkoutItem.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/components/LoadTooltip.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/components/LogEntry.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/views/StrengthView.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/views/MobilityView.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/views/OverviewView.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/views/CalendarView.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/hooks/useSplashGate.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/hooks/useInitialDataReady.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/hooks/usePrefersReducedMotion.js': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/utils/splashCss.js': { lines: 80, functions: 80, branches: 70 },
        'src/components/mobile/SplashScreen.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        // Extracted from main.jsx so the boot decision is testable. main.jsx
        // itself stays excluded — it is bootstrap only now.
        'src/AuthGate.jsx': { lines: 80, functions: 80, branches: 70 },
      },
    },
  },
});
