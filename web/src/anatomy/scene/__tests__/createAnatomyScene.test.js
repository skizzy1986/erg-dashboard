import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { BufferGeometry, DirectionalLight } from 'three';
import { createAnatomyScene } from '../createAnatomyScene.js';
import { scenePalette } from '../../utils/sceneColours.js';
import { sceneStyle } from '../../constants/sceneStyle.js';

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

const build = (container) =>
  createAnatomyScene({
    container,
    manifest,
    buffer,
    palette: scenePalette('dark'),
    style: sceneStyle('dark'),
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
