// @vitest-environment node
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONVENTION_FROM,
  GRANDFATHERED_DUPLICATE_PREFIXES,
  PROJECT_REF,
  STATUSES,
  classifyFiles,
  diffLive,
  parseLive,
  parseManifest,
  summarise,
  validateManifest,
} from '../check-migrations.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '../..');
const repoRoot = resolve(webRoot, '..');
const migrationsDir = join(repoRoot, 'supabase/migrations');
const scriptPath = join(webRoot, 'scripts/check-migrations.mjs');
const fixturePath = join(here, 'fixtures/live-migrations-2026-11-09.json');

const V1 = '20260101000000';
const V2 = '20260202000000';
const V3 = '20260303000000';

const NAMES = [
  '001_a.sql',
  '002_b.sql',
  '003_c.sql',
  '014_d.sql',
  '014_d_rollback.sql',
  '015_e.sql',
  '015_e_rollback.sql',
  'manifest.json',
];

const base = () => ({
  $comment: 'test',
  schemaVersion: 1,
  project: PROJECT_REF,
  files: [
    {
      file: '001_a.sql',
      status: 'applied',
      live: [{ version: V1, name: 'anything_goes_pre_convention' }],
    },
    {
      file: '002_b.sql',
      status: 'mirror',
      note: 'reconstruction',
      related: [V3],
    },
    { file: '003_c.sql', status: 'unapplied', reason: 'not yet', issue: 54 },
    {
      file: '014_d.sql',
      status: 'applied',
      live: [{ version: V2, name: '014_d' }],
    },
    { file: '015_e.sql', status: 'pending' },
  ],
  liveOnly: [
    { version: V3, name: 'old_thing', note: 'built live', issue: 428 },
  ],
});

const entry = (m, file) => m.files.find((e) => e.file === file);
const validate = (mutate, names = NAMES) => {
  const m = base();
  mutate(m);
  return validateManifest(m, names);
};
const expectFailure = (failures, needle) => {
  expect(
    failures.some((f) =>
      needle instanceof RegExp ? needle.test(f) : f.includes(needle)
    )
  ).toBe(true);
};

// The happy-path live set for base(): every applied version and liveOnly row.
const ROWS = [
  { version: V1, name: 'anything_goes_pre_convention' },
  { version: V2, name: '014_d' },
  { version: V3, name: 'old_thing' },
];
const withoutPending = () => {
  const m = base();
  m.files = m.files.filter((e) => e.status !== 'pending');
  return m;
};
const kinds = (result) => result.drift.map((d) => d.kind);

describe('constants', () => {
  it('exports the documented values', () => {
    expect(STATUSES).toEqual(['applied', 'mirror', 'unapplied', 'pending']);
    expect(GRANDFATHERED_DUPLICATE_PREFIXES).toEqual(['011']);
    expect(CONVENTION_FROM).toBe(14);
    expect(PROJECT_REF).toBe('swdrueaserjzhuxnzmeu');
  });
});

describe('classifyFiles', () => {
  it('splits forward, rollback and other, and ignores manifest.json', () => {
    expect(classifyFiles([...NAMES, 'README.md'])).toEqual({
      forward: [
        '001_a.sql',
        '002_b.sql',
        '003_c.sql',
        '014_d.sql',
        '015_e.sql',
      ],
      rollbacks: ['014_d_rollback.sql', '015_e_rollback.sql'],
      other: ['README.md'],
    });
  });
});

describe('validateManifest — the base manifest is valid', () => {
  it('returns no failures', () => {
    expect(validateManifest(base(), NAMES)).toEqual([]);
  });

  it('summarises', () => {
    expect(summarise(base(), NAMES)).toEqual({
      forward: 5,
      applied: 2,
      mirror: 1,
      unapplied: 1,
      pending: 1,
      rollbacks: 2,
      liveOnly: 1,
    });
  });
});

