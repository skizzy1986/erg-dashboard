// Pure shaping for the health-record cards. No React, no Supabase.

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

// Only a sourced range is shown; the DB CHECK refuses an unsourced one.
export function formatLabRange(row) {
  const hasLow = row.ref_low != null;
  const hasHigh = row.ref_high != null;
  if ((!hasLow && !hasHigh) || !row.ref_source) return null;
  const range =
    hasLow && hasHigh
      ? `${row.ref_low}–${row.ref_high}`
      : hasLow
        ? `≥${row.ref_low}`
        : `≤${row.ref_high}`;
  return `ref ${range} (${row.ref_source})`;
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
