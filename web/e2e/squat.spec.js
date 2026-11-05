import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The public /squat tool against the built preview — the real browser, a real
// Worker and a real DecompressionStream, none of which jsdom has.
//
// No fixtures: the tool has no auth gate and must never touch Supabase, so
// nothing is stubbed. Any request to *.supabase.co fails the test rather than
// being quietly fulfilled. Service workers are blocked so every request the
// page makes is the page's own, visible to page.on('request').

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const READY = /3D model ready/;
// Building the scene under SwiftShader (no GPU in CI) takes seconds, on top
// of the 2.2 MB download and gunzip.
const READY_TIMEOUT = 45_000;
// First paint under parallel load (several SwiftShader pages at once) has
// taken over 10 s here. The fix is a longer wait rather than relying on the
// CI-wide single retry (playwright.config.js), which would hide a real
// regression in how long the page takes to appear.
const PAINT_TIMEOUT = 30_000;

const VERCEL = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')
);

test.use({
  serviceWorkers: 'block',
  // Headless Chromium has no GPU; WebGL falls back to SwiftShader only when
  // this flag allows it. Scoped to this file — the dashboard needs no WebGL.
  launchOptions: { args: ['--enable-unsafe-swiftshader'] },
});
test.setTimeout(90_000);

function recordRequests(page) {
  const urls = [];
  page.on('request', (req) => urls.push(req.url()));
  return urls;
}

const supabaseHits = (urls) =>
  urls.filter((u) => /(^|\.)supabase\.co(:\d+)?$/.test(new URL(u).hostname));

async function openReady(page, path = '/squat') {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(path, { timeout: PAINT_TIMEOUT });
  await expect(
    page.getByRole('heading', { level: 1, name: 'High-bar back squat' })
  ).toBeVisible({ timeout: PAINT_TIMEOUT });
  // Manifest fetch → worker streams and gunzips 2.2 MB → three.js chunk →
  // scene build → first frame. The status region stays mounted, visually
  // hidden, once the model is drawn.
  await expect(page.getByTestId('load-status')).toHaveText(READY, {
    timeout: READY_TIMEOUT,
  });
  return errors;
}

// The scene's e2e probe (frame counter, mirror check, pixel snapshot) is
// switched on by this query flag; production builds otherwise carry none.
const DEBUG = '/squat?anatomy-debug';
const frames = (page) => page.evaluate(() => window.__anatomyFrames);

// Waits until the frame counter stops moving (no frame for 500 ms), so an
// idle assertion compares like with like instead of trusting a fixed sleep.
async function settledFrames(page) {
  let last = -1;
  let now = -1;
  await expect
    .poll(
      async () => {
        now = await frames(page);
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [500], timeout: 30_000 }
    )
    .toBe(true);
  return now;
}

