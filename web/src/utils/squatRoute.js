// The public squat tool lives at /squat. Path and deep-link helpers are kept
// here, outside src/squat/, because RouteRoot reads them at first paint and
// must not pull any of the tool's own chunk in to do so.

export const isSquatPath = (pathname) =>
  pathname === '/squat' || pathname === '/squat/';

export const GUIDE_PANE_IDS = [
  'phases',
  'metrics',
  'measured',
  'method',
  'sources',
];
export const GRAPH_TAB_IDS = ['angles', 'moments', 'force', 'act', 'len'];

// Deep-link state rides in the hash so the Vercel catch-all rewrite never has
// to know about it: #guide=metrics&t=1.60&tab=moments&paused. Unknown keys and
// malformed values are dropped rather than trusted.
export function parseSquatHash(hash) {
  const out = { guide: null, t: null, tab: null, paused: false };
  const body = (hash || '').replace(/^#/, '');
  if (!body) return out;
  for (const part of body.split('&')) {
    const eq = part.indexOf('=');
    const key = eq === -1 ? part : part.slice(0, eq);
    const raw = eq === -1 ? '' : part.slice(eq + 1);
    let value;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // A malformed escape is a hand-edited URL, not an error worth reporting.
      continue;
    }
    if (key === 'guide' && GUIDE_PANE_IDS.includes(value)) out.guide = value;
    else if (key === 'tab' && GRAPH_TAB_IDS.includes(value)) out.tab = value;
    else if (key === 't' && /^\d+(\.\d+)?$/.test(value)) out.t = Number(value);
    else if (key === 'paused') out.paused = true;
  }
  return out;
}

export function formatSquatHash({ guide, t, tab, paused } = {}) {
  const parts = [];
  if (guide && GUIDE_PANE_IDS.includes(guide)) parts.push(`guide=${guide}`);
  if (typeof t === 'number' && Number.isFinite(t) && t >= 0) {
    parts.push(`t=${t.toFixed(2)}`);
  }
  if (tab && GRAPH_TAB_IDS.includes(tab)) parts.push(`tab=${tab}`);
  if (paused) parts.push('paused');
  return parts.length ? `#${parts.join('&')}` : '';
}
