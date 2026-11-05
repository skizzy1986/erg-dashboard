import { ACT_BANDS } from '../constants/activationBands.js';

// act is [[lowering…], [drive…]] of 0–255 bytes, one per stored depth sample.
const lerpAt = (arr, x) => {
  const i0 = Math.max(0, Math.min(arr.length - 2, Math.floor(x)));
  const u = Math.min(1, Math.max(0, x - i0));
  return arr[i0] + (arr[i0 + 1] - arr[i0]) * u;
};

const seriesOf = (m, direction) =>
  m?.act ? m.act[direction === 'drive' ? 1 : 0] : null;

/** One 0–1 weight per muscle at depth `s` going `direction`. Tendons read 0. */
export function activationAt(muscles, s, direction) {
  const out = new Float32Array(muscles.length);
  for (let i = 0; i < muscles.length; i++) {
    const a = seriesOf(muscles[i], direction);
    if (!a || a.length < 2) continue;
    const clamped = s < 0 ? 0 : s > 1 ? 1 : s;
    out[i] = lerpAt(a, clamped * (a.length - 1)) / 255;
  }
  return out;
}

/** The single 0–1 weight for one muscle, or null where there is no estimate. */
export function activationOf(muscle, s, direction) {
  const a = seriesOf(muscle, direction);
  if (!a || a.length < 2) return null;
  const clamped = s < 0 ? 0 : s > 1 ? 1 : s;
  return lerpAt(a, clamped * (a.length - 1)) / 255;
}

/** The band a 0–1 weight falls in; null for no estimate. */
export function bandOf(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const v = value < 0 ? 0 : value > 1 ? 1 : value;
  return ACT_BANDS.find((b) => v < b.max) ?? ACT_BANDS[ACT_BANDS.length - 1];
}

/**
 * The hardest the muscle works anywhere in the rep, and on which side of the
 * turn. Without it a coach reading a muscle at 10% depth sees "Low" and
 * concludes it does not matter, when it is the hardest worker at the bottom.
 */
export function peakBandOf(muscle) {
  if (!muscle?.act) return null;
  let best = -1;
  let where = 'lowering';
  ['lowering', 'drive'].forEach((dir, k) => {
    for (const v of muscle.act[k] ?? []) {
      if (v > best) {
        best = v;
        where = dir;
      }
    }
  });
  if (best < 0) return null;
  const band = bandOf(best / 255);
  return { id: band.id, name: band.name, where };
}
