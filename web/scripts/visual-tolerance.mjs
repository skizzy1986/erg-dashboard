// Comparator options for the Playwright visual suite, plus the colour-distance
// maths they are chosen against. Kept out of playwright.config.js so the
// reasoning is testable: scripts/__tests__/visual-tolerance.test.mjs asserts the
// configured threshold cannot admit a visible colour change (#291).
//
// The constants below are pixelmatch's. pixelmatch is vendored inside
// playwright-core and is what toHaveScreenshot compares with. It is deliberately
// NOT imported here (it is a transitive dep, not a declared one); the formula is
// replicated instead, and the test pins the replica against deltas measured in
// the pinned container. The pixelmatch version in play is fixed by
// web/package-lock.json.

// There is a THIRD knob, and it is not settable from playwright.config.js.
// pixelmatch defaults to includeAA: false and Playwright does not override it, so
// a pixel that exceeds the allowance is still dropped from the diff count when
// pixelmatch's antialiased() heuristic classifies it as an edge pixel. Exceeding
// the threshold is necessary, not sufficient. It does not affect the flat fills
// this suite's grounds are made of - a solid region has no edge neighbours to
// trip the heuristic - but assuming one knob where there were two is precisely
// how #291 happened, so: there are three.

export const SCREENSHOT_COMPARE = { threshold: 0, maxDiffPixels: 0 };

function channels(hex) {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// pixelmatch's colorDelta for two fully opaque pixels: squared YIQ distance.
export function yiqDelta(hexA, hexB) {
  const [r1, g1, b1] = channels(hexA);
  const [r2, g2, b2] = channels(hexB);
  const y =
    0.29889531 * (r1 - r2) + 0.58662247 * (g1 - g2) + 0.11448223 * (b1 - b2);
  const i =
    0.59597799 * (r1 - r2) - 0.2741761 * (g1 - g2) - 0.32180189 * (b1 - b2);
  const q =
    0.21147017 * (r1 - r2) - 0.52261711 * (g1 - g2) + 0.31114694 * (b1 - b2);
  return 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
}

// The largest squared YIQ distance a given threshold still calls "identical".
export function maxAdmittedDelta(threshold) {
  return 35215 * threshold ** 2;
}

// The smallest colour edit that can be represented at all: a one-level change in
// the single least-weighted channel. Blue wins at 0.0565, nine times smaller
// than the 0.5053 of a one-level change in all three channels, so taking the
// minimum is what makes the ceiling in the test mean what it says.
export const ONE_CHANNEL_LEVEL = Math.min(
  yiqDelta('#000000', '#010000'),
  yiqDelta('#000000', '#000100'),
  yiqDelta('#000000', '#000001')
);
