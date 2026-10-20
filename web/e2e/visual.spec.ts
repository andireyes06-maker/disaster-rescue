import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

// Current references are reviewed local visual regressions. The animated film is masked here
// and tested separately with normal motion. Historical captures remain evidence only.
//
// Current pages use Playwright's configured baseURL, never a hardcoded host. Before capturing, the spec checks that the
// server fingerprint matches every hashed web source/asset/config input, through the shared fixture.
// Captures live in the test output directory, never over tracked source images.
//
// The pre-Tailwind baseline is historical. It is captured only when BASELINE_URL is set, to an owner-verified dev server
// for the baseline code. It is not an approval of the current design.
const BASELINE_URL = process.env.BASELINE_URL;
const WIDTHS = [1280, 375];
const PAGES = [
  { name: 'login', route: '/login', heading: 'Sign in' },
  { name: 'landing', route: '/', heading: null },
] as const;

async function blockExternal(page: Page) {
  await page.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    if (hostname === 'localhost' || hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
}

test.describe('current pages (reviewed visual regression, configured baseURL)', () => {
  for (const page of PAGES) {
    for (const width of WIDTHS) {
      test(`${page.name} at ${width}px`, async ({ page: p, baseURL }, testInfo) => {
        expect(baseURL, 'Playwright baseURL must be configured').toBeTruthy();
        await blockExternal(p);
        await p.setViewportSize({ width, height: 800 });
        await p.goto(page.route);
        if (page.heading) await expect(p.getByRole('heading', { name: page.heading })).toBeVisible();
        await p.waitForLoadState('networkidle');
        await expect(p).toHaveScreenshot(`${page.name}-${width}.png`, {fullPage: true, animations: 'allow', mask: page.name === 'landing' ? [p.locator('.response-film')] : [], maxDiffPixelRatio: 0.002});
        await p.screenshot({
          path: testInfo.outputPath(`${page.name}-${width}.png`),
          fullPage: true,
        });
      });
    }
  }
});

test.describe('historical pre-Tailwind baseline (capture only, not an approval)', () => {
  test.skip(!BASELINE_URL, 'BASELINE_URL not set: the historical pre-Tailwind capture is skipped, not passed');

  for (const width of WIDTHS) {
    test(`historical login at ${width}px`, async ({ page }, testInfo) => {
      await blockExternal(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto(BASELINE_URL!);
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: testInfo.outputPath(`historical-login-${width}.png`),
        fullPage: true,
      });
    });
  }
});
