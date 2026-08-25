// Fails the build on a raw colour hex written into a rendering surface.
//
// #287 flipped the app to light behind the var(--color-*) seam and its body
// claimed `src/` held zero raw colour literals outside the palette module.
// Nothing enforced that, and it was not true — 66 remained, and 47 of them were
// verbatim DARK palette values that the flip stranded on the wrong theme:
//
//   OverviewView.jsx  color:'#fff' on a tile that light paints #ffffff, so the
//                     stat values (0, 0km, 118kg) rendered white-on-white and
//                     disappeared from the desktop overview entirely
//   App.jsx           #08080d as the header gradient's far stop, leaving a black
//                     band across a light page
//   OverviewView.jsx  #2a2a48 under the today card, same
//
// The visual suite caught it, but only by accident of covering those four
// shots — nine screenshots cannot cover a class. A literal is invisible to
// review precisely because it looks correct on whichever theme it was written
// for. This does cover the class: every tracked source file, every hex.
//
//   npm run check:colours
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(webRoot, '..');

// The one file allowed to write a hex down. Named rather than pattern-matched:
// if it is renamed, this guard must fail loudly instead of silently scanning a
// tree with no palette in it and reporting success.
const PALETTE = 'web/src/constants/themeValues.js';
if (!existsSync(join(repoRoot, PALETTE))) {
  console.error(`check:colours: ${PALETTE} is missing — has it been renamed?`);
  process.exit(1);
}
const { DARK } = await import(pathToFileURL(join(repoRoot, PALETTE)).href);

// Off-palette literals, deferred rather than guessed at. Substituting a token
// here would change a rendered colour, which is a design decision and not a
// migration — #287's rule was that no hex may change.
//
// Declared per file AND per hex, so this pins the debt at its current shape
// instead of exempting a file: a NEW literal in StrengthLogger.jsx still fails.
// A stale entry fails too (see below), so fixing one of these forces its
// removal and the list can only shrink.
const ALLOWED = {
  'web/src/StrengthLogger.jsx': {
    hexes: [
      '#00a8cc',
      '#c79bf2',
      '#7ad7ff',
      '#6fe09a',
      '#04222b',
      '#06210f',
      '#ff9b9b',
      '#000',
      '#fff',
    ],
    reason:
      'off-palette chip/chrome ink. The #fff and #000 sit on the black toast ' +
      'and the always-cyan rest bar, where textStrong would invert them on ' +
      'light — these need a light design, not a substitution. 1,665 untested ' +
      'lines (#79).',
  },
  'web/src/views/ErgLiveView.jsx': {
    hexes: ['#a0a0b8'],
    reason:
      'between DARK.muted #7e7e9a and DARK.textSubtle #aaaacc; neither is exact.',
  },
  'web/src/constants/trainingConfig.js': {
    hexes: ['#666'],
    reason:
      'zone-lookup fallback; wants a decision, not a nearest-token guess.',
  },
  'web/src/views/ErgView.jsx': {
    hexes: ['#666'],
    reason: 'as trainingConfig.js.',
  },
  'web/src/views/program/ProgramYear.jsx': {
    hexes: ['#666'],
    reason: 'as trainingConfig.js.',
  },
};

