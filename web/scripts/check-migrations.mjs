// Reconciles supabase/migrations/ against production, file by file.
//
// Why this exists (#429): a migration merged to main and then sat unapplied in
// production, because "merged" was being read as "done". Nothing noticed — the
// repo had no record of which files were live, which were deliberately not,
// and which live rows had no file at all. supabase/migrations/manifest.json is
// that record, and this script keeps it honest.
//
// Two modes, because CI has no database access:
//
//   manifest   (no args) checks the manifest's internal consistency against the
//              files in the directory: every forward file accounted for exactly
//              once, statuses well formed, versions unique, rollback and naming
//              conventions held. Runs on every PR that touches migrations
//              (.github/workflows/migrations-manifest.yml).
//
//   live       (--live <path>) additionally diffs the manifest against a saved
//              `list_migrations` result. CI cannot produce that file; the
//              nightly scheduled task in docs/routines/migration-drift-check.md
//              does, and opens an issue on drift.
//
// Exit codes: 0 OK; 1 manifest invalid or drift; 2 usage error, unreadable or
// unparseable --live file, git failure, or missing manifest.
//
//   npm run check:migrations
//   node scripts/check-migrations.mjs --live <list_migrations.json>
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(webRoot, '..');

export const STATUSES = ['applied', 'mirror', 'unapplied', 'pending'];
// Two forward files share 011 because two PRs picked the same next number
// before the convention was enforced. Renaming an applied file would break the
// file-stem ↔ live-name link, so the pair stays; no new prefix may join it.
export const GRANDFATHERED_DUPLICATE_PREFIXES = ['011'];
// Rollback files and stem-named applies are enforced from this number on;
// earlier files predate the convention.
export const CONVENTION_FROM = 14;
export const PROJECT_REF = 'swdrueaserjzhuxnzmeu';

const MIGRATION_DIR = 'supabase/migrations';
const MANIFEST_NAME = 'manifest.json';
const FORWARD_RE = /^\d{3}_[a-z0-9_]+\.sql$/;
const ROLLBACK_SUFFIX = '_rollback.sql';
const TOP_KEYS = ['$comment', 'schemaVersion', 'project', 'files', 'liveOnly'];
const FILE_KEYS = [
  'file',
  'status',
  'live',
  'reason',
  'note',
  'related',
  'issue',
];
const LIVE_KEYS = ['version', 'name'];
const LIVE_ONLY_KEYS = ['version', 'name', 'note', 'issue'];

const isObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const stemOf = (file) => file.replace(/\.sql$/, '');
const numberOf = (file) => Number(file.slice(0, 3));

export function isValidVersion(v) {
  if (typeof v !== 'string' || !/^\d{14}$/.test(v)) return false;
  const n = (a, b) => Number(v.slice(a, b));
  const month = n(4, 6);
  const day = n(6, 8);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    n(8, 10) < 24 &&
    n(10, 12) < 60 &&
    n(12, 14) < 60
  );
}

export function classifyFiles(names) {
  const forward = [];
  const rollbacks = [];
  const other = [];
  for (const raw of names) {
    const name = basename(raw);
    if (name === MANIFEST_NAME) continue;
    if (name.endsWith(ROLLBACK_SUFFIX)) rollbacks.push(name);
    else if (FORWARD_RE.test(name)) forward.push(name);
    else other.push(name);
  }
  return {
    forward: forward.sort(),
    rollbacks: rollbacks.sort(),
    other: other.sort(),
  };
}

export function parseManifest(text) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (e) {
    return {
      manifest: null,
      failures: [`manifest.json is not valid JSON — ${e.message}`],
    };
  }
  if (!isObject(manifest)) {
    return {
      manifest: null,
      failures: [
        'manifest.json is not a JSON object — expected {…} at the top level',
      ],
    };
  }
  const failures = [];
  for (const key of Object.keys(manifest)) {
    if (!TOP_KEYS.includes(key))
      failures.push(`manifest.json has an unknown top-level key "${key}"`);
  }
  if (manifest.schemaVersion !== 1)
    failures.push('manifest.json schemaVersion must be 1');
  if (manifest.project !== PROJECT_REF)
    failures.push(`manifest.json project must be "${PROJECT_REF}"`);
  for (const key of ['files', 'liveOnly']) {
    if (!Array.isArray(manifest[key]))
      failures.push(`manifest.json "${key}" must be an array`);
  }
  return failures.length
    ? { manifest: null, failures }
    : { manifest, failures };
}

