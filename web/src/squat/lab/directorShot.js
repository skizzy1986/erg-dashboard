import { tweenSpherical } from '../../anatomy/utils/cameraMath.js';

// Prototype (lab) only. Camera shots for the reference rep, in the spherical
// convention of anatomy/utils/cameraMath.js: the lifter faces +x, azimuth 0 is
// the lifter's right side, π/2 is straight on from the front.
const FRONT = Math.PI / 2;
const ESTABLISHING = { azimuth: FRONT - 0.65, polar: 1.32, radius: 3.4 };

// One key shot per phase, held at the middle of that phase and eased between.
// Lockout returns to the opening shot, so a looping rep never cuts.
export const DIRECTOR_SHOTS = [
  { phase: 0, why: 'Establishing three-quarter front', ...ESTABLISHING },
  {
    phase: 1,
    why: 'Side profile: hip hinge, trunk angle and bar path',
    azimuth: 0.12,
    polar: 1.42,
    radius: 3.0,
  },
  {
    phase: 2,
    why: 'Low and front-on: knee track and any lateral shift',
    azimuth: FRONT - 0.08,
    polar: 1.58,
    radius: 2.6,
  },
  {
    phase: 3,
    why: 'Behind the right hip: hips and back through the sticking region',
    azimuth: -0.35,
    polar: 1.3,
    radius: 3.0,
  },
  { phase: 4, why: 'Back to the establishing shot', ...ESTABLISHING },
];

// The look-at point follows the hips down: standing and full-depth heights.
export const TARGET_STAND = 0.8;
export const TARGET_BOTTOM = 0.52;

export const targetHeight = (s) =>
  TARGET_STAND + (TARGET_BOTTOM - TARGET_STAND) * Math.max(0, Math.min(1, s));

/** The frame each phase's key shot is held at: the middle of the phase. */
export function keyFrames(info) {
  const n = info.starts.length;
  return info.starts.map((start, k) => {
    const end = k + 1 < n ? info.starts[k + 1] - 1 : info.last;
    return (start + end) / 2;
  });
}

const view = ({ azimuth, polar, radius }) => ({ azimuth, polar, radius });

/** Director camera at `frame`: a pure function of the playhead. */
export function directorView(info, frame, shots = DIRECTOR_SHOTS) {
  const keys = keyFrames(info);
  if (frame <= keys[0]) return view(shots[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame <= keys[i + 1]) {
      const k = (frame - keys[i]) / (keys[i + 1] - keys[i]);
      return tweenSpherical(view(shots[i]), view(shots[i + 1]), k);
    }
  }
  return view(shots[shots.length - 1]);
}

/**
 * Show-off camera: one full orbit per rep, a gentle rise and fall, and a
 * push-in at depth. Continuous at the loop point by construction.
 */
export function showoffView(info, frame, s) {
  const u = info.last > 0 ? frame / info.last : 0;
  return {
    azimuth: ESTABLISHING.azimuth + 2 * Math.PI * u,
    polar: 1.36 + 0.14 * Math.sin(4 * Math.PI * u),
    radius: 3.5 - 0.8 * Math.max(0, Math.min(1, s)),
  };
}

/** The camera for a mode, or null where the user is driving. */
export function cameraFor(mode, info, frame, s) {
  if (!info) return null;
  if (mode === 'director') return directorView(info, frame);
  if (mode === 'showoff') return showoffView(info, frame, s);
  return null;
}

/** The key shot whose phase holds `phaseCode`, for the on-screen caption. */
export const shotFor = (phaseCode) =>
  DIRECTOR_SHOTS.find((s) => s.phase === phaseCode) ?? null;

/**
 * The shots are framed for a landscape stage. A portrait phone sees a far
 * narrower horizontal field, so the camera pulls back to keep the bar in.
 */
export const portraitPullback = (aspect) =>
  aspect > 0 && aspect < 0.75 ? (0.75 / aspect) ** 0.8 : 1;
