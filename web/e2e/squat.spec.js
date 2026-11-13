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
        [
          'a[href]',
          'button',
          '[role="tab"]',
          '[role="radio"]',
          'input[type="range"]',
          // The muscle list's rows: the panel's primary control, and the
          // accessible substitute for the canvas.
          '[role="option"]',
          // The switch INPUT is deliberately 24 px (WCAG 2.5.8 AA's floor,
          // which is what axe measures); the target a finger hits is the
          // label around it, so that is what is measured here.
          'label:has([role="switch"])',
        ].join(', ')
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

      const slider = page.getByRole('slider', { name: 'Rep time' });
      const readout = page.getByTestId('depth-readout');
      await expect(readout).toHaveText(/0\.00 s · Setup and brace · 0% depth/);
      await slider.focus();
      await page.keyboard.press('End');
      await expect(readout).toHaveText(/3\.68 s · Lockout · 0% depth · drive/);
      // End leaves depth at 0, as it started; the bottom actually moves it.
      await page.getByRole('button', { name: 'Bottom', exact: true }).click();
      await expect(readout).toHaveText(/2\.02 s · Bottom/);
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
      await expect
        .poll(() => new URL(page.url()).hash)
        .toBe('#m=adductor-minimus');
      await expect(page.getByTestId('muscle-band')).toContainText(
        'Indicative estimate, not EMG.'
      );
      // Announced, not focused: focus stays on the option so the next arrow
      // press keeps moving down the list.
      await expect(page.getByTestId('muscle-announce')).toHaveText(
        'Showing Adductor minimus'
      );
      await expect(listbox.getByRole('option').nth(2)).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect
        .poll(() => new URL(page.url()).hash)
        .toBe('#m=rectus-femoris');
      // The one role sentence that used to cite EMG, two lines above the card's
      // own "not EMG" caveat (docs/squat/PROVENANCE.md).
      await expect(
        page.getByText(/It works at roughly half the level/)
      ).toBeVisible();
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
  });
}

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

test('a #t= deep link opens on its frame, and Play runs to lockout and stops', async ({
  page,
}) => {
  const errors = await openReady(page, `${DEBUG}#t=2.44&paused`);
  const readout = page.getByTestId('depth-readout');
  await expect(readout).toHaveText(/2\.44 s · Drive/);
  await expect(
    page
      .getByRole('group', { name: 'Jump to phase' })
      .getByRole('button', { name: 'Drive' })
  ).toHaveAttribute('aria-pressed', 'true');
  // Opening a link does not rewrite it.
  expect(new URL(page.url()).hash).toBe('#t=2.44&paused');
  expect(await axe(page)).toEqual([]);

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true })
  ).toBeVisible();
  await expect(readout).toHaveText(/3\.68 s · Lockout/, { timeout: 10_000 });
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeVisible();
  // Stopped, not looping: the render loop goes idle again.
  await settledFrames(page);
  await expect.poll(() => new URL(page.url()).hash).toBe('#t=3.68&paused');
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
  // The last control before the stage (the header's link), then Tab: focus
  // lands on the first control after it — the rail's first button — never
  // on the canvas. Stage, then rail, then the page below.
  await page.getByRole('link', { name: /Open SplitIQ/ }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Step back' })).toBeFocused();
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
  await page.getByRole('button', { name: 'Bottom', exact: true }).click();
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
    await expect(page.getByRole('slider', { name: 'Rep time' })).toBeDisabled();
    // The camera presets sit behind the phone bar's View tab.
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Front (anterior) view' })
    ).toBeDisabled();
    const atFirstPaint = await formCheckTop();

    gates.manifestOpen();
    await expect(page.getByRole('slider', { name: 'Rep time' })).toBeEnabled();
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

// PR C, model as hero (docs/squat/HERO_STAGE_SPEC.md). Every tool for the
// model is on screen without scrolling, at both reference viewports: on a
// phone after opening the bar's tab that holds it.
const PHASE_NAMES = [
  'Setup and brace',
  'Lowering',
  'Bottom',
  'Drive',
  'Lockout',
];
const PRESETS = [
  'Front (anterior) view',
  'Back (posterior) view',
  'Left side (lateral) view',
  'Right side (lateral) view',
];

