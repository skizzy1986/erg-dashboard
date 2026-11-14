import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

// Two catalogs, one per product, so a dashboard visitor never downloads /squat's
// words and the reverse. The squat catalog is defined now and filled in PR-2.
export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'es'],
  fallbackLocales: { default: 'en' },
  // File origins stay for the translator; line numbers go, or any edit above
  // a message would make the catalog stale and fail `lingui check sync` in CI.
  format: formatter({ lineNumbers: false }),
  catalogs: [
    {
      path: '<rootDir>/src/squat/locales/{locale}',
      include: ['<rootDir>/src/squat', '<rootDir>/src/anatomy'],
    },
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['<rootDir>/src'],
      exclude: [
        '<rootDir>/src/squat/**',
        '<rootDir>/src/anatomy/**',
        '**/__tests__/**',
        '**/*.test.*',
      ],
    },
  ],
});
