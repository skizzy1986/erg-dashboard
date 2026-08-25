import {
  SCREENSHOT_COMPARE,
  ONE_CHANNEL_LEVEL,
  maxAdmittedDelta,
  yiqDelta,
} from '../visual-tolerance.mjs';

describe('visual comparator tolerance', () => {
  // Guards the pure-JS replica of pixelmatch's colorDelta against a
  // transcription error in the YIQ coefficients. Every expected value here was
  // measured in the pinned Playwright container, so a drifted formula shows up
  // as a number mismatch rather than as a silently-passing visual suite.
  it('reproduces the measured YIQ deltas', () => {
    expect(yiqDelta('#08080d', '#3d0812')).toBeCloseTo(436.7, 1);
    expect(yiqDelta('#08080d', '#6b6b8f')).toBeCloseTo(5361.8, 1);
    expect(yiqDelta('#08080d', '#ffffff')).toBeCloseTo(30686.4, 1);
    expect(yiqDelta('#0a0a0f', '#08080d')).toBeCloseTo(2.02, 2);
    expect(yiqDelta('#000000', '#010101')).toBeCloseTo(0.5053, 4);
    expect(yiqDelta('#000000', '#000001')).toBeCloseTo(0.0565, 4);
  });

  // #291 in executable form. At Playwright's default threshold of 0.2 the
  // allowance is 35215 * 0.2^2 = 1408.6, which swallows the 436.7 delta of a
  // whole-viewport repaint from #08080d to #3d0812 — so no pixel was ever
  // flagged, maxDiffPixels: 0 never fired, and the run updated zero baseline
  // bytes. Anyone restoring the default should read this first.
  it('shows the default threshold admits the #291 repaint', () => {
    expect(maxAdmittedDelta(0.2)).toBeGreaterThan(
      yiqDelta('#08080d', '#3d0812')
    );
  });

  // The actual guard, stated as a ceiling rather than a magic number: the
  // configured threshold must not admit a delta as large as a one-level change
  // in a single channel. This fails for 0.2, 0.05 and 0.01 alike. Asserting
  // `threshold === 0` instead would be circular — it would restate the config
  // rather than test what the config buys.
  it('configures a threshold that admits less than one channel level', () => {
    expect(maxAdmittedDelta(SCREENSHOT_COMPARE.threshold)).toBeLessThan(
      ONE_CHANNEL_LEVEL
    );
  });

  // A colour-token change that should move pixels cannot silently move none.
  // Scoped deliberately to the allowance: pixelmatch also drops anti-aliased
  // pixels from the count (includeAA: false), so clearing the allowance is
  // necessary but not sufficient for an edge pixel. Flat grounds are unaffected.
  // Literal hex on purpose: reading THEME here would couple this guard to
  // web/src/constants/theme.js, which is being rewritten to var(--color-*)
  // strings on a separate branch.
  it('puts every colour change that should move pixels over the allowance', () => {
    const shouldMovePixels = [
      ['#08080d', '#3d0812'], // the #291 sentinel repaint
      ['#0a0a0f', '#08080d'], // the MobileApp background drift already in the repo
      ['#000000', '#000001'], // the smallest representable colour edit
      ['#08080d', '#1a1a2e'], // a bg -> surface token swap
    ];
    for (const [a, b] of shouldMovePixels) {
      expect(yiqDelta(a, b)).toBeGreaterThan(
        maxAdmittedDelta(SCREENSHOT_COMPARE.threshold)
      );
    }
  });

  // The assertions above guard the constant; this one guards the wiring. A
  // config that imported SCREENSHOT_COMPARE and then ignored it, or a project
  // that overrode toHaveScreenshot downstream, would leave every other test in
  // this file green while the real suite ran blind again. Dynamic import so the
  // @playwright/test load is paid only here.
  it('applies the shared options to the real Playwright config', async () => {
    const { default: config } = await import('../../playwright.config.js');
    expect(config.expect.toHaveScreenshot).toMatchObject(SCREENSHOT_COMPARE);
  });

  // The count bound is half the contract; a relaxed maxDiffPixels would let
  // flagged pixels through even at threshold 0.
  it('allows no differing pixels', () => {
    expect(SCREENSHOT_COMPARE.maxDiffPixels).toBe(0);
  });
});
