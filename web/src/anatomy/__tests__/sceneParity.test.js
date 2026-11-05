import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCENE_STYLE } from '../constants/sceneStyle.js';

// The scene module needs a real WebGL context, so jsdom cannot run it (it is
// covered by e2e/squat.spec.js). What makes it match the r128 source page is
// a handful of settings, and losing any one of them still renders a plausible
// model — just darker, flatter or panning off-screen. Pinned at the source.
const SCENE_SRC = readFileSync(
  join(process.cwd(), 'src/anatomy/scene/createAnatomyScene.js'),
  'utf8'
);
// Comments are prose and may name APIs freely; only code counts.
const CODE = SCENE_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(
  /(^|[^:])\/\/.*$/gm,
  '$1'
);

const byte = (n) => n / 255;

describe('three r187 parity with the r128 page (source)', () => {
  it('turns colour management off at module scope, before any colour exists', () => {
    const at = CODE.indexOf('ColorManagement.enabled = false;');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(CODE.indexOf('export function createAnatomyScene'));
  });

  it('encodes sRGB output with no tone mapping', () => {
    expect(CODE).toMatch(/renderer\.outputColorSpace = SRGBColorSpace;/);
    expect(CODE).toMatch(/renderer\.toneMapping = NoToneMapping;/);
  });

  it('scales every light by π (r155 physically correct units)', () => {
    expect(CODE).toMatch(/const LIGHT_UNIT = Math\.PI;/);
    for (const light of ['hemi', 'key', 'rim', 'fill']) {
      expect(CODE).toMatch(
        new RegExp(
          `${light}\\.intensity = lt\\.\\w+\\.intensity \\* LIGHT_UNIT;`
        )
      );
    }
    // And nowhere is an intensity set without it.
    const sets = CODE.match(/\.intensity = [^;]+;/g);
    expect(sets).toHaveLength(4);
    expect(sets.every((s) => s.includes('* LIGHT_UNIT'))).toBe(true);
  });

  it('never enables OrbitControls keys or calls its private methods', () => {
    expect(CODE).not.toMatch(/listenToKeyEvents/);
    expect(CODE).not.toMatch(/controls\._/);
  });

  it('turns pan off, so no gesture can lose the model off-screen', () => {
    expect(CODE).toMatch(/controls\.enablePan = false;/);
    expect(CODE).toMatch(/controls\.autoRotate = false;/);
    expect(CODE).toMatch(/controls\.enableDamping = !reducedMotion;/);
  });

  it('keeps its canvas out of the tab order and the accessibility tree', () => {
    expect(CODE).toMatch(/canvas\.setAttribute\('aria-hidden', 'true'\)/);
    expect(CODE).toMatch(/canvas\.setAttribute\('tabindex', '-1'\)/);
  });
});

// The heatmap's wiring, pinned the same way: the module cannot run in jsdom,
// and each of these failing silently costs a frame or a whole repaint.
describe('activation heatmap wiring', () => {
  it('exposes setActivation and skips unchanged weights', () => {
    expect(CODE).toMatch(/setActivation\(weights = null\) \{/);
    expect(CODE).toMatch(/if \(sameWeights\(heat, next\)\) return;/);
  });

  it('recolours inside the same frame as the pose, so one frame draws', () => {
    const atPose = CODE.indexOf(
      'if (pendingS !== null && pendingS !== posedS)'
    );
    const atHeat = CODE.indexOf('if (pendingHeat) {');
    expect(atPose).toBeGreaterThan(-1);
    expect(atHeat).toBeGreaterThan(atPose);
    expect(
      CODE.indexOf('renderer.render(scene, camera);', atHeat)
    ).toBeGreaterThan(atHeat);
  });

  it('swaps the tendon blend with the colour source, and nothing else', () => {
    expect(CODE).toMatch(
      /const blend = heat \? st\.tendonBlendHeat : st\.tendonBlend;/
    );
    expect(CODE).toMatch(
      /heatColours\(meta\.muscles, heat, pal\.heat, pal\.tendon\)/
    );
  });

  it('keeps the colour write callable without redoing the light setup', () => {
    // A heatmap toggle must not re-run applyLights, and a theme change must
    // not lose the heatmap — both follow from these being separate.
    expect(CODE).toMatch(/function applyLights\(/);
    expect(CODE).toMatch(/function writeColours\(\) \{/);
    const inPalette = CODE.slice(
      CODE.indexOf('function applyPalette('),
      CODE.indexOf('applyPalette(palette, style);')
    );
    expect(inPalette).toMatch(/applyLights\(p, style0\);/);
    expect(inPalette).toMatch(/writeColours\(\);/);
  });
});

describe('three is pinned', () => {
  it('to exactly 0.187.0 in package.json and the lockfile', () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8')
    );
    expect(pkg.dependencies.three).toBe('0.187.0');
    const lock = JSON.parse(
      readFileSync(join(process.cwd(), 'package-lock.json'), 'utf8')
    );
    expect(lock.packages['node_modules/three'].version).toBe('0.187.0');
  });
});

describe('scene lights are the page values (before × π)', () => {
  it.each(['dark', 'light'])('%s', (theme) => {
    const L = SCENE_STYLE[theme].lights;
    expect(L.hemisphere.intensity).toBe(0.62);
    expect(L.key.intensity).toBe(0.92);
    expect(L.rim.intensity).toBe(0.5);
    expect(L.fill.intensity).toBe(0.28);
    // 0xf2f6ff / 0x3b3532, 0xffffff, 0xc8dcff, 0xffe7d2
    expect(L.hemisphere.sky).toEqual([242, 246, 255].map(byte));
    expect(L.hemisphere.ground).toEqual([59, 53, 50].map(byte));
    expect(L.key.color).toEqual([255, 255, 255].map(byte));
    expect(L.rim.color).toEqual([200, 220, 255].map(byte));
    expect(L.fill.color).toEqual([255, 231, 210].map(byte));
    expect(L.key.position).toEqual([2.2, 4.0, 2.6]);
    expect(L.rim.position).toEqual([-2.6, 2.4, -2.8]);
    expect(L.fill.position).toEqual([-1.0, 1.2, 3.0]);
    expect(L.key.target).toEqual([0, 0.8, 0]);
    expect(L.key.shadowBias).toBe(-0.0005);
    expect(L.key.shadowNormalBias).toBe(0.015);
  });

  it('keeps the page material and tendon blend', () => {
    expect(SCENE_STYLE.dark.material).toEqual({ roughness: 0.6, metalness: 0 });
    expect(SCENE_STYLE.dark.tendonBlend).toBe(0.9);
    expect(SCENE_STYLE.dark.tendonBlendHeat).toBe(0.75);
    expect(SCENE_STYLE.dark.jitter).toEqual({ h: 0.0035, s: 0.025, l: 0.018 });
  });
});
