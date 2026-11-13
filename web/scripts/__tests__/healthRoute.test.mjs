import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HEALTH_NETWORK_ONLY_ROUTE, HEALTH_TABLES } from '../healthRoute.mjs';

const BASE = 'https://abcdefgh.supabase.co/rest/v1';

// Workbox RegExpRoute semantics for a cross-origin URL: the match must start
// at index 0 of the href (workbox-routing RegExpRoute.js).
const workboxMatches = (re, href) => {
  const m = re.exec(href);
  return Boolean(m) && m.index === 0;
};

describe('HEALTH_NETWORK_ONLY_ROUTE', () => {
  const re = HEALTH_NETWORK_ONLY_ROUTE.urlPattern;

  it('is NetworkOnly with no cache name', () => {
    expect(HEALTH_NETWORK_ONLY_ROUTE.handler).toBe('NetworkOnly');
    expect(HEALTH_NETWORK_ONLY_ROUTE.options).toBeUndefined();
  });

  it.each(HEALTH_TABLES)(
    'matches a PostgREST read of %s the way Workbox matches',
    (table) => {
      expect(
        workboxMatches(re, `${BASE}/${table}?select=id&order=id.desc`)
      ).toBe(true);
      expect(workboxMatches(re, `${BASE}/${table}`)).toBe(true);
    }
  );

  it('leaves every other table to the generic rule', () => {
    for (const t of ['vitals', 'sessions', 'bp_readings_archive', 'anchors']) {
      expect(workboxMatches(re, `${BASE}/${t}?select=*`)).toBe(false);
    }
    expect(workboxMatches(re, 'https://evil.example/rest/v1/injuries')).toBe(
      false
    );
  });

  // vite.config.js cannot be imported outside Vite (see squatChunks.test.mjs),
  // so the ordering is pinned at the source: Workbox's Router serves the
  // FIRST registered route that matches, so this must precede the generic one.
  it('is registered before the generic supabase rule in vite.config.js', () => {
    const src = readFileSync(join(process.cwd(), 'vite.config.js'), 'utf8');
    const health = src.indexOf('HEALTH_NETWORK_ONLY_ROUTE,');
    const generic = src.indexOf("cacheName: 'supabase-api'");
    expect(health).toBeGreaterThan(-1);
    expect(generic).toBeGreaterThan(health);
  });
});