describe('R1 parseManifest', () => {
  const ok = JSON.stringify(base());
  it('accepts a valid manifest', () => {
    expect(parseManifest(ok).failures).toEqual([]);
    expect(parseManifest(ok).manifest).not.toBeNull();
  });
  it('rejects invalid JSON', () => {
    const r = parseManifest('{');
    expect(r.manifest).toBeNull();
    expectFailure(r.failures, 'not valid JSON');
  });
  it('rejects a non-object', () => {
    expectFailure(parseManifest('[]').failures, 'is not a JSON object');
  });
  it('rejects a wrong schemaVersion', () => {
    expectFailure(
      parseManifest(JSON.stringify({ ...base(), schemaVersion: 2 })).failures,
      'schemaVersion'
    );
  });
  it('rejects a wrong project', () => {
    expectFailure(
      parseManifest(JSON.stringify({ ...base(), project: 'other' })).failures,
      'project'
    );
  });
  it('rejects files as an object (JSON.parse drops duplicate keys)', () => {
    expectFailure(
      parseManifest(JSON.stringify({ ...base(), files: {} })).failures,
      '"files" must be an array'
    );
  });
  it('rejects an unknown top-level key', () => {
    expectFailure(
      parseManifest(JSON.stringify({ ...base(), extra: 1 })).failures,
      'unknown top-level key'
    );
  });
});

