import { i18n } from '@lingui/core';
import { messages as en } from '../locales/views/en.po';
import { registerCatalogs } from './locale.js';

// The settled dashboard views' words (i18n Phase 2a), a catalog of their own so
// they ride in the lazy shells' chunk and not on first paint: App.jsx and
// MobileApp.jsx import this module, AuthGate never does. English loads here,
// synchronously, before any view renders. Spanish is a separate i18n-es-*
// chunk; a visitor already in Spanish is held by LanguageProvider until it
// arrives, because registering it below re-renders the provider.
i18n.load('en', en);

registerCatalogs('dashboard', {
  name: 'views',
  source: en,
  loaders: { es: () => import('../locales/views/es.po') },
});
