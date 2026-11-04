import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createPoser } from '../poseModel.js';
import { createCurves, curvesAt, evalBind } from '../curveSkin.js';
import { depthIndex } from '../depth.js';
import { transformPoint } from '../quat.js';
import { viewArray } from '../../../squat/utils/manifest.js';
import { dequantise } from '../../../squat/utils/dequantise.js';
import { DATA_ASSET } from '../../../squat/constants/dataAsset.js';

// The reference positions come from the published page's own posing
// functions run in a real browser (docs/squat/SKINNING.md §11). A port that
// matches them to 1e-5 m is posing the model the way the page does.
const ASSETS = join(process.cwd(), 'src/squat/assets');
const FIXTURE = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      'src/anatomy/utils/__tests__/fixtures/squat-skinning-fixture.json'
    ),
    'utf8'
  )
);
const manifestBytes = readFileSync(join(ASSETS, DATA_ASSET.manifest.file));
const binBytes = readFileSync(join(ASSETS, DATA_ASSET.bin.file));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const raw = gunzipSync(binBytes);
const buffer = raw.buffer.slice(
  raw.byteOffset,
  raw.byteOffset + raw.byteLength
);
const TOL = FIXTURE.tolerance_m;
const sha = (b) => createHash('sha256').update(b).digest('hex');

const near = (actual, expected) => {
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThanOrEqual(TOL);
  }
};

describe('posing fixture data version', () => {
  it('was generated against the data this repo ships', () => {
    const v = FIXTURE.data_version;
    const message =
      'Anatomy data version changed — regenerate the posing fixture ' +
      '(docs/squat/SKINNING.md §11) before trusting these tests.';
    expect(DATA_ASSET.bin.sha256, message).toBe(v.bin_sha256);
    expect(DATA_ASSET.bin.rawBytes, message).toBe(v.bin_raw_bytes);
    expect(DATA_ASSET.manifest.sha256, message).toBe(v.manifest_sha256);
    expect(sha(binBytes), message).toBe(v.bin_sha256);
    // The repo manifest is a re-serialisation of the page's (99,904 vs
    // 100,785 bytes, same values — SKINNING.md §9.7), so it is pinned by its
    // own hash, recorded in the fixture alongside the page's.
    expect(sha(manifestBytes), message).toBe(v.manifest_sha256);
    expect(FIXTURE.source.manifest_bytes_embedded).not.toBe(
      manifestBytes.byteLength
    );
    expect(raw.byteLength, message).toBe(
      FIXTURE.source.blob_bytes_decompressed
    );
  });
});

