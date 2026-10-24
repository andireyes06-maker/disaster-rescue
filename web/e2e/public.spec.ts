import { test, expect } from './fixtures';

test('the public front door explains reporting and fits narrow screens', async ({ page }) => {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['localhost', '127.0.0.1'].includes(host) ? route.continue() : route.abort();
  });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', {waitUntil: 'domcontentloaded'});
    await expect(page.getByRole('heading', { level: 1, name: /Report clearly/ })).toBeVisible();
    await expect(page.getByText('Report incidents. Follow response updates.')).toBeVisible();
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByRole('link', { name: 'Access', exact: true }).click();
  await expect(page.getByText('Use the Rescue Reports mobile app to submit reports, add a location and check updates. The website is for administrators and rescue teams.')).toBeVisible();
});
