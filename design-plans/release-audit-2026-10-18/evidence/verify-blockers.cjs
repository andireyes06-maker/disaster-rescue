// Verifies repair items 2 to 4 in Chromium on the release-audit stack (web picks up the worktree source).
const { createRequire } = require('node:module');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');
const BASE = 'http://localhost:5178', API = 'http://localhost:3105/api', AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'AuditOnly-Rescue-2026';
const results = [];
const note = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(detail)}`); };
const sign = async (e) => (await (await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: PASSWORD, returnSecureToken: true }) })).json()).idToken;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  // 2. Public header: no demo banner on the landing page.
  await page.goto(`${BASE}/`, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  const demo = await page.getByText(/demo site|hotline not configured/i).count();
  note('B2-no-demo-banner-on-landing', demo === 0, { matches: demo });
  // 3. Unknown address shows a 404 page, anonymous and signed in.
  await page.goto(`${BASE}/no-such-page-audit`, { waitUntil: 'load' }); await page.waitForTimeout(800);
  const nf = await page.getByRole('heading', { name: 'Page not found' }).isVisible().catch(() => false);
  note('B3-404-page-anonymous', nf && page.url().includes('/no-such-page-audit'), { url: page.url(), visible: nf });
  await page.screenshot({ path: __dirname + '/evidence/repair-404-anonymous-1440.png', fullPage: true });
  // Signed-in resident on an unknown address sees the 404 page too.
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email').fill('resident@harbor.example'); await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/my/, { timeout: 25000 }).catch(() => {});
  await page.goto(`${BASE}/no-such-page-audit`, { waitUntil: 'load' }); await page.waitForTimeout(800);
  const nf2 = await page.getByRole('heading', { name: 'Page not found' }).isVisible().catch(() => false);
  note('B3-404-page-signed-in-resident', nf2 && page.url().includes('/no-such-page-audit'), { url: page.url(), visible: nf2 });
  // 4. Safety card: no number configured -> neutral heading, no call prompt.
  await page.goto(`${BASE}/my`, { waitUntil: 'load' }); await page.waitForTimeout(2000);
  const neutral = await page.getByRole('heading', { name: 'Safety information' }).isVisible().catch(() => false);
  const callNow = await page.getByText('If you are in danger, call now').count();
  note('B4-no-number-neutral-safety-card', neutral && callNow === 0, { neutralVisible: neutral, callNowCount: callNow });
  await page.screenshot({ path: __dirname + '/evidence/repair-resident-hub-no-number-1440.png', fullPage: true });
  // Configure a number through the admin settings API, then the card must show the call prompt with that number.
  const admin = await sign('admin@harbor.example');
  const put = await fetch(`${API}/admin/settings`, { method: 'PUT', headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' }, body: JSON.stringify({ hotline: '0917 000 1111', residentNotice: 'Audit fixture notice.' }) });
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);
  const withNumber = await page.getByRole('heading', { name: 'If you are in danger, call now' }).isVisible().catch(() => false);
  note('B4-configured-number-shows-call-prompt', put.status === 200 && withNumber, { saveStatus: put.status, callPromptVisible: withNumber });
  await browser.close();
  require('node:fs').writeFileSync(__dirname + '/verify-blockers.json', JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
})().catch((e) => { console.error('script error', e.message); process.exit(1); });
