// The public squat tool lives at /squat. The path helpers are kept here,
// outside src/squat/, because RouteRoot reads them at first paint and must not
// pull any of the tool's own chunk in to do so. The hash grammar is the tool's
// alone, so it lives with the tool (squat/utils/squatHash.js) and costs the
// dashboard's first paint nothing.

export const isSquatPath = (pathname) =>
  pathname === '/squat' || pathname === '/squat/';

// /squat/ is served (vercel.json rewrites its relative asset URLs back to
// /assets/), then swapped for /squat in place before the window's load event,
// so the service worker registers at the root scope and the URL a visitor
// copies is the canonical one. A replaceState, not a redirect: a redirect rule
// on the host risked a self-loop. Returns null when there is nothing to change.
export function canonicalSquatUrl({ pathname, search = '', hash = '' }) {
  return pathname === '/squat/' ? `/squat${search}${hash}` : null;
}
