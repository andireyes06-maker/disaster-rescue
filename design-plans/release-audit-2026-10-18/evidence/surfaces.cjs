// Surface sweep on the release-audit stack (Chromium): each reachable page at 390/768/1024/1440.
// Records heading, horizontal overflow, console/page errors, and small touch targets at 390px. Saves full-page screenshots.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');

const BASE = 'http://localhost:5178';
const API = 'http://localhost:3105/api';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const EVID = path.join(__dirname, 'evidence', 'surfaces');
fs.mkdirSync(EVID, { recursive: true });
const PASSWORD = 'AuditOnly-Rescue-2026';
const WIDTHS = [390, 768, 1024, 1440];
const out = [];

async function token(email) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  return (await r.json()).idToken;
}
async function api(p, tok) {
  const r = await fetch(`${API}${p}`, { headers: { authorization: `Bearer ${tok}` } });
  return r.json();
}
async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 }).catch(() => {});
}

async function sweep(browser, label, pages, email) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`));
    if (email) await login(page, email);
    for (const p of pages) {
      const url = p.replace('{incident}', out.incidentId || 'none');
      await page.goto(`${BASE}${url}`, { waitUntil: 'load' }).catch(() => {});
      await page.waitForTimeout(1200);
      const record = await page.evaluate((w) => {
        const h1 = document.querySelector('h1')?.textContent?.trim() ?? null;
        const overflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
        const small = [];
        if (w === 390) {
          document.querySelectorAll('a, button, input, select, textarea, [role="button"]').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;
            if (getComputedStyle(el).visibility === 'hidden') return;
            if (r.width < 44 || r.height < 44) small.push(`${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}`);
          });
        }
        return { h1, overflowPx, smallTargets: small.length, smallSample: small.slice(0, 4), url: location.pathname };
      }, width);
      await page.screenshot({ path: path.join(EVID, `${label}-${p.replace(/[^a-z0-9]+/gi, '_') || 'root'}-${width}.png`), fullPage: true }).catch(() => {});
      out.push({ role: label, path: url, width, ...record, errors: errors.splice(0).slice(0, 4) });
      console.log(`${label} ${url} @${width}: h1="${record.h1}" overflow=${record.overflowPx}px small=${record.smallTargets} errors=${errors.length}`);
    }
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const dtok = await token('dispatcher@harbor.example');
  const reports = await api('/reports', dtok);
  out.incidentId = Array.isArray(reports) && reports[0] ? reports[0].id : null;

  await sweep(browser, 'anonymous', ['/', '/login', '/register', '/forbidden', '/no-such-page-audit']);
  await sweep(browser, 'resident', ['/my', '/my/report', out.incidentId ? '/my/reports/{incident}' : '/my'], 'resident@harbor.example');
  await sweep(browser, 'dispatcher', ['/dashboard', `/incidents/{incident}`, '/map', '/analytics', '/audit', '/teams', '/users'], 'dispatcher@harbor.example');
  await sweep(browser, 'responder', ['/assignments'], 'responder@harbor.example');
  await sweep(browser, 'dmo', ['/monitor', '/analytics'], 'dmo@harbor.example');
  await sweep(browser, 'admin', ['/admin', '/dashboard', '/users', '/teams', '/audit', '/analytics', '/map'], 'admin@harbor.example');

  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'surfaces.json'), JSON.stringify(out, null, 2));
  console.log(`\nrecorded ${out.length} page/width samples`);
})().catch((e) => { console.error('script error', e); process.exit(1); });
