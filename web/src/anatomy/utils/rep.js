// The reference rep as a timeline: one frame every `dt` seconds, each with a
// depth `s` ∈ [0, 1] and an integer phase code `ph`. Movement-neutral — it
// knows codes, not their names, and takes the code count from the caller.

/**
 * Null unless the rep is usable: dt finite and positive, s and ph the same
 * length (≥ 2), every code an integer in [0, phaseCount), every code present.
 * `bottom` is the first maximum of s, so the direction can never disagree
 * with the pose; `starts[code]` is the first frame carrying that code.
 */
export function repInfo(rep, phaseCount) {
  if (!rep || typeof rep !== 'object') return null;
  const { dt, s, ph } = rep;
  if (!Number.isFinite(dt) || dt <= 0) return null;
  if (!Array.isArray(s) || !Array.isArray(ph)) return null;
  if (s.length < 2 || s.length !== ph.length) return null;
  const starts = new Array(phaseCount).fill(undefined);
  let bottom = 0;
  for (let i = 0; i < s.length; i++) {
    const code = ph[i];
    if (!Number.isInteger(code) || code < 0 || code >= phaseCount) return null;
    if (starts[code] === undefined) starts[code] = i;
    if (s[i] > s[bottom]) bottom = i;
  }
  if (starts.includes(undefined)) return null;
  return { dt, frames: s.length, last: s.length - 1, s, ph, bottom, starts };
}

// The epsilon keeps a time written as toFixed(2) landing on its own frame
// when float noise puts it a hair under the half-way point.
export const frameAt = (info, t) =>
  Number.isFinite(t)
    ? Math.max(0, Math.min(info.last, Math.round(t / info.dt + 1e-9)))
    : 0;

export const timeAt = (info, frame) => frame * info.dt;

// By frame, not phase code: the bottom code spans both sides of the turn.
export const directionAt = (info, frame) =>
  frame < info.bottom ? 'lowering' : 'drive';
