// Verifies audit Finding 8 (admin Accounts team control) on the release-audit stack, with API read-back, then restores the team.
const { createRequire } = require('node:module');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');
const BASE = 'http://localhost:5178', API = 'http://localhost:3105/api', AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'AuditOnly-Rescue-2026';
const results = [];
const note = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(detail)}`); };
const sign = async (e) => (await (await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: PASSWORD, returnSecureToken: true }) })).json()).idToken;
const apiGet = async (t, p) => (await fetch(`${API}${p}`, { headers: { authorization: `Bearer ${t}` } })).json();
(async () => {
  const admin = await sign('admin@harbor.example');
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email').fill('admin@harbor.example'); await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard|\/admin/, { timeout: 25000 }).catch(() => {});
  await page.goto(`${BASE}/admin`, { waitUntil: 'load' });
  const select = page.getByRole('combobox', { name: 'Team for Ana Cruz' });
  const visible = await select.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  note('F8-accounts-team-control-visible', visible, {});
  if (visible) {
    const before = (await apiGet(admin, '/users')).find((u) => u.name === 'Ana Cruz')?.team;
    const target = before === 'team-bravo' ? 'Team Alpha' : 'Team Bravo';
    const targetId = target === 'Team Alpha' ? 'team-alpha' : 'team-bravo';
    await select.selectOption({ label: target });
    await page.waitForTimeout(1500);
    const stored = (await apiGet(admin, '/users')).find((u) => u.name === 'Ana Cruz')?.team;
    note('F8-team-change-persisted-readback', stored === targetId, { before, storedAfter: stored });
    await select.selectOption({ label: before === 'team-bravo' ? 'Team Bravo' : 'Team Alpha' });
    await page.waitForTimeout(1200);
    const restored = (await apiGet(admin, '/users')).find((u) => u.name === 'Ana Cruz')?.team;
    note('F8-restored-original-team', restored === before, { restored });
  }
  await browser.close();
  require('node:fs').writeFileSync(__dirname + '/verify-repairs2.json', JSON.stringify(results, null, 2));
})().catch((e) => { console.error('script error', e.message); process.exit(1); });
