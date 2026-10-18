// Browser checks against the scratch emulator-wired production build (port 4183) and scratch emulators (9393 / 8393).
import { chromium } from '/private/tmp/claude-501/-Users-rien-Documents-FINAL-PROJECT/1f78c2ca-cbeb-4f2f-bc77-b7fa860a8447/scratchpad/grpc-exp/web/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const W = '/private/tmp/claude-501/-Users-rien-Documents-FINAL-PROJECT/1f78c2ca-cbeb-4f2f-bc77-b7fa860a8447/scratchpad/grpc-exp';
const APP = 'http://127.0.0.1:4183';
const FS = 'http://127.0.0.1:8393';
const PROJECT = 'demo-rescue-grpc';
const UID = JSON.parse(fs.readFileSync(`${W}/fixture-uid.json`, 'utf8')).uid;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const EMAIL = 'responder.fixture@example.test';
const PASSWORD = 'fixture-pass-123';
const TITLE_1 = 'Flooded road near the bridge';
const TITLE_2 = 'Second fixture report near the dam';

const results = [];
const record = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${detail}`); };
const s = (v) => ({ stringValue: v });
const b = (v) => ({ booleanValue: v });
const ts = (iso) => ({ timestampValue: iso });
async function patchUser(team) {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/users/${UID}`, { method: 'PATCH', headers: OWNER,
    body: JSON.stringify({ fields: { role: s('responder'), team: s(team), active: b(true), name: s('Fixture Responder'), email: s(EMAIL) } }) });
  if (!r.ok) throw new Error(`patch user ${r.status}`);
}
async function addReport(id, title) {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/reports/${id}`, { method: 'PATCH', headers: OWNER,
    body: JSON.stringify({ fields: { type: s('flood'), description: s(title), classification: s('fixture'), verified: b(true), status: s('Verified'), priority: s('high'), addressText: s('Fixture street'), photos: { arrayValue: {} }, possibleDuplicates: { arrayValue: {} }, assignedTeamId: s('team-alpha'), reporterId: s('fixture-reporter'), createdAt: ts('2026-10-18T09:00:00Z'), updatedAt: ts('2026-10-18T09:00:00Z') } }) });
  if (!r.ok) throw new Error(`add report ${r.status}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
const shot = (n) => page.screenshot({ path: `${W}/shots/${n}.png`, fullPage: false });

try {
  // 1. Sign-in and first listener render
  await page.goto(`${APP}/login`);
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/assignments/, { timeout: 30000 });
  const seen1 = await page.getByText(TITLE_1).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  record('sign-in lands on /assignments and listener renders the team report', seen1, page.url());
  await shot('01-signed-in-assignments');

  // 2. Session restore after reload
  await page.reload();
  await page.waitForURL(/\/assignments/, { timeout: 30000 });
  const seen2 = await page.getByText(TITLE_1).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  record('session restore after reload stays signed in and renders data', seen2 && !page.url().includes('/login'), page.url());
  await shot('02-after-reload');

  // 3. Permission denial: users doc team no longer matches the token claim, so the rules refuse the team query.
  await patchUser('team-beta');
  await page.reload();
  await page.waitForURL(/\/assignments/, { timeout: 30000 });
  const denialBanner = await page.getByText('Could not load your assignments').waitFor({ timeout: 30000 }).then(() => true, () => false);
  const retryBtn = await page.getByRole('button', { name: 'Try again' }).isVisible().catch(() => false);
  const crashed = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
  record('permission denial shows recovery banner with Try again (no crash)', denialBanner && retryBtn && !crashed, `banner=${denialBanner} retry=${retryBtn} crash=${crashed}`);
  await shot('03-permission-denied');
  // Restore the matching team, then retry without reload.
  await patchUser('team-alpha');
  await page.getByRole('button', { name: 'Try again' }).click();
  const recovered = await page.getByText(TITLE_1).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  record('after restoring access, Try again recovers the listener', recovered);
  await shot('04-recovered-after-retry');

  // 4. Offline then online with no page reload
  await context.setOffline(true);
  const offlineShown = await page.getByText(/You are offline/).waitFor({ timeout: 15000 }).then(() => true, () => false);
  const cachedStill = await page.getByText(TITLE_1).first().isVisible().catch(() => false);
  record('offline shows the offline notice and keeps the last data', offlineShown && cachedStill, `notice=${offlineShown} cached=${cachedStill}`);
  await shot('05-offline');
  await context.setOffline(false);
  const backOnline = await page.getByText(/You are offline/).waitFor({ state: 'detached', timeout: 15000 }).then(() => true, () => false);
  record('online clears the offline notice', backOnline);
  // Write a new report server-side while online; the listener must pick it up without reload.
  await addReport('rpt-grpc-fixture-2', TITLE_2);
  const live = await page.getByText(TITLE_2).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  record('listener recovers after offline and receives a new report without reload', live);
  await shot('06-online-live');
} catch (err) {
  record('unexpected error in browser flow', false, String(err.message).slice(0, 300));
  await shot('99-error').catch(() => {});
} finally {
  await browser.close();
}

const out = {
  app: APP, emulators: { auth: 9393, firestore: 8393 }, pass: results.filter((r) => r.pass).length, fail: results.filter((r) => !r.pass).length,
  results, pageErrors, consoleErrorCount: consoleErrors.length, consoleErrorSamples: [...new Set(consoleErrors)].slice(0, 8),
};
fs.writeFileSync(`${W}/browser-results.json`, JSON.stringify(out, null, 2));
console.log(`SUMMARY pass=${out.pass} fail=${out.fail} pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
