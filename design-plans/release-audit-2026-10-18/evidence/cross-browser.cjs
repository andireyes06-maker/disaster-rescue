// Cross-engine realtime check: sign in and open the live pages in Chromium, Firefox and WebKit.
// Captures every console error, and separates Firestore Listen messages so WebKit is investigated, not reported clean.
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium, firefox, webkit } = req('playwright');

const BASE = 'http://localhost:5178';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const API = 'http://localhost:3105/api';
const PASSWORD = 'AuditOnly-Rescue-2026';
const home = process.env.HOME;
const EXE = {
  firefox: `${home}/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox`,
  webkit: `${home}/Library/Caches/ms-playwright/webkit-2359/pw_run.sh`,
};
const out = [];

async function token(email) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  return (await r.json()).idToken;
}

async function run(name, engine, exe) {
  const launch = { headless: true, ...(exe ? { executablePath: exe } : {}) };
  const browser = await engine.launch(launch);
  const record = { engine: name, steps: [], listenErrors: [], otherErrors: [] };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text().slice(0, 220);
    if (/listen/i.test(text)) record.listenErrors.push(text); else record.otherErrors.push(text);
  });
  page.on('pageerror', (e) => record.otherErrors.push(`pageerror: ${e.message.slice(0, 200)}`));
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'load' });
    await page.getByLabel('Email').fill('dispatcher@harbor.example');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    record.steps.push('signed in as dispatcher -> /dashboard');
    await page.waitForTimeout(3000);
    const rows = await page.locator('a[href^="/incidents/"]').count();
    record.steps.push(`dashboard rows: ${rows}`);
    await page.goto(`${BASE}/map`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    record.steps.push('map loaded');
  } catch (e) {
    record.steps.push(`error: ${e.message.split('\n')[0]}`);
  }
  await browser.close();
  return record;
}

(async () => {
  out.push(await run('chromium', chromium, null));
  out.push(await run('firefox', firefox, EXE.firefox));
  out.push(await run('webkit', webkit, EXE.webkit));
  fs.writeFileSync(path.join(__dirname, 'cross-browser.json'), JSON.stringify(out, null, 2));
  for (const r of out) console.log(JSON.stringify(r));
})().catch((e) => { console.error('script error', e); process.exit(1); });
