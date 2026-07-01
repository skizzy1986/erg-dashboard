import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Upload source maps to Sentry only on release builds that carry an auth token
// (CI). Without the token the plugin is omitted and local builds are untouched.
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
  plugins: [
    react(),
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
        name: 'Erg Dashboard',
        short_name: 'ErgDash',
        description: 'Personal rowing and strength coaching dashboard',
        theme_color: '#08080d',
        background_color: '#08080d',
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
          }),
        ]
      : []),
  ],
  base: './',
  // 'hidden' emits source maps for Sentry upload without referencing them from
  // the shipped bundles, so production source stays out of the browser.
  build: { sourcemap: uploadSourceMaps ? 'hidden' : false },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    // Playwright E2E specs live in e2e/ and must not be collected by Vitest.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      // Make scope explicit. Without `include` + `all`, v8 only counts files a
      // test happens to import, so the untested monolith is invisible and the
      // gate passes by accident. `all: true` counts every in-scope src file.
      all: true,
      include: ['src/**'],
      // Excluded from the coverage denominator (documented why each is here):
      //  - erg-dashboard.jsx: the not-yet-decomposed monolith (#52). Each
      //    extraction PR removes the file(s) it extracts from this list in the
      //    same PR, so a file cannot leave `exclude` without hitting threshold.
      //  - StrengthLogger.jsx: large untested component, extraction tracked (#79).
      //  - main.jsx: auth/bootstrap entry point, not unit-testable in jsdom.
      //  - constants/**: pure data tables — no logic to cover; counting them
      //    only distorts the denominator.
      //  - test-setup.js: the test harness itself.
      exclude: [
        'src/erg-dashboard.jsx',
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
        lines: 48,
        functions: 46,
        branches: 40,
        // Commercial-baseline gate (80/80/70) for new/extracted code, applied
        // per-file as it lands. The global floor above ratchets toward this as
        // the monolith is decomposed and its exclusions fall away.
        'src/utils/sentry.js': { lines: 80, functions: 80, branches: 70 },
        'src/components/ErrorFallback.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
        'src/views/StrengthView.jsx': {
          lines: 80,
          functions: 80,
          branches: 70,
        },
      },
    },
  },
});
