import { DARK, LIGHT } from '../../constants/themeValues.js';

// Scene colours as raw 0–1 channels. No sRGB → linear conversion: the scene
// disables three's ColorManagement to match the r128 page, where a hex or HSL
// colour went into the shader as-is and only the output was sRGB-encoded.

export const hexToRaw01 = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l <= 0.5 ? d / (max + min) : d / (2 - max - min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

const hue2rgb = (p, q, t) => {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
  return p;
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** three's Color.setHSL: hue wraps, saturation and lightness clamp. */
export function hslToRgb(h, s, l) {
  const hh = ((h % 1) + 1) % 1;
  const ss = clamp01(s);
  const ll = clamp01(l);
  if (ss === 0) return [ll, ll, ll];
  const q = ll <= 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  return [
    hue2rgb(p, q, hh + 1 / 3),
    hue2rgb(p, q, hh),
    hue2rgb(p, q, hh - 1 / 3),
  ];
}

/**
 * Muscle i's base colour: the anatomyMuscle token nudged in HSL by the
 * page's deterministic steps. The page's own offsets were not centred (its
 * saturation and lightness steps ran 0…4), so they are re-centred (−2…2) on
 * the token — muscle colours then average to the token itself.
 */
export function jitteredMuscle(base, i, jitter) {
  const [h, s, l] = rgbToHsl(base);
  return hslToRgb(
    h + (((i * 37) % 11) - 5) * jitter.h,
    s + (((i * 13) % 5) - 2) * jitter.s,
    l + (((i * 7) % 5) - 2) * jitter.l
  );
}

/** One RGB triple per muscle: tendon colour for tendons, else jittered. */
export function muscleColours(muscles, palette, jitter) {
  const out = new Float32Array(muscles.length * 3);
  muscles.forEach((m, i) => {
    const c = m.tendon
      ? palette.tendon
      : jitteredMuscle(palette.muscle, i, jitter);
    out[i * 3] = c[0];
    out[i * 3 + 1] = c[1];
    out[i * 3 + 2] = c[2];
  });
  return out;
}

/**
 * Per-vertex colour (SKINNING.md §7): the vertex's muscle colour moved
 * towards the tendon colour by tw/255 × blend. blend is 0.9, or 0.75 under
 * the activation heatmap (PR2b).
 */
export function writeVertexColours(out, mid, tw, muscleCols, tendon, blend) {
  for (let v = 0; v < mid.length; v++) {
    const m = mid[v] * 3;
    const t = (tw[v] / 255) * blend;
    const v3 = v * 3;
    out[v3] = muscleCols[m] + (tendon[0] - muscleCols[m]) * t;
    out[v3 + 1] = muscleCols[m + 1] + (tendon[1] - muscleCols[m + 1]) * t;
    out[v3 + 2] = muscleCols[m + 2] + (tendon[2] - muscleCols[m + 2]) * t;
  }
  return out;
}

// Where the four ramp tokens sit along 0-1. They are the band cuts, so
// squat/constants/activationBands.js derives its HEAT_STOPS from the same
// numbers and sceneColours.test.js asserts the two lists are equal — the model
// and its legend cannot drift apart while that passes.
export const HEAT_POSITIONS = [0, 0.3, 0.6, 1];

/** RGB lerp along `stops` ([position, [r,g,b]] pairs, ascending). */
export function rampAt(stops, a) {
  if (!stops?.length) return [0, 0, 0];
  if (stops.length === 1) return [...stops[0][1]];
  const x = a < 0 || !Number.isFinite(a) ? 0 : a > 1 ? 1 : a;
  let i = 0;
  while (i < stops.length - 2 && x > stops[i + 1][0]) i++;
  const [p0, c0] = stops[i];
  const [p1, c1] = stops[i + 1];
  const span = p1 - p0;
  const t = span > 0 ? Math.max(0, Math.min(1, (x - p0) / span)) : 0;
  return [0, 1, 2].map((k) => c0[k] + (c1[k] - c0[k]) * t);
}

/**
 * One RGB triple per muscle under the activation heatmap: the ramp colour for
 * its weight, and the tendon colour for a tendon — tendons carry no estimate,
 * so they keep their own colour, mirroring the source page's recolor().
 */
export function heatColours(muscles, weights, stops, tendon) {
  const out = new Float32Array(muscles.length * 3);
  muscles.forEach((m, i) => {
    const c = m.tendon ? tendon : rampAt(stops, weights?.[i] ?? 0);
    out[i * 3] = c[0];
    out[i * 3 + 1] = c[1];
    out[i * 3 + 2] = c[2];
  });
  return out;
}

/**
 * Lifts the muscles in `mask` out of the rest (HERO_STAGE_SPEC.md, PR B): every
 * other muscle moves `dim` of the way to its own luma grey, so it keeps its
 * lightness and loses its hue. A focus muscle keeps its colour (under the
 * heatmap, its ramp colour, so the emphasis never misstates the estimate), or
 * takes `focusColour` when one is given (heatmap off: the selected muscle).
 * Per muscle only: the per-vertex write after it is unchanged.
 */
export function emphasise(muscleCols, mask, { dim, focusColour = null }) {
  if (!mask) return muscleCols;
  const out = new Float32Array(muscleCols.length);
  for (let i = 0; i < muscleCols.length / 3; i++) {
    const k = i * 3;
    const r = muscleCols[k];
    const g = muscleCols[k + 1];
    const b = muscleCols[k + 2];
    if (mask[i]) {
      const c = focusColour ?? [r, g, b];
      out[k] = c[0];
      out[k + 1] = c[1];
      out[k + 2] = c[2];
    } else {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      out[k] = r + (y - r) * dim;
      out[k + 1] = g + (y - g) * dim;
      out[k + 2] = b + (y - b) * dim;
    }
  }
  return out;
}

/** The scene's palette for a theme, from the anatomy* tokens. */
export function scenePalette(themeName) {
  const p = themeName === 'dark' ? DARK : LIGHT;
  const heat = [
    p.anatomyHeatLow,
    p.anatomyHeatMid,
    p.anatomyHeatHigh,
    p.anatomyHeatPeak,
  ].map((hex, i) => [HEAT_POSITIONS[i], hexToRaw01(hex)]);
  return {
    muscle: hexToRaw01(p.anatomyMuscle),
    tendon: hexToRaw01(p.anatomyTendon),
    bone: hexToRaw01(p.anatomyBone),
    shadow: hexToRaw01(p.anatomyShadow),
    bar: hexToRaw01(p.anatomyBar),
    focus: hexToRaw01(p.anatomyFocus),
    heat,
  };
}