// Pathspec is the directory, not a `**` glob — git's wildmatch does not reach
// web/src/App.jsx from web/src/**/*.jsx, and silently scanning everything
// except the top level is exactly the near-miss this guard exists to stop.
let files;
try {
  files = execFileSync('git', ['ls-files', 'web/src'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((p) => /\.(jsx?|css)$/.test(p));
} catch (e) {
  console.error(`check:colours: could not list tracked source — ${e.message}`);
  process.exit(1);
}
if (!files.length) {
  console.error('check:colours: matched no source files under web/src.');
  process.exit(1);
}

// Tests are excluded, and that is required rather than conceded. theme.test.js
// writes all 24 dark hexes down — it IS the palette lock. ui.test.js and
// theme.test.js's migration block assert `DARK[token] === hex`, which is the
// proof that a substitution changed nothing. The files carrying literals are
// the ones proving the literals were removed safely. A test renders to nobody,
// so it cannot strand a user on the wrong theme.
const isTest = (p) => p.includes('__tests__/') || /\.test\.[jt]sx?$/.test(p);
const scanned = files.filter((p) => p !== PALETTE && !isTest(p));

// An issue reference (#188, #276) is shaped exactly like a colour (#666, #000),
// so digits-only is not a discriminator. What separates them in this codebase:
// a colour is in a string or a style value, a reference is in a comment. Strip
// comments and the ambiguity goes with them. The `:` guard keeps a `https://`
// inside a string from truncating the line and hiding real matches after it.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// #toast, #restBar, #navHome — no CSS id in this tree is all-hex, so \b after
// 3/6/8 hex digits already excludes them. That is true today, not guaranteed:
// an id like #face or #dad would trip this. Allowlist it if that ever happens
// rather than growing a selector parser in here.
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

const expand = (hex) =>
  hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;

const tokenFor = (hex) => {
  const full = expand(hex).toLowerCase();
  return Object.keys(DARK).find((k) => DARK[k].toLowerCase() === full);
};

// `${THEME.accent}15` concatenated into the 8-digit hex #00d4ff15 while THEME
// held literals. Under the seam it renders `var(--color-accent)15`, which CSS
// reads as two components rather than one colour — the declaration is invalid
// at computed-value time and is dropped whole, with no fallback and no console
// warning. 67 borders and backgrounds were rendering nothing before this was
// found. Same class as a raw literal: a colour that stopped being a colour when
// the seam landed, and that no diff review would catch.
const ALPHA_SUFFIX = /\$\{[^{}]*\}[0-9a-fA-F]{2}\b/g;

// cssVarName() emits kebab-case. Two hand-written call sites used camelCase
// (--color-textSubtle), which names no property, so the color-mix() around each
// resolved to nothing and both declarations were dropped.
const CAMEL_VAR = /var\(--color-[a-z0-9-]*[A-Z]/g;

const failures = [];
const seen = new Map();
let checked = 0;

for (const rel of scanned) {
  const lines = stripComments(readFileSync(join(repoRoot, rel), 'utf8')).split(
    '\n'
  );

  lines.forEach((line, i) => {
    for (const m of line.match(ALPHA_SUFFIX) ?? []) {
      failures.push(
        `${rel}:${i + 1}  ${m} — a token with an alpha suffix stopped being a ` +
          "colour under the seam; use alpha(TOKEN, 'NN') from utils/themeCss.js"
      );
    }
    for (const m of line.match(CAMEL_VAR) ?? []) {
      failures.push(
        `${rel}:${i + 1}  ${m}… — custom properties are kebab-case; this names ` +
          'no property, so the declaration is dropped'
      );
    }
    for (const hex of line.match(HEX) ?? []) {
      checked += 1;
      const allowed = ALLOWED[rel];
      if (allowed?.hexes.includes(hex.toLowerCase())) {
        seen.set(`${rel} ${hex.toLowerCase()}`, true);
        continue;
      }
      const token = tokenFor(hex);
      failures.push(
        `${rel}:${i + 1}  ${hex} ` +
          (token
            ? `is DARK.${token} — use THEME.${token}`
            : 'matches no palette value — pick a token, or add it to ALLOWED with a reason')
      );
    }
  });
}

// A stale allowlist is how a debt register turns back into a silencer.
for (const [rel, { hexes }] of Object.entries(ALLOWED)) {
  if (!existsSync(join(repoRoot, rel))) {
    failures.push(
      `${rel} is allowlisted but no longer exists — drop the entry`
    );
    continue;
  }
  for (const hex of hexes) {
    if (!seen.has(`${rel} ${hex}`)) {
      failures.push(
        `${rel} allowlists ${hex}, which no longer appears there — drop the entry`
      );
    }
  }
}

if (failures.length) {
  console.error('\ncolour literal guard FAILED\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(
    '\nA raw colour hex in a rendering surface is pinned to one theme. It looks\n' +
      'correct on whichever theme it was written for and wrong on the other, and\n' +
      'no review catches that by reading the diff. Route it through THEME so the\n' +
      'cascade resolves it, or — if no token is right — add it to ALLOWED in\n' +
      'web/scripts/check-colour-literals.mjs with the reason it has to stay.\n'
  );
  process.exit(1);
}

console.log(
  `check:colours: ${checked} colour literal(s) across ${scanned.length} tracked ` +
    'source files, all either tokenised or allowlisted.'
);
