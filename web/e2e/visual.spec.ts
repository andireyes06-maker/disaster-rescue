import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Captures full-page login screenshots of the current app and of the pre-Tailwind
// baseline (set BASELINE_URL to a dev server running the f30db64 code).
// Skipped unless BASELINE_URL is set, so the default smoke run stays fast.
const BASELINE_URL = process.env.BASELINE_URL;
const here = path.dirname(fileURLToPath(import.meta.url));
const WIDTHS = [1280, 375];

async function blockExternal(page: Page) {
  await page.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    if (hostname === 'localhost' || hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
}

test.describe('visual comparison', () => {
  test.skip(!BASELINE_URL, 'Set BASELINE_URL to capture the baseline');

  for (const [label, url] of [
    ['baseline', BASELINE_URL ?? ''],
    ['current', 'http://localhost:5173/'],
  ] as const) {
    for (const width of WIDTHS) {
      test(`${label} login at ${width}px`, async ({ page }) => {
        await blockExternal(page);
        await page.setViewportSize({ width, height: 800 });
        await page.goto(url);
        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
        await page.waitForLoadState('networkidle');
        await page.screenshot({
          path: path.join(here, '__screenshots__', label, `login-${width}.png`),
          fullPage: true,
        });
      });
    }
  }
});
