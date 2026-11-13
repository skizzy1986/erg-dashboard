import { BRAND_LINE } from '../constants/brandLine.js';

// Callers pass the locale in; until i18n PR-1 lands that is the page's own
// `lang`, a stand-in for the real locale source.
export function brandLine(locale) {
  return /^es(-|$)/i.test(String(locale ?? '')) ? BRAND_LINE.es : BRAND_LINE.en;
}
