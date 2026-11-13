#!/usr/bin/env node
// The Spanish reviewer's sheet: every translated string side by side with its
// English, its translator note and a short row id, regenerated from the
// catalogs so it can never describe strings that are not there.
//
//   npm run i18n:review              rewrite docs/i18n/REVIEW-es-CO.md
//   npm run i18n:review -- --html F  also write a standalone HTML copy to F,
//                                    for a reviewer who does not use GitHub
//
// The reviewer answers with row ids; the msgstr at that id is corrected in the
// .po file and the sheet regenerated. A test (scripts/__tests__) fails if the
// checked-in sheet is stale.
//
// PO is read with a minimal parser (msgctxt / msgid / msgstr / #. / #:), which
// is all Lingui's PO formatter writes. Row ids are Lingui's own message ids:
// sha256(message + U+001F + context), base64url, first 6 characters — the
// algorithm in @lingui/message-utils generateMessageId.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANG_UI, OFFLINE_TEXT, ROOT_ERROR_TEXT } from '../src/i18n/lang.js';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SHEET = join(WEB, '..', 'docs', 'i18n', 'REVIEW-es-CO.md');
export const REVIEW_RECORD = join(WEB, 'src', 'locales', 'review.es-CO.json');

// Dashboard first: it is what PR-1 asks the reviewer to read.
export const CATALOGS = [
  { name: 'Dashboard', dir: 'src/locales' },
  { name: '/squat', dir: 'src/squat/locales' },
];

const unquote = (s) => JSON.parse(s);

/** Parse a PO file into entries; the header (empty msgid) is dropped. */
export function parsePo(text) {
  const entries = [];
  let cur = null;
  let field = null;
  const flush = () => {
    if (cur && cur.msgid) entries.push(cur);
    cur = null;
    field = null;
  };
  const start = () => {
    cur ??= { comments: [], origins: [], msgctxt: '', msgid: '', msgstr: '' };
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('#.')) {
      start();
      cur.comments.push(line.slice(2).trim());
    } else if (line.startsWith('#:')) {
      start();
      cur.origins.push(...line.slice(2).trim().split(/\s+/));
    } else if (line.startsWith('#')) {
      start();
    } else {
      const m = /^(msgctxt|msgid|msgstr)\s+(".*")$/.exec(line);
      if (m) {
        if (m[1] === 'msgctxt' || (m[1] === 'msgid' && cur?.msgstr)) {
          // A new entry without a blank line between: close the last one.
          if (cur?.msgid && m[1] === 'msgctxt') flush();
        }
        start();
        field = m[1];
        cur[field] = unquote(m[2]);
      } else if (line.startsWith('"') && cur && field) {
        cur[field] += unquote(line);
      }
    }
  }
  flush();
  return entries;
}

