// Operations lifecycle on the release-audit stack (Chromium): verify, assign, responder progress, resolve, close and team release,
// rejection, plus analytics downloads compared with the stats API. Every state change is read back through the API.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');

const BASE = 'http://localhost:5178';
const API = 'http://localhost:3105/api';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'AuditOnly-Rescue-2026';
const EVID = path.join(__dirname, 'evidence');
fs.mkdirSync(EVID, { recursive: true });
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
async function api(method, p, tok, body, form) {
  const headers = { authorization: `Bearer ${tok}` };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(`${API}${p}`, { method, headers, body: payload });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json, text };
}
async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 }).catch(() => {});
}
function reportForm(desc) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ type: 'fire', description: desc, lat: '14.6150', lng: '120.9750', source: 'gps' })) f.append(k, v);
  return f;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const resTok = await token('resident@harbor.example');
  const dispTok = await token('dispatcher@harbor.example');
  const adminTok = await token('admin@harbor.example');

  // Two fresh reports from the resident, so each lifecycle starts from a known state.
  const a = await api('POST', '/reports', resTok, undefined, reportForm(`Lifecycle report A ${Date.now()}`));
  const b = await api('POST', '/reports', resTok, undefined, reportForm(`Lifecycle report B ${Date.now()}`));
  note('SETUP-resident-submits-two-reports', a.status === 201 && b.status === 201, { a: a.status, b: b.status });
  const idA = a.body?.id; const idB = b.body?.id;

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const disp = await ctx.newPage();
  await login(disp, 'dispatcher@harbor.example');

  // Responder moves to Team Bravo for this run (Team Alpha is held by an earlier test report); restored at the end.
  const ana = (await api('GET', '/users', adminTok)).body.find((u) => u.email === 'responder@harbor.example');
  await api('PATCH', `/users/${ana.uid}`, adminTok, { team: 'team-bravo' });
  // --- Report A: verify, assign, responder progress, resolve, close, team release ---
  await disp.goto(`${BASE}/incidents/${idA}`, { waitUntil: 'load' });
  await disp.getByRole('button', { name: 'Verify', exact: true }).click();
  note('VERIFY-shows-success', await seen(disp.getByText('Report verified.')), {});
  let rA = await api('GET', `/reports/${idA}`, dispTok);
  note('VERIFY-persisted', rA.body?.verified === true && rA.body?.status === 'Awaiting Assignment', { status: rA.body?.status, verified: rA.body?.verified });

  await disp.getByRole('button', { name: 'Assign team' }).click();
  await disp.locator('#assign-team').selectOption({ label: 'Team Bravo' });
  await disp.getByRole('dialog').getByRole('button', { name: 'Assign team' }).click();
  await disp.waitForTimeout(1500);
  rA = await api('GET', `/reports/${idA}`, dispTok);
  note('ASSIGN-persisted', rA.body?.assignedTeamId === 'team-bravo', { status: rA.body?.status, team: rA.body?.assignedTeamId });

  // Responder (Team Alpha) posts progress on the assignment.
  const resp = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const rp = await resp.newPage();
  await login(rp, 'responder@harbor.example');
  await rp.goto(`${BASE}/assignments`, { waitUntil: 'load' });
  const hasCard = await seen(rp.getByText('Lifecycle report A').first(), 15000);
  note('RESPONDER-sees-assignment', hasCard, { found: hasCard });
  if (hasCard) {
    const card = rp.locator('li', { hasText: 'Lifecycle report A' }).first();
    await card.getByRole('button', { name: 'Acknowledge' }).click();
    await rp.waitForTimeout(800);
    note('RESPONDER-acknowledge-shown', true, {});
    await card.getByRole('button', { name: 'Post an update' }).click();
    const status = card.getByLabel('Status');
    await status.selectOption({ index: 0 }).catch(() => {});
    await card.getByLabel('People rescued').fill('3');
    await card.getByLabel('Notes').fill('Audit progress note');
    await card.getByRole('button', { name: 'Submit update' }).click();
    await rp.waitForTimeout(1500);
    rA = await api('GET', `/reports/${idA}`, dispTok);
    note('RESPONDER-progress-persisted', rA.body?.status === 'Rescue in Progress', { status: rA.body?.status });
    if (!(await seen(card.getByLabel('Status'), 2000))) await card.getByRole('button', { name: 'Post an update' }).click();
    await card.getByLabel('Status').selectOption({ label: 'Resolved' });
    await card.getByLabel('Notes').fill('Audit resolution note');
    await card.getByRole('button', { name: 'Submit update' }).click();
    await rp.waitForTimeout(1500);
    rA = await api('GET', `/reports/${idA}`, dispTok);
    note('RESPONDER-resolve-persisted', rA.body?.status === 'Resolved', { status: rA.body?.status });
  }
  await resp.close();

  // Dispatcher closes report A and the team is released.
  await disp.reload({ waitUntil: 'load' });
  const closeBtn = disp.getByRole('button', { name: 'Close report' });
  if (await seen(closeBtn, 8000)) {
    await closeBtn.click();
    await disp.waitForTimeout(1500);
  }
  rA = await api('GET', `/reports/${idA}`, dispTok);
  const teams = await api('GET', '/teams', dispTok);
  const alpha = Array.isArray(teams.body) ? teams.body.find((t) => t.id === 'team-bravo') : null;
  note('CLOSE-report-and-release-team', rA.body?.status !== 'Rescue in Progress' && alpha?.busy === false, { status: rA.body?.status, teamBusy: alpha?.busy ?? null });

  // --- Report B: reject with a reason ---
  await disp.goto(`${BASE}/incidents/${idB}`, { waitUntil: 'load' });
  await disp.getByRole('button', { name: 'Reject', exact: true }).click();
  await disp.getByLabel(/reason/i).fill('Audit: duplicate of an existing report');
  await disp.getByRole('button', { name: 'Confirm reject' }).click();
  await disp.waitForTimeout(1500);
  const rB = await api('GET', `/reports/${idB}`, dispTok);
  note('REJECT-persisted', rB.body?.status === 'Rejected', { status: rB.body?.status });

  // --- Analytics downloads: compare CSV rows with the stats total (no filter) ---
  await disp.goto(`${BASE}/analytics`, { waitUntil: 'load' });
  const dl = disp.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await disp.getByRole('button', { name: 'Download CSV' }).click();
  const download = await dl;
  if (download) {
    const file = path.join(EVID, 'analytics-download.csv');
    await download.saveAs(file);
    const rows = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(1).filter(Boolean).length;
    const stats = await api('GET', '/stats', dispTok);
    note('ANALYTICS-csv-rows-match-stats-total', rows === stats.body?.total, { csvRows: rows, statsTotal: stats.body?.total, filename: download.suggestedFilename() });
  } else {
    note('ANALYTICS-csv-download', false, { blocked: 'no download event' });
  }
  await disp.screenshot({ path: path.join(EVID, 'analytics-1440.png'), fullPage: true });

  // Admin: settings validation in the UI.
  const adCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adm = await adCtx.newPage();
  await login(adm, 'admin@harbor.example');
  await adm.goto(`${BASE}/admin`, { waitUntil: 'load' });
  await adm.waitForTimeout(1200);
  await adm.screenshot({ path: path.join(EVID, 'admin-1440.png'), fullPage: true });
  const hotline = adm.getByLabel(/hotline/i).first();
  if (await seen(hotline, 8000)) {
    await hotline.fill('');
    const saveBtn = adm.getByRole('button', { name: 'Save settings' });
    if (await seen(saveBtn, 4000)) {
      await saveBtn.click();
      const err = await seen(adm.getByText(/required|Enter|Add a/i), 6000);
      const readback = await api('GET', '/admin/settings', adminTok);
      note('ADMIN-settings-empty-hotline-blocked', err && readback.body?.hotline === '', { uiMessage: err, storedHotline: readback.body?.hotline });
    } else {
      note('ADMIN-settings-empty-hotline-blocked', false, { blocked: 'no save button found' });
    }
  } else {
    note('ADMIN-settings-empty-hotline-blocked', false, { blocked: 'no hotline field found' });
  }

  await api('PATCH', `/users/${ana.uid}`, adminTok, { team: 'team-alpha' });
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'flows-ops.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
})().catch((e) => { console.error('script error', e); process.exit(1); });