function checkLiveList(label, live, failures) {
  if (!Array.isArray(live) || live.length === 0) {
    failures.push(`${label}: applied needs at least one live version`);
    return;
  }
  live.forEach((row, i) => {
    if (!isObject(row)) {
      failures.push(
        `${label}: live[${i}] must be {version, name} — applied needs at least one live version`
      );
      return;
    }
    for (const key of Object.keys(row)) {
      if (!LIVE_KEYS.includes(key))
        failures.push(`${label}: live[${i}] has unknown field ${key}`);
    }
    if (!nonEmpty(row.name)) {
      failures.push(
        `${label}: live[${i}] has no name — applied needs at least one live version with a name`
      );
    }
  });
}

export function validateManifest(manifest, names) {
  const failures = [];
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  const liveOnly = Array.isArray(manifest?.liveOnly) ? manifest.liveOnly : [];
  const { forward, rollbacks, other } = classifyFiles(names);
  const forwardSet = new Set(forward);
  const rollbackSet = new Set(rollbacks);

  // R15 — nothing else lives in the directory.
  for (const name of other) {
    failures.push(
      `unexpected file ${name} in ${MIGRATION_DIR}/ — only NNN_snake_case.sql, *${ROLLBACK_SUFFIX} and ${MANIFEST_NAME} belong here`
    );
  }

  // R16 — one forward file per number, bar the grandfathered pair.
  const byPrefix = new Map();
  for (const f of forward)
    byPrefix.set(f.slice(0, 3), [...(byPrefix.get(f.slice(0, 3)) ?? []), f]);
  for (const [prefix, group] of byPrefix) {
    if (
      group.length > 1 &&
      !GRANDFATHERED_DUPLICATE_PREFIXES.includes(prefix)
    ) {
      failures.push(
        `duplicate migration number ${prefix}: ${group.join(', ')} — take the next free number`
      );
    }
  }

  // R17 — rollback pairing.
  for (const rb of rollbacks) {
    const fwd = rb.slice(0, -ROLLBACK_SUFFIX.length) + '.sql';
    if (!forwardSet.has(fwd))
      failures.push(
        `${rb} needs its forward migration ${fwd}, which does not exist`
      );
  }
  for (const f of forward) {
    const rb = `${stemOf(f)}${ROLLBACK_SUFFIX}`;
    if (numberOf(f) >= CONVENTION_FROM && !rollbackSet.has(rb)) {
      failures.push(
        `${f} needs ${rb} (rollback files are required from ${String(CONVENTION_FROM).padStart(3, '0')})`
      );
    }
  }

  const liveOnlyVersions = new Set(
    liveOnly.filter(isObject).map((e) => e.version)
  );
  const seenVersions = new Map();
  const claim = (version, where) => {
    if (!isValidVersion(version)) {
      failures.push(
        `${where}: malformed version ${JSON.stringify(version)} — expected YYYYMMDDHHMMSS`
      );
      return;
    }
    if (seenVersions.has(version)) {
      failures.push(
        `version ${version} is accounted for twice (${seenVersions.get(version)} and ${where})`
      );
    } else seenVersions.set(version, where);
  };

  const listed = new Map();
  files.forEach((entry, i) => {
    if (!isObject(entry)) {
      failures.push(`files[${i}] must be an object`);
      return;
    }
    const label = nonEmpty(entry.file) ? entry.file : `files[${i}]`;
    for (const key of Object.keys(entry)) {
      if (!FILE_KEYS.includes(key))
        failures.push(`${label}: unknown field ${key}`);
    }

    if (nonEmpty(entry.file)) {
      // R5
      if (listed.has(entry.file))
        failures.push(`${entry.file} is listed twice in manifest.json`);
      listed.set(entry.file, entry);
      // R4 / R3
      if (entry.file.endsWith(ROLLBACK_SUFFIX)) {
        failures.push(
          `${entry.file}: rollback files are not migrations — remove its manifest entry`
        );
      } else if (!forwardSet.has(entry.file)) {
        failures.push(
          `manifest.json names ${entry.file}, which does not exist in ${MIGRATION_DIR}/`
        );
      }
    } else {
      failures.push(`files[${i}] needs a "file" naming a forward .sql`);
    }

    if (
      entry.issue !== undefined &&
      !(Number.isInteger(entry.issue) && entry.issue > 0)
    ) {
      failures.push(`${label}: issue must be a positive integer`);
    }
    if (entry.related !== undefined && entry.status !== 'mirror') {
      failures.push(`${label}: related is only valid on a mirror entry`);
    }
    // R7/R8: a reason explains why a file is NOT applied, so only unapplied
    // may carry one.
    if (entry.reason !== undefined && entry.status !== 'unapplied') {
      failures.push(`${label}: reason is only valid on an unapplied entry`);
    }

    switch (entry.status) {
      case 'applied': {
        // R7
        checkLiveList(label, entry.live, failures);
        if (Array.isArray(entry.live)) {
          entry.live.forEach(
            (row, j) =>
              isObject(row) && claim(row.version, `${label} live[${j}]`)
          );
          // R18
          if (nonEmpty(entry.file) && numberOf(entry.file) >= CONVENTION_FROM) {
            const stem = stemOf(entry.file);
            for (const row of entry.live.filter(isObject)) {
              if (
                row.name !== stem &&
                !String(row.name).startsWith(`${stem}_`)
              ) {
                failures.push(
                  `${label}: live name "${row.name}" must be applied under its file stem "${stem}" (apply_migration name = file stem)`
                );
              }
            }
          }
        }
        break;
      }
      case 'unapplied':
        // R8
        if (!nonEmpty(entry.reason))
          failures.push(`${label}: unapplied needs a reason`);
        if (entry.live !== undefined)
          failures.push(`${label}: unapplied must not list live versions`);
        break;
      case 'mirror':
        // R19: mirror entries are never compared with production, so a new
        // file marked mirror would escape drift detection for good. Only the
        // pre-convention reconstructions may use it.
        if (nonEmpty(entry.file) && numberOf(entry.file) >= CONVENTION_FROM)
          failures.push(
            `${label}: mirror is only valid for pre-${String(CONVENTION_FROM).padStart(3, '0')} files — a new migration is applied, unapplied or pending`
          );
        // R9
        if (!nonEmpty(entry.note))
          failures.push(
            `${label}: mirror needs a note saying what it reconstructs`
          );
        if (entry.live !== undefined)
          failures.push(`${label}: mirror must not list live versions`);
        if (entry.related !== undefined) {
          if (!Array.isArray(entry.related))
            failures.push(`${label}: related must be an array of versions`);
          else
            for (const v of entry.related) {
              if (!isValidVersion(v))
                failures.push(
                  `${label}: related has malformed version ${JSON.stringify(v)}`
                );
              else if (!liveOnlyVersions.has(v))
                failures.push(
                  `${label}: related version ${v} is not in liveOnly`
                );
            }
        }
        break;
      case 'pending':
        // R10
        if (entry.live !== undefined)
          failures.push(`${label}: pending must not list live versions`);
        break;
      default:
        // R6
        failures.push(
          `${label}: unknown status ${JSON.stringify(entry.status)} — expected one of ${STATUSES.join(', ')}`
        );
    }
  });

  // R2
  for (const f of forward) {
    if (!listed.has(f))
      failures.push(
        `${f} has no manifest entry — add it to supabase/migrations/manifest.json`
      );
  }

  // R13 / R14 / R11 / R12 on liveOnly.
  liveOnly.forEach((entry, i) => {
    if (!isObject(entry)) {
      failures.push(`liveOnly[${i}] must be an object and needs a note`);
      return;
    }
    const label = `liveOnly ${isValidVersion(entry.version) ? entry.version : `[${i}]`}`;
    for (const key of Object.keys(entry)) {
      if (!LIVE_ONLY_KEYS.includes(key))
        failures.push(`${label}: unknown field ${key}`);
    }
    claim(entry.version, label);
    if (!nonEmpty(entry.name)) failures.push(`${label} needs a name`);
    if (!nonEmpty(entry.note))
      failures.push(`${label} needs a note saying why it has no file`);
    if (
      entry.issue !== undefined &&
      !(Number.isInteger(entry.issue) && entry.issue > 0)
    ) {
      failures.push(`${label}: issue must be a positive integer`);
    }
  });

  return failures;
}

