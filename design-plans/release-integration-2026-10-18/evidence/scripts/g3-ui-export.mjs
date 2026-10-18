import { chromium } from '/Users/rien/Documents/FINAL_PROJECT/web/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const EV = '/Users/rien/Documents/FINAL_PROJECT/design-plans/release-integration-2026-10-18/evidence';
const rec = (n, ok, d) => console.log(ok ? 'PASS' : 'FAIL', n, d ?? '');
const browser = await chromium.launch({ headless: true });
for (const [label, email] of [['dispatcher', 'marco.reyes'], ['admin', 'elena.cruz']]) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  await page.fill('#email', `${email}@harbor.example`);
  await page.fill('#password', process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  await page.goto('http://localhost:5174/analytics', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  for (const name of ['incidents.csv', 'summary.pdf']) {
    const label2 = name === 'incidents.csv' ? 'Download CSV' : 'Download PDF';
    const btn = page.getByRole('button', { name: label2 });
    if ((await btn.count()) === 0) { rec(`${label}: ${name} button present`, false, 'not found'); continue; }
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }).catch((e) => null), btn.click()]);
    if (!dl) { rec(`${label}: ${name} download started`, false, 'no download event'); continue; }
    const path = `${EV}/g3-${label}-${name}`;
    await dl.saveAs(path);
    const buf = readFileSync(path);
    const okType = name.endsWith('.csv') ? buf.toString('utf8', 0, 9) === 'reference' : buf.toString('latin1', 0, 4) === '%PDF';
    rec(`${label}: ${name} downloads and has the right content type`, okType && buf.length > 200, `suggested "${dl.suggestedFilename()}", ${buf.length} bytes`);
  }
  await page.screenshot({ path: `${EV}/g3-${label}-analytics.png` });
  await ctx.close();
}
await browser.close();