async function axe(page, include) {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder.include(include);
  const { violations } = await builder.analyze();
  // Readable on failure: rule, then the offending nodes' targets.
  return violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`
  );
}

async function noHorizontalScroll(page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth
  );
}

// Every visible control's box, for the 44 × 44 px touch-target check.
async function smallTargets(page, scope = 'body') {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    return [
      ...root.querySelectorAll(
        'a[href], button, [role="tab"], [role="radio"], input[type="range"]'
      ),
    ]
      .filter((el) => el.offsetParent !== null && !el.closest('[inert]'))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: (
            el.getAttribute('aria-label') ||
            el.textContent ||
            el.type
          ).trim(),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
      .filter((t) => t.w < 44 || t.h < 44);
  }, scope);
}

for (const scheme of ['light', 'dark']) {
  test.describe(`/squat — ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test('loads the model without contacting Supabase, and passes axe', async ({
      page,
    }) => {
      const urls = recordRequests(page);
      const errors = await openReady(page);

      await expect(page.locator('[data-theme]').first()).toHaveAttribute(
        'data-theme',
        scheme
      );
      // The data really went through the worker: the stream was requested.
      expect(urls.some((u) => /squat-anatomy-.*\.bin$/.test(u))).toBe(true);
      expect(supabaseHits(urls)).toEqual([]);
      // Stronger still, and what keeps CI hermetic: nothing leaves the origin.
      const origin = new URL(page.url()).origin;
      expect(
        urls.filter((u) => /^https?:/.test(u) && new URL(u).origin !== origin)
      ).toEqual([]);
      expect(errors).toEqual([]);

      expect(await axe(page)).toEqual([]);
    });

    test('the guide dialog passes axe and leaves the page inert', async ({
      page,
    }) => {
      await openReady(page);
      await page.getByRole('button', { name: 'Coaching guide' }).click();
      const dialog = page.getByRole('dialog', { name: 'Coaching guide' });
      await expect(dialog).toBeVisible();
      await expect(page.locator('main')).toHaveAttribute('inert', '');

      for (const pane of [
        'Phases',
        'Metrics',
        'Measured',
        'Method',
        'Sources',
      ]) {
        await dialog.getByRole('tab', { name: pane }).click();
        expect(await axe(page, '[role="dialog"]'), pane).toEqual([]);
      }
      await page.keyboard.press('Escape');
      await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    });

    test('draws the 3D model on demand, and the controls drive it', async ({
      page,
    }) => {
      const errors = await openReady(page, DEBUG);
      expect(await frames(page)).toBeGreaterThan(0);
      // Render on demand: once damping settles, no frames while idle.
      const idle = await settledFrames(page);

      const slider = page.getByRole('slider', { name: 'Depth' });
      const readout = page.getByTestId('depth-readout');
      await expect(readout).toHaveText(/Depth 0% · Standing/);
      await slider.focus();
      await page.keyboard.press('End');
      await expect(readout).toHaveText(/Depth 100% · Bottom/);
      await page.keyboard.press('PageDown');
      await expect(readout).toHaveText(/Depth 88% · Descent/);
      await expect.poll(() => frames(page)).toBeGreaterThan(idle);

      await page
        .getByRole('button', { name: 'Left side (lateral) view' })
        .click();
      const camera = page.getByRole('group', { name: 'Camera controls' });
      await camera.focus();
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('+');
      await page.getByRole('switch', { name: 'Skeleton' }).click();
      await expect(
        page.getByRole('switch', { name: 'Skeleton' })
      ).not.toBeChecked();
      expect(errors).toEqual([]);
      expect(await axe(page)).toEqual([]);
    });
  });
}