export function linguiId(message, context = '') {
  return createHash('sha256')
    .update(`${message}\u001F${context || ''}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    .slice(0, 6);
}

const readPo = (dir, locale) =>
  parsePo(readFileSync(join(WEB, dir, `${locale}.po`), 'utf8'));

/** One row per English message, with its Spanish (possibly empty). */
export function catalogRows(dir) {
  const es = new Map(
    readPo(dir, 'es').map((e) => [`${e.msgctxt}\u0004${e.msgid}`, e.msgstr])
  );
  return readPo(dir, 'en').map((e) => ({
    id: linguiId(e.msgid, e.msgctxt),
    en: e.msgid,
    es: es.get(`${e.msgctxt}\u0004${e.msgid}`) ?? '',
    note: [
      ...e.comments,
      ...(e.msgctxt ? [`context: ${e.msgctxt}`] : []),
      // Files only: line numbers churn on every unrelated edit.
      ...[...new Set(e.origins.map((o) => o.replace(/:\d+$/, '')))],
    ].join(' · '),
  }));
}

// Words that render before any catalog exists (src/i18n/lang.js).
export function preChunkRows() {
  const rows = [];
  const add = (key, table, note) => {
    if (table.es) rows.push({ id: key, en: table.en, es: table.es, note });
  };
  add('offline', OFFLINE_TEXT, '/squat first visit with no connection');
  add('err-head', ROOT_ERROR_TEXT.heading, 'Whole-app crash screen, heading');
  add('err-body', ROOT_ERROR_TEXT.body, 'Whole-app crash screen, body');
  add('err-retry', ROOT_ERROR_TEXT.retry, 'Whole-app crash screen, button');
  add('lang-label', LANG_UI.label, 'Language control: group name');
  add(
    'lang-native',
    LANG_UI.native,
    'Language control: each language in its own name (screen reader)'
  );
  add(
    'lang-switch',
    LANG_UI.switchTo,
    'Language control, compact button: screen-reader name'
  );
  return rows;
}

/** Every Spanish string the app can show, for checks that span all of them. */
export function allSpanish() {
  return [
    ...CATALOGS.flatMap((c) => catalogRows(c.dir)),
    ...preChunkRows(),
  ].map((r) => ({ id: r.id, en: r.en, es: r.es }));
}

/** A fingerprint of the Spanish corpus, stamped into the review record. */
export function corpusSha() {
  const corpus = allSpanish()
    .map((r) => `${r.id}\t${r.es}`)
    .sort()
    .join('\n');
  return createHash('sha256').update(corpus).digest('hex').slice(0, 12);
}

export function readReviewRecord() {
  return JSON.parse(readFileSync(REVIEW_RECORD, 'utf8'));
}

const cell = (s) =>
  String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '<br>');

export function buildSheet() {
  const review = readReviewRecord();
  const status =
    review.status === 'reviewed'
      ? `**Reviewed** by ${review.reviewer} on ${review.reviewedOn} (corpus \`${review.corpusSha}\`).`
      : '**Pending native review.** Machine-drafted es-CO; not yet read by a native speaker.';
  const out = [
    '# Spanish (es-CO) review sheet',
    '',
    '<!-- Generated by web/scripts/i18n-review-sheet.mjs — do not edit by hand. -->',
    '',
    status,
    '',
    'Colombian, neutral Latin American Spanish, **tú** throughout (never usted). Brand and',
    'proper names stay as they are (SplitIQ, Strava). Numbers use a decimal point.',
    'Placeholders in braces — `{count}`, `{0}` — must stay exactly as written; their order',
    'may change. To correct a line, reply with its **row** id and the new Spanish.',
    '',
  ];
  const table = (title, rows) => {
    out.push(
      `## ${title}`,
      '',
      '| Row | English | Español | Where / note |',
      '|---|---|---|---|'
    );
    for (const r of rows) {
      out.push(
        `| \`${r.id}\` | ${cell(r.en)} | ${cell(r.es || '— missing —')} | ${cell(r.note)} |`
      );
    }
    out.push('');
  };
  for (const c of CATALOGS) {
    const rows = catalogRows(c.dir);
    if (rows.length)
      table(`${c.name} (${c.dir}, ${rows.length} strings)`, rows);
    else out.push(`## ${c.name} (${c.dir})`, '', 'No strings yet.', '');
  }
  table('Before any catalog loads (src/i18n/lang.js)', preChunkRows());
  return out.join('\n');
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildHtml() {
  const rows = [
    ...CATALOGS.flatMap((c) => catalogRows(c.dir)),
    ...preChunkRows(),
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SplitIQ es-CO review</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}code{font-size:12px}</style></head><body>
<h1>SplitIQ — Spanish (es-CO) review</h1><p>Reply with the row id and the corrected Spanish. Use tú, never usted.</p>
<table><tr><th>Row</th><th>English</th><th>Español</th><th>Where / note</th></tr>
${rows.map((r) => `<tr><td><code>${esc(r.id)}</code></td><td>${esc(r.en)}</td><td lang="es-CO">${esc(r.es)}</td><td>${esc(r.note)}</td></tr>`).join('\n')}
</table></body></html>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(dirname(SHEET), { recursive: true });
  writeFileSync(SHEET, `${buildSheet()}\n`);
  console.log(`Wrote ${relative(process.cwd(), SHEET)}`);
  const at = process.argv.indexOf('--html');
  if (at > -1 && process.argv[at + 1]) {
    writeFileSync(process.argv[at + 1], buildHtml());
    console.log(`Wrote ${process.argv[at + 1]}`);
  }
}
