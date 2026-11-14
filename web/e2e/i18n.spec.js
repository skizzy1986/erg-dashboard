import { test, expect } from '@playwright/test';
import { stubSupabase } from './fixtures.js';

// The language control on the signed-out login card: reachable before there
// is an account, remembered across a reload, and owning <html lang>.
test.describe('language on the login screen', () => {
  test.beforeEach(async ({ context }) => {
    await stubSupabase(context);
  });

  test('switches to Spanish, keeps it across a reload, and tags the page', async ({
    page,
  }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', {
      name: 'Language: English (EN). Switch to Spanish',
    });
    await expect(toggle).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await toggle.click();
    await expect(page.getByText('Inicia sesión para continuar')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-CO');

    const back = page.getByRole('button', {
      name: 'Idioma: español (ES). Cambiar a inglés',
    });
    const box = await back.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await page.reload();
    await expect(page.getByText('Inicia sesión para continuar')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-CO');
  });

  test('stays in English and says so when the Spanish catalog cannot load', async ({
    page,
    context,
  }) => {
    await context.route(/\/assets\/i18n-[^/]+\.js$/, (route) => route.abort());
    await page.goto('/');
    await page.getByRole('button', { name: /Switch to Spanish/ }).click();
    await expect(page.getByText(/Spanish could not be loaded/)).toBeVisible();
    await expect(page.getByText('Sign in to continue')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('fits a 360px phone in Spanish without sideways scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await page.getByRole('button', { name: /Switch to Spanish/ }).click();
    await expect(page.getByText('Inicia sesión para continuar')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
