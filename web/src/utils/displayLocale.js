// The one decision about which locale a displayed date or number uses. Each
// call site passes the locale it uses TODAY (including `undefined`, the
// browser's own), so English output stays byte-identical; Spanish is es-CO.
// Sites convert in the PR that translates their view — a Spanish date inside
// an English view would be a mixed sentence. Stored formats never change.
export const dateLocale = (lang, enLocale) =>
  lang === 'es' ? 'es-CO' : enLocale;

// sessions.date is stored M/D/YY and shown as stored. A Colombian reader takes
// 6/7/26 as 6 July, so Spanish shows the same date day first (7/6/26). Only the
// display moves; anything that is not a stored M/D/YY date passes through.
export function displayLogDate(lang, value) {
  if (lang !== 'es' || typeof value !== 'string') return value;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(value.trim());
  return m ? `${m[2]}/${m[1]}/${m[3]}` : value;
}

// Chart axes and tooltips label days MM/DD (calcTrainingLoad and the vitals
// trends build them that way, and tests pin those values). Spanish reads
// day first, so the label is flipped at render; the data is untouched.
export function displayChartDate(lang, value) {
  if (lang !== 'es' || typeof value !== 'string') return value;
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(value.trim());
  return m ? `${m[2]}/${m[1]}` : value;
}
