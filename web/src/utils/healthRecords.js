// Pure shaping for the health-record cards. No React, no Supabase.
import { msg } from '@lingui/core/macro';

// One blood draw per collected_on date, newest first; markers by name so a
// panel reads the same way every time. Each marker row is kept whole, so a
// reference range never travels without its ref_source.
export function groupLabDraws(rows, panel) {
  const byDate = new Map();
  for (const r of rows ?? []) {
    if (r.panel !== panel) continue;
    if (!byDate.has(r.collected_on)) byDate.set(r.collected_on, []);
    byDate.get(r.collected_on).push(r);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([collectedOn, markers]) => ({
      collectedOn,
      markers: markers.slice().sort((a, b) => a.marker.localeCompare(b.marker)),
    }));
}

// "<0.5 nmol/L": a lab reports below-detection results with a qualifier, and
// dropping it would present a ceiling as a measurement.
export function formatLabValue(row) {
  const unit = row.unit ? ` ${row.unit}` : '';
  return `${row.value_qualifier ?? ''}${row.value}${unit}`;
}

// The word before a reference range, for a view to translate and pass in.
export const LAB_REF_MESSAGE = msg({
  message: 'ref',
  comment: 'Short for "reference range" before a lab range, e.g. "ref 0.5–1.0"',
});

// What a lab marker's name says on screen, keyed by the stored English name
// (LIPID_REF's `marker` in constants/logs.js, and lab_results.marker). The
// stored and constant values stay English; a name not listed here is data the
// map has not met and shows as stored. Pinned against LIPID_REF in
// src/i18n/__tests__/descriptors.test.js. Kept out of constants/logs.js, which
// stays plain data with no macro import.
export const LAB_MARKER_MESSAGES = {
  'Total Cholesterol': msg({
    message: 'Total Cholesterol',
    comment: 'Blood lipid marker',
  }),
  'LDL Cholesterol': msg({
    message: 'LDL Cholesterol',
    comment: 'Blood lipid marker',
  }),
  'HDL Cholesterol (male)': msg({
    message: 'HDL Cholesterol (male)',
    comment: 'Blood lipid marker; decision limit for men',
  }),
  'HDL Cholesterol (female)': msg({
    message: 'HDL Cholesterol (female)',
    comment: 'Blood lipid marker; decision limit for women',
  }),
  Triglycerides: msg({
    message: 'Triglycerides',
    comment: 'Blood lipid marker',
  }),
};

export function labMarkerText(i18n, marker) {
  const m = Object.hasOwn(LAB_MARKER_MESSAGES, marker)
    ? LAB_MARKER_MESSAGES[marker]
    : null;
  return m ? i18n._(m) : marker;
}

// Only a sourced range is shown; the DB CHECK refuses an unsourced one.
export function formatLabRange(row, refWord = 'ref') {
  const hasLow = row.ref_low != null;
  const hasHigh = row.ref_high != null;
  if ((!hasLow && !hasHigh) || !row.ref_source) return null;
  const range =
    hasLow && hasHigh
      ? `${row.ref_low}–${row.ref_high}`
      : hasLow
        ? `≥${row.ref_low}`
        : `≤${row.ref_high}`;
  return `${refWord} ${range} (${row.ref_source})`;
}

const INJURY_RANK = { active: 0, monitoring: 1, resolved: 2 };

// Active and monitoring first, then resolved; the hook's onset order is kept
// within each group (Array.prototype.sort is stable).
export function orderInjuries(rows) {
  return (rows ?? [])
    .slice()
    .sort(
      (a, b) => (INJURY_RANK[a.status] ?? 1) - (INJURY_RANK[b.status] ?? 1)
    );
}
