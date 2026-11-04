// Camera placement as plain numbers, in three's Spherical convention (the one
// OrbitControls reads back): polar φ from +y, azimuth θ about +y measured from
// +z towards +x. offset = (r·sinφ·sinθ, r·cosφ, r·sinφ·cosθ).
//
// Model axes: the lifter faces +x, +y is up, +z is the lifter's right.

export const MIN_DISTANCE = 0.6;
export const MAX_DISTANCE = 6;

export const clampDistance = (d, min = MIN_DISTANCE, max = MAX_DISTANCE) =>
  Math.max(min, Math.min(max, d));

export function toOffset({ radius, polar, azimuth }) {
  const sp = Math.sin(polar);
  return [
    radius * sp * Math.sin(azimuth),
    radius * Math.cos(polar),
    radius * sp * Math.cos(azimuth),
  ];
}

export function fromOffset([x, y, z]) {
  const radius = Math.hypot(x, y, z);
  if (radius === 0) return { radius: 0, polar: 0, azimuth: 0 };
  return {
    radius,
    polar: Math.acos(Math.max(-1, Math.min(1, y / radius))),
    azimuth: Math.atan2(x, z),
  };
}

/** Distance at which a sphere of `radius` fills the narrower field of view. */
export function framingDistance(radius, fovDeg, aspect) {
  const v = (fovDeg * Math.PI) / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  return radius / Math.sin(Math.min(v, h) / 2);
}

export function orbit(sph, dAzimuth, dPolar, minPolar = 0.01, maxPolar = 3.13) {
  return {
    radius: sph.radius,
    azimuth: sph.azimuth + dAzimuth,
    polar: Math.max(minPolar, Math.min(maxPolar, sph.polar + dPolar)),
  };
}

/** factor < 1 moves in. */
export const zoom = (sph, factor, min, max) => ({
  ...sph,
  radius: clampDistance(sph.radius * factor, min, max),
});

// Where the camera sits for each named view, as an azimuth: Front looks at
// the lifter's face from +x; Left is the lifter's own left side, −z.
export const PRESET_AZIMUTH = {
  front: Math.PI / 2,
  back: -Math.PI / 2,
  left: Math.PI,
  right: 0,
};

export const PRESET_DIRECTION = {
  front: [1, 0, 0],
  back: [-1, 0, 0],
  left: [0, 0, -1],
  right: [0, 0, 1],
};

/** The azimuth step from a to b the short way round, in (−π, π]. */
export function shortestTurn(a, b) {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

/** The camera k ∈ [0, 1] of the way from `from` to `to`, eased. */
export function tweenSpherical(from, to, k) {
  const e = ease(Math.max(0, Math.min(1, k)));
  return {
    radius: from.radius + (to.radius - from.radius) * e,
    polar: from.polar + (to.polar - from.polar) * e,
    azimuth: from.azimuth + shortestTurn(from.azimuth, to.azimuth) * e,
  };
}
