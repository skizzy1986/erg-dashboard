import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import config, { VIEWS_SOURCES } from '../../lingui.config.js';
import { parsePo } from '../i18n-review-sheet.mjs';

// i18n Phase 2a split the dashboard's words across two catalogs. Each source
// file belongs to exactly one: the views catalog (VIEWS_SOURCES, loaded with
// the lazy shells) or the boot catalog (on first paint). A file in the wrong
// one either puts view text on first paint or leaves a view's words unloaded.

const WEB = process.cwd();
const read = (dir, locale) =>
  parsePo(readFileSync(join(WEB, dir, `${locale}.po`), 'utf8'));
const files = (entries) =>
  new Set(entries.flatMap((e) => e.origins.map((o) => o.replace(/:\d+$/, ''))));

const BOOT = 'src/locales';
const VIEWS = 'src/locales/views';
const bootEn = read(BOOT, 'en');
const viewsEn = read(VIEWS, 'en');

describe('dashboard catalog membership', () => {
  it('the config makes the views catalog exactly VIEWS_SOURCES, and the boot catalog exclude them', () => {
    const views = config.catalogs.find((c) =>
      c.path.endsWith('/views/{locale}')
    );
    const boot = config.catalogs.find((c) =>
      c.path.endsWith('src/locales/{locale}')
    );
    const rooted = VIEWS_SOURCES.map((f) => `<rootDir>/${f}`);
    expect(views.include).toEqual(rooted);
    for (const f of rooted) expect(boot.exclude).toContain(f);
  });

  it('every views message comes from a views file', () => {
    const outside = [...files(viewsEn)].filter(
      (f) => !VIEWS_SOURCES.includes(f)
    );
    expect(outside).toEqual([]);
  });

  it('no boot message comes from a views file', () => {
    const leaked = [...files(bootEn)].filter((f) => VIEWS_SOURCES.includes(f));
    expect(leaked).toEqual([]);
  });

  it('every views file that speaks has its words in the views catalog', () => {
    const seen = files(viewsEn);
    const silent = VIEWS_SOURCES.filter((f) => !seen.has(f));
    // LoadTooltip formats a date and says nothing of its own.
    expect(silent).toEqual(['src/components/LoadTooltip.jsx']);
  });

  it('a message both catalogs hold reads the same in both', () => {
    const es = (dir) =>
      new Map(read(dir, 'es').map((e) => [e.msgid, e.msgstr]));
    const bootEs = es(BOOT);
    const viewsEs = es(VIEWS);
    const shared = [...viewsEs.keys()].filter((id) => bootEs.has(id));
    // "Settings", "Loading…", "Progress", "Strength": identical by design.
    expect(shared.length).toBeGreaterThan(0);
    for (const id of shared) expect(viewsEs.get(id), id).toBe(bootEs.get(id));
  });

  it('the views catalog is translated in full', () => {
    const empty = read(VIEWS, 'es').filter((e) => !e.msgstr);
    expect(empty.map((e) => e.msgid)).toEqual([]);
    expect(read(VIEWS, 'es').length).toBe(viewsEn.length);
  });
});
