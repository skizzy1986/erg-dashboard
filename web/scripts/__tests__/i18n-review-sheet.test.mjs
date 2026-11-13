import { readFileSync } from 'node:fs';
import { messages as dashboardEn } from '../../src/locales/en.po';
import {
  SHEET,
  buildSheet,
  catalogRows,
  corpusSha,
  linguiId,
  parsePo,
  readReviewRecord,
} from '../i18n-review-sheet.mjs';

describe('the es-CO review sheet', () => {
  it('is up to date with the catalogs (run `npm run i18n:review`)', () => {
    expect(readFileSync(SHEET, 'utf8')).toBe(`${buildSheet()}\n`);
  });

  it("uses Lingui's own ids, so a reviewer's row id finds the message", () => {
    const ids = catalogRows('src/locales').map((r) => r.id);
    expect(ids.sort()).toEqual(Object.keys(dashboardEn).sort());
  });

  it('carries a review record whose stamp matches the corpus once signed off', () => {
    const record = readReviewRecord();
    expect(['pending', 'reviewed']).toContain(record.status);
    if (record.status === 'reviewed') {
      // A string changed after the native speaker read it: review again.
      expect(record.corpusSha).toBe(corpusSha());
      expect(record.reviewer).toBeTruthy();
      expect(record.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('parsePo', () => {
  it('reads comments, origins, context and multi-line strings', () => {
    const entries = parsePo(
      [
        'msgid ""',
        'msgstr ""',
        '"Language: es\\n"',
        '',
        '#. Button',
        '#: src/A.jsx:3 src/B.jsx:9',
        'msgctxt "nav"',
        'msgid "Log"',
        'msgstr "Historial"',
        '',
        'msgid ""',
        '"Long "',
        '"line"',
        'msgstr "Línea \\"larga\\""',
      ].join('\n')
    );
    expect(entries).toEqual([
      {
        comments: ['Button'],
        origins: ['src/A.jsx:3', 'src/B.jsx:9'],
        msgctxt: 'nav',
        msgid: 'Log',
        msgstr: 'Historial',
      },
      {
        comments: [],
        origins: [],
        msgctxt: '',
        msgid: 'Long line',
        msgstr: 'Línea "larga"',
      },
    ]);
  });

  it('computes the id Lingui computes', () => {
    // From the spike build: <Trans>Spike hello world</Trans> compiled to 8eIx86.
    expect(linguiId('Spike hello world')).toBe('8eIx86');
    expect(linguiId('Log', 'nav')).not.toBe(linguiId('Log'));
  });
});
