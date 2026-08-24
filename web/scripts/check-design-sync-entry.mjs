// Guards the design-sync barrel against silent drift.
//
// web/.design-sync/entry.jsx re-exports app components by name so the
// claude.ai/design bundle can expose them on window.SplitIQ. It is
// hand-maintained and nothing else references it, so when a component or
// constant is renamed, moved or removed, the barrel keeps naming a symbol that
// no longer exists and the design-sync build breaks — invisibly, until someone
// next runs a sync.
//
// That is not hypothetical: #203 correctly deleted the static PACE_ZONES export
// from trainingConfig.js, the barrel was not updated, and the break sat on main
// undetected. A prose warning in NOTES.md was already in place and did not stop
// it. This is the control that does.
//
// The real converter bundles with esbuild; Vite 8 ships rolldown instead, so we
// bundle with rolldown to avoid adding a dependency for a CI check. Either way a
// missing named re-export is a hard bundler error, which is exactly the class of
// failure being guarded.
//
//   npm run check:design-sync
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(webRoot, '.design-sync', 'config.json');

if (!existsSync(configPath)) {
  console.log('design-sync: no .design-sync/config.json — nothing to guard.');
  process.exit(0);
}

let cfg;
try {
  cfg = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error(
    `design-sync: .design-sync/config.json is not valid JSON — ${e.message}`
  );
  process.exit(1);
}

const failures = [];

// 1. Every componentSrcMap path must still exist. A moved component file would
//    otherwise silently drop out of the synced set.
for (const [name, rel] of Object.entries(cfg.componentSrcMap ?? {})) {
  if (rel === null) continue;
  if (!existsSync(join(webRoot, rel))) {
    failures.push(
      `componentSrcMap.${name} points at "${rel}", which does not exist`
    );
  }
}

// 2. The barrel must bundle. This is what catches renamed/removed exports.
const entryRel = cfg.entry ?? '.design-sync/entry.jsx';
const entry = join(webRoot, entryRel);

if (!existsSync(entry)) {
  failures.push(`cfg.entry points at "${entryRel}", which does not exist`);
} else {
  try {
    const { rolldown } = await import('rolldown');
    const bundle = await rolldown({ input: entry, platform: 'browser' });
    await bundle.generate({ format: 'iife', name: 'DesignSyncEntryCheck' });
    await bundle.close?.();
  } catch (e) {
    // Built from a string so the escape character never appears literally
    // inside a regex literal (no-control-regex). String.raw keeps the bracket
    // escape exact.
    const ansi = new RegExp(
      String.fromCharCode(27) + String.raw`\[[0-9;]*m`,
      'g'
    );
    const msg = String(e?.message ?? e).replace(ansi, '');
    failures.push(`${entryRel} does not bundle:\n\n${msg}`);
  }
}

// 3. Every contrast claim conventions.md publishes must survive arithmetic, and
//    every --color-* it names must exist.
//
//    conventions.md is the readmeHeader — the one input guaranteed to be inlined
//    into the design agent's prompt, so a wrong number here reaches every design.
//    Its own revision history is the argument for checking it: #224 measured the
//    ratios, #240 replaced them with a different palette's, and #262 records that
//    "four separate AA failures were shipped during this revision, every one of
//    them a colour chosen against a background that was darkened afterwards".
//    Ratios in prose do not recompute themselves.
const conventionsRel = '.design-sync/conventions.md';
const conventionsPath = join(webRoot, conventionsRel);

let claimsChecked = 0;

