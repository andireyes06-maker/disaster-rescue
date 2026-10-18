// Browser flows for sign-in, password setup (F02), registration (F08), Forbidden and 404 on the release-audit stack.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');

const BASE = 'http://localhost:5178';
const API = 'http://localhost:3105/api';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const EMU = 'http://127.0.0.1:9099/emulator/v1/projects/demo-release-audit';
const OUT = __dirname;
const EVID = path.join(OUT, 'evidence');
fs.mkdirSync(EVID, { recursive: true });
const PASSWORD = 'AuditOnly-Rescue-2026';
const NEW_PASSWORD = 'AuditOnly-Reset-2026';
const results = [];
const seen = (locator, ms) => locator.waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);
const note = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(detail)}`); };

async function adminToken() {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@harbor.example', password: PASSWORD, returnSecureToken: true }),
  });
  return (await r.json()).idToken;
}
async function api(method, p, token, body) {
  const r = await fetch(`${API}${p}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const stamp = Date.now();
  const staffEmail = `new.responder.${stamp}@harbor.example`;
  const residentEmail = `new.resident.${stamp}@harbor.example`;
  const admin = await adminToken();

  // 1. Wrong password is refused with a message.
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email').fill('dispatcher@harbor.example');
  await page.getByLabel('Password').fill('wrong-password-here');
  await page.getByRole('button', { name: 'Sign in' }).click();
  const wrongMsg = await seen(page.getByText('Could not sign in').first(), 15000);
  note('LOGIN-wrong-password-message', wrongMsg, { visible: wrongMsg });
  await page.screenshot({ path: path.join(EVID, 'login-wrong-password-1440.png'), fullPage: true });

  // 2. F02: a staff account created without a password can set one through Forgot password.
  const created = await api('POST', '/users', admin, { email: staffEmail, name: 'New Responder', role: 'responder', team: 'team-alpha' });
  note('F02-staff-created-via-api', created.status === 201, { status: created.status });
  await page.getByLabel('Email').fill(staffEmail);
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  const resetNote = await seen(page.getByText(/If an account exists for that email/), 15000);
  note('F02-forgot-password-confirmation-shown', resetNote, { visible: resetNote });
  // Read the reset code the Auth emulator issued (the emulator's stand-in for the email link).
  const oobs = await (await fetch(`${EMU}/oobCodes`)).json();
  const reset = (oobs.oobCodes || []).filter((o) => o.email === staffEmail && o.requestType === 'PASSWORD_RESET').pop();
  note('F02-reset-code-issued-by-auth', Boolean(reset), { issued: Boolean(reset) });
  if (reset) {
    const applied = await fetch(`${AUTH}/accounts:resetPassword?key=audit-local-key`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ oobCode: reset.oobCode, newPassword: NEW_PASSWORD }),
    });
    note('F02-reset-applied', applied.status === 200, { status: applied.status });
    await page.goto(`${BASE}/login`, { waitUntil: 'load' });
    await page.getByLabel('Email').fill(staffEmail);
    await page.getByLabel('Password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/assignments/, { timeout: 20000 }).catch(() => {});
    note('F02-new-staff-reaches-role-page', page.url().includes('/assignments'), { url: page.url() });
    await page.screenshot({ path: path.join(EVID, 'f02-new-staff-landing-1440.png'), fullPage: true });
  }
  await ctx.close();

  // 3. F08: self-registration stores the verified email, which admins can find.
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await page.goto(`${BASE}/register`, { waitUntil: 'load' });
  await page.getByLabel('Name').fill('Audit Resident');
  await page.getByLabel('Email').fill(residentEmail);
  await page.getByLabel('Phone').fill('09170009999');
  await page.getByLabel('Password', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Confirm password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/my/, { timeout: 25000 }).catch(() => {});
  note('REGISTER-lands-on-my-reports', page.url().includes('/my'), { url: page.url() });
  await page.screenshot({ path: path.join(EVID, 'register-success-1440.png'), fullPage: true });
  const users = await api('GET', '/users', admin);
  const newResident = Array.isArray(users.body) ? users.body.find((u) => u.email === residentEmail) : null;
  note('F08-new-resident-has-email-in-accounts', Boolean(newResident), { found: Boolean(newResident), emailStored: newResident?.email ?? null });
  await ctx.close();

  // 4. Forbidden: a resident cannot open a staff route.
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email').fill('resident@harbor.example');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/my/, { timeout: 20000 }).catch(() => {});
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' });
  const forbidden = await seen(page.getByText(/not allowed|permission|Forbidden|do not have access/i).first(), 8000);
  note('ROUTE-resident-denied-dashboard', forbidden || !page.url().endsWith('/dashboard'), { url: page.url(), forbiddenText: forbidden });
  await page.screenshot({ path: path.join(EVID, 'forbidden-resident-1440.png'), fullPage: true });

  // 5. Unknown address shows a recovery page.
  await page.goto(`${BASE}/no-such-page-audit`, { waitUntil: 'load' });
  const notFound = await seen(page.getByText(/not found|could not find|Page not found|404/i).first(), 8000);
  note('NOT-FOUND-page-shown', notFound, { visible: notFound });
  await page.screenshot({ path: path.join(EVID, 'not-found-1440.png'), fullPage: true });
  await ctx.close();

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'flows-auth.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
})().catch((e) => { console.error('script error', e); process.exit(1); });
