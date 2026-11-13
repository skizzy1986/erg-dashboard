// The one decision about which locale a displayed date or number uses. Each
// call site passes the locale it uses TODAY (including `undefined`, the
// browser's own), so English output stays byte-identical; Spanish is es-CO.
// Sites convert in the PR that translates their view — a Spanish date inside
// an English view would be a mixed sentence. Stored formats never change.
export const dateLocale = (lang, enLocale) =>
  lang === 'es' ? 'es-CO' : enLocale;
