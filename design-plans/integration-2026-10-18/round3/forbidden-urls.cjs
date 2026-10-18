// Lists every 403 response URL during dispatcher and responder navigation in Chromium, to separate font requests from API responses.
const { createRequire } = require('node:module');
const req = createRequire('/private/tmp/rescue-release-integration-2026-10-18/web/package.json');
const { chromium } = req('playwright');
const BASE = 'http://localhost:5179', PASSWORD = 'Demo-Sample#2026';
(async () => {
  const b = await chromium.launch({ headless: true });
  const out = [];
  for (const [email, routes] of [['marco.reyes', ['/dashboard', '/map', '/analytics', '/audit']], ['daniel.flores', ['/assignments']]]) {
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    p.on('response', (r) => { if (r.status() === 403) out.push({ user: email, url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 110) }); });
    await p.goto(`${BASE}/login`, { waitUntil: 'load' });
    await p.getByLabel('Email', { exact: true }).fill(`${email}@harbor.example`);
    await p.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await p.getByRole('button', { name: 'Sign in', exact: true }).click();
    await p.locator('h1').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    for (const r of routes) { await p.goto(`${BASE}${r}`, { waitUntil: 'load' }); await p.waitForTimeout(1500); }
  }
  await b.close();
  const summary = {};
  for (const o of out) summary[o.url] = (summary[o.url] || 0) + 1;
  console.log(JSON.stringify(summary, null, 1));
  console.log('total 403 responses:', out.length);
})().catch((e) => { console.error('fatal', e.message); process.exit(1); });