test('the muscle listbox is one tab stop, and axe-clean with a card open', async ({
  page,
}) => {
  const errors = await openReady(page);
  const listbox = page.getByRole('listbox', { name: 'Muscles by region' });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('option')).toHaveCount(118);
  await expect(listbox.getByRole('group')).toHaveCount(11);
  // One tab stop for 118 options: exactly one has tabindex 0.
  expect(
    await listbox.evaluate(
      (el) => el.querySelectorAll('[role="option"][tabindex="0"]').length
    )
  ).toBe(1);

  // Arrows move focus and select NOTHING — the URL is the proof.
  const first = listbox.getByRole('option').first();
  await first.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(new URL(page.url()).hash).toBe('');
  await page.keyboard.press('Enter');
  expect(new URL(page.url()).hash).toBe('#m=adductor-minimus');
  await expect(
    page.getByRole('heading', { level: 3, name: 'Adductor minimus' })
  ).toBeFocused();
  await expect(page.getByTestId('muscle-band')).toContainText(
    'Indicative estimate, not EMG.'
  );
  expect(await axe(page)).toEqual([]);

  // The heatmap is off until asked, and its legend arrives with it.
  const heat = page.getByRole('switch', { name: 'Activation heatmap' });
  await expect(heat).not.toBeChecked();
  await heat.click();
  await expect(heat).toBeChecked();
  await expect(page.getByText('Activation key')).toBeVisible();
  await expect(page.getByText(/Tendons are not coloured/)).toBeVisible();
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('a #m= deep link selects on load; a dead one says so and is dropped', async ({
  page,
}) => {
  const errors = await openReady(page, '/squat#m=vastus-lateralis');
  await expect(
    page.getByRole('option', { name: 'Vastus lateralis' })
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('heading', { level: 3, name: 'Vastus lateralis' })
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#m=vastus-lateralis');

  await openReady(page, '/squat#m=no-such-muscle');
  await expect(
    page.getByText('That link points to a muscle this version does not have.')
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  expect(errors).toEqual([]);
});

test('the filter never adds a history entry, and the heatmap redraws', async ({
  page,
}) => {
  await openReady(page, DEBUG);
  const idle = await settledFrames(page);
  const before = await page.evaluate(() => window.history.length);
  await page.getByRole('searchbox', { name: /Filter muscles/ }).fill('glutes');
  await expect(page.getByTestId('muscle-matches')).toContainText('of 118');
  expect(await page.evaluate(() => window.history.length)).toBe(before);
  expect(new URL(page.url()).hash).toBe('');

  // Turning the heatmap on recolours, which costs frames; it is off by
  // default, so nothing was spent before the click.
  await page.getByRole('switch', { name: 'Activation heatmap' }).click();
  await expect.poll(() => frames(page)).toBeGreaterThan(idle);
  const lit = await settledFrames(page);
  await page.getByRole('switch', { name: 'Activation heatmap' }).click();
  await expect.poll(() => frames(page)).toBeGreaterThan(lit);
});

test('the canvas is hidden from assistive tech and skipped by Tab', async ({
  page,
}) => {
  const errors = await openReady(page);
  const canvas = page.locator('[data-testid="scene-host"] canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  expect(await canvas.evaluate((el) => el.tabIndex)).toBe(-1);
  // The last control before the stage, then Tab: focus lands on the first
  // control after it — the depth slider — never on the canvas.
  await page.getByRole('button', { name: 'Metrics and targets' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('slider', { name: 'Depth' })).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    'CANVAS'
  );
  expect(errors).toEqual([]);
});

test('the mirrored left side has a negative determinant', async ({ page }) => {
  await openReady(page, DEBUG);
  // three flips winding only for a negative-determinant world matrix; the
  // left muscles share the right's geometry under scale z = −1.
  const [left, right] = await page.evaluate(() => [
    window.__anatomyDebug.leftDeterminant(),
    window.__anatomyDebug.rightDeterminant(),
  ]);
  expect(left).toBeCloseTo(-1, 6);
  expect(right).toBeCloseTo(1, 6);
});

test('a hidden tab draws nothing, and drawing resumes when visible', async ({
  page,
}) => {
  const errors = await openReady(page, DEBUG);
  await settledFrames(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const before = await frames(page);
  const slider = page.getByRole('slider', { name: 'Depth' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(page.getByTestId('depth-readout')).toHaveText(/Bottom/);
  // The setter asked for a frame; the hidden page must not have drawn it.
  expect(await settledFrames(page)).toBe(before);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => frames(page)).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});

for (const [motion, check] of [
  ['reduce', (n) => expect(n).toBeLessThanOrEqual(2)],
  ['no-preference', (n) => expect(n).toBeGreaterThan(2)],
]) {
  test(`a camera preset with reduced motion "${motion}"`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await openReady(page, DEBUG);
    const start = await settledFrames(page);
    await page.getByRole('button', { name: 'Back (posterior) view' }).click();
    // Reduced motion jumps: one frame to draw the new view, one more for
    // OrbitControls to notice it moved. Otherwise the preset tweens.
    await expect.poll(() => frames(page)).toBeGreaterThan(start);
    check((await settledFrames(page)) - start);
  });
}

test('switching theme recolours the same canvas, not a new one', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  const errors = await openReady(page, DEBUG);
  const canvas = page.locator('[data-testid="scene-host"] canvas');
  await canvas.evaluate((el) => {
    el.dataset.marker = 'first';
  });
  await settledFrames(page);
  const snap = () => page.evaluate(() => window.__anatomyDebug.snapshot());
  const lightPixels = await snap();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('[data-theme="dark"]').first()).toBeVisible();
  await settledFrames(page);
  const darkPixels = await snap();
  // The canvas is transparent where there is no model, so the difference is
  // the model's own colours, not the stage gradient behind it.
  expect(darkPixels.length).toBeGreaterThan(1000);
  expect(darkPixels).not.toBe(lightPixels);
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute('data-marker', 'first');
  expect(errors).toEqual([]);
});

test('a stored dark choice beats a light OS, from the first frame', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() =>
    window.localStorage.setItem('splitiq.theme', 'dark')
  );
  // Hold the tool's chunk so the Suspense fallback is what is on screen.
  let release;
  const held = new Promise((r) => (release = r));
  await page.route(/\/assets\/squat-SquatApp-.*\.js$/, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/squat');
  const ground = page.getByTestId('route-ground');
  await expect(ground).toHaveAttribute('data-theme', 'dark');
  const bg = await ground.evaluate(
    (el) => window.getComputedStyle(el).backgroundColor
  );
  expect(bg).toBe('rgb(8, 8, 13)');
  release();
  await expect(page.getByTestId('load-status')).toHaveText(READY, {
    timeout: READY_TIMEOUT,
  });
});

// vite preview has no vercel.json, so /squat/'s relative asset URLs would hit
// the SPA fallback. Apply the deployed rewrites — read from vercel.json, not
// restated — first match wins, the catch-all left to the preview server.
test('/squat/ loads through the vercel.json rewrites and canonicalises to /squat', async ({
  page,
}) => {
  const rules = VERCEL.rewrites
    .filter((r) => r.source !== '/(.*)')
    .map((r) => ({ re: new RegExp(`^${r.source}$`), to: r.destination }));
  await page.route(
    (url) => rules.some((r) => r.re.test(url.pathname)),
    async (route) => {
      const url = new URL(route.request().url());
      const rule = rules.find((r) => r.re.test(url.pathname));
      const m = url.pathname.match(rule.re);
      url.pathname = rule.to.replace(/\$(\d)/g, (_, i) => m[Number(i)]);
      const response = await route.fetch({ url: url.href });
      await route.fulfill({ response });
    }
  );
  const urls = recordRequests(page);
  const errors = await openReady(page, '/squat/#guide=metrics');
  expect(new URL(page.url()).pathname).toBe('/squat');
  expect(new URL(page.url()).hash).toBe('#guide=metrics');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(urls.some((u) => u.includes('/squat/assets/'))).toBe(true);
  expect(supabaseHits(urls)).toEqual([]);
  expect(errors).toEqual([]);
});

test.describe('phone 390 px layout', () => {
  test.use({
    viewport: { width: 390, height: 800 },
    hasTouch: true,
    isMobile: true,
  });

  test('nothing below the stage moves while the model loads', async ({
    page,
  }) => {
    // Hold the manifest and the 3D chunk so every intermediate state is on
    // screen long enough to measure: no data, data but no engine, ready.
    const gates = {};
    const hold = (re, name) => {
      let open;
      gates[name] = new Promise((r) => (open = r));
      gates[`${name}Open`] = () => open();
      return page.route(re, async (route) => {
        await gates[name];
        await route.continue();
      });
    };
    await hold(/\/assets\/squat-manifest-.*\.json$/, 'manifest');
    await hold(/\/assets\/squat-createAnatomyScene-.*\.js$/, 'scene');

    // Page coordinates, so a scroll could not fake a stable position.
    const formCheckTop = () =>
      page
        .getByRole('heading', { name: 'Form check' })
        .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

    await page.goto('/squat', { timeout: PAINT_TIMEOUT });
    await expect(page.getByRole('region', { name: '3D model' })).toBeVisible({
      timeout: PAINT_TIMEOUT,
    });
    // The controls are laid out from the first paint, disabled.
    await expect(page.getByRole('slider', { name: 'Depth' })).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Front (anterior) view' })
    ).toBeDisabled();
    const atFirstPaint = await formCheckTop();

    gates.manifestOpen();
    await expect(page.getByRole('slider', { name: 'Depth' })).toBeEnabled();
    const withData = await formCheckTop();

    gates.sceneOpen();
    await expect(page.getByTestId('load-status')).toHaveText(READY, {
      timeout: READY_TIMEOUT,
    });
    await expect(
      page.getByRole('button', { name: 'Front (anterior) view' })
    ).toBeEnabled();
    const ready = await formCheckTop();

    expect(Math.abs(withData - atFirstPaint)).toBeLessThanOrEqual(1);
    expect(Math.abs(ready - atFirstPaint)).toBeLessThanOrEqual(1);
  });
});

for (const width of [360, 390]) {
  test.describe(`phone ${width} px`, () => {
    test.use({
      viewport: { width, height: 800 },
      hasTouch: true,
      isMobile: true,
    });

    test('no horizontal scroll, intact header, 44 px targets', async ({
      page,
    }) => {
      await openReady(page);
      expect(await noHorizontalScroll(page)).toBe(true);
      await expect(page.getByRole('link', { name: /Open SplitIQ/ })).toHaveText(
        /^Open SplitIQ/
      );
      expect(await smallTargets(page)).toEqual([]);

      // With a muscle card open, the attribution and the modelled framing are
      // still there — the panel stacks above them, it does not push them out.
      await page.getByRole('option', { name: 'Soleus' }).click();
      await expect(
        page.getByRole('heading', { level: 3, name: 'Soleus' })
      ).toBeVisible();
      await expect(page.getByText('Modelled, not measured')).toBeVisible();
      await expect(
        page.getByText(/Muscle activation is estimated from joint moments/)
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /BodyParts3D/ })
      ).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
      expect(await smallTargets(page)).toEqual([]);

      await page.getByRole('button', { name: 'Coaching guide' }).click();
      const dialog = page.getByRole('dialog');
      for (const pane of ['Phases', 'Sources']) {
        await dialog.getByRole('tab', { name: pane }).click();
        expect(await smallTargets(page, '[role="dialog"]'), pane).toEqual([]);
      }
      expect(await noHorizontalScroll(page)).toBe(true);
    });
  });
}