export function parseLive(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return {
      rows: null,
      failures: [`live file is not valid JSON — ${e.message}`],
    };
  }
  const rows = Array.isArray(data)
    ? data
    : isObject(data) && Array.isArray(data.migrations)
      ? data.migrations
      : null;
  if (!rows) {
    return {
      rows: null,
      failures: [
        'live file must be {"migrations":[{version,name}…]} or a bare array of {version,name}',
      ],
    };
  }
  const bad = rows.findIndex(
    (r) =>
      !isObject(r) ||
      typeof r.version !== 'string' ||
      typeof r.name !== 'string'
  );
  if (bad !== -1) {
    return {
      rows: null,
      failures: [
        `live file row ${bad} is not {version, name} with string values`,
      ],
    };
  }
  return {
    rows: rows.map(({ version, name }) => ({ version, name })),
    failures: [],
  };
}

export function diffLive(manifest, rows) {
  const drift = [];
  const files = manifest.files ?? [];
  const liveOnly = manifest.liveOnly ?? [];
  const liveByVersion = new Map(rows.map((r) => [r.version, r.name]));
  const liveNames = new Set(rows.map((r) => r.name));
  const byFileVersions = new Set();
  const liveOnlyVersions = new Set(liveOnly.map((e) => e.version));

  for (const entry of files) {
    const stem = stemOf(entry.file);
    if (entry.status === 'applied') {
      for (const { version, name } of entry.live ?? []) {
        byFileVersions.add(version);
        if (!liveByVersion.has(version)) {
          drift.push({
            kind: 'applied-missing-live',
            file: entry.file,
            version,
            message: `${entry.file} is marked applied as ${version} (${name}), but production has no such version`,
          });
        } else if (liveByVersion.get(version) !== name) {
          drift.push({
            kind: 'applied-name-mismatch',
            file: entry.file,
            version,
            message: `${entry.file}: live version ${version} is named "${liveByVersion.get(version)}", manifest says "${name}"`,
          });
        }
      }
    } else if (entry.status === 'pending') {
      if (liveNames.has(stem)) {
        drift.push({
          kind: 'pending-already-live',
          file: entry.file,
          message: `${entry.file} is live as "${stem}" but still marked pending — flip it to applied with its version`,
        });
      } else {
        drift.push({
          kind: 'pending-not-applied',
          file: entry.file,
          message: `${entry.file} is merged but not applied to production — apply it (Scott approves) and flip the entry to applied`,
        });
      }
    } else if (entry.status === 'unapplied' && liveNames.has(stem)) {
      drift.push({
        kind: 'unapplied-is-live',
        file: entry.file,
        message: `${entry.file} is marked unapplied, but production has a migration named "${stem}"`,
      });
    }
  }

  for (const { version, name } of liveOnly) {
    if (!liveByVersion.has(version)) {
      drift.push({
        kind: 'liveonly-missing-live',
        version,
        message: `liveOnly ${version} (${name}) is not in production`,
      });
    } else if (liveByVersion.get(version) !== name) {
      drift.push({
        kind: 'liveonly-name-mismatch',
        version,
        message: `liveOnly ${version}: production names it "${liveByVersion.get(version)}", manifest says "${name}"`,
      });
    }
  }

  let byFile = 0;
  let liveOnlyCount = 0;
  for (const { version, name } of rows) {
    if (byFileVersions.has(version)) byFile++;
    else if (liveOnlyVersions.has(version)) liveOnlyCount++;
    else {
      drift.push({
        kind: 'live-unaccounted',
        version,
        message: `production migration ${version} (${name}) is in neither an applied file entry nor liveOnly`,
      });
    }
  }

  return {
    drift,
    counts: {
      live: rows.length,
      byFile,
      liveOnly: liveOnlyCount,
      unapplied: files.filter((e) => e.status === 'unapplied').length,
      pending: files.filter((e) => e.status === 'pending').length,
    },
  };
}

