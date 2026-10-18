// Incident, responder and admin workflows on the integration stack, in each engine.
// Every state change is read back through the API. Fixtures: the integration's own demo accounts (fictional).
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
const PASSWORD = 'Demo-Sample#2026';
const KEY = 'local-functional-key';
const ACCT = { resident: 'maya.torres', dispatcher: 'marco.reyes', admin: 'elena.cruz', responder: 'daniel.flores' };
const OUT = path.join(__dirname, 'engine-workflows.json');
const tokens = {};
const all = [];

async function tok(role) {
  if (!tokens[role]) {
    const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=${KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${ACCT[role]}@harbor.example`, password: PASSWORD, returnSecureToken: true }) });
    const j = await r.json();
    if (!j.idToken) throw new Error(`sign-in failed for ${role}: ${JSON.stringify(j).slice(0, 120)}`);
    tokens[role] = j.idToken;
  }
  return tokens[role];
}
async function api(method, p, role, body, form) {
  const headers = { authorization: `Bearer ${await tok(role)}` };
  let payload;
  if (form) payload = form; else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(`${API}${p}`, { method, headers, body: payload });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json };
}
function photoLessForm(desc) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ type: 'flood', description: desc, lat: '14.5870', lng: '120.9720', source: 'gps' })) f.append(k, v);
  return f;
}
async function login(page, role) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email', { exact: true }).fill(`${ACCT[role]}@harbor.example`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {});
  // Let the landing page finish loading its lazy route before the next full navigation (avoids cancelling the in-flight chunk).
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function runEngine(name, engine, exe) {
  const rec = { engine: name, checks: [], runtimeErrors: [], launchError: null };
  let browser;
  try { browser = await engine.launch({ headless: true, ...(exe ? { executablePath: exe } : {}) }); }
  catch (e) { rec.launchError = e.message.split('\n')[0]; all.push(rec); return; }
  const check = async (id, fn) => {
    rec.currentCheck = id;
    try { const detail = await fn(); rec.checks.push({ id, pass: true, detail }); console.log(name, 'PASS', id, JSON.stringify(detail)); }
    catch (e) { rec.checks.push({ id, pass: false, detail: e.message.split('\n')[0].slice(0, 220) }); console.log(name, 'FAIL', id, e.message.split('\n')[0].slice(0, 160)); }
    fs.writeFileSync(OUT, JSON.stringify([...all, rec], null, 2));
  };
  const ctxFor = async (role) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => rec.runtimeErrors.push(`${role} @${rec.currentCheck}: ${e.message.slice(0, 160)}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/Listen|Failed to load resource: .*(429|401)/.test(m.text())) rec.runtimeErrors.push(`${role} @${rec.currentCheck}: ${m.text().slice(0, 160)}`); });
    return { ctx, page };
  };

  // Fresh report from the resident, so the dispatcher starts from a known state.
  const created = await api('POST', '/reports', 'resident', undefined, photoLessForm(`Engine workflow ${name} ${Date.now()}`));
  const reportId = created.body?.id;
  await check('resident submits a report through the API', async () => { if (created.status !== 201) throw new Error(`status ${created.status}`); return { id: reportId }; });

  // Dispatcher: verify, assign to the responder's team, reject a second report.
  const second = await api('POST', '/reports', 'resident', undefined, photoLessForm(`Engine reject ${name} ${Date.now()}`));
  const teams = (await api('GET', '/teams', 'dispatcher')).body;
  const danielTeam = (await api('GET', '/users', 'admin')).body.find((u) => u.email === `${ACCT.responder}@harbor.example`)?.team;
  const busyBefore = Array.isArray(teams) ? teams.filter((t) => t.busy) : [];
  const freeTeam = Array.isArray(teams) ? teams.find((t) => !t.busy) : null;
  const daniel = (await api("GET", "/users", "admin")).body.find((u) => u.email === `${ACCT.responder}@harbor.example`);
  if (freeTeam) await api("PATCH", `/users/${daniel.uid}`, "admin", { team: freeTeam.id });
  const team = freeTeam || null;
  void danielTeam; void busyBefore;
  {
    const { ctx, page } = await ctxFor('dispatcher');
    await login(page, 'dispatcher');
    await check('dispatcher verifies a report (persisted)', async () => {
      await page.goto(`${BASE}/incidents/${reportId}`, { waitUntil: 'load' });
      await page.getByRole('button', { name: 'Verify', exact: true }).click();
      await page.waitForTimeout(1500);
      const r = await api('GET', `/reports/${reportId}`, 'dispatcher');
      if (r.body?.verified !== true) throw new Error(`verified=${r.body?.verified} status=${r.body?.status}`);
      return { status: r.body.status };
    });
    await check('dispatcher assigns the responder team (persisted)', async () => {
      if (!team) throw new Error('responder has no team in fixtures');
      await page.getByRole('button', { name: 'Assign team', exact: true }).click();
      const dlg = page.getByRole('dialog');
      await dlg.waitFor({ state: 'visible', timeout: 10000 });
      await dlg.locator('select').first().selectOption({ label: team.name });
      await dlg.getByRole('button', { name: 'Assign team', exact: true }).click();
      await page.waitForTimeout(1500);
      const r = await api('GET', `/reports/${reportId}`, 'dispatcher');
      if (r.body?.assignedTeamId !== team.id) throw new Error(`assignedTeamId=${r.body?.assignedTeamId}`);
      return { team: team.name, status: r.body.status };
    });
    await check('dispatcher rejects a second report with a reason (persisted)', async () => {
      await page.goto(`${BASE}/incidents/${second.body?.id}`, { waitUntil: 'load' });
      await page.getByRole('button', { name: 'Reject', exact: true }).click();
      const dlg = page.getByRole('dialog');
      await dlg.getByLabel(/reason/i).fill(`Engine audit reject ${name}`);
      await dlg.getByRole('button', { name: /Confirm reject|Reject/ }).last().click();
      await page.waitForTimeout(1500);
      const r = await api('GET', `/reports/${second.body?.id}`, 'dispatcher');
      if (r.body?.status !== 'Rejected') throw new Error(`status=${r.body?.status}`);
      return { status: r.body.status };
    });
    await ctx.close();
  }

  // Responder: post a progress update on the assigned report (Daniel's team).
  {
    const { ctx, page } = await ctxFor('responder');
    await login(page, 'responder');
    await check('responder sees the assignment and posts progress (persisted)', async () => {
      await page.goto(`${BASE}/assignments`, { waitUntil: 'load' });
      const card = page.locator('article, li, section').filter({ hasText: 'Engine workflow ' + name }).first();
      await card.waitFor({ state: 'visible', timeout: 20000 });
      const post = card.getByRole('button', { name: 'Post an update', exact: true });
      if (await post.count()) await post.click();
      const status = card.getByLabel('Status', { exact: false }).first();
      await status.selectOption({ label: 'Rescue in Progress' }).catch(async () => status.selectOption({ index: 0 }));
      await card.getByLabel('People rescued', { exact: false }).fill('2');
      await card.getByRole('button', { name: 'Submit update', exact: true }).click();
      await page.waitForTimeout(1500);
      const r = await api('GET', `/reports/${reportId}`, 'dispatcher');
      if (r.body?.status !== 'Rescue in Progress') throw new Error(`status=${r.body?.status}`);
      return { status: r.body.status };
    });
    await ctx.close();
  }

  // Admin: create a team and read it back.
  {
    const { ctx, page } = await ctxFor('admin');
    await login(page, 'admin');
    const teamName = `Engine team ${name} ${Date.now() % 100000}`;
    await check('admin creates a team (persisted)', async () => {
      await page.goto(`${BASE}/teams`, { waitUntil: 'load' });
      await page.locator('summary', { hasText: 'Create team' }).click();
      await page.getByLabel('New team name', { exact: false }).fill(teamName);
      await page.getByRole('button', { name: 'Create team', exact: true }).click();
      await page.waitForTimeout(1500);
      const list = (await api('GET', '/teams', 'admin')).body;
      if (!Array.isArray(list) || !list.some((t) => t.name === teamName)) throw new Error('team not stored');
      return { team: teamName };
    });
    await ctx.close();
  }

  if (freeTeam && daniel) await api("PATCH", `/users/${daniel.uid}`, "admin", { team: danielTeam ?? null });
  await browser.close();
  all.push(rec);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
}

(async () => {
  await runEngine('chromium', chromium, null);
  await runEngine('firefox', firefox, EXE.firefox);
  await runEngine('webkit', webkit, EXE.webkit);
  for (const r of all) console.log(JSON.stringify({ engine: r.engine, launchError: r.launchError, passed: r.checks.filter((c) => c.pass).length, total: r.checks.length, runtimeErrors: r.runtimeErrors.length }));
})().catch((e) => { console.error('fatal', e.message); process.exit(1); });
