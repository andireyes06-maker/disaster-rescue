// Realtime across users (resident page updates without reload) and keyboard focus on sign-in. Chromium, release-audit stack.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');
const BASE = 'http://localhost:5178', API = 'http://localhost:3105/api', AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'AuditOnly-Rescue-2026';
const EVID = path.join(__dirname, 'evidence');
const results = [];
const note = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(detail)}`); };
const sign = async (email) => (await (await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }) })).json());

(async () => {
  const res = await sign('resident@harbor.example');
  const disp = await sign('dispatcher@harbor.example');
  const f = new FormData();
  for (const [k, v] of Object.entries({ type: 'flood', description: `Realtime check ${Date.now()}`, lat: '14.5950', lng: '120.9790', source: 'gps' })) f.append(k, v);
  const created = await (await fetch(`${API}/reports`, { method: 'POST', headers: { authorization: `Bearer ${res.idToken}`, 'Idempotency-Key': `rt-${Date.now()}-abcdefgh` }, body: f })).json();
  const id = created.id;

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email').fill('resident@harbor.example');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/my/, { timeout: 25000 }).catch(() => {});
  await page.goto(`${BASE}/my/reports/${id}`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const before = await page.locator('main').innerText();
  const hadSubmitted = before.includes('Submitted');
  note('REALTIME-resident-sees-submitted-before-change', hadSubmitted, {});
  // Dispatcher verifies the report through the API, with no reload on the resident page.
  const v = await fetch(`${API}/reports/${id}/verify`, { method: 'PATCH', headers: { authorization: `Bearer ${disp.idToken}`, 'content-type': 'application/json' }, body: '{}' });
  note('REALTIME-dispatcher-verify-request', v.status === 200, { status: v.status });
  await page.waitForTimeout(6000);
  const after = await page.locator('main').innerText();
  note('REALTIME-resident-page-updates-without-reload', after.includes('Awaiting Assignment') || after.includes('Verified'), { statusTextVisible: after.includes('Awaiting Assignment') || after.includes('Verified') });
  await page.screenshot({ path: path.join(EVID, 'realtime-resident-after-verify-1440.png'), fullPage: true });

  // Keyboard: sign-in form focus order and visible focus.
  const kb = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kp = await kb.newPage();
  await kp.goto(`${BASE}/login`, { waitUntil: 'load' });
  const order = [];
  for (let i = 0; i < 8; i++) {
    await kp.keyboard.press('Tab');
    const info = await kp.evaluate(() => {
      const el = document.activeElement; if (!el) return null;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
      return { tag: el.tagName.toLowerCase(), text: (el.textContent || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 30), visibleRing: ring };
    });
    order.push(info);
  }
  note('KEYBOARD-signin-tab-order-reaches-controls', order.some((o) => o && o.text.includes('Sign in')), { order });
  await kp.screenshot({ path: path.join(EVID, 'keyboard-focus-login-1440.png'), fullPage: false });
  note('KEYBOARD-signin-focus-ring-visible', order.filter(Boolean).every((o) => o.visibleRing), { ringsVisible: order.filter(Boolean).map((o) => o.visibleRing) });

  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'realtime-keyboard.json'), JSON.stringify(results, null, 2));
})().catch((e) => { console.error('script error', e); process.exit(1); });
