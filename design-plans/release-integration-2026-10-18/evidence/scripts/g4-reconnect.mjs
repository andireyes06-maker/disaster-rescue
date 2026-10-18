import { chromium } from '/Users/rien/Documents/FINAL_PROJECT/web/node_modules/playwright/index.mjs';
import { signIn, api, fsList, fsDoc } from './rel-lib.mjs';
const EV = '/Users/rien/Documents/FINAL_PROJECT/design-plans/release-integration-2026-10-18/evidence';
const rec = (name, ok, detail) => console.log(ok ? 'PASS' : 'FAIL', name, detail ?? '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const reports = await fsList('reports');
const dispTok = await signIn('marco.reyes@harbor.example');
const mayaTok = await signIn('maya.torres@harbor.example');
const submitted = reports.find((r) => r.status === 'Submitted');
const mayaOpen = reports.find((r) => r.status === 'Submitted' && r.reporterId === 'demo-resident-a' && r.id !== submitted.id);
console.log('dispatcher target:', submitted?.reference, submitted?.id, '| resident target:', mayaOpen?.reference, mayaOpen?.id);

const browser = await chromium.launch({ headless: true });
const results = {};
async function session(email, label) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const hosts = new Set();
  const consoleErrors = [];
  page.on('request', (req) => { try { hosts.add(new URL(req.url()).host); } catch {} });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 160)));
  await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  await page.fill('#email', email);
  await page.fill('#password', process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  await sleep(2500);
  const emuOk = [...hosts].some((h) => h === 'localhost:9299') && [...hosts].some((h) => h === 'localhost:8190');
  const prod = [...hosts].filter((h) => /googleapis|firebaseio|firebaseapp|onrender|vercel/.test(h));
  rec(`${label}: sign-in via emulator (Auth 9299, Firestore 8190), no production hosts`, emuOk && prod.length === 0, `hosts ${[...hosts].filter((h) => h.startsWith('localhost')).join(', ')}; non-local ${prod.join(', ') || 'none'}`);
  return { ctx, page, consoleErrors, hosts };
}

async function rowText(page, ref) {
  const row = page.locator('tr, li, article, [role="row"]', { hasText: ref }).first();
  if ((await row.count()) === 0) return null;
  return (await row.innerText()).replace(/\s+/g, ' ').trim();
}

// ---- Scenario A: dispatcher dashboard ----
{
  const s = await session('marco.reyes@harbor.example', 'dispatcher');
  await s.page.goto('http://localhost:5174/dashboard', { waitUntil: 'domcontentloaded' });
  await s.page.waitForTimeout(3000);
  const before = await rowText(s.page, submitted.description);
  rec('dispatcher: target row visible before offline', !!before, before?.slice(0, 120));
  await s.page.screenshot({ path: `${EV}/g4-dispatcher-online.png` });
  await s.ctx.setOffline(true);
  await sleep(4000);
  const offlineText = (await s.page.locator('body').innerText()).toLowerCase();
  const indicator = ['offline', 'no connection', 'reconnect', 'connection lost', 'working offline', 'out of date'].filter((w) => offlineText.includes(w));
  await s.page.screenshot({ path: `${EV}/g4-dispatcher-offline.png` });
  const r = await api('PATCH', `/reports/${submitted.id}/verify`, dispTok, {});
  const stored = await fsDoc('reports', submitted.id);
  rec('API write while browser offline stored', r.status === 200 && stored?.status !== 'Submitted', `api ${r.status}, stored now ${stored?.status}`);
  await sleep(3000);
  const whileOffline = await rowText(s.page, submitted.description);
  results.dispatcherOffline = { indicatorWords: indicator, rowWhileOffline: whileOffline?.slice(0, 160) };
  rec('dispatcher: offline indicator shown to user', indicator.length > 0, `words found: ${indicator.join(', ') || 'none'}`);
  await s.ctx.setOffline(false);
  const t0 = Date.now();
  let after = null;
  while (Date.now() - t0 < 30000) {
    after = await rowText(s.page, submitted.description);
    if (after && after !== whileOffline && after.includes(stored.status)) break;
    await sleep(500);
  }
  const ms = Date.now() - t0;
  const statusShown = after && stored?.status ? after.includes(stored.status) : false;
  rec('dispatcher: missed update appears after reconnect without reload', statusShown, `status shown "${stored?.status}" after ${ms} ms; row: ${after?.slice(0, 140)}`);
  await s.page.screenshot({ path: `${EV}/g4-dispatcher-reconnected.png` });
  const realErrors = s.consoleErrors.filter((e) => !e.startsWith('Failed to load resource')); rec('dispatcher: no uncaught page errors during offline window', realErrors.length === 0, `uncaught ${realErrors.length}; network-disconnect console entries ${s.consoleErrors.length - realErrors.length}`);
  results.dispatcherReconnect = { ms, statusShown, consoleErrors: s.consoleErrors.slice(0, 5) };
  await s.ctx.close();
}

// ---- Scenario B: resident detail page ----
if (mayaOpen) {
  const s = await session('maya.torres@harbor.example', 'resident');
  await s.page.goto(`http://localhost:5174/my/reports/${mayaOpen.id}`, { waitUntil: 'domcontentloaded' });
  await s.page.waitForTimeout(3000);
  const beforeText = (await s.page.locator('main').innerText()).replace(/\s+/g, ' ');
  rec('resident: detail shows reference before offline', beforeText.includes(mayaOpen.reference), '');
  await s.ctx.setOffline(true);
  await sleep(3000);
  const r = await api('PATCH', `/reports/${mayaOpen.id}/verify`, dispTok, {});
  const stored = await fsDoc('reports', mayaOpen.id);
  rec('API status change while resident offline stored', r.status === 200, `api ${r.status}, stored ${stored?.status}`);
  await sleep(2500);
  const offMain = (await s.page.locator('main').innerText()).replace(/\s+/g, ' ');
  const stale = offMain.includes(mayaOpen.status) && !offMain.includes(stored.status);
  await s.page.screenshot({ path: `${EV}/g4-resident-offline.png` });
  rec('resident: page still shows previous status while offline (stale, no cue)', stale, `previous ${mayaOpen.status}, stored ${stored?.status}`);
  await s.ctx.setOffline(false);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 30000) {
    const txt = (await s.page.locator('main').innerText()).replace(/\s+/g, ' ');
    if (txt.includes(stored.status)) { ok = true; break; }
    await sleep(500);
  }
  rec('resident: change appears after reconnect without reload', ok, `after ${Date.now() - t0} ms`);
  await s.page.screenshot({ path: `${EV}/g4-resident-reconnected.png` });
  results.resident = { ok, consoleErrors: s.consoleErrors.slice(0, 5) };
  await s.ctx.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
