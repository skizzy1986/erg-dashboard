export function wattsToPace500(watts) {
  return 500 * (2.8 / watts) ** (1 / 3);
}

export function pace500ToWatts(secs) {
  return 2.8 / (secs / 500) ** 3;
}

export function formatPace(secs) {
  if (secs == null || secs === 0 || Number.isNaN(secs)) return '—';
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

export function classifyZone(watts, cp) {
  if (watts == null) return null;
  if (!Number.isFinite(cp) || cp <= 0) return null;
  const pct = watts / cp;
  if (pct < 0.55) return 'Recovery';
  if (pct < 0.7) return 'UT2';
  if (pct < 0.8) return 'UT1';
  if (pct < 0.9) return 'AT';
  if (pct < 1.05) return 'TR';
  return 'AN';
}
