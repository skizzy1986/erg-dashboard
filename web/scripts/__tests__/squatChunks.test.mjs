import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isSquatOnly,
  PLAIN_CHUNK_NAME,
  SQUAT_CHUNK_NAME,
  SQUAT_CODE_ROUTE,
  SQUAT_GLOB_IGNORES,
  SQUAT_JS,
  SQUAT_ONLY_DIRS,
  squatChunkFileNames,
} from '../squatChunks.mjs';

const ROOT = '/repo/web';

describe('isSquatOnly', () => {
  it('accepts a chunk made only of squat, anatomy and three modules', () => {
    expect(
      isSquatOnly([
        `${ROOT}/src/squat/SquatApp.jsx`,
        `${ROOT}/src/anatomy/scene/createAnatomyScene.js`,
        `${ROOT}/node_modules/three/build/three.module.js`,
      ])
    ).toBe(true);
  });

  it('rejects a chunk that mixes in any shared module', () => {
    expect(
      isSquatOnly([
        `${ROOT}/src/squat/SquatApp.jsx`,
        `${ROOT}/src/constants/tokens.js`,
      ])
    ).toBe(false);
    expect(isSquatOnly([`${ROOT}/node_modules/react/index.js`])).toBe(false);
  });

  it('rejects an empty or missing module list', () => {
    expect(isSquatOnly([])).toBe(false);
    expect(isSquatOnly(undefined)).toBe(false);
  });

  it('does not match a look-alike folder name', () => {
    expect(isSquatOnly([`${ROOT}/src/squatter/x.js`])).toBe(false);
    expect(isSquatOnly([`${ROOT}/node_modules/threejs-ext/x.js`])).toBe(false);
  });

  it('covers exactly the three trees', () => {
    expect(SQUAT_ONLY_DIRS).toEqual([
      '/src/squat/',
      '/src/anatomy/',
      '/node_modules/three/',
    ]);
  });
});

describe('squatChunkFileNames', () => {
  it('prefixes squat-only chunks and leaves the rest plain', () => {
    expect(squatChunkFileNames({ moduleIds: [`${ROOT}/src/squat/a.js`] })).toBe(
      'assets/squat-[name]-[hash].js'
    );
    expect(squatChunkFileNames({ moduleIds: [`${ROOT}/src/App.jsx`] })).toBe(
      'assets/[name]-[hash].js'
    );
    expect(SQUAT_CHUNK_NAME).not.toBe(PLAIN_CHUNK_NAME);
  });

  it('names files the SQUAT_JS pattern then recognises', () => {
    const built = SQUAT_CHUNK_NAME.replace('[name]', 'SquatApp')
      .replace('[hash]', 'Ab12')
      .replace('assets/', '');
    expect(SQUAT_JS.test(built)).toBe(true);
    expect(SQUAT_JS.test('SquatApp-Ab12.js')).toBe(false);
  });
});

describe('Workbox pieces', () => {
  it('ignores squat data and squat JS in the precache', () => {
    expect(SQUAT_GLOB_IGNORES).toContain('**/assets/squat-*.js');
    expect(SQUAT_GLOB_IGNORES).toContain('**/squat-*.{json,bin}');
  });

  it('caches squat JS cache-first, 200s only, with expiry', () => {
    expect(SQUAT_CODE_ROUTE.handler).toBe('CacheFirst');
    expect(SQUAT_CODE_ROUTE.options.cacheName).toBe('squat-code');
    expect(SQUAT_CODE_ROUTE.options.cacheableResponse).toEqual({
      statuses: [200],
    });
    expect(SQUAT_CODE_ROUTE.options.expiration).toEqual({
      maxEntries: 30,
      maxAgeSeconds: 2592000,
    });
    const re = SQUAT_CODE_ROUTE.urlPattern;
    expect(re.test('https://x.app/assets/squat-SquatApp-Ab12.js')).toBe(true);
    expect(re.test('https://x.app/squat/assets/squat-three-Ab12.js')).toBe(
      true
    );
    expect(re.test('https://x.app/assets/index-Ab12.js')).toBe(false);
    expect(re.test('https://x.app/assets/squat-anatomy-Ab12.bin')).toBe(false);
  });

  // vite.config.js cannot be imported outside Vite (vite-plugin-pwa resolves
  // itself from the config's location at import), so its wiring is pinned at
  // the source; the built sw.js is then checked by `npm run size`.
  it('is what vite.config.js actually uses', () => {
    const src = readFileSync(join(process.cwd(), 'vite.config.js'), 'utf8');
    expect(src).toMatch(/globIgnores:\s*SQUAT_GLOB_IGNORES/);
    expect(src).toMatch(/runtimeCaching:\s*\[[\s\S]*SQUAT_CODE_ROUTE,/);
    expect(src).toMatch(/chunkFileNames:\s*squatChunkFileNames/);
    expect(src).toMatch(/worker:[\s\S]*entryFileNames:\s*SQUAT_CHUNK_NAME/);
  });
});
