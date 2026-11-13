import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { BufferGeometry, DirectionalLight } from 'three';
import { createAnatomyScene } from '../createAnatomyScene.js';
import {
  emphasise,
  heatColours,
  muscleColours,
  scenePalette,
  writeVertexColours,
} from '../../utils/sceneColours.js';
import { viewArray } from '../../utils/arrays.js';
import { sceneStyle } from '../../constants/sceneStyle.js';
import { fromOffset } from '../../utils/cameraMath.js';

// jsdom has no WebGL, so the real renderer is swapped for a recorder. The rest
// of three (geometry, materials, lights, the scene graph) and OrbitControls
// are real, which is what makes a mid-build failure realistic: by the time
// the controls are built, the canvas, renderer, lights and every geometry
// already exist and must all be released.
const fake = vi.hoisted(() => ({
  rendererThrows: false,
  controlsThrows: false,
  renderers: [],
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal();
  class FakeRenderer {
    constructor({ canvas }) {
      if (fake.rendererThrows) throw new Error('WebGL context failed');
      this.domElement = canvas;
      this.shadowMap = { enabled: false };
      this.setPixelRatio = vi.fn();
      this.setClearAlpha = vi.fn();
      this.setSize = vi.fn();
      this.render = vi.fn();
      this.dispose = vi.fn();
      this.forceContextLoss = vi.fn();
      fake.renderers.push(this);
    }
  }
  return { ...actual, WebGLRenderer: FakeRenderer };
});

vi.mock('three/addons/controls/OrbitControls.js', async (importOriginal) => {
  const actual = await importOriginal();
  class MaybeThrowing extends actual.OrbitControls {
    constructor(...args) {
      if (fake.controlsThrows) throw new Error('controls failed');
      super(...args);
    }
  }
  return { OrbitControls: MaybeThrowing };
});

const ASSETS = join(process.cwd(), 'src/squat/assets');
const manifest = JSON.parse(
  readFileSync(join(ASSETS, 'squat-manifest.json'), 'utf8')
);
const raw = gunzipSync(readFileSync(join(ASSETS, 'squat-anatomy.bin')));
const buffer = raw.buffer.slice(
  raw.byteOffset,
  raw.byteOffset + raw.byteLength
);

const build = (container, extra = {}) =>
  createAnatomyScene({
    container,
    manifest,
    buffer,
    palette: scenePalette('dark'),
    style: sceneStyle('dark'),
    ...extra,
  });

let container;
beforeEach(() => {
  fake.rendererThrows = false;
  fake.controlsThrows = false;
  fake.renderers.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => {
  container.remove();
  vi.restoreAllMocks();
});

describe('createAnatomyScene teardown', () => {
  it('leaves nothing behind when the renderer cannot be created', () => {
    fake.rendererThrows = true;
    expect(() => build(container)).toThrow('WebGL context failed');
    expect(container.childElementCount).toBe(0);
    expect(window.__anatomyFrames).toBeUndefined();
  });

  it('releases everything built so far when construction fails midway', () => {
    const geoDispose = vi.spyOn(BufferGeometry.prototype, 'dispose');
    const lightDispose = vi.spyOn(DirectionalLight.prototype, 'dispose');
    const removeDoc = vi.spyOn(document, 'removeEventListener');
    fake.controlsThrows = true;
    expect(() => build(container)).toThrow('controls failed');

    expect(container.childElementCount).toBe(0);
    const [renderer] = fake.renderers;
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    // Every bone, muscle set, bar part and the ground — all already built.
    expect(geoDispose.mock.calls.length).toBeGreaterThan(20);
    expect(lightDispose).toHaveBeenCalledTimes(3);
    // Nothing was listening yet, so nothing is left listening either.
    expect(removeDoc).not.toHaveBeenCalledWith(
      'visibilitychange',
      expect.anything()
    );
  });

  it('does not accumulate canvases across failed retries', () => {
    fake.controlsThrows = true;
    for (let i = 0; i < 3; i++) expect(() => build(container)).toThrow();
    expect(container.childElementCount).toBe(0);
    expect(
      fake.renderers.every((r) => r.forceContextLoss.mock.calls.length === 1)
    ).toBe(true);
  });

  it('a successful build owns one hidden, untabbable canvas, and dispose releases it all', () => {
    const lightDispose = vi.spyOn(DirectionalLight.prototype, 'dispose');
    const removeDoc = vi.spyOn(document, 'removeEventListener');
    const ctl = build(container);
    expect(container.childElementCount).toBe(1);
    const canvas = container.firstElementChild;
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.tabIndex).toBe(-1);

    ctl.dispose();
    ctl.dispose();
    expect(container.childElementCount).toBe(0);
    const [renderer] = fake.renderers;
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    // key, rim and fill; the key's dispose also releases its shadow map.
    expect(lightDispose).toHaveBeenCalledTimes(3);
    expect(removeDoc).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
    expect(window.__anatomyFrames).toBeUndefined();
    expect(window.__anatomyDebug).toBeUndefined();
  });
});

// The heatmap against the REAL scene: real three geometry, real BufferAttributes,
// real colour writes. The pure-function test and the text pins in
// sceneParity.test.js all pass if writeColours() writes the wrong colours into
// the wrong attribute; only this catches that.
describe('setActivation on a built scene', () => {
  // Deterministic, spread across the ramp, and built here rather than imported
  // from squat/utils/activation.js — anatomy/ must not reach into squat/.
  const weightsFor = (n) =>
    Float32Array.from({ length: n }, (_, i) => (i % 11) / 10);

  // Captures the queued frame callbacks so a frame can be driven on demand.
  // Only the batch pending at call time is run, so a self-requeuing frame
  // (damping) cannot spin.
  function frameDriver() {
    const q = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      q.push(cb);
      return q.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    return () => {
      for (const cb of q.splice(0)) cb(0);
    };
  }

  const colourAttrs = (spy) =>
    spy.mock.calls.filter(([name]) => name === 'color').map(([, attr]) => attr);
  const snapshot = (attrs) => attrs.map((a) => Float32Array.from(a.array));

  // What the colour attribute for one muscle set MUST hold, recomputed from
  // the pure helpers. Comparing a restore against the scene's own earlier
  // output only proves it is self-consistent — a swapped blend constant, or
  // the wrong colour source, would be stable and therefore invisible. These
  // name tendonBlend and tendonBlendHeat explicitly, so swapping them fails.
  const expectedColours = ({ mid, tw, weights, palette, style }) =>
    writeVertexColours(
      new Float32Array(mid.length * 3),
      mid,
      tw,
      weights
        ? heatColours(
            manifest.meta.muscles,
            weights,
            palette.heat,
            palette.tendon
          )
        : muscleColours(manifest.meta.muscles, palette, style.jitter),
      palette.tendon,
      weights ? style.tendonBlendHeat : style.tendonBlend
    );

  // The scene's makeSet call order: cm, lb, st, sa. lb is skipped — its tendon
  // weights are all zero, so it cannot tell the two blends apart.
  const SETS = [
    { name: 'cm', at: 0, mid: 'cm_mid', tw: 'cm_tw' },
    { name: 'st', at: 2, mid: 'st_mid', tw: 'st_tw' },
    { name: 'sa', at: 3, mid: 'sa_mid', tw: 'sa_tw' },
  ];
  const A = (name) => viewArray(manifest, buffer, name);
  const assertMatches = (shot, weights, label) => {
    const palette = scenePalette('dark');
    const style = sceneStyle('dark');
    for (const set of SETS) {
      expect([...shot[set.at]], `${set.name} ${label}`).toEqual([
        ...expectedColours({
          mid: A(set.mid),
          tw: A(set.tw),
          weights,
          palette,
          style,
        }),
      ]);
    }
  };

  it('recolours every muscle set, then restores byte-identical anatomy colours', () => {
    const drive = frameDriver();
    const setAttr = vi.spyOn(BufferGeometry.prototype, 'setAttribute');
    const ctl = build(container);
    const attrs = colourAttrs(setAttr);
    // cm (curve), lb (trunk), st (static upper) and sa (intercostals).
    expect(attrs).toHaveLength(4);
    for (const a of attrs) expect(a.array.length).toBeGreaterThan(0);

    const anatomy = snapshot(attrs);
    expect(anatomy.some((a) => a.some((c) => c !== 0))).toBe(true);
    const versions = attrs.map((a) => a.version);
    // The built scene's colours are the ones the helpers specify, tendon
    // blend included — not merely whatever the scene happened to write.
    assertMatches(anatomy, null, 'anatomy');

    const w = weightsFor(manifest.meta.muscles.length);
    ctl.setActivation(w);
    drive();
    const heat = snapshot(attrs);
    // Every set really changed — not just the first one the loop touches.
    heat.forEach((a, i) =>
      expect([...a], `set ${i}`).not.toEqual([...anatomy[i]])
    );
    attrs.forEach((a, i) =>
      expect(a.version, `set ${i}`).toBeGreaterThan(versions[i])
    );
    // Changed to the ramp at the softer blend, not to something that merely
    // differs.
    assertMatches(heat, w, 'heat');

    ctl.setActivation(null);
    drive();
    snapshot(attrs).forEach((a, i) =>
      expect([...a], `set ${i}`).toEqual([...anatomy[i]])
    );
    ctl.dispose();
  });

  it('is a no-op for weights equal to the ones already applied', () => {
    const drive = frameDriver();
    const setAttr = vi.spyOn(BufferGeometry.prototype, 'setAttribute');
    const ctl = build(container);
    const attrs = colourAttrs(setAttr);
    drive();

    const w = weightsFor(manifest.meta.muscles.length);
    ctl.setActivation(w);
    drive();
    const after = snapshot(attrs);
    const versions = attrs.map((a) => a.version);
    const renders = fake.renderers[0].render.mock.calls.length;

    // A different array object holding the same numbers: no repaint, and no
    // frame requested — this is what keeps a depth drag from recolouring
    // 50,119 vertices on every one of the 41 steps.
    ctl.setActivation(Float32Array.from(w));
    drive();
    attrs.forEach((a, i) => expect(a.version, `set ${i}`).toBe(versions[i]));
    snapshot(attrs).forEach((a, i) => expect([...a]).toEqual([...after[i]]));
    expect(fake.renderers[0].render.mock.calls.length).toBe(renders);

    // And setActivation(null) twice is a no-op the second time.
    ctl.setActivation(null);
    drive();
    const nulled = attrs.map((a) => a.version);
    ctl.setActivation(null);
    drive();
    attrs.forEach((a, i) => expect(a.version).toBe(nulled[i]));
    ctl.dispose();
  });

  it('draws ONE frame for a depth change, with the new colours already in it', () => {
    const drive = frameDriver();
    const setAttr = vi.spyOn(BufferGeometry.prototype, 'setAttribute');
    const ctl = build(container);
    const attrs = colourAttrs(setAttr);
    drive();
    const renderer = fake.renderers[0];
    const before = Float32Array.from(attrs[0].array);

    // What the renderer SAW, captured at draw time. A render count alone
    // cannot tell a recolour that happened before the draw from one that
    // happened after it and left the drawn frame a step stale.
    const drawn = [];
    renderer.render.mockImplementation(() => {
      drawn.push(Float32Array.from(attrs[0].array));
    });

    ctl.setDepth(0.5);
    ctl.setActivation(weightsFor(manifest.meta.muscles.length));
    drive();

    expect(drawn).toHaveLength(1);
    expect([...drawn[0]]).not.toEqual([...before]);
    expect([...drawn[0]]).toEqual([...attrs[0].array]);
    ctl.dispose();
  });

  it('keeps the heatmap across a theme change, and the theme across a toggle', () => {
    const drive = frameDriver();
    const setAttr = vi.spyOn(BufferGeometry.prototype, 'setAttribute');
    const ctl = build(container);
    const attrs = colourAttrs(setAttr);
    const darkAnatomy = snapshot(attrs);

    const w = weightsFor(manifest.meta.muscles.length);
    ctl.setActivation(w);
    drive();
    const darkHeat = snapshot(attrs);

    ctl.setPalette(scenePalette('light'), sceneStyle('light'));
    drive();
    const lightHeat = snapshot(attrs);
    // Still the heatmap (the light ramp differs from the light anatomy
    // colours), and the ramp tokens are theme-identical, so the heat colours
    // themselves do not move — the tendon blend ground does.
    lightHeat.forEach((a, i) =>
      expect([...a]).not.toEqual([...darkAnatomy[i]])
    );

    ctl.setActivation(null);
    drive();
    const lightAnatomy = snapshot(attrs);
    lightAnatomy.forEach((a, i) =>
      expect([...a]).not.toEqual([...darkAnatomy[i]])
    );
    lightAnatomy.forEach((a, i) =>
      expect([...a]).not.toEqual([...lightHeat[i]])
    );

    ctl.setPalette(scenePalette('dark'), sceneStyle('dark'));
    drive();
    snapshot(attrs).forEach((a, i) =>
      expect([...a]).toEqual([...darkAnatomy[i]])
    );
    expect(darkHeat.length).toBe(4);
    ctl.dispose();
  });

  // PR B's strain focus rides the same write: setFocus(mask) must reach the
  // colour attributes as emphasise() specifies, and an equal mask must not
  // repaint. The regex pins in sceneParity.test.js stay as a secondary guard.
  const maskFor = (n) =>
    Uint8Array.from({ length: n }, (_, i) => +(i % 7 === 0));
  const expectedFocus = ({ mid, tw, weights, mask, palette, style }) => {
    const base = weights
      ? heatColours(
          manifest.meta.muscles,
          weights,
          palette.heat,
          palette.tendon
        )
      : muscleColours(manifest.meta.muscles, palette, style.jitter);
    return writeVertexColours(
      new Float32Array(mid.length * 3),
      mid,
      tw,
      emphasise(base, mask, {
        dim: style.focusDim,
        focusColour: weights ? null : palette.focus,
      }),
      palette.tendon,
      weights ? style.tendonBlendHeat : style.tendonBlend
    );
  };
  const assertFocus = (shot, weights, mask, label) => {
    const palette = scenePalette('dark');
    const style = sceneStyle('dark');
    for (const set of SETS) {
      expect([...shot[set.at]], `${set.name} ${label}`).toEqual([
        ...expectedFocus({
          mid: A(set.mid),
          tw: A(set.tw),
          weights,
          mask,
          palette,
          style,
        }),
      ]);
    }
  };

  it('setFocus(mask) changes the colours written; an equal mask does not repaint', () => {
    const drive = frameDriver();
    const setAttr = vi.spyOn(BufferGeometry.prototype, 'setAttribute');
    const ctl = build(container);
    const attrs = colourAttrs(setAttr);
    drive();
    const anatomy = snapshot(attrs);

    const mask = maskFor(manifest.meta.muscles.length);
    ctl.setFocus(mask);
    drive();
    const focused = snapshot(attrs);
    focused.forEach((a, i) =>
      expect([...a], `set ${i}`).not.toEqual([...anatomy[i]])
    );
    assertFocus(focused, null, mask, 'focus');

    // A different array holding the same bytes: no repaint, no frame.
    const versions = attrs.map((a) => a.version);
    const renders = fake.renderers[0].render.mock.calls.length;
    ctl.setFocus(Uint8Array.from(mask));
    drive();
    attrs.forEach((a, i) => expect(a.version, `set ${i}`).toBe(versions[i]));
    expect(fake.renderers[0].render.mock.calls.length).toBe(renders);

    // Under the heatmap the focus keeps its ramp colour; the rest are dimmed.
    const w = weightsFor(manifest.meta.muscles.length);
    ctl.setActivation(w);
    drive();
    assertFocus(snapshot(attrs), w, mask, 'heat + focus');

    ctl.setActivation(null);
    ctl.setFocus(null);
    drive();
    snapshot(attrs).forEach((a, i) =>
      expect([...a], `set ${i}`).toEqual([...anatomy[i]])
    );
    ctl.dispose();
  });
});

// R11 (#439): the camera API a shared link drives. Real three and real
// OrbitControls; only the renderer is a recorder.
describe('the camera pose API', () => {
  const CAM = sceneStyle('dark').camera;
  const LINK = { radius: 2.5, polar: 1.2, azimuth: -1 };

  function frameDriver() {
    const q = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      q.push(cb);
      return q.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    let now = 0;
    return (ms = 0) => {
      now += ms;
      for (const cb of q.splice(0)) cb(now);
    };
  }
  // Where the camera is, as the renderer's own camera argument reports it.
  const drawnPose = (renderer, call = 0) => {
    const [, camera] = renderer.render.mock.calls[call];
    return fromOffset(
      camera.position.clone().sub({ x: 0, y: 0.8, z: 0 }).toArray()
    );
  };
  const close = (a, b) => {
    expect(a.radius).toBeCloseTo(b.radius, 6);
    expect(a.polar).toBeCloseTo(b.polar, 6);
    expect(a.azimuth).toBeCloseTo(b.azimuth, 6);
  };

  it('draws its very first frame at the initial pose, not at home', () => {
    const drive = frameDriver();
    const ctl = build(container, { initialPose: LINK });
    drive();
    const renderer = fake.renderers[0];
    expect(renderer.render).toHaveBeenCalledTimes(1);
    close(drawnPose(renderer), LINK);
    expect(ctl.camera.pose()).toMatchObject({ home: false });
    close(ctl.camera.pose(), LINK);
    ctl.dispose();
  });

  it('is home without an initial pose, at the default angles', () => {
    const ctl = build(container);
    const pose = ctl.camera.pose();
    expect(pose.home).toBe(true);
    expect(pose.polar).toBeCloseTo(CAM.defaultPolar, 6);
    expect(pose.azimuth).toBeCloseTo(CAM.defaultAzimuth, 6);
    ctl.dispose();
  });

  it('clamps an out-of-range initial pose, and keeps it clamped after controls.update()', () => {
    const drive = frameDriver();
    const ctl = build(container, {
      initialPose: { radius: 99, polar: 3, azimuth: 0.5 },
    });
    drive();
    const drawn = drawnPose(fake.renderers[0]);
    expect(drawn.radius).toBeCloseTo(CAM.maxDistance, 6);
    expect(drawn.polar).toBeCloseTo(CAM.maxPolar, 6);
    ctl.dispose();
  });

  it('setPose places at once, quietly; null is home', () => {
    const drive = frameDriver();
    const onUserCamera = vi.fn();
    const ctl = build(container, { onUserCamera });
    drive();
    ctl.camera.setPose(LINK);
    close(ctl.camera.pose(), LINK);
    expect(ctl.camera.pose().home).toBe(false);
    drive();
    close(drawnPose(fake.renderers[0], 1), LINK);
    ctl.camera.setPose({ radius: 0.1, polar: 0, azimuth: 7 });
    expect(ctl.camera.pose().radius).toBeCloseTo(CAM.minDistance, 6);
    expect(ctl.camera.pose().polar).toBeCloseTo(CAM.minPolar, 6);
    ctl.camera.setPose(null);
    expect(ctl.camera.pose().home).toBe(true);
    expect(ctl.camera.pose().polar).toBeCloseTo(CAM.defaultPolar, 6);
    expect(onUserCamera).not.toHaveBeenCalled();
    ctl.dispose();
  });

  it('every user move reports itself; Reset is home again, the rest are not', () => {
    frameDriver();
    const onUserCamera = vi.fn();
    const ctl = build(container, { onUserCamera });
    ctl.camera.preset('front');
    expect(ctl.camera.pose().home).toBe(false);
    ctl.camera.reset();
    expect(ctl.camera.pose().home).toBe(true);
    ctl.camera.orbit(0.1, 0);
    expect(ctl.camera.pose().home).toBe(false);
    ctl.camera.reset();
    ctl.camera.zoom(0.9);
    expect(ctl.camera.pose().home).toBe(false);
    ctl.camera.preset('nowhere');
    expect(onUserCamera).toHaveBeenCalledTimes(5);
    ctl.dispose();
  });

  it('a gesture on the canvas (controls start) clears home and reports', () => {
    frameDriver();
    const onUserCamera = vi.fn();
    const ctl = build(container, { onUserCamera });
    const canvas = container.querySelector('canvas');
    canvas.dispatchEvent(new window.WheelEvent('wheel', { deltaY: 10 }));
    expect(onUserCamera).toHaveBeenCalledTimes(1);
    expect(ctl.camera.pose().home).toBe(false);
    ctl.dispose();
  });

  it('mid-tween, pose() is the destination', () => {
    const drive = frameDriver();
    const ctl = build(container);
    drive();
    ctl.camera.preset('front');
    drive(CAM.tweenMs / 4);
    drive(CAM.tweenMs / 4);
    const pose = ctl.camera.pose();
    expect(pose.azimuth).toBeCloseTo(Math.PI / 2, 6);
    expect(pose.polar).toBeCloseTo(Math.PI / 2 - CAM.presetPolarOffset, 6);
    ctl.dispose();
  });

  it('exposes pose() on the e2e probe', () => {
    const ctl = build(container, { initialPose: LINK });
    close(window.__anatomyDebug.pose(), LINK);
    ctl.dispose();
  });
});