if (!existsSync(conventionsPath)) {
  failures.push(`${conventionsRel} is missing`);
} else {
  const md = readFileSync(conventionsPath, 'utf8');

  const relLum = (hex) => {
    const ch = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const ratio = (a, b) => {
    const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  //  "#43485a   (verified 4.5:1+ against #bcc5dd)" — a floor the pair must clear.
  for (const m of md.matchAll(
    /(#[0-9a-fA-F]{6})[^\n]*?([0-9]+(?:\.[0-9]+)?):1\+?\s*against\s*(#[0-9a-fA-F]{6})/g
  )) {
    const [, fg, floor, bg] = m;
    claimsChecked += 1;
    const real = ratio(fg, bg);
    if (real < Number(floor)) {
      failures.push(
        `${conventionsRel} claims ${fg} clears ${floor}:1 against ${bg}; ` +
          `it is ${real.toFixed(2)}`
      );
    }
  }

  //  "muted #7e7e9a on raised #2a2a48 -> 3.50" — an exact published ratio.
  for (const m of md.matchAll(
    /(#[0-9a-fA-F]{6})\s+on\s+[a-zA-Z]*\s*(#[0-9a-fA-F]{6})\s*->\s*([0-9]+\.[0-9]{2})/g
  )) {
    const [, fg, bg, claimed] = m;
    claimsChecked += 1;
    const real = ratio(fg, bg);
    if (Math.abs(real - Number(claimed)) > 0.01) {
      failures.push(
        `${conventionsRel} says ${fg} on ${bg} is ${claimed}; it is ` +
          real.toFixed(2)
      );
    }
  }

  //  Any --color-* it names must actually be generated from THEME.
  const named = [...md.matchAll(/--color-([a-zA-Z][a-zA-Z0-9]*)/g)].map(
    (m) => m[1]
  );
  if (named.length) {
    try {
      const { THEME } = await import(
        pathToFileURL(join(webRoot, 'src/constants/theme.js')).href
      );
      for (const key of [...new Set(named)]) {
        if (!(key in THEME)) {
          failures.push(
            `${conventionsRel} names --color-${key}, which theme.js does not ` +
              'define — it will resolve to nothing in a generated design'
          );
        }
      }
    } catch (e) {
      failures.push(
        `src/constants/theme.js could not be imported — ${e?.message ?? e}`
      );
    }
  }
}

// 4. Any zone band published in the design-sync docs must match derivePaceZones.
//
//    The same wrong AT ceiling reached two separate files: the repo CLAUDE.md and
//    .design-sync/CLAUDE.md both gave AT as 164-205 W. 205 is the CP anchor, which
//    sits one line above in both — the band's ceiling is 185. #266 fixed one copy
//    and missed the other, which is the argument for checking rather than reading.
//
//    Bands are derived from CP, so anything written down is a snapshot. Verify the
//    snapshot against the function at the CP the doc itself quotes.
for (const rel of ['.design-sync/CLAUDE.md', '.design-sync/conventions.md']) {
  const abs = join(webRoot, rel);
  if (!existsSync(abs)) continue;
  const md = readFileSync(abs, 'utf8');

  //  "UT2 / UT1 / AT — ... 113-144 / 144-164 / 164-185 W"
  const line = md.match(
    /UT2[^\n]*?AT[^\n]*?([0-9]+)[–-]([0-9]+)\s*\/\s*([0-9]+)[–-]([0-9]+)\s*\/\s*([0-9]+)[–-]([0-9]+)\s*W/
  );
  if (!line) continue;

  const cpMatch = md.match(/~([0-9]{2,4})\s*W/);
  const cp = cpMatch ? Number(cpMatch[1]) : null;
  if (!cp) {
    failures.push(
      `${rel} publishes UT2/UT1/AT watt bands but names no CP to derive them from`
    );
    continue;
  }

  try {
    const { derivePaceZones } = await import(
      pathToFileURL(join(webRoot, 'src/constants/trainingConfig.js')).href
    );
    const zones = derivePaceZones(cp);
    const claimed = line.slice(1).map(Number);
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
  } catch (e) {
    failures.push(
      `src/constants/trainingConfig.js could not be imported — ${e?.message ?? e}`
    );
  }
}

if (failures.length) {
  console.error('\ndesign-sync entry guard FAILED\n');
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  console.error(
    'The design-sync barrel has drifted from web/src.\n\n' +
      'It is hand-maintained: renaming, moving or deleting anything it re-exports\n' +
      'breaks the claude.ai/design build with no other symptom. Fix by updating\n' +
      'web/.design-sync/entry.jsx (and the matching preview/doc/config entries) to\n' +
      'name what src actually exports now.\n\n' +
      'See web/.design-sync/NOTES.md for the sync contract.\n'
  );
  process.exit(1);
}

console.log(
  'design-sync: barrel bundles, every componentSrcMap path resolves, and ' +
    `${claimsChecked} published contrast claim(s) in conventions.md recompute.`
);