describe('validateManifest rules', () => {
  it('R2 a forward file with no entry', () => {
    expectFailure(
      validate(() => {}, [...NAMES, '016_f.sql', '016_f_rollback.sql']),
      '016_f.sql has no manifest entry'
    );
  });
  it('R3 an entry naming a missing file', () => {
    expectFailure(
      validate((m) =>
        m.files.push({ file: '009_gone.sql', status: 'mirror', note: 'x' })
      ),
      'names 009_gone.sql, which does not exist'
    );
  });
  it('R4 a rollback file listed', () => {
    expectFailure(
      validate((m) =>
        m.files.push({
          file: '014_d_rollback.sql',
          status: 'mirror',
          note: 'x',
        })
      ),
      'rollback files are not migrations'
    );
  });
  it('R5 a duplicate entry', () => {
    expectFailure(
      validate((m) =>
        m.files.push({ file: '003_c.sql', status: 'unapplied', reason: 'x' })
      ),
      'listed twice'
    );
  });
  it('R6 an unknown status', () => {
    expectFailure(
      validate((m) => (entry(m, '003_c.sql').status = 'skipped')),
      'unknown status'
    );
  });
  it('R7 applied with no live versions', () => {
    expectFailure(
      validate((m) => (entry(m, '001_a.sql').live = [])),
      'applied needs at least one live version'
    );
  });
  it('R7 applied with a nameless live row', () => {
    expectFailure(
      validate(
        (m) => (entry(m, '001_a.sql').live = [{ version: V1, name: '' }])
      ),
      'applied needs at least one live version'
    );
  });
  it('R7 applied carrying a reason', () => {
    expectFailure(
      validate((m) => (entry(m, '001_a.sql').reason = 'x')),
      'reason is only valid on an unapplied entry'
    );
  });
  it('R8 unapplied with a blank reason', () => {
    expectFailure(
      validate((m) => (entry(m, '003_c.sql').reason = '   ')),
      'unapplied needs a reason'
    );
  });
  it('R8 unapplied listing live versions', () => {
    expectFailure(
      validate(
        (m) => (entry(m, '003_c.sql').live = [{ version: V1, name: 'x' }])
      ),
      'unapplied must not list live versions'
    );
  });
  it('R9 mirror without a note', () => {
    expectFailure(
      validate((m) => delete entry(m, '002_b.sql').note),
      'mirror needs a note'
    );
  });
  it('R9 mirror related version not in liveOnly', () => {
    expectFailure(
      validate((m) => (entry(m, '002_b.sql').related = ['20260404000000'])),
      /related version 20260404000000 is not in liveOnly/
    );
  });
  it('R10 pending listing live versions', () => {
    expectFailure(
      validate(
        (m) =>
          (entry(m, '015_e.sql').live = [
            { version: '20260505000000', name: '015_e' },
          ])
      ),
      'pending must not list live versions'
    );
  });
  it.each([
    ['too short', '2026010100000'],
    ['month 13', '20261301000000'],
    ['day 00', '20260100000000'],
    ['hour 24', '20260101240000'],
    ['minute 60', '20260101006000'],
    ['second 60', '20260101000060'],
  ])('R11 malformed version (%s)', (_label, version) => {
    expectFailure(
      validate((m) => (entry(m, '001_a.sql').live[0].version = version)),
      'malformed version'
    );
  });
  it('R11 malformed liveOnly version', () => {
    expectFailure(
      validate((m) => (m.liveOnly[0].version = 'abc')),
      'malformed version'
    );
  });
  it('R12 a version claimed by a file and liveOnly', () => {
    expectFailure(
      validate((m) => m.liveOnly.push({ version: V1, name: 'dup', note: 'x' })),
      'accounted for twice'
    );
  });
  it('R13 a liveOnly row with no note', () => {
    expectFailure(
      validate((m) => (m.liveOnly[0].note = '')),
      /liveOnly .* needs a note/
    );
  });
  it('R13 a liveOnly row with no name', () => {
    expectFailure(
      validate((m) => delete m.liveOnly[0].name),
      /liveOnly .* needs a name/
    );
  });
  it('R14 an unknown field on a file entry', () => {
    expectFailure(
      validate((m) => (entry(m, '001_a.sql').notes = 'typo')),
      'unknown field notes'
    );
  });
  it('R14 an unknown field on a liveOnly entry', () => {
    expectFailure(
      validate((m) => (m.liveOnly[0].reason = 'x')),
      'unknown field reason'
    );
  });
  it('R14 an unknown field on a live row', () => {
    expectFailure(
      validate((m) => (entry(m, '001_a.sql').live[0].applied_at = 'x')),
      'unknown field applied_at'
    );
  });
  it('R15 an unexpected file in the directory', () => {
    expectFailure(
      validate(() => {}, [...NAMES, 'notes.md']),
      'unexpected file notes.md'
    );
    expectFailure(
      validate(() => {}, [...NAMES, '16_bad.sql']),
      'unexpected file 16_bad.sql'
    );
  });
  it('R16 a duplicate migration number outside the grandfathered list', () => {
    const names = [...NAMES, '014_z.sql', '014_z_rollback.sql'];
    expectFailure(
      validate(
        (m) => m.files.push({ file: '014_z.sql', status: 'pending' }),
        names
      ),
      'duplicate migration number 014'
    );
  });
  it('R16 tolerates the grandfathered 011 pair', () => {
    const names = [...NAMES, '011_x.sql', '011_y.sql'];
    const failures = validate((m) => {
      m.files.push({ file: '011_x.sql', status: 'unapplied', reason: 'x' });
      m.files.push({ file: '011_y.sql', status: 'unapplied', reason: 'y' });
    }, names);
    expect(failures).toEqual([]);
  });
  it('R17 a forward file from 014 on without its rollback', () => {
    expectFailure(
      validate(
        () => {},
        NAMES.filter((n) => n !== '015_e_rollback.sql')
      ),
      'needs 015_e_rollback.sql'
    );
  });
  it('R17 a rollback with no forward file', () => {
    expectFailure(
      validate(() => {}, [...NAMES, '004_x_rollback.sql']),
      'needs its forward migration 004_x.sql'
    );
  });
  it('R17 does not require rollbacks before 014', () => {
    expect(validate(() => {}).some((f) => f.includes('001_a_rollback'))).toBe(
      false
    );
  });
  it('R18 an applied file from 014 on under a different live name', () => {
    expectFailure(
      validate((m) => (entry(m, '014_d.sql').live[0].name = 'revoke_things')),
      'must be applied under its file stem'
    );
  });
  it('R18 accepts a stem-prefixed follow-up step', () => {
    expect(
      validate((m) =>
        entry(m, '014_d.sql').live.push({
          version: '20260202000100',
          name: '014_d_fixup',
        })
      )
    ).toEqual([]);
  });
  it('R19 a new (014+) file marked mirror', () => {
    const names = [...NAMES, '016_new_fn.sql', '016_new_fn_rollback.sql'];
    expectFailure(
      validate(
        (m) =>
          m.files.push({ file: '016_new_fn.sql', status: 'mirror', note: 'x' }),
        names
      ),
      /mirror is only valid for pre-014 files/
    );
  });
  it('R19 an existing pre-014 mirror still passes', () => {
    const failures = validate(() => {});
    expect(entry(base(), '002_b.sql').status).toBe('mirror');
    expect(failures.some((f) => f.includes('mirror is only valid'))).toBe(
      false
    );
  });
});

