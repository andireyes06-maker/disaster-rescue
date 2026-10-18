import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Capture-only evidence. These tests write screenshots for inspection; they make no visual regression assertion,
// because no approved golden image exists for the current design.
//
// Current pages use Playwright's configured baseURL, never a hardcoded host. Before capturing, the spec checks that the
// server at that baseURL serves THIS source tree (a file that exists only in this integration). That stops another
// session's dev server on the same port from producing evidence.
//
// The pre-Tailwind baseline is historical. It is captured only when BASELINE_URL is set, to an owner-verified dev server
// for the baseline code. It is not an approval of the current design.
const BASELINE_URL = process.env.BASELINE_URL;
const here = path.dirname(fileURLToPath(import.meta.url));
const WIDTHS = [1280, 375];
const PAGES = [
  { name: 'login', route: '/login', heading: 'Sign in' },
  { name: 'landing', route: '/', heading: null },
] as const;
const IDENTITY_FILE = '/src/features/responder/ClosedReportDetail.tsx';
const IDENTITY_TEXT = 'Report not available to your team';

async function blockExternal(page: Page) {
  await page.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    if (hostname === 'localhost' || hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
}

async function verifySourceIdentity(baseURL: string) {
  const res = await fetch(new URL(IDENTITY_FILE, baseURL));
  const body = res.ok ? await res.text() : '';
  if (!body.includes(IDENTITY_TEXT)) {
    throw new Error(`The server at ${baseURL} does not serve this source tree (${IDENTITY_FILE} not identical). Refusing to capture.`);
  }
}

test.describe('current pages (capture only, configured baseURL)', () => {
  for (const page of PAGES) {
    for (const width of WIDTHS) {
      test(`${page.name} at ${width}px`, async ({ page: p, baseURL }) => {
        expect(baseURL, 'Playwright baseURL must be configured').toBeTruthy();
        await verifySourceIdentity(baseURL!);
        await blockExternal(p);
        await p.setViewportSize({ width, height: 800 });
        await p.goto(page.route);
        if (page.heading) await expect(p.getByRole('heading', { name: page.heading })).toBeVisible();
        await p.waitForLoadState('networkidle');
        await p.screenshot({
          path: path.join(here, '__screenshots__', 'current', `${page.name}-${width}.png`),
          fullPage: true,
        });
      });
    }
  }
});

test.describe('historical pre-Tailwind baseline (capture only, not an approval)', () => {
  test.skip(!BASELINE_URL, 'BASELINE_URL not set: the historical pre-Tailwind capture is skipped, not passed');

  for (const width of WIDTHS) {
    test(`historical login at ${width}px`, async ({ page }) => {
      await blockExternal(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto(BASELINE_URL!);
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: path.join(here, '__screenshots__', 'historical-pre-tailwind', `login-${width}.png`),
        fullPage: true,
      });
    });
  }
});
