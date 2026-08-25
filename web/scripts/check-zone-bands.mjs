// Guards every published rowing zone band against the code that derives it.
//
// The bands come from derivePaceZones(cp) — they are not constants, they move
// whenever the rowing_cp anchor is revalidated. Anything written into prose is a
// snapshot, and snapshots do not recompute themselves.
//
// This is not hypothetical. The same wrong AT ceiling of 205 W — the CP anchor
// restated as the band's top, where CP sits a line above in every one of them —
// reached three separate documents:
//
//   CLAUDE.md                        fixed in #266
//   web/.design-sync/CLAUDE.md       fixed in #268
//   coach/CODE_TO_COACH_HANDOVER.md  fixed in #275
//
// #266 fixed one copy and missed the other two because it grepped one file.
// #268 caught the second only because check:design-sync had grown a zone check
// by then — and missed the third because that check scanned .design-sync/ only.
// Scanning every tracked markdown file is what closes the class.
//
//   npm run check:zones
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(webRoot, '..');

const configPath = join(webRoot, 'src/constants/trainingConfig.js');
if (!existsSync(configPath)) {
  console.error('check:zones: src/constants/trainingConfig.js is missing.');
  process.exit(1);
}
const { derivePaceZones } = await import(pathToFileURL(configPath).href);

let files;
try {
  files = execFileSync('git', ['ls-files', '*.md'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
} catch (e) {
  console.error(`check:zones: could not list tracked markdown — ${e.message}`);
  process.exit(1);
}

// Markdown emphasis lands inside the numbers (`AT **164–185** W`) and the bands
// wrap across lines in at least one document, so normalise before matching:
// drop emphasis and backticks, collapse all whitespace to single spaces.
const normalise = (s) => s.replace(/[*`]/g, '').replace(/\s+/g, ' ');

// Three real phrasings have to match, so anchor on UT2 and read the next three
// ranges in order rather than assuming where the labels sit:
//   "UT2 113-144 / UT1 144-164 / AT 164-185 W"   labels interleaved
//   "UT2 / UT1 / AT - ... 113-144 / 144-164 / 164-185 W"   labels grouped
//  The separator class must be [\\s\\S], not [^0-9]: the labels themselves contain
//  digits ("UT1", "UT2"), so a no-digits class cannot step over them and the
//  interleaved phrasing never matches. That bug made this guard find 1 band of 3.
const BAND = new RegExp(
  'UT2\\b[\\s\\S]{0,200}?' +
    '(\\d{1,4})[–-](\\d{1,4})[\\s\\S]{0,40}?' +
    '(\\d{1,4})[–-](\\d{1,4})[\\s\\S]{0,40}?' +
    '(\\d{1,4})[–-](\\d{1,4})\\s*W',
  'g'
);

const failures = [];
let checked = 0;

for (const rel of files) {
  const text = normalise(readFileSync(join(repoRoot, rel), 'utf8'));

  for (const m of text.matchAll(BAND)) {
    //  A band statement names all three zones. Prose that merely mentions
    //  "UT1/UT2" (there is plenty) must not be read as a published band.
    if (!/\bAT\b/.test(m[0]) || !/\bUT1\b/.test(m[0])) continue;

    //  Derive against the CP the document itself quotes, so a doc written for a
    //  different anchor is not reported as wrong when it is merely historical.
    //  Both approximation signs count. The design-side mirrors are committed
    //  verbatim and write "CP ≈ 205W"; a tilde-only class reads that as quoting
    //  no CP at all and fails a document whose bands are in fact correct — and
    //  the mirror cannot be hand-edited to suit the guard.
    const cpMatch = text
      .slice(0, m.index)
      .match(/[~≈]\s?(\d{2,4})\s?W(?![^ ]*\/)/g);
    const cp = cpMatch
      ? Number(cpMatch[cpMatch.length - 1].match(/\d+/)[0])
      : null;
    if (!cp) {
      failures.push(
        `${rel} publishes UT2/UT1/AT bands but names no CP to derive them from`
      );
      continue;
    }

    checked += 1;
    const zones = derivePaceZones(cp);
    const claimed = m.slice(1, 7).map(Number);

    ['UT2', 'UT1', 'AT'].forEach((name, i) => {
      const z = zones.find((x) => x.zone === name);
      const [lo, hi] = [claimed[i * 2], claimed[i * 2 + 1]];
      if (z.wattsLow !== lo || z.wattsHigh !== hi) {
        failures.push(
          `${rel} gives ${name} as ${lo}-${hi} W; derivePaceZones(${cp}) yields ` +
            `${z.wattsLow}-${z.wattsHigh}`
        );
      }
    });
  }
}

if (failures.length) {
  console.error('\nzone band guard FAILED\n');
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  console.error(
    'A rowing zone band written into prose has drifted from the code.\n\n' +
      'The bands are derived from the live rowing_cp anchor by derivePaceZones();\n' +
      'they are not constants. Either correct the prose to what the function\n' +
      'returns at the CP that document quotes, or stop publishing watt figures\n' +
      'there and point at derivePaceZones(cp) instead.\n'
  );
  process.exit(1);
}

console.log(
  `check:zones: ${checked} published zone band(s) across ${files.length} tracked ` +
    'markdown files match derivePaceZones.'
);
