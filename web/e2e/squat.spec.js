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
const READY = /Model loaded/;

const VERCEL = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')
);

test.use({ serviceWorkers: 'block' });

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
  await page.goto(path);
  await expect(
    page.getByRole('heading', { level: 1, name: 'High-bar back squat' })
  ).toBeVisible();
  // Manifest fetch → worker streams and gunzips 2.2 MB → layout check.
  await expect(page.getByRole('status')).toHaveText(READY, { timeout: 20_000 });
  return errors;
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
    return [...root.querySelectorAll('a[href], button, [role="tab"]')]
      .filter((el) => el.offsetParent !== null && !el.closest('[inert]'))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: (el.getAttribute('aria-label') || el.textContent).trim(),
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
  });
}

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
  await page.route(/\/assets\/SquatApp-.*\.js$/, async (route) => {
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
  await expect(page.getByRole('status')).toHaveText(READY, { timeout: 20_000 });
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
