const { chromium } = require('/private/tmp/rescue-release-integration-2026-10-18/web/node_modules/playwright');
const fs = require('fs'), path = require('path');
const dir = __dirname;
const out = { kind: 'Real emulator (Auth + Firestore) responder, closed report seeded with 24 updates (6 acknowledgements); built web app, normal motion', widths: {} };
const OPERATIONAL = /acknowledge|submit update|close report|assign|save update|^close$|post update/i;
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(15000);
      await page.goto('http://localhost:5190/login');
      await page.getByLabel('Email', { exact: true }).fill('daniel.flores@harbor.example');
      await page.getByLabel('Password', { exact: true }).fill('Demo-Sample#2026');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL('**/assignments', { timeout: 20000 });
      await page.goto('http://localhost:5190/assignments/closed-render-alpha-1');
      const detail = page.locator('main').first();
      await page.getByText('Crew update 24:', { exact: false }).first().waitFor();
      const notes = await page.getByText('Crew update', { exact: false }).count();
      const loadOlder = page.getByRole('button', { name: /Load older updates/i });
      const hasLoadOlder = await loadOlder.count();
      const buttons = await page.locator('main button').evaluateAll((els) => els.map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim()).filter(Boolean));
      const operational = buttons.filter((b) => OPERATIONAL.test(b));
      const before = await page.evaluate(() => document.documentElement.scrollHeight);
      const recent = await page.locator('.closed-history li').count();
      if (hasLoadOlder) { await loadOlder.first().click(); await page.waitForTimeout(600); }
      const showOlder = page.getByRole('button', { name: /Show \d+ older updates/ });
      if (await showOlder.count()) { await showOlder.first().click(); await page.waitForTimeout(300); }
      const after = await page.getByText('Crew update', { exact: false }).count();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const geist = await page.evaluate(() => document.fonts.check('16px Geist'));
      await page.locator('article.closed-report').screenshot({ path: path.join(dir, `closed-view-${width}.png`) });
      out.widths[width] = { recentRowsInHistoryList: recent, notesVisibleInitially: notes, loadOlderVisible: hasLoadOlder > 0, notesAfterLoadOlder: after, operationalControls: operational, horizontalOverflow: overflow, geistReady: geist, pageHeightBefore: before, buttonLabels: buttons };
      await page.close();
    }
    out.pass = Object.values(out.widths).every((w) => w.loadOlderVisible && w.operationalControls.length === 0 && w.horizontalOverflow === 0 && w.notesAfterLoadOlder > w.notesVisibleInitially);
  } catch (e) { out.pass = false; out.error = e.message; process.exitCode = 1; }
  finally { await browser.close(); fs.writeFileSync(path.join(dir, 'closed-render.json'), JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 2)); }
})();
