import { beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { i18n } from '@lingui/core';
import { messages as en } from './locales/en.po';
import { messages as viewsEn } from './locales/views/en.po';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// The dashboard's English (both catalogs), loaded the way src/i18n/dashboard.js
// and src/i18n/views.js load it, so a
// component or util that renders a message works without its product's boot
// module. Not dashboard.js itself: that reaches utils/sentry.js, and a module
// a setup file imports is evaluated before a test file's vi.mock() of it
// registers — sentry.test.js mocks @sentry/react and would get the real one.
i18n.load('en', { ...en, ...viewsEn });

// @lingui/core lives in node_modules, so its `i18n` outlives a test file. Every
// test starts in English, so a Spanish test cannot leak its locale into the
// next one's English assertions. The previous tree is already unmounted by
// RTL's cleanup, so activating here re-renders nothing.
beforeEach(() => {
  if (i18n.locale !== 'en') i18n.activate('en');
});
