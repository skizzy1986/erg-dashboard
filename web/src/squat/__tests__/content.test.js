import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PHASES } from '../constants/phases.js';
import {
  GUIDE_PANES,
  MEASURED_PANE,
  METRICS_INTRO,
  PHASE_GUIDE,
} from '../constants/guide.js';
import { FORM_CHECK, FORM_CHECK_LABEL } from '../constants/formCheck.js';
import { METRICS_TABLE } from '../constants/metricsTable.js';
import { METHOD } from '../constants/method.js';
import {
  ACT_BANDS,
  ACT_BASIS,
  ACT_NONE,
  ACT_NOTE,
  HEAT_LEGEND,
  HEAT_STOPS,
  STALE_LINK,
} from '../constants/activationBands.js';
import { REGION_NAMES, REGION_OF } from '../constants/muscleRegions.js';
import { REFERENCES } from '../constants/references.js';
import { MV_TABLE } from '../constants/velocityTable.js';
import { ATTRIBUTION } from '../constants/attribution.js';
import { DATA_ASSET } from '../constants/dataAsset.js';
import * as SHARE from '../constants/share.js';
import { summariseRep } from '../utils/repSummary.js';

const ROOT = process.cwd();
const REFS_MD = readFileSync(join(ROOT, '../docs/squat/REFERENCES.md'), 'utf8');
const manifest = JSON.parse(
  readFileSync(join(ROOT, 'src/squat/assets/squat-manifest.json'), 'utf8')
);

// Flattens the segment format to plain text with model values filled in.
const text = (segments, kv = {}) =>
  segments
    .map((s) =>
      typeof s === 'string' ? s : s.k ? kv[s.k] : (s.b ?? s.i ?? s.code ?? '')
    )
    .join('');

describe('content counts', () => {
  it('has five phases in timeline order', () => {
    expect(PHASES.map((p) => p.name)).toEqual([
      'Setup and brace',
      'Lowering',
      'Bottom',
      'Drive',
      'Lockout',
    ]);
    expect(PHASES.map((p) => p.index)).toEqual([0, 1, 2, 3, 4]);
    for (const p of PHASES) expect(PHASE_GUIDE[p.id]).toBeDefined();
  });

  it('has five guide panes', () => {
    expect(GUIDE_PANES.map((p) => p.id)).toEqual([
      'phases',
      'metrics',
      'measured',
      'method',
      'sources',
    ]);
  });

  // The source table has 18 rows; the spec's "17" missed the last.
  it('has all eighteen metrics rows', () => {
    expect(METRICS_TABLE).toHaveLength(18);
    expect(METRICS_TABLE.at(-1).metric).toBe('Muscle length at the bottom');
  });

  it('has fifteen sources', () => {
    expect(REFERENCES).toHaveLength(15);
    expect(new Set(REFERENCES.map((r) => r.id)).size).toBe(15);
  });

  it('has ten form-check items, labelled as the reference ideal', () => {
    expect(FORM_CHECK).toHaveLength(10);
    expect(FORM_CHECK_LABEL).toBe('Reference ideal — modelled');
    const ids = new Set(REFERENCES.map((r) => r.id));
    for (const item of FORM_CHECK) {
      for (const s of item.sources) expect(ids.has(s)).toBe(true);
    }
  });
});

