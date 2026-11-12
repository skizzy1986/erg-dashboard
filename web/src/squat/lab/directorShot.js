// Prototype (lab) only. The Director camera as a Ken Burns move: one slow,
// continuous drift across several reps, never a cut and never a per-phase
// re-frame. Spherical convention of anatomy/utils/cameraMath.js: the lifter
// faces +x, azimuth 0 is the lifter's right side, π/2 is straight on.
const FRONT = Math.PI / 2;

export const DRIFT = {
  // Resting framing: three-quarter front from the lifter's right.
  azimuth: FRONT - 0.65,
  polar: 1.34,
  radius: 3.3,
  // How far the move wanders either side of rest.
  azimuthSwing: 0.32, // ≈ ±18°
  polarSwing: 0.05,
  radiusSwing: 0.25,
  // One full drift spans this many reps (≈ 11 s at the reference tempo).
  reps: 3,
};

// The look-at point follows the hips down, but only part of the way: a full
// follow reads as the operator chasing the lifter.
export const TARGET_STAND = 0.8;
export const TARGET_BOTTOM = 0.64;

export const targetHeight = (s) =>
  TARGET_STAND + (TARGET_BOTTOM - TARGET_STAND) * Math.max(0, Math.min(1, s));

/**
 * Director camera. A pure function of the playhead: `loops` is how many reps
 * have already played, so the drift carries on across the loop instead of
 * rewinding with it. Pause or scrub and the camera holds where the rep is.
 */
export function directorView(info, frame, loops = 0, d = DRIFT) {
  const perRep = info.last + 1;
  const u = (loops * perRep + frame) / (perRep * d.reps);
  const a = 2 * Math.PI * u;
  return {
    azimuth: d.azimuth + d.azimuthSwing * Math.sin(a),
    polar: d.polar + d.polarSwing * Math.sin(2 * a),
    radius: d.radius - d.radiusSwing * Math.cos(a),
  };
}

/** The camera for a mode, or null where the user is driving. */
export function cameraFor(mode, info, frame, loops = 0) {
  if (!info || mode !== 'director') return null;
  return directorView(info, frame, loops);
}

/**
 * The drift is framed for a landscape stage. A portrait phone sees a far
 * narrower horizontal field, so the camera pulls back to keep the bar in.
 */
export const portraitPullback = (aspect) =>
  aspect > 0 && aspect < 0.75 ? (0.75 / aspect) ** 0.8 : 1;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Push in on one muscle: aim at its centre, swing round to the side of the
 * body it sits on, and close in to a few times its size. The drift's own
 * wander (the offset from rest) is kept, so the move stays alive. `focus` is
 * { centre: [x, y, z], radius } in world units, or null for the whole body.
 */
export function framedOn(view, focus) {
  if (!focus) return { view, at: null };
  const [x, , z] = focus.centre;
  const facing = Math.hypot(x, z) > 0.05 ? Math.atan2(x, z) : DRIFT.azimuth;
  const close = clamp(focus.radius * 3 + 0.6, 0.9, 2.2);
  return {
    view: {
      ...view,
      azimuth: facing + (view.azimuth - DRIFT.azimuth),
      radius: close * (view.radius / DRIFT.radius),
    },
    at: focus.centre,
  };
}
