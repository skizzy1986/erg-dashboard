import { i18n } from '@lingui/core';
import { messages as en } from '../locales/en.po';
import { registerCatalogs } from './locale.js';

// The dashboard's English is a static import: production builds strip the
// source text out of every message descriptor (id-only), so without this
// catalog loaded nothing could render. Synchronous, no fetch, so it is safe at
// module scope. Spanish is a separate chunk (i18n-es-*), fetched only by a
// visitor who chose it.
i18n.load('en', en);
if (!i18n.locale) i18n.activate('en');

registerCatalogs('dashboard', {
  source: en,
  loaders: { es: () => import('../locales/es.po') },
});
