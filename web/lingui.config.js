import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

// The dashboard's settled views (i18n Phase 2a). Their words live in a second
// dashboard catalog, loaded by the lazy shells (App.jsx, MobileApp.jsx) through
// src/i18n/views.js, so none of them sit on first paint. Every other dashboard
// file stays in the boot catalog, which AuthGate imports statically. A file is
// in exactly one of the two: listed here, or not.
export const VIEWS_SOURCES = [
  'src/views/OverviewView.jsx',
  'src/views/CalendarView.jsx',
  'src/views/PlanView.jsx',
  'src/views/LogView.jsx',
  'src/views/RecoveryView.jsx',
  'src/components/LogEntry.jsx',
  'src/components/LogSessionForm.jsx',
  'src/components/WorkoutItem.jsx',
  'src/components/LoadTooltip.jsx',
  'src/components/HealthRecordCard.jsx',
  'src/views/mobile/MobileToday.jsx',
  'src/views/mobile/MobileTrain.jsx',
  'src/views/mobile/MobileProgress.jsx',
  'src/views/mobile/MobileAnalytics.jsx',
  'src/views/mobile/MobileSessionLog.jsx',
  'src/views/mobile/MobileRecovery.jsx',
  'src/utils/trainingLoad.js',
  'src/utils/recoveryAnalytics.js',
  'src/utils/healthRecords.js',
  'src/constants/srpeGuideMessages.js',
];

const rooted = (f) => `<rootDir>/${f}`;

// One catalog per product (and the dashboard split in two, above), so a
// dashboard visitor never downloads /squat's words and the reverse.
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
      path: '<rootDir>/src/locales/views/{locale}',
      include: VIEWS_SOURCES.map(rooted),
    },
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['<rootDir>/src'],
      exclude: [
        '<rootDir>/src/squat/**',
        '<rootDir>/src/anatomy/**',
        '**/__tests__/**',
        '**/*.test.*',
        ...VIEWS_SOURCES.map(rooted),
      ],
    },
  ],
});
