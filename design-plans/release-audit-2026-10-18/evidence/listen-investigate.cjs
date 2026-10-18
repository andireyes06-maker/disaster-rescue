// Isolates Firestore Listen errors by navigation type, in each engine.
// Steps: sign in, idle, in-app (client-side) navigation, full reload, full navigation. Records errors after each step.
const { createRequire } = require('node:module');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium, firefox, webkit } = req('playwright');
const H = process.env.HOME;
const EXE = { firefox: `${H}/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox`, webkit: `${H}/Library/Caches/ms-playwright/webkit-2359/pw_run.sh` };
const PASSWORD = 'AuditOnly-Rescue-2026';
const out = [];
(async () => {
  for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
    const b = await engine.launch({ headless: true, ...(EXE[name] ? { executablePath: EXE[name] } : {}) });
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    let errs = 0; const cancelled = [];
    p.on('pageerror', () => errs++);
    p.on('console', (m) => { if (m.type() === 'error' && /Listen/.test(m.text())) errs++; });
    p.on('requestfailed', (r) => { if (/Listen/.test(r.url())) cancelled.push(r.failure()?.errorText); });
    const step = async (label, fn) => { const before = errs; await fn(); await p.waitForTimeout(3000); out.push({ engine: name, step: label, newErrors: errs - before, cancelled: cancelled.length }); cancelled.length = 0; };
    await p.goto('http://localhost:5178/login', { waitUntil: 'load' });
    await p.getByLabel('Email').fill('dispatcher@harbor.example'); await p.getByLabel('Password').fill(PASSWORD);
    await step('sign-in and dashboard', async () => { await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL(/\/dashboard/, { timeout: 30000 }); });
    await step('idle on dashboard', async () => {});
    await step('client-side nav to map', async () => { await p.getByRole('link', { name: 'Map' }).first().click(); await p.waitForURL(/\/map/, { timeout: 15000 }); });
    await step('client-side nav back to dashboard', async () => { await p.getByRole('link', { name: 'Dashboard' }).first().click(); await p.waitForURL(/\/dashboard/, { timeout: 15000 }); });
    await step('full reload', async () => { await p.reload({ waitUntil: 'load' }); });
    await step('full navigation to map', async () => { await p.goto('http://localhost:5178/map', { waitUntil: 'load' }); });
    await b.close();
  }
  require('node:fs').writeFileSync(__dirname + '/listen-investigate.json', JSON.stringify(out, null, 2));
  for (const r of out) console.log(JSON.stringify(r));
})().catch((e) => { console.error('script error', e.message); process.exit(1); });
