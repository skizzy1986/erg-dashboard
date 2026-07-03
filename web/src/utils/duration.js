// Parses the free-text `sessions.duration` column into minutes.
// Real formats seen in production: "45:00" (mm:ss), "57m"/"9min"/"60min"
// (minutes with suffix), "1h4m"/"2h00m" (hours+minutes), bare numeric
// strings like "45", and already-numeric values from callers/tests that
// pass a JS number directly. Never throws — unparseable input degrades to 0.
export function parseDurationMinutes(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const s = String(value).trim().toLowerCase();
  if (!s) return 0;

  // mm:ss — "45:00", "60:00"
  let m = s.match(/^(\d+):(\d{2})$/);
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;

  // hours + optional minutes — "1h4m", "2h00m", "1h"
  m = s.match(/^(\d+)h(\d+)?m?$/);
  if (m) return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);

  // minutes with suffix — "57m", "9min", "60min"
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|min)$/);
  if (m) return parseFloat(m[1]);

  // bare numeric string — "45"
  if (/^\d+(?:\.\d+)?$/.test(s)) return parseFloat(s);

  return 0;
}
