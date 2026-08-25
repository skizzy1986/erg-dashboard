import { C } from '../constants/ui.js';
import { THEME } from '../constants/theme.js';

// Normalize incoming session `type` to the canonical taxonomy the colour/icon
// maps use. Coach CSV uses "erg"/"strength"; the log form writes "Strength";
// seed + program data already use canonical names. Keeps every source coloured.
export const normType = (t, label = '') => {
  if (C[t]) return t; // already canonical
  const lt = (t || '').toLowerCase();
  const ll = (label || '').toLowerCase();
  if (lt === 'erg') return 'Z2 Aerobic';
  if (lt === 'strength') {
    if (/upper/.test(ll)) return 'Upper Strength';
    if (/lower/.test(ll)) return 'Lower Strength';
    return 'Combined';
  }
  if (lt === 'cycling' || lt === 'bike' || lt === 'ride') return 'Cycling';
  if (lt === 'mobility' || lt === 'rest') return 'Rest';
  return t; // unknown -> grey fallback
};

export function workoutAccent(txt) {
  if (!txt) return THEME.neutral;
  const t = txt.toLowerCase();
  if (t.includes('lower')) return THEME.positive;
  if (t.includes('upper')) return THEME.accentAlt;
  if (t.includes('rate ladder') || t.includes('threshold'))
    return THEME.caution;
  if (t.includes('interval') || t.includes('vo')) return THEME.warning;
  if (t.includes('yoga') || t.includes('foam') || t.includes('rest'))
    return THEME.neutral;
  return THEME.accent; // erg aerobic default
}

export function assessMacro(val, range) {
  if (typeof val !== 'number' || !Array.isArray(range) || range.length < 2)
    return '—';
  if (val >= range[0] && val <= range[1]) return '✅';
  if (val < range[0]) return val >= range[0] * 0.9 ? '⚠️' : '❌';
  return val <= range[1] * 1.15 ? '⚠️' : '❌';
}

export function macroColor(status) {
  return status === '✅'
    ? THEME.positive
    : status === '⚠️'
      ? THEME.caution
      : THEME.critical;
}

// AU/most guidelines: treated target generally < 130–135 systolic, < 80 diastolic.
// Confirm YOUR target with your GP — this is generic reference only.
export function bpCategory(sys, dia) {
  // Validation: flag implausible readings rather than rendering garbage as a category.
  if (
    typeof sys !== 'number' ||
    typeof dia !== 'number' ||
    sys < 60 ||
    sys > 260 ||
    dia < 30 ||
    dia > 160 ||
    dia >= sys
  ) {
    return { label: 'Check reading', color: THEME.neutralAccent };
  }
  if (sys < 120 && dia < 80) return { label: 'Optimal', color: THEME.positive };
  if (sys < 130 && dia < 80) return { label: 'Normal', color: THEME.positive };
  if (sys < 140 || dia < 90)
    return { label: 'High-normal', color: THEME.caution };
  return { label: 'Elevated — note for GP', color: THEME.warning };
}
