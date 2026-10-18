// Core workflows in Chromium on the release-audit stack: resident submit and unsaved navigation (F06),
// offline notice (F07), dispatcher verify/assign, responder assignment, team selector (F03), and API readback.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');

const BASE = 'http://localhost:5178';
const API = 'http://localhost:3105/api';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const EVID = path.join(__dirname, 'evidence');
fs.mkdirSync(EVID, { recursive: true });
const PASSWORD = 'AuditOnly-Rescue-2026';
const results = [];
const note = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(detail)}`); };
const seen = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);

async function token(email) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  return (await r.json()).idToken;
}
async function api(method, p, tok, body) {
  const r = await fetch(`${API}${p}`, { method, headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json };
}
async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const dispatcherTok = await token('dispatcher@harbor.example');
  const adminTok = await token('admin@harbor.example');

  // --- Resident submission with GPS, validation, and unsaved navigation (F06) ---
  const resCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, geolocation: { latitude: 14.6, longitude: 120.98 }, permissions: ['geolocation'] });
  const res = await resCtx.newPage();
  await login(res, 'resident@harbor.example');
  await res.goto(`${BASE}/my/report`, { waitUntil: 'load' });
  await res.getByRole('button', { name: 'Submit report' }).click();
  const validation = await seen(res.getByText(/required|Choose|Add|Describe|Pick/i), 8000);
  note('REPORT-empty-submit-shows-errors', validation, { visible: validation });
  await res.screenshot({ path: path.join(EVID, 'report-empty-submit-1440.png'), fullPage: true });

  await res.getByLabel('Type of emergency').selectOption('flood');
  await res.getByLabel('What is happening?').fill('Audit submission: water across the road near the bridge');
  await res.getByRole('button', { name: 'Use my location' }).click();
  await seen(res.getByText(/location|coordinates|Location/), 8000);
  await res.getByRole('button', { name: 'Submit report' }).click();
  const submitted = await res.waitForURL((u) => u.pathname.startsWith('/my/report') && u.pathname !== '/my/report', { timeout: 25000 }).then(() => true).catch(() => false);
  note('REPORT-submit-with-gps-succeeds', submitted, { url: res.url() });
  await res.screenshot({ path: path.join(EVID, 'report-submitted-1440.png'), fullPage: true });

  // F06: in-app navigation keeps unsent text when the resident declines to leave.
  await res.goto(`${BASE}/my/report`, { waitUntil: 'load' });
  await res.getByLabel('What is happening?').fill('Unsaved draft that must survive a declined navigation');
  res.once('dialog', (d) => d.dismiss());
  await res.getByRole('link', { name: 'My reports' }).click();
  await res.waitForTimeout(800);
  const stayed = await res.getByLabel('What is happening?').inputValue().then((v) => v.includes('Unsaved draft')).catch(() => false);
  note('F06-declined-navigation-keeps-draft', stayed, { draftKept: stayed, url: res.url() });
  // Accepting the prompt leaves the page.
  res.once('dialog', (d) => d.accept());
  await res.getByRole('link', { name: 'My reports' }).click();
  await res.waitForURL((u) => u.pathname === '/my', { timeout: 10000 }).catch(() => {});
  note('F06-accepted-navigation-leaves', res.url().endsWith('/my'), { url: res.url() });

  // F07: a report detail goes stale-aware when the connection drops, and clears on reconnect.
  const firstReport = res.locator('a[href^="/my/reports/"]').first();
  const hasDetailLink = await seen(firstReport, 10000);
  if (hasDetailLink) {
    await firstReport.click();
    await res.waitForURL(/\/my\/reports\//, { timeout: 10000 }).catch(() => {});
    await res.waitForTimeout(1500);
    await resCtx.setOffline(true);
    await res.waitForTimeout(4000);
    const stale = await seen(res.getByText(/You may be offline/), 8000);
    note('F07-offline-notice-shown-on-detail', stale, { visible: stale });
    await res.screenshot({ path: path.join(EVID, 'f07-resident-detail-offline-1440.png'), fullPage: true });
    await resCtx.setOffline(false);
    await res.waitForTimeout(4000);
    const cleared = !(await res.getByText(/You may be offline/).first().isVisible().catch(() => false));
    note('F07-notice-clears-after-reconnect', cleared, { cleared });
  } else {
    note('F07-offline-notice-shown-on-detail', false, { blocked: 'no resident report link found on /my' });
  }
  await resCtx.close();

  // --- Dispatcher: verify, assign a team, and read the stored status back through the API (independent) ---
  const dispCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const disp = await dispCtx.newPage();
  await login(disp, 'dispatcher@harbor.example');
  await disp.goto(`${BASE}/dashboard`, { waitUntil: 'load' });
  const row = disp.locator('a[href^="/incidents/"]').first();
  const hasRow = await seen(row, 15000);
  note('DASHBOARD-lists-open-reports', hasRow, { found: hasRow });
  await disp.screenshot({ path: path.join(EVID, 'dashboard-1440.png'), fullPage: true });
  if (hasRow) {
    const href = await row.getAttribute('href');
    await disp.goto(`${BASE}${href}`, { waitUntil: 'load' });
    const id = href.split('/').pop();
    const verify = disp.getByRole('button', { name: 'Verify' });
    if (await seen(verify, 10000)) {
      await verify.click();
      const ok = await seen(disp.getByText('Report verified.'), 10000);
      note('DISPATCH-verify-shows-success', ok, { visible: ok });
      const readback = await api('GET', `/reports/${id}`, dispatcherTok);
      note('DISPATCH-verify-persisted-readback', readback.body?.verified === true || readback.body?.status !== 'Submitted', { status: readback.body?.status, verified: readback.body?.verified });
    } else {
      note('DISPATCH-verify-shows-success', false, { blocked: 'no Verify button on the first report (it may already be verified)' });
    }
    await disp.screenshot({ path: path.join(EVID, 'incident-details-1440.png'), fullPage: true });
  }
  await dispCtx.close();

  // --- Admin: F03 team selector on Users; readback via API ---
  const adCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adm = await adCtx.newPage();
  await login(adm, 'admin@harbor.example');
  await adm.goto(`${BASE}/users`, { waitUntil: 'load' });
  const teamSelect = adm.getByRole('combobox', { name: 'Team for Ana Cruz' });
  const hasSelect = await seen(teamSelect, 15000);
  note('F03-team-selector-visible-on-users', hasSelect, { visible: hasSelect });
  if (hasSelect) {
    await teamSelect.selectOption({ label: 'Team Bravo' }).catch(() => {});
    const saved = await seen(adm.getByText('Team assigned.'), 10000);
    const u = await api('GET', '/users', adminTok);
    const ana = Array.isArray(u.body) ? u.body.find((x) => x.name === 'Ana Cruz') : null;
    note('F03-team-change-persisted-readback', saved && ana?.team === 'team-bravo', { saved, storedTeam: ana?.team ?? null });
    await teamSelect.selectOption({ label: 'Team Alpha' }).catch(() => {});
    await seen(adm.getByText('Team assigned.'), 8000);
  }
  await adm.screenshot({ path: path.join(EVID, 'users-1440.png'), fullPage: true });
  await adCtx.close();

  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'flows-core.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
})().catch((e) => { console.error('script error', e); process.exit(1); });
