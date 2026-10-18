// Records each React/module error with the URL and boundary state at that moment, per engine, during the dispatcher workflow steps.
const { createRequire } = require('node:module');
const fs = require('node:fs');
const req = createRequire('/private/tmp/rescue-release-integration-2026-10-18/web/package.json');
const { chromium, firefox, webkit } = req('playwright');
const H = process.env.HOME;
const EXE = { firefox: `${H}/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox`, webkit: `${H}/Library/Caches/ms-playwright/webkit-2359/pw_run.sh` };
const BASE = 'http://localhost:5179', PASSWORD = 'Demo-Sample#2026';
const log = [];
(async () => {
  for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
    const b = await engine.launch({ headless: true, ...(EXE[name] ? { executablePath: EXE[name] } : {}) });
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    let step = 'start';
    p.on('console', (m) => { if (m.type() === 'error' && /React components|Importing a module|font/.test(m.text())) log.push({ engine: name, step, url: p.url().replace(BASE, ''), error: m.text().slice(0, 90), boundary: null }); });
    p.on('pageerror', (e) => log.push({ engine: name, step, url: p.url().replace(BASE, ''), pageerror: e.message.slice(0, 90) }));
    const mark = async (label) => { const shown = await p.getByRole('heading', { name: 'Page unavailable' }).count(); log.push({ engine: name, step: label, url: p.url().replace(BASE, ''), boundaryShown: shown > 0 }); };
    step = 'login';
    await p.goto(`${BASE}/login`, { waitUntil: 'load' });
    await p.getByLabel('Email', { exact: true }).fill('marco.reyes@harbor.example');
    await p.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await p.getByRole('button', { name: 'Sign in', exact: true }).click();
    await p.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(2500); step = 'dashboard'; await mark('after sign-in');
    const row = p.locator('a[href^="/incidents/"]').first();
    if (await row.count()) { step = 'incident'; await row.click(); await p.waitForTimeout(3000); await mark('incident opened by click'); }
    step = 'map'; await p.goto(`${BASE}/map`, { waitUntil: 'load' }); await p.waitForTimeout(2500); await mark('map by direct load');
    await b.close();
  }
  fs.writeFileSync(__dirname + '/boundary-trace.json', JSON.stringify(log, null, 2));
  for (const r of log) console.log(JSON.stringify(r));
})().catch((e) => { console.error('fatal', e.message); process.exit(1); });
