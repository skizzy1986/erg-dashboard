import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  I18N_CHUNK_NAME,
  I18N_CODE_ROUTE,
  I18N_GLOB_IGNORES,
  I18N_JS,
  isTranslatedCatalog,
} from '../i18nChunks.mjs';
import { PLAIN_CHUNK_NAME, squatChunkFileNames } from '../squatChunks.mjs';

const ROOT = '/repo/web';

describe('isTranslatedCatalog', () => {
  it('accepts a chunk that is only the dashboard Spanish catalog', () => {
    expect(isTranslatedCatalog([`${ROOT}/src/locales/es.po`])).toBe(true);
    expect(isTranslatedCatalog([`${ROOT}/src/locales/es.po?lingui`])).toBe(
      true
    );
  });

  it('accepts the views catalog beside it (i18n Phase 2a)', () => {
    expect(isTranslatedCatalog([`${ROOT}/src/locales/views/es.po`])).toBe(true);
    expect(
      isTranslatedCatalog([`${ROOT}/src/locales/views/es.po?lingui`])
    ).toBe(true);
  });

  it('never claims an English catalog, which must stay precached', () => {
    expect(isTranslatedCatalog([`${ROOT}/src/locales/en.po`])).toBe(false);
    expect(isTranslatedCatalog([`${ROOT}/src/locales/views/en.po`])).toBe(
      false
    );
  });

  it('leaves /squat catalogs to the squat- rule', () => {
    expect(isTranslatedCatalog([`${ROOT}/src/squat/locales/es.po`])).toBe(
      false
    );
  });

  it('rejects a chunk that mixes in anything else, or nothing', () => {
    expect(
      isTranslatedCatalog([`${ROOT}/src/locales/es.po`, `${ROOT}/src/App.jsx`])
    ).toBe(false);
    expect(isTranslatedCatalog([])).toBe(false);
    expect(isTranslatedCatalog(undefined)).toBe(false);
  });
});

describe('chunk naming', () => {
  it('names the Spanish catalog i18n-es-*, which I18N_JS recognises', () => {
    expect(
      squatChunkFileNames({ moduleIds: [`${ROOT}/src/locales/es.po`] })
    ).toBe(I18N_CHUNK_NAME);
    const built = I18N_CHUNK_NAME.replace('[name]', 'es')
      .replace('[hash]', 'Ab12')
      .replace('assets/', '');
    expect(built).toBe('i18n-es-Ab12.js');
    expect(I18N_JS.test(built)).toBe(true);
    expect(I18N_JS.test('index-Ab12.js')).toBe(false);
  });

  it('names the views Spanish catalog i18n-es-* too', () => {
    expect(
      squatChunkFileNames({ moduleIds: [`${ROOT}/src/locales/views/es.po`] })
    ).toBe(I18N_CHUNK_NAME);
  });

  it('leaves English and ordinary chunks plain', () => {
    expect(
      squatChunkFileNames({ moduleIds: [`${ROOT}/src/locales/en.po`] })
    ).toBe(PLAIN_CHUNK_NAME);
    expect(
      squatChunkFileNames({
        moduleIds: [
          `${ROOT}/src/locales/views/en.po`,
          `${ROOT}/src/i18n/views.js`,
        ],
      })
    ).toBe(PLAIN_CHUNK_NAME);
  });
});

describe('Workbox pieces', () => {
  it('keeps translated catalogs out of the precache', () => {
    expect(I18N_GLOB_IGNORES).toEqual(['**/assets/i18n-*.js']);
  });

  it('caches them cache-first on first use, 200s only, with expiry', () => {
    expect(I18N_CODE_ROUTE.handler).toBe('CacheFirst');
    expect(I18N_CODE_ROUTE.options.cacheName).toBe('i18n-code');
    expect(I18N_CODE_ROUTE.options.cacheableResponse).toEqual({
      statuses: [200],
    });
    expect(I18N_CODE_ROUTE.options.expiration.maxAgeSeconds).toBeGreaterThan(0);
    const re = I18N_CODE_ROUTE.urlPattern;
    expect(re.test('https://x.app/assets/i18n-es-Ab12.js')).toBe(true);
    expect(re.test('https://x.app/assets/index-Ab12.js')).toBe(false);
  });

  it('is what vite.config.js actually uses', () => {
    const src = readFileSync(join(process.cwd(), 'vite.config.js'), 'utf8');
    expect(src).toMatch(
      /globIgnores:\s*SQUAT_GLOB_IGNORES\.concat\(I18N_GLOB_IGNORES\)/
    );
    expect(src).toMatch(/runtimeCaching:\s*\[[\s\S]*I18N_CODE_ROUTE,/);
    expect(src).toMatch(/lingui\(\{\s*macroTransform:\s*true\s*\}\)/);
  });
});
