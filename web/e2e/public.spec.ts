import { test, expect } from '@playwright/test';

test('the public front door labels unavailable services honestly and fits narrow screens', async ({ page }) => {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['localhost', '127.0.0.1'].includes(host) ? route.continue() : route.abort();
  });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Report an incident/ })).toBeVisible();
    await expect(page.getByText('Demo site · hotline not configured')).toBeVisible();
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByRole('link', { name: 'Resident app availability' }).click();
  await expect(page.getByText('Not published yet. Ask your team lead for the demo build.')).toBeVisible();
});
