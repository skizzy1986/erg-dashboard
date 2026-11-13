import { msg } from '@lingui/core/macro';
import { toISODate } from './dateFormat.js';
import { parseDurationMinutes } from './duration.js';

// Which calibration anchor a session's watts should be measured against.
// Rowing watts against rowing CP, bike watts against bike FTP — comparing bike
// power to CP would overstate every ride. Anything else (strength, mobility)
// has no power model at all.
function thresholdFor(type, cp, ftp) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('erg') || t.includes('row')) return cp;
  if (t.includes('bike') || t.includes('cycl') || t.includes('ride'))
    return ftp;
  return null;
}

// Load for one session, in classic TSS units: an hour at threshold reads 100,
// and so does an hour at sRPE 10.
//
// sRPE wins whenever it exists. When it does not — every Strava-backfilled
// session, because sRPE is subjective and was never captured after the fact —
// fall back to power: intensity factor (avg watts / threshold), squared and
// scaled by 100, which is exactly the standard TrainingPeaks TSS formula.
// Without this fallback those sessions contribute nothing and the CTL/ATL/TSB
// curve coasts on whatever was last rated by hand.
//
// The unit matters as much as the formula. Every threshold downstream — the
// TSB_BANDS table below (read by every surface that bands TSB) and
// calcReadiness's `tsb < -20` deduction — was calibrated for
// classic TSS. An earlier sRPE-hours unit (an hour at sRPE 7 → 7) left every
// one of those bands ~10x too wide, which pinned TSB mid-range and meant the
// fatigue deduction could never fire. Do not rescale one side without the other.
//
// Known offset, deliberately NOT calibrated away: power-derived load can read
// below the sRPE figure for the same session. An RPE that is high for the
// watts is a fatigue signal, not a unit error, and tuning a factor to close the
// gap would erase that signal rather than measure it.
export function sessionLoad(session, { cp, ftp } = {}) {
  const minutes = parseDurationMinutes(session?.duration);
  if (!(minutes > 0)) return 0;
  const hours = minutes / 60;

  if (session.srpe > 0) return Math.round(hours * session.srpe * 10);

  const threshold = thresholdFor(session.type, cp, ftp);
  const watts = session.avg_watts;
  // A missing anchor degrades to zero rather than a hardcoded default: useAnchors
  // returns null when it cannot resolve one, and inventing a threshold here would
  // silently rewrite history the next time CP is revalidated.
  if (!(threshold > 0) || !(watts > 0)) return 0;

  const intensity = watts / threshold;
  return Math.round(hours * intensity * intensity * 100);
}

export function calcTrainingLoad(tssData, endDate) {
  const CTL_K = Math.exp(-1 / 42);
  const ATL_K = Math.exp(-1 / 7);
  const tssMap = {};
  tssData.forEach((d) => {
    const key = toISODate(d.date);
    const existing = tssMap[key];
    if (existing) {
      tssMap[key] = {
        tss: existing.tss + d.tss,
        note: d.note
          ? existing.note
            ? `${existing.note}; ${d.note}`
            : d.note
          : existing.note,
      };
    } else {
      tssMap[key] = { tss: d.tss, note: d.note };
    }
  });

  const isoDates = tssData.map((d) => toISODate(d.date));
  const minIso = isoDates.reduce(
    (min, iso) => (iso < min ? iso : min),
    isoDates[0]
  );
  const maxIso = isoDates.reduce(
    (max, iso) => (iso > max ? iso : max),
    isoDates[0]
  );
  const start = new Date(minIso);
  const today = new Date().toISOString().split('T')[0];
  const resolvedEnd = endDate ?? (maxIso > today ? maxIso : today);
  const end = new Date(resolvedEnd);
  const results = [];
  let ctl = 0,
    atl = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    const day = tssMap[key];
    const tss = day ? day.tss : 0;
    ctl = ctl * CTL_K + tss * (1 - CTL_K);
    atl = atl * ATL_K + tss * (1 - ATL_K);
    results.push({
      date: key.slice(5).replace('-', '/'),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
      tss,
      note: day ? day.note : '',
    });
  }
  return results;
}

// The TSB bands, in one place. These thresholds were inlined at five call
// sites and had already drifted onto different schemes, so the same TSB
// read one band on one screen and another elsewhere. HANDOFF.md §5 calls
// that the same defect as computing the number two different ways.
//
// `token` is a THEME key, not a colour — this module is pure maths and does
// not import the palette. Callers do THEME[band.token].
export const TSB_BANDS = [
  {
    key: 'fresh',
    floor: 10,
    label: 'Fresh — good form',
    token: 'positive',
  },
  {
    key: 'neutral',
    floor: -10,
    label: 'Neutral — balanced',
    token: 'caution',
  },
  {
    key: 'fatigued',
    floor: -30,
    label: 'Fatigued — recent load above fitness',
    token: 'warning',
  },
  {
    key: 'deep',
    floor: -Infinity,
    label: 'High fatigue — recent load well above fitness',
    token: 'critical',
  },
];

// What each band says on screen. TSB_BANDS keeps its English `label` (tests
// and callers read it as a string); a view renders i18n._(TSB_BAND_MESSAGES[
// band.key]) instead, and descriptors.test.js pins the two together.
export const TSB_BAND_MESSAGES = {
  fresh: msg({
    message: 'Fresh — good form',
    comment: 'Training form (TSB) band',
  }),
  neutral: msg({
    message: 'Neutral — balanced',
    comment: 'Training form (TSB) band',
  }),
  fatigued: msg({
    message: 'Fatigued — recent load above fitness',
    comment: 'Training form (TSB) band',
  }),
  deep: msg({
    message: 'High fatigue — recent load well above fitness',
    comment: 'Training form (TSB) band',
  }),
};

// Returns null for a missing reading — "no band" is a real state and must not
// render as the worst one.
export function tsbBand(tsb) {
  if (tsb == null || !Number.isFinite(tsb)) return null;
  return (
    TSB_BANDS.find((b) => tsb > b.floor) ?? TSB_BANDS[TSB_BANDS.length - 1]
  );
}