describe('validateManifest — smaller branches', () => {
  it('related with a malformed version', () => {
    expectFailure(
      validate((m) => (entry(m, '002_b.sql').related = ['nope'])),
      'related has malformed version'
    );
  });
  it('related on a non-mirror entry', () => {
    expectFailure(
      validate((m) => (entry(m, '003_c.sql').related = [V3])),
      'related is only valid on a mirror entry'
    );
  });
  it('reason on a pending entry', () => {
    expectFailure(
      validate((m) => (entry(m, '015_e.sql').reason = 'x')),
      'reason is only valid on an unapplied entry'
    );
  });
  it('issue not a positive integer on a file entry', () => {
    expectFailure(
      validate((m) => (entry(m, '003_c.sql').issue = '54')),
      '003_c.sql: issue must be a positive integer'
    );
  });
  it('issue not a positive integer on a liveOnly entry', () => {
    expectFailure(
      validate((m) => (m.liveOnly[0].issue = 0)),
      `liveOnly ${V3}: issue must be a positive integer`
    );
  });
  it('a mirror carrying live', () => {
    expectFailure(
      validate(
        (m) => (entry(m, '002_b.sql').live = [{ version: V1, name: 'x' }])
      ),
      'mirror must not list live versions'
    );
  });
  it('an entry with no file', () => {
    expectFailure(
      validate((m) => m.files.push({ status: 'pending' })),
      'needs a "file" naming a forward .sql'
    );
  });
});

describe('L1 parseLive', () => {
  it('rejects an unrecognised shape', () => {
    const r = parseLive('{"rows":[]}');
    expect(r.rows).toBeNull();
    expect(r.failures).toHaveLength(1);
  });
  it('accepts a bare array', () => {
    const r = parseLive(JSON.stringify(ROWS));
    expect(r.failures).toEqual([]);
    expect(r.rows).toEqual(ROWS);
  });
  it('accepts the list_migrations envelope', () => {
    expect(parseLive(JSON.stringify({ migrations: ROWS })).rows).toEqual(ROWS);
  });
  it('rejects invalid JSON and malformed rows', () => {
    expect(parseLive('nope').rows).toBeNull();
    expect(parseLive('[{"version":1}]').rows).toBeNull();
  });
});

describe('diffLive', () => {
  it('happy path: no drift and the counts add up', () => {
    const result = diffLive(withoutPending(), ROWS);
    expect(result.drift).toEqual([]);
    expect(result.counts).toEqual({
      live: 3,
      byFile: 2,
      liveOnly: 1,
      unapplied: 1,
      pending: 0,
    });
    expect(result.counts.byFile + result.counts.liveOnly).toBe(
      result.counts.live
    );
  });

  it('L2 applied-missing-live', () => {
    expect(
      kinds(
        diffLive(
          withoutPending(),
          ROWS.filter((r) => r.version !== V2)
        )
      )
    ).toContain('applied-missing-live');
  });
  it('L3 applied-name-mismatch', () => {
    const rows = ROWS.map((r) =>
      r.version === V2 ? { ...r, name: 'renamed' } : r
    );
    expect(kinds(diffLive(withoutPending(), rows))).toEqual([
      'applied-name-mismatch',
    ]);
  });
  it('L4 live-unaccounted', () => {
    const rows = [...ROWS, { version: '20260909000000', name: 'surprise' }];
    expect(kinds(diffLive(withoutPending(), rows))).toEqual([
      'live-unaccounted',
    ]);
  });
  it('L5 liveonly-missing-live', () => {
    expect(
      kinds(
        diffLive(
          withoutPending(),
          ROWS.filter((r) => r.version !== V3)
        )
      )
    ).toEqual(['liveonly-missing-live']);
  });
  it('L6 liveonly-name-mismatch', () => {
    const rows = ROWS.map((r) =>
      r.version === V3 ? { ...r, name: 'other' } : r
    );
    expect(kinds(diffLive(withoutPending(), rows))).toEqual([
      'liveonly-name-mismatch',
    ]);
  });
  it('L7 pending-not-applied', () => {
    expect(kinds(diffLive(base(), ROWS))).toEqual(['pending-not-applied']);
  });
  it('L8 pending-already-live (manifest not flipped)', () => {
    const rows = [...ROWS, { version: '20260505000000', name: '015_e' }];
    const k = kinds(diffLive(base(), rows));
    expect(k).toContain('pending-already-live');
    expect(k).not.toContain('pending-not-applied');
  });
  it('L9 unapplied-is-live', () => {
    const rows = [...ROWS, { version: '20260606000000', name: '003_c' }];
    expect(kinds(diffLive(withoutPending(), rows))).toContain(
      'unapplied-is-live'
    );
  });
});

