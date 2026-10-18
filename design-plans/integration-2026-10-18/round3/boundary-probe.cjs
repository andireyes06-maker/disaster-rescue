// Loads each role's routes in Chromium, Firefox and WebKit and records whether the page error boundary ("Page unavailable") appears.
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const req = createRequire('/private/tmp/rescue-release-integration-2026-10-18/web/package.json');
const { chromium, firefox, webkit } = req('playwright');
const H = process.env.HOME;
const EXE = {
  firefox: `${H}/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox`,
  webkit: `${H}/Library/Caches/ms-playwright/webkit-2359/pw_run.sh`,
};
const BASE = 'http://localhost:5179', API = 'http://localhost:3106/api', AUTH = 'http://127.0.0.1:9599/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'Demo-Sample#2026', KEY = 'local-functional-key';
const ACCT = { resident: 'maya.torres', dispatcher: 'marco.reyes', admin: 'elena.cruz', responder: 'daniel.flores', dmo: null };
const ROUTES = {
  resident: ['/my', '/my/report'],
  dispatcher: ['/dashboard', '/map', '/analytics', '/audit', '/teams', '/users'],
  admin: ['/admin', '/dashboard', '/analytics', '/audit', '/teams', '/users', '/map'],
  responder: ['/assignments'],
  dmo: ['/monitor', '/analytics'],
};
const results = [];

async function dmoEmail() {
  // The integration has a DMO fixture under a different name; discover it from the admin user list.
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=${KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'elena.cruz@harbor.example', password: PASSWORD, returnSecureToken: true }) });
  const t = (await r.json()).idToken;
  const users = await (await fetch(`${API}/users`, { headers: { authorization: `Bearer ${t}` } })).json();
  return users.find((u) => u.role === 'dmo' && u.active)?.email ?? null;
}

async function probe(name, engine, exe) {
  const browser = await engine.launch({ headless: true, ...(exe ? { executablePath: exe } : {}) });
  for (const role of Object.keys(ROUTES)) {
    const email = role === 'dmo' ? DMO_EMAIL : `${ACCT[role]}@harbor.example`;
    if (!email) { results.push({ engine: name, role, note: 'no active DMO fixture' }); continue; }
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'load' });
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForTimeout(2500);
    for (const route of ROUTES[role]) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load' }).catch(() => {});
      await page.waitForTimeout(2500);
      const failed = await page.getByRole('heading', { name: 'Page unavailable' }).count();
      const h1 = await page.locator('h1').first().textContent().catch(() => null);
      results.push({ engine: name, role, route, boundary: failed > 0, h1: (h1 || '').trim().slice(0, 40) });
      console.log(name, role, route, failed ? 'BOUNDARY' : 'ok', (h1 || '').trim().slice(0, 30));
    }
    await ctx.close();
  }
  await browser.close();
}

let DMO_EMAIL = null;
(async () => {
  DMO_EMAIL = await dmoEmail();
  await probe('chromium', chromium, null);
  await probe('firefox', firefox, EXE.firefox);
  await probe('webkit', webkit, EXE.webkit);
  fs.writeFileSync(path.join(__dirname, 'boundary-probe.json'), JSON.stringify({ dmoEmail: DMO_EMAIL, results }, null, 2));
  const bad = results.filter((r) => r.boundary);
  console.log(`boundary shown on ${bad.length} of ${results.length} route checks`);
})().catch((e) => { console.error('fatal', e.message); process.exit(1); });
