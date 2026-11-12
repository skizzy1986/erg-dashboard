// A camera pose as a link carries it: {radius, polar, azimuth} in radians, in
// cameraMath.js's spherical convention, cleaned against the scene's limits.
// The degree form is what a URL holds: whole degrees and centimetres, so a
// cleaned value survives a round trip unchanged.

const TAU = 2 * Math.PI;
const DEG = 180 / Math.PI;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const wrap = (a, half) => {
  let w = a % (2 * half);
  if (w > half) w -= 2 * half;
  if (w <= -half) w += 2 * half;
  return w;
};

/** An angle in (−π, π]. */
export const wrapAngle = (rad) => wrap(rad, TAU / 2);

/** Null when any field is not a finite number; otherwise clamped and wrapped. */
export function cleanPose(pose, limits) {
  if (
    !pose ||
    ![pose.radius, pose.polar, pose.azimuth].every((v) => Number.isFinite(v))
  ) {
    return null;
  }
  return {
    radius: clamp(pose.radius, limits.minDistance, limits.maxDistance),
    polar: clamp(pose.polar, limits.minPolar, limits.maxPolar),
    azimuth: wrapAngle(pose.azimuth),
  };
}

// Rounded inwards, so a quantised polar never leaves the scene's range.
export const degreeLimits = (limits) => ({
  minPol: Math.ceil(limits.minPolar * DEG),
  maxPol: Math.floor(limits.maxPolar * DEG),
  minDist: limits.minDistance,
  maxDist: limits.maxDistance,
});

export function toDegrees(pose, limits) {
  const L = degreeLimits(limits);
  return {
    // `+ 0` folds a rounded −0 into 0.
    az: wrap(Math.round(pose.azimuth * DEG), 180) + 0,
    pol: clamp(Math.round(pose.polar * DEG), L.minPol, L.maxPol),
    dist: Math.round(clamp(pose.radius, L.minDist, L.maxDist) * 100) / 100,
  };
}

export const fromDegrees = ({ az, pol, dist }, limits) =>
  cleanPose({ radius: dist, polar: pol / DEG, azimuth: az / DEG }, limits);