describe('the real manifest', () => {
  const realManifest = JSON.parse(
    readFileSync(join(migrationsDir, 'manifest.json'), 'utf8')
  );

  it('parses', () => {
    expect(
      parseManifest(readFileSync(join(migrationsDir, 'manifest.json'), 'utf8'))
        .failures
    ).toEqual([]);
  });

  it('validates against the real migrations directory', () => {
    expect(validateManifest(realManifest, readdirSync(migrationsDir))).toEqual(
      []
    );
  });

  it('reconciles against the 2026-11-09 live snapshot', () => {
    const { rows } = parseLive(readFileSync(fixturePath, 'utf8'));
    const { drift, counts } = diffLive(realManifest, rows);
    // Discipline: the fixture is a verbatim `list_migrations` result. When
    // production changes — any other file applied, any live row added — refresh
    // the fixture from list_migrations in the SAME PR. This test is meant to
    // fail until you do; do not add a tolerance here to get it green — the
    // last one (for 014 while it was pending) was removed when 014 was applied.
    expect(drift).toEqual([]);
    expect(counts.live).toBe(32);
    expect(counts.byFile).toBe(9);
    expect(counts.liveOnly).toBe(23);
  });
});

describe('CLI', () => {
  it('exits 0 in manifest mode', () => {
    const out = execFileSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(out.startsWith('check:migrations: manifest OK')).toBe(true);
  });

  it('exits 0 in --live mode against the current snapshot', () => {
    const out = execFileSync(
      process.execPath,
      [scriptPath, '--live', fixturePath],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      }
    );
    expect(out).toContain('check:migrations: live OK');
  });

  it('exits 1 on drift in --live mode', () => {
    // The #429 incident shape: 011 is marked applied but production lacks it.
    const { rows } = parseLive(readFileSync(fixturePath, 'utf8'));
    const without011 = rows.filter(
      (r) => r.name !== '011_revoke_security_definer_execute'
    );
    const dir = mkdtempSync(join(tmpdir(), 'check-migrations-'));
    const driftPath = join(dir, 'live.json');
    writeFileSync(driftPath, JSON.stringify({ migrations: without011 }));
    let error;
    try {
      execFileSync(process.execPath, [scriptPath, '--live', driftPath], {
        cwd: repoRoot,
        stdio: 'pipe',
        encoding: 'utf8',
      });
    } catch (e) {
      error = e;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(error?.status).toBe(1);
    expect(error.stderr).toContain('Migration drift DETECTED');
    expect(error.stderr).toContain('drift-kinds: applied-missing-live');
  });

  it('exits 2 on an unreadable --live file', () => {
    let status;
    try {
      execFileSync(
        process.execPath,
        [scriptPath, '--live', '/nonexistent.json'],
        { cwd: repoRoot, stdio: 'pipe' }
      );
    } catch (e) {
      status = e.status;
    }
    expect(status).toBe(2);
  });

  it('exits 2 on a usage error', () => {
    let status;
    try {
      execFileSync(process.execPath, [scriptPath, '--bogus'], {
        cwd: repoRoot,
        stdio: 'pipe',
      });
    } catch (e) {
      status = e.status;
    }
    expect(status).toBe(2);
  });
});

describe('014 static guard', () => {
  // SQL line comments are stripped first: 014's header prose mentions both
  // "revoke" and service_role, and a guard on statements must not trip on
  // documentation (nor be satisfied by a statement that only appears in it).
  const sql = readFileSync(
    join(migrationsDir, '014_revoke_default_function_execute.sql'),
    'utf8'
  )
    .replace(/--.*$/gm, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  it('revokes the global default from PUBLIC', () => {
    expect(sql).toContain(
      'alter default privileges for role postgres revoke execute on functions from public'
    );
  });
  it('revokes the public-schema default from anon and authenticated', () => {
    expect(sql).toContain(
      'alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated'
    );
  });
  it('self-tests with the probe function', () => {
    expect(sql).toContain('__acl_probe_429');
  });
  it('never revokes from service_role', () => {
    expect(/revoke[^;]*service_role/i.test(sql)).toBe(false);
  });
});