describe('createPoser', () => {
  const poser = createPoser(manifest, buffer);

  it('takes its sample count from the data', () => {
    expect(poser.ns).toBe(manifest.meta.S.length);
    expect(poser.cmPos).toHaveLength(manifest.meta.cm_nv * 3);
    expect(poser.lbPos).toHaveLength(manifest.meta.lbs.nv * 3);
  });

  it('reads the vertex inputs the fixture was built from', () => {
    const A = (n) => viewArray(manifest, buffer, n);
    for (const [v, inp] of Object.entries(FIXTURE.vertex_inputs.cm)) {
      const i = Number(v);
      expect(A('cm_c1')[i]).toBe(inp.c1);
      expect(A('cm_c2')[i]).toBe(inp.c2);
      expect(A('cm_w')[i]).toBe(inp.w);
      expect(A('cm_s1')[i]).toBe(inp.s1);
      expect(A('cm_s2')[i]).toBe(inp.s2);
      expect([...A('cm_l1').subarray(i * 3, i * 3 + 3)]).toEqual(inp.l1);
      expect([...A('cm_l2').subarray(i * 3, i * 3 + 3)]).toEqual(inp.l2);
      expect(A('cm_mid')[i]).toBe(inp.mid);
    }
    const lbm = manifest.meta.lbs;
    const rest = dequantise(A('lb_pos'), lbm.c, lbm.s);
    for (const [v, inp] of Object.entries(FIXTURE.vertex_inputs.lb)) {
      const i = Number(v);
      expect(A('lb_i0')[i]).toBe(inp.i0);
      expect(A('lb_w')[i]).toBe(inp.w);
      expect(lbm.frames[inp.i0]).toBe(inp.frame0);
      expect(lbm.frames[inp.i0 + 1]).toBe(inp.frame1);
      near(rest.subarray(i * 3, i * 3 + 3), inp.rest);
    }
    const bm = manifest.meta.bones.femur_r;
    const femur = dequantise(A('bone_femur_r_pos'), bm.c, bm.s);
    near(femur.subarray(0, 3), FIXTURE.vertex_inputs.bone_femur_r[0].stored);
  });

  it.each(Object.keys(FIXTURE.samples))('matches the page at S = %s', (S) => {
    const smp = FIXTURE.samples[S];
    const d = poser.poseAt(Number(S));
    expect(d.i0).toBe(smp.i0);
    expect(d.i1).toBe(smp.i1);
    expect(d.t).toBeCloseTo(smp.t, 12);

    for (const [v, exp] of Object.entries(smp.cm)) {
      const i = Number(v);
      near(poser.cmPos.subarray(i * 3, i * 3 + 3), exp);
    }
    // The left copy is the same geometry under scale z = −1.
    for (const [v, exp] of Object.entries(smp.cm_left)) {
      const i = Number(v);
      const p = poser.cmPos.subarray(i * 3, i * 3 + 3);
      near([p[0], p[1], -p[2]], exp);
    }
    for (const [v, exp] of Object.entries(smp.lb)) {
      const i = Number(v);
      near(poser.lbPos.subarray(i * 3, i * 3 + 3), exp);
    }

    const m = poser.matrixFor('femur_r');
    near(m, smp.frame_femur_r_matrix4_elements_column_major);
    const stored = FIXTURE.vertex_inputs.bone_femur_r[0].stored;
    near(
      transformPoint(m, 0, stored[0], stored[1], stored[2], [0, 0, 0]),
      smp.bone_femur_r[0]
    );
  });

  it('reproduces the cm vertex 0 trace step by step', () => {
    const ns = manifest.meta.S.length;
    const curves = createCurves(manifest.meta.curves, ns);
    const cvPos = viewArray(manifest, buffer, 'cv_pos');
    const cvQuat = viewArray(manifest, buffer, 'cv_quat');
    for (const trace of Object.values(FIXTURE.trace_cm_vertex_0)) {
      const { i0, i1, t } = depthIndex(trace.S, ns);
      curvesAt(curves, cvPos, cvQuat, i0, i1, t);
      const inp = FIXTURE.vertex_inputs.cm[0];
      const posed = trace.bindings.map((b, k) => {
        const cv = curves[b.curve];
        expect(cv.n).toBe(b.n);
        expect(cv.nseg).toBe(b.nseg);
        expect(cv.s).toBeCloseTo(b.sig_at_S, 4);
        const l = k === 0 ? inp.l1 : inp.l2;
        const out = evalBind(cv, b.s, l[0], l[1], l[2], manifest.meta.LQ, []);
        near(out, b.posed);
        return out;
      });
      const w = inp.w / 255;
      near(
        posed[0].map((x, r) => x * w + posed[1][r] * (1 - w)),
        trace.blended
      );
    }
  });

  it('allocates nothing per pose — the same buffers come back', () => {
    const { cmPos, lbPos, frames } = poser;
    poser.poseAt(0.7);
    expect(poser.cmPos).toBe(cmPos);
    expect(poser.lbPos).toBe(lbPos);
    expect(poser.frames).toBe(frames);
  });

  it('resolves static foot transforms and rejects unknown frames', () => {
    expect(poser.matrixFor('@calcn_r')).toHaveLength(16);
    expect(() => poser.matrixFor('@nope')).toThrow(/No static/);
    expect(() => poser.matrixFor('nope')).toThrow(/No frame/);
  });

  it('refuses data whose tables disagree with meta.S', () => {
    const bad = { ...manifest, meta: { ...manifest.meta, S: [0, 0.5, 1] } };
    expect(() => createPoser(bad, buffer)).toThrow(/does not match meta\.S/);
    const badCurve = {
      ...manifest,
      meta: {
        ...manifest.meta,
        curves: manifest.meta.curves.map((c, i) =>
          i ? c : { ...c, sig: c.sig.slice(1) }
        ),
      },
    };
    expect(() => createPoser(badCurve, buffer)).toThrow(/sig table/);
    const badTrunk = {
      ...manifest,
      meta: {
        ...manifest.meta,
        lbs: { ...manifest.meta.lbs, frames: ['nope'] },
      },
    };
    expect(() => createPoser(badTrunk, buffer)).toThrow(/Trunk frame/);
  });
});
