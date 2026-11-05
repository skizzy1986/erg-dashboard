// Pure helpers over `coach_log` rows ({ id, date, entry_type, body, tags,
// supersedes, created_at }). The table is append-only: a reversal is a new row
// whose `supersedes` points at the old one, so "is this still live" is derived.

// Headline is everything before the first blank line; without one, the first
// line. Migrated decisions are written as "<decision>\n\n<why>".
export function splitBody(body) {
  if (typeof body !== 'string') return { headline: '', detail: '' };
  const text = body.trim();
  const blank = text.match(/\n[ \t]*\n/);
  if (blank) {
    return {
      headline: text.slice(0, blank.index).trim(),
      detail: text.slice(blank.index + blank[0].length).trim(),
    };
  }
  const nl = text.indexOf('\n');
  if (nl === -1) return { headline: text, detail: '' };
  return {
    headline: text.slice(0, nl).trim(),
    detail: text.slice(nl + 1).trim(),
  };
}

export function supersededIds(rows) {
  const ids = new Set();
  for (const r of rows ?? []) if (r?.supersedes != null) ids.add(r.supersedes);
  return ids;
}

const tagsOf = (r) => (Array.isArray(r?.tags) ? r.tags : []);

export function toDecisions(rows) {
  const dead = supersededIds(rows);
  return (rows ?? [])
    .filter((r) => r?.entry_type === 'decision')
    .map((r) => {
      const { headline, detail } = splitBody(r.body);
      return {
        id: r.id,
        date: r.date,
        headline,
        detail,
        tags: tagsOf(r),
        superseded: dead.has(r.id),
      };
    });
}

// Only the live end of each supersede chain: a hypothesis whose status moved
// is a new row superseding the old, so the newest row carries the status.
export function toHypotheses(rows) {
  const dead = supersededIds(rows);
  return (rows ?? [])
    .filter(
      (r) =>
        r?.entry_type === 'observation' &&
        tagsOf(r).includes('hypothesis') &&
        !dead.has(r.id)
    )
    .map((r) => {
      const { headline, detail } = splitBody(r.body);
      const statusTag = tagsOf(r).find(
        (t) => typeof t === 'string' && t.startsWith('status:')
      );
      return {
        id: r.id,
        date: r.date,
        statement: headline,
        status: statusTag
          ? statusTag.slice('status:'.length) || 'open'
          : 'open',
        evidence: detail,
      };
    });
}