export function summarise(manifest, names) {
  const { forward, rollbacks } = classifyFiles(names);
  const count = (s) => manifest.files.filter((e) => e.status === s).length;
  return {
    forward: forward.length,
    applied: count('applied'),
    mirror: count('mirror'),
    unapplied: count('unapplied'),
    pending: count('pending'),
    rollbacks: rollbacks.length,
    liveOnly: manifest.liveOnly.length,
  };
}

// --- CLI --------------------------------------------------------------------

const REMEDY =
  'Fix the manifest, or apply the migration — never weaken this check to make\n' +
  'it pass. A manifest that disagrees with production is exactly the silent\n' +
  'state #429 was. See WORKFLOW.md § Database migrations.\n';

function fail(header, items, kinds) {
  console.error(`\n${header}\n`);
  for (const item of items) console.error(`  ✗ ${item}\n`);
  console.error(REMEDY);
  if (kinds) console.error(`drift-kinds: ${kinds.join(',')}`);
  process.exit(1);
}

function usage(message) {
  console.error(
    `check:migrations: ${message}\nusage: node scripts/check-migrations.mjs [--live <list_migrations.json>]`
  );
  process.exit(2);
}

function main(argv) {
  let livePath = null;
  if (argv.length === 2 && argv[0] === '--live' && argv[1]) livePath = argv[1];
  else if (argv.length) usage(`unexpected arguments: ${argv.join(' ')}`);

  const manifestPath = join(repoRoot, MIGRATION_DIR, MANIFEST_NAME);
  if (!existsSync(manifestPath)) {
    console.error(
      `check:migrations: ${MIGRATION_DIR}/${MANIFEST_NAME} is missing.`
    );
    process.exit(2);
  }

  let names;
  try {
    // --others so a new, not-yet-added migration is seen locally; in CI the
    // checkout is clean and this equals the tracked set. -z keeps non-ASCII
    // names unquoted; --deduplicate stops a deleted-but-unstaged file being
    // listed twice.
    names = execFileSync(
      'git',
      [
        'ls-files',
        '-z',
        '--cached',
        '--others',
        '--exclude-standard',
        '--deduplicate',
        '--',
        MIGRATION_DIR,
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      }
    )
      .split('\0')
      .filter(Boolean)
      .filter((p) => dirname(p) === MIGRATION_DIR)
      .map((p) => basename(p));
  } catch (e) {
    console.error(
      `check:migrations: could not list ${MIGRATION_DIR} — ${e.message}`
    );
    process.exit(2);
  }

  const { manifest, failures: parseFailures } = parseManifest(
    readFileSync(manifestPath, 'utf8')
  );
  const failures = manifest ? validateManifest(manifest, names) : parseFailures;
  if (failures.length)
    fail(
      'Migrations manifest FAILED',
      failures,
      livePath ? ['manifest-invalid'] : null
    );

  const s = summarise(manifest, names);
  console.log(
    `check:migrations: manifest OK — ${s.forward} forward file(s): ${s.applied} applied, ${s.mirror} mirror, ` +
      `${s.unapplied} unapplied, ${s.pending} pending; ${s.rollbacks} rollback(s) excluded; ` +
      `${s.liveOnly} live-only row(s).`
  );
  if (!livePath) return;

  let text;
  try {
    text = readFileSync(livePath, 'utf8');
  } catch (e) {
    console.error(
      `check:migrations: could not read --live file — ${e.message}`
    );
    process.exit(2);
  }
  const { rows, failures: liveFailures } = parseLive(text);
  if (!rows) {
    console.error(`check:migrations: ${liveFailures.join('; ')}`);
    process.exit(2);
  }

  const { drift, counts } = diffLive(manifest, rows);
  if (drift.length) {
    fail(
      'Migration drift DETECTED',
      drift.map((d) => `[${d.kind}] ${d.message}`),
      [...new Set(drift.map((d) => d.kind))]
    );
  }
  console.log(
    `check:migrations: live OK — ${counts.live} live row(s) reconciled (${counts.byFile} by file, ` +
      `${counts.liveOnly} live-only); ${counts.unapplied} intentionally unapplied.`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2));
}
