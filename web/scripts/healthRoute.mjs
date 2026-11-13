// Health tables never touch Cache Storage (#417, decision 5). Nothing clears
// the service worker's caches on sign-out, so a cached REST response would sit
// on the device after the session ends.
//
// Two Workbox rules shape this (workbox-routing 7.x, Router.findMatchingRoute
// and RegExpRoute):
//   - routes are tried in registration order and the FIRST match handles the
//     request, so this route must sit before the generic supabase rule;
//   - a RegExp only matches a cross-origin URL when the match starts at index
//     0 of the full href, hence the leading ^https://. Without the anchor the
//     route would silently never fire on the Supabase origin.
export const HEALTH_TABLES = ['bp_readings', 'lab_results', 'injuries'];

export const HEALTH_NETWORK_ONLY_ROUTE = {
  urlPattern:
    /^https:\/\/[^/]+\.supabase\.co\/rest\/v1\/(bp_readings|lab_results|injuries)(\?|\/|$)/,
  handler: 'NetworkOnly',
};