function heroTools(page) {
  const pills = page.getByRole('group', { name: 'Jump to phase' });
  return [
    [null, 'Play', page.getByRole('button', { name: 'Play', exact: true })],
    [null, 'Rep time', page.getByRole('slider', { name: 'Rep time' })],
    [null, 'Step back', page.getByRole('button', { name: 'Step back' })],
    [null, 'Step forward', page.getByRole('button', { name: 'Step forward' })],
    ...PHASE_NAMES.map((n) => [
      'Rep',
      n,
      pills.getByRole('button', { name: n, exact: true }),
    ]),
    ...PRESETS.map((n) => ['View', n, page.getByRole('button', { name: n })]),
    ['View', 'Reset', page.getByRole('button', { name: 'Reset' })],
    // The switch input is 24 px by design; its label is the target.
    [
      'Show',
      'Activation heatmap',
      page.locator('label', {
        has: page.getByRole('switch', { name: 'Activation heatmap' }),
      }),
    ],
    // R11: the rail footer's third button on desktop, the Share tab on a phone.
    [
      'Share',
      'Copy link',
      page.getByRole('button', { name: 'Copy link to this view' }),
    ],
  ];
}

for (const [label, viewport, phone] of [
  ['desktop 1280 × 720', { width: 1280, height: 720 }, false],
  ['phone 390 × 844', { width: 390, height: 844 }, true],
]) {
  test.describe(`hero stage — ${label}`, () => {
    test.use(
      phone ? { viewport, hasTouch: true, isMobile: true } : { viewport }
    );

    test('every tool is reachable without scrolling, at 44 px (criteria 16, 17)', async ({
      page,
    }) => {
      const errors = await openReady(page);
      const innerHeight = await page.evaluate(() => window.innerHeight);
      for (const [tab, name, control] of heroTools(page)) {
        if (phone && tab) {
          const button = page.getByRole('button', { name: tab, exact: true });
          if ((await button.getAttribute('aria-expanded')) !== 'true') {
            await button.click();
          }
        }
        await expect(control, name).toBeVisible();
        const box = await control.boundingBox();
        expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(
          innerHeight
        );
        expect(Math.round(box.width), `${name} width`).toBeGreaterThanOrEqual(
          44
        );
        expect(Math.round(box.height), `${name} height`).toBeGreaterThanOrEqual(
          44
        );
        expect(await page.evaluate(() => window.scrollY), name).toBe(0);
      }
      expect(await noHorizontalScroll(page)).toBe(true);
      expect(await smallTargets(page)).toEqual([]);
      expect(await axe(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    // PR B: the strain readout is laid over the stage, so it must neither push
    // a tool off screen nor sit off screen itself (criteria 9, 12, 16).
    test('with the heatmap on, the readout and every tool are on screen (criteria 12, 16)', async ({
      page,
    }) => {
      const errors = await openReady(page, '/squat#heat');
      const innerHeight = await page.evaluate(() => window.innerHeight);
      const stage = page.getByRole('region', { name: '3D model' });
      const panel = stage.getByTestId('strain-panel');
      await expect(panel).toBeVisible();
      await expect(panel.locator('ol > li')).toHaveCount(3);
      await expect(
        panel.getByText('Indicative estimate, not EMG.')
      ).toBeVisible();
      await expect(panel.getByTestId('heat-swatch-high')).toBeVisible();
      const p = await panel.boundingBox();
      const s = await stage.boundingBox();
      expect(p.y).toBeGreaterThanOrEqual(s.y);
      expect(p.y + p.height).toBeLessThanOrEqual(
        Math.min(innerHeight, s.y + s.height)
      );
      for (const [tab, name, control] of heroTools(page)) {
        if (phone && tab) {
          const button = page.getByRole('button', { name: tab, exact: true });
          if ((await button.getAttribute('aria-expanded')) !== 'true') {
            await button.click();
          }
        }
        await expect(control, name).toBeVisible();
        const box = await control.boundingBox();
        expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(
          innerHeight
        );
        expect(await page.evaluate(() => window.scrollY), name).toBe(0);
      }
      // A step updates it in place: the readout follows the playhead.
      await page.getByRole('button', { name: 'Step forward' }).click();
      await expect(panel).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
      expect(await axe(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('without WebGL, the readout sits in the controls, clear of the notice (criterion 21)', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const proto = window.HTMLCanvasElement.prototype;
        const original = proto.getContext;
        proto.getContext = function (kind, ...rest) {
          if (/^(webgl|webgl2|experimental-webgl)$/.test(kind)) return null;
          return original.call(this, kind, ...rest);
        };
      });
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto('/squat#heat', { timeout: PAINT_TIMEOUT });
      const note = page.getByRole('note', { name: '3D view unavailable' });
      await expect(note).toBeVisible({ timeout: PAINT_TIMEOUT });
      const rail = page.getByRole('region', { name: 'Controls' });
      const panel = rail.getByTestId('strain-panel');
      await expect(panel).toBeVisible({ timeout: PAINT_TIMEOUT });
      await expect(panel.locator('ol > li')).toHaveCount(3);
      const innerHeight = await page.evaluate(() => window.innerHeight);
      const p = await panel.boundingBox();
      const n = await note.boundingBox();
      expect(p.y + p.height).toBeLessThanOrEqual(innerHeight);
      const overlaps =
        p.x < n.x + n.width &&
        n.x < p.x + p.width &&
        p.y < n.y + n.height &&
        n.y < p.y + p.height;
      expect(overlaps).toBe(false);
      if (phone) {
        await page.getByRole('button', { name: 'Show', exact: true }).click();
      }
      const heat = page.getByRole('switch', { name: 'Activation heatmap' });
      await expect(heat).toBeEnabled();
      await expect(
        page.getByRole('switch', { name: 'Skeleton' })
      ).toBeDisabled();
      const footer = phone
        ? heat
        : page.getByRole('button', { name: 'Coaching guide' });
      const f = await footer.boundingBox();
      expect(f.y + f.height).toBeLessThanOrEqual(innerHeight);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await heat.click();
      await expect(page.getByTestId('strain-panel')).toHaveCount(0);
      expect(new URL(page.url()).hash).toBe('');
      expect(await axe(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('the stage is the hero, and the page below stays reachable (criteria 15, 18)', async ({
      page,
    }) => {
      await openReady(page);
      const stage = await page
        .getByRole('region', { name: '3D model' })
        .boundingBox();
      if (phone) {
        expect(stage.width).toBe(390);
        expect(stage.height).toBeGreaterThanOrEqual(0.5 * 844);
      } else {
        expect(stage.width).toBeGreaterThanOrEqual(0.6 * 1280);
        expect(stage.height).toBeGreaterThanOrEqual(520);
        // Fills the viewport below the header, less the hero's padding.
        expect(stage.y + stage.height).toBeGreaterThanOrEqual(720 - 16 - 1);
      }
      // Docked: the rail sits beside the stage on desktop, the bar under it on
      // a phone (criterion 17).
      const rail = await page
        .getByRole('region', { name: 'Controls' })
        .boundingBox();
      if (phone) {
        expect(rail.y).toBeGreaterThanOrEqual(stage.y + stage.height - 1);
      } else {
        expect(rail.x).toBeGreaterThanOrEqual(stage.x + stage.width - 1);
        expect(rail.y).toBeLessThan(stage.y + stage.height);
      }
      // The hero is sized from HEADER_HEIGHT in SquatHeader.jsx; this is the
      // only place the real rendered height is checked against it.
      const header = await page.locator('header').first().boundingBox();
      expect(header.height).toBe(phone ? 57 : 59);
      // Keyboard-reachable below the fold: Tab walks from the last rail
      // control down into the page until it reaches the muscle listbox.
      await page.getByRole('slider', { name: 'Rep time' }).focus();
      let reached = false;
      for (let i = 0; i < 40 && !reached; i++) {
        await page.keyboard.press('Tab');
        reached = await page.evaluate(
          () => !!document.activeElement?.closest('[role="listbox"]')
        );
      }
      expect(reached).toBe(true);
    });
  });
}

// R11 share-a-view (#439), criterion 16. Chromium only (this config), which is
// the one engine that grants clipboard-write as a permission.
const COPY = 'Copy link to this view';
const G5 =
  '#t=2.44&m=vastus-lateralis&paused&cam=90,85,2.50&hide=skeleton&heat';
const DEG = 180 / Math.PI;
const camOf = (hash) => {
  const m = /cam=(-?[\d.]+),([\d.]+),([\d.]+)/.exec(hash);
  return m && { az: Number(m[1]), pol: Number(m[2]), dist: Number(m[3]) };
};
// Within a degree and a centimetre of the link's camera.
function expectPose(pose, cam) {
  const dAz = ((((pose.azimuth * DEG - cam.az) % 360) + 540) % 360) - 180;
  expect(Math.abs(dAz)).toBeLessThanOrEqual(1);
  expect(Math.abs(pose.polar * DEG - cam.pol)).toBeLessThanOrEqual(1);
  expect(Math.abs(pose.radius - cam.dist)).toBeLessThanOrEqual(0.01);
}
const readClipboard = (page) =>
  page.evaluate(() => navigator.clipboard.readText());

test('a copied view reopens exactly, with no query string (criterion 16a)', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await openReady(page, DEBUG);
  await page.getByRole('button', { name: 'Front (anterior) view' }).click();
  await page.getByRole('switch', { name: 'Skeleton' }).click();
  await page.getByRole('switch', { name: 'Activation heatmap' }).click();
  await page.getByRole('option', { name: 'Soleus' }).click();
  await page.getByRole('slider', { name: 'Rep time' }).focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  const before = await page.evaluate(() => window.history.length);
  await page.getByRole('button', { name: COPY }).click();
  await expect(page.getByTestId('share-status')).toHaveText('Link copied.');
  const link = await readClipboard(page);
  const url = new URL(link);
  expect(link).not.toContain('?');
  expect(url.pathname).toBe('/squat');
  expect(url.hash).toBe(
    '#t=0.10&m=soleus&paused&cam=90,85,3.60&hide=skeleton&heat'
  );
  // Copy adds no history entry.
  expect(await page.evaluate(() => window.history.length)).toBe(before);

  // The probe flag is the one addition: a link has no query string.
  await openReady(page, `${DEBUG}${url.hash}`);
  await expect(page.getByTestId('depth-readout')).toHaveText(/^0\.10 s/);
  await expect(page.getByRole('option', { name: 'Soleus' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByRole('switch', { name: 'Muscles' })).toBeChecked();
  await expect(
    page.getByRole('switch', { name: 'Skeleton' })
  ).not.toBeChecked();
  await expect(
    page.getByRole('switch', { name: 'Activation heatmap' })
  ).toBeChecked();
  expectPose(
    await page.evaluate(() => window.__anatomyDebug.pose()),
    camOf(url.hash)
  );
  // Opening a link does not rewrite it, and never starts playback.
  expect(new URL(page.url()).hash).toBe(url.hash);
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeVisible();
  // The recipient gets the full tool, framing and attribution included
  // (criterion 15): there is no chrome-less shared view.
  await expect(page.getByText('Modelled, not measured')).toBeVisible();
  await expect(page.getByRole('link', { name: /BodyParts3D/ })).toBeAttached();
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
});

for (const [label, viewport, scheme] of [
  ['desktop, light', { width: 1280, height: 720 }, 'light'],
  ['desktop, dark', { width: 1280, height: 720 }, 'dark'],
  ['phone 360, light', { width: 360, height: 800 }, 'light'],
  ['phone 390, dark', { width: 390, height: 844 }, 'dark'],
]) {
  test.describe(`share, clipboard refused — ${label}`, () => {
    const phone = viewport.width < 761;
    test.use(
      phone
        ? { viewport, colorScheme: scheme, hasTouch: true, isMobile: true }
        : { viewport, colorScheme: scheme }
    );

    test('falls back to a selected link field (criteria 3, 14, 16b)', async ({
      page,
    }) => {
      // Without a grant Chromium would still allow the write through the
      // click's activation, so the refusal is forced to make it certain.
      await page.addInitScript(() => {
        navigator.clipboard.writeText = () =>
          Promise.reject(new window.DOMException('denied', 'NotAllowedError'));
      });
      const errors = await openReady(page);
      if (phone)
        await page.getByRole('button', { name: 'Share', exact: true }).click();
      // Idle: axe-clean, and nothing laid out for the status yet.
      expect(await axe(page)).toEqual([]);
      const railTop = phone
        ? null
        : (await page.getByRole('region', { name: 'Controls' }).boundingBox())
            .y;
      await page.getByRole('button', { name: COPY }).click();
      const field = page.getByRole('textbox', { name: 'Link to this view' });
      await expect(field).toBeVisible();
      await expect(field).toBeFocused();
      await expect(page.getByTestId('share-status')).toHaveText(
        'The browser blocked copying. The link is selected below.'
      );
      const value = await field.inputValue();
      expect(value).toBe(`${new URL(page.url()).origin}/squat`);
      expect(
        await field.evaluate((el) => [el.selectionStart, el.selectionEnd])
      ).toEqual([0, value.length]);
      // The desktop panel overlays the rail: the rail does not move and the
      // page does not scroll.
      if (!phone) {
        expect(
          (await page.getByRole('region', { name: 'Controls' }).boundingBox()).y
        ).toBe(railTop);
        const panel = await page.getByTestId('share-panel').boundingBox();
        const rail = await page
          .getByRole('region', { name: 'Controls' })
          .boundingBox();
        expect(panel.x).toBeGreaterThanOrEqual(rail.x);
        expect(panel.x + panel.width).toBeLessThanOrEqual(rail.x + rail.width);
        expect(panel.y + panel.height).toBeLessThanOrEqual(720);
      }
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(await smallTargets(page)).toEqual([]);
      expect(await noHorizontalScroll(page)).toBe(true);
      expect(await axe(page)).toEqual([]);

      await page.keyboard.press('Escape');
      await expect(field).toBeHidden();
      await expect(page.getByRole('button', { name: COPY })).toBeFocused();
      expect(errors).toEqual([]);
    });
  });
}

test('a link pasted into an open tool updates the whole view (criteria 8, 14, 16c)', async ({
  page,
}) => {
  const errors = await openReady(page, `${DEBUG}#t=2.44&paused`);
  const before = await page.evaluate(() => window.history.length);
  const next = '#t=1.00&cam=-90,80,2.00&hide=muscles';
  await page.evaluate((h) => {
    window.location.hash = h;
  }, next);
  await expect(page.getByTestId('depth-readout')).toHaveText(/^1\.00 s/);
  await expect(page.getByRole('switch', { name: 'Muscles' })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Skeleton' })).toBeChecked();
  expectPose(
    await page.evaluate(() => window.__anatomyDebug.pose()),
    camOf(next)
  );
  // The test's own hash assignment is one history entry; the tool adds none
  // on top of it, and writes nothing back.
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.history.length)).toBe(before + 1);
  expect(new URL(page.url()).hash).toBe(next);
  expect(errors).toEqual([]);
});

test('without WebGL, a link keeps its camera and layers through a re-share (criteria 9, 16d)', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    const proto = window.HTMLCanvasElement.prototype;
    const original = proto.getContext;
    proto.getContext = function (kind, ...rest) {
      if (/^(webgl|webgl2|experimental-webgl)$/.test(kind)) return null;
      return original.call(this, kind, ...rest);
    };
  });
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(`/squat${G5}`, { timeout: PAINT_TIMEOUT });
  await expect(
    page.getByRole('note', { name: '3D view unavailable' })
  ).toBeVisible({ timeout: PAINT_TIMEOUT });
  await expect(page.getByTestId('depth-readout')).toHaveText(
    /^2\.44 s · Drive/,
    {
      timeout: PAINT_TIMEOUT,
    }
  );
  await expect(
    page.getByRole('option', { name: 'Vastus lateralis' })
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('group', { name: 'Camera controls' })
  ).toHaveCount(0);
  await page.getByRole('button', { name: COPY }).click();
  await expect(page.getByTestId('share-status')).toHaveText('Link copied.');
  expect(new URL(await readClipboard(page)).hash).toBe(G5);
  expect(new URL(page.url()).hash).toBe(G5);
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
});