describe('numbers and citations match docs/squat/REFERENCES.md', () => {
  it.each([
    ['Wretenberg ratio', 'Hip 230 N·m, knee 191 N·m', 'hip 230, knee 191 N·m'],
    ['ankle range', '32 ± 3°', 'about 32 ± 3° range'],
    ['lumbar flexion', '13°', '13–26° lumbar flexion'],
  ])('%s', (_label, inDoc, inTable) => {
    expect(REFS_MD).toContain(inDoc);
    expect(METRICS_TABLE.map((r) => text(r.target)).join('\n')).toContain(
      inTable
    );
  });

  it('carries the full-squat velocity table exactly', () => {
    expect(REFS_MD).toContain(
      '50% 1.08, 60% 0.95, 70% 0.82, 80% 0.67, 90% 0.50, 95% 0.42, 1RM 0.32 m/s'
    );
    expect(MV_TABLE).toEqual([
      [1.08, 50],
      [0.95, 60],
      [0.82, 70],
      [0.67, 80],
      [0.5, 90],
      [0.42, 95],
      [0.32, 100],
    ]);
  });

  it('pins the sticking region and the eccentric mode factor', () => {
    expect(REFS_MD).toContain('Sticking band (8–22 cm)');
    expect(REFS_MD).toContain('Mode factor 0.62');
    expect(text(METHOD.modelled[5])).toContain('about 0.62 of the activation');
  });

  it('cites every journal reference with the volume and pages the doc gives', () => {
    const cites = REFERENCES.map((r) => text(r.citation));
    for (const [needle, doc] of [
      ['28(2):218–224', '28(2):218–224'],
      ['1:E80–E88', '1:E80–E88'],
      ['36(6):4–27', '36(6):4–27'],
      ['24(10):2731–2741', '24(10):2731–2741'],
      ['81(6):2339–2346', '81(6):2339–2346'],
      ['29(9):1223–1230', '29(9):1223–1230'],
      ['38(5):981–992', '38(5):981–992'],
      ['10:924', '10:924'],
    ]) {
      expect(REFS_MD).toContain(doc);
      expect(cites.some((c) => c.includes(needle))).toBe(true);
    }
  });

  it('links to the same URLs the doc lists', () => {
    const urls = REFERENCES.flatMap((r) => r.links.map((l) => l.url));
    for (const u of [
      'https://pubmed.ncbi.nlm.nih.gov/8775157',
      'https://www.thieme-connect.de/products/ejournals/pdf/10.1055/s-0043-102933.pdf',
      'https://ojs.ub.uni-konstanz.de/cpa/article/view/6649',
      'https://www.sponet.de/Record/4037610',
      'https://openrepository.aut.ac.nz/items/dfd50d9d-184a-470b-a677-0039c63c55bd',
      'https://pubmed.ncbi.nlm.nih.gov/25506270/',
      'https://knowledge.lancashire.ac.uk/id/eprint/47042/',
      'https://doi.org/10.1038/s41597-023-02840-6',
    ]) {
      expect(REFS_MD).toContain(u);
      expect(urls).toContain(u);
    }
    for (const u of urls) expect(u).toMatch(/^https:\/\//);
  });

  it('pins fixed literals in the form check and targets', () => {
    const refs = FORM_CHECK.map((f) => text(f.ref, { er: '90°' }));
    expect(refs).toContain('Target: within ±25 mm of midfoot all rep');
    expect(refs).toContain('Target: 25–60%, heels down, toes relaxed');
    expect(refs).toContain(
      'Controlled 1.5–2 s descent. 0.59–0.67 m/s ≈ 80–85% 1RM (Sánchez-Medina 2017)'
    );
    expect(refs).toContain(
      'Shoulder external rotation 90° is the top of normal range. If it is out of reach, widen the grip'
    );
    expect(METRICS_INTRO).toContain('Myer et al. (2014)');
  });
});

describe('modelled values are labelled modelled, never EMG', () => {
  const allProse = [
    ...METRICS_TABLE.flatMap((r) => [r.metric, text(r.target), r.why]),
    ...FORM_CHECK.flatMap((f) => [f.name, text(f.ref)]),
    ...METHOD.modelled.map((s) => text(s)),
    ...Object.values(PHASE_GUIDE).flatMap((g) =>
      g.body.map((s) => text(s)).concat(g.lookFor, g.faults)
    ),
    // Every user-facing activation string the muscle panel renders. Without
    // these the "not EMG" requirement was unenforced for all of the new UI.
    ...ACT_BANDS.map((b) => b.name),
    ACT_NOTE,
    ACT_BASIS,
    ACT_NONE,
    HEAT_LEGEND,
    STALE_LINK,
    ...REGION_NAMES,
  ].join('\n');

  // The 118 `role` sentences from the data. PR2b-i's muscle card is the first
  // thing that ever renders them, two lines above "Indicative estimate, not
  // EMG." — so they are prose this page publishes, and they are scanned like
  // any other. Scoped to what the UI shows, not to the file the spec named:
  // that narrower scope is how one EMG claim reached the card.
  const roles = manifest.meta.muscles.map((m) => m.role).join('\n');

  it('never cites EMG in a muscle role sentence', () => {
    expect(manifest.meta.muscles).toHaveLength(118);
    for (const m of manifest.meta.muscles) {
      expect(m.role, m.name).toBeTruthy();
      expect(m.role, m.name).not.toMatch(/\bEMG\b/i);
    }
    expect(roles).not.toMatch(/\bEMG\b/i);
    // The one that was edited, so the wording cannot drift back.
    expect(manifest.meta.muscles[9].name).toBe('Rectus femoris');
    expect(manifest.meta.muscles[9].role).toBe(
      'The only quad that crosses the hip, so its length barely changes in a squat. It works at roughly half the level of the vasti.'
    );
  });

  it('never puts EMG next to an activation label', () => {
    expect(allProse).not.toMatch(/EMG\s+activation|activation\s*\(?EMG/i);
    expect(allProse).not.toMatch(/measured activation/i);
    expect(roles).not.toMatch(/EMG\s+activation|activation\s*\(?EMG/i);
    expect(roles).not.toMatch(/measured activation/i);
    const row = METRICS_TABLE.find((r) => r.metric === 'Estimated activation');
    expect(text(row.target)).toMatch(/^Estimated from joint moments, not EMG/);
  });

  it('says activation is estimated, not measured', () => {
    expect(text(METHOD.modelled[5])).toContain('Estimated, not measured.');
  });

  it("labels the bands as the model's own steps, with no citation implied", () => {
    expect(ACT_NOTE).toBe('Indicative estimate, not EMG.');
    expect(ACT_BASIS).toBe(
      "Bands are this model's own colour steps, not a published threshold."
    );
    expect(ACT_NONE).toBe('Not a muscle — no activation estimate.');
    expect(HEAT_LEGEND).toBe(
      'Estimated activation at the depth shown. Indicative estimate, not EMG. Tendons are not coloured.'
    );
    expect(STALE_LINK).toBe(
      'That link points to a muscle this version does not have.'
    );
    for (const s of [ACT_NOTE, ACT_BASIS, ACT_NONE, HEAT_LEGEND]) {
      expect(s).not.toMatch(/\b(19|20)\d\d\b/);
    }
  });

  it("cuts three bands at the model's own ramp stops", () => {
    expect(ACT_BANDS.map((b) => b.name)).toEqual(['Low', 'Moderate', 'High']);
    expect(ACT_BANDS.map((b) => b.max)).toEqual([0.3, 0.6, 1]);
    expect(HEAT_STOPS).toEqual([0, 0.3, 0.6, 1]);
  });

  it('describes the importer without pretending it is live', () => {
    expect(MEASURED_PANE.comingSoon).toMatch(/later release/);
  });
});

describe('derived model values', () => {
  const s = summariseRep(manifest.meta);

  it('reproduces the source CHANGELOG figures for v3', () => {
    expect(s.kv.ecc).toBe('1.63 s');
    expect(s.kv.con).toBe('0.92 s');
    expect(s.kv.trans).toBe('0.30 s');
    expect(s.kv.mcv).toBe('0.61 m/s');
    expect(s.kv.er).toBe('90°');
    expect(s.kv.elev).toBe('27°');
    expect(s.kv.elbow).toBe('130°');
    expect(s.kv.wrist).toBe('6°');
    expect(s.kv.grip).toBe('79 cm');
    expect(s.kv.cop0).toBe('48%');
    expect(s.kv.cop1).toBe('31%');
    expect(s.metrics[9]).toBe('1.15 at depth');
    expect(s.metrics[11]).toBe('0.74–1.38× system weight');
  });

  it('gives one value per form-check item and metrics row', () => {
    expect(s.checks).toHaveLength(FORM_CHECK.length);
    expect(s.metrics).toHaveLength(METRICS_TABLE.length);
    for (const v of [...s.checks, ...s.metrics]) expect(v).toBeTruthy();
  });

  it('fills every model value the prose asks for', () => {
    const keys = new Set();
    const walk = (segs) =>
      segs.forEach((x) => typeof x === 'object' && x.k && keys.add(x.k));
    Object.values(PHASE_GUIDE).forEach((g) => {
      g.body.forEach(walk);
      g.facts.forEach(([, v]) => typeof v === 'object' && keys.add(v.k));
    });
    METHOD.modelled.forEach(walk);
    FORM_CHECK.forEach((f) => walk(f.ref));
    METRICS_TABLE.forEach((r) => walk(r.target));
    for (const k of keys) expect(s.kv[k], k).toBeTruthy();
  });
});

// Index-keyed, so a data regeneration that reorders meta.muscles would move
// every assignment silently. The sha pin above is what makes that impossible
// without a human re-deriving the table; these assert the shape.
describe('muscle regions', () => {
  it('has eleven named regions, hips first', () => {
    expect(REGION_NAMES).toHaveLength(11);
    expect(REGION_NAMES[0]).toBe('Hip extensors');
    expect(new Set(REGION_NAMES).size).toBe(11);
  });

  it('assigns all 118 muscles to exactly one real region, with no Other', () => {
    expect(REGION_OF).toHaveLength(manifest.meta.muscles.length);
    expect(REGION_OF).toHaveLength(118);
    for (const r of REGION_OF) {
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(REGION_NAMES.length);
    }
    expect(new Set(REGION_OF).size).toBe(11);
    expect(REGION_NAMES).not.toContain('Other');
  });
});

describe('data asset', () => {
  const sha = (p) =>
    createHash('sha256')
      .update(readFileSync(join(ROOT, 'src/squat/assets', p)))
      .digest('hex');

  it('commits exactly the extracted files', () => {
    expect(sha(DATA_ASSET.bin.file)).toBe(DATA_ASSET.bin.sha256);
    expect(sha(DATA_ASSET.manifest.file)).toBe(DATA_ASSET.manifest.sha256);
  });

  it('attributes BodyParts3D under CC BY-SA 2.1 JP', () => {
    expect(ATTRIBUTION.anatomy).toBe(
      'Anatomy: BodyParts3D © DBCLS, CC BY-SA 2.1 JP'
    );
    const licence = readFileSync(
      join(ROOT, 'src/squat/assets/LICENSE.md'),
      'utf8'
    );
    expect(licence).toContain('squat-anatomy.bin');
    expect(licence).toContain('squat-manifest.json');
    expect(licence).toContain('CC BY-SA 2.1 JP');
  });
});

// The Knee-flexion row's "why" makes a claim about the data ("slightly deeper
// than the study mean"), so the data is pinned beside it. If the model is
// re-run and the bottom knee angle moves, this fails before the prose lies.
describe('knee flexion text agrees with the modelled rep', () => {
  const i = METRICS_TABLE.findIndex((r) => r.metric === 'Knee flexion');
  const row = METRICS_TABLE[i];
  const modelled = summariseRep(manifest.meta).metrics[i];

  it('pins the modelled bottom knee flexion', () => {
    expect(modelled).toBe('131°');
  });

  it('is deeper than the 124 ± 7° study mean, but within one SD', () => {
    expect(row.target[0]).toMatch(/about 124 ± 7°/);
    expect(row.why).toMatch(/slightly deeper than the study mean/);
    const deg = Number.parseInt(modelled, 10);
    expect(deg).toBeGreaterThan(124);
    expect(deg).toBeLessThanOrEqual(124 + 7);
  });
});

// R11 (criterion 15): the share UI makes no measured or recorded claim. The
// recipient lands on the full tool, with its "Modelled, not measured" label.
describe('share strings', () => {
  const strings = Object.entries(SHARE).filter(
    ([, v]) => typeof v === 'string'
  );

  it('are all scanned', () => {
    expect(strings.length).toBeGreaterThanOrEqual(9);
  });

  it.each(strings)('%s claims nothing measured or recorded', (_k, text) => {
    expect(text).not.toMatch(/measur|record/i);
  });
});
