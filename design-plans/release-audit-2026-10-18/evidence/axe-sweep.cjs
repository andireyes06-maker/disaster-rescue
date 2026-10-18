// Accessibility sweep: axe-core (WCAG 2.0/2.1 A and AA tags) on each surface at 390 and 1440px, Chromium.
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');
const scratch = createRequire('/private/tmp/claude-501/-Users-rien-Documents-FINAL-PROJECT/12c512fa-e0a9-403a-9dae-e5b68c155771/scratchpad/axe/package.json');
const { AxeBuilder } = scratch('@axe-core/playwright');

const BASE = 'http://localhost:5178';
const API = 'http://localhost:3105/api';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'AuditOnly-Rescue-2026';
const WIDTHS = [390, 1440];
const out = [];

async function token(email) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  return (await r.json()).idToken;
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
  const dtok = await token('dispatcher@harbor.example');
  const reports = await (await fetch(`${API}/reports`, { headers: { authorization: `Bearer ${dtok}` } })).json();
  const incident = Array.isArray(reports) && reports[0] ? reports[0].id : 'none';
  const plans = [
    { who: 'anonymous', email: null, paths: ['/', '/login', '/register', '/forbidden'] },
    { who: 'resident', email: 'resident@harbor.example', paths: ['/my', '/my/report', `/my/reports/${incident}`] },
    { who: 'dispatcher', email: 'dispatcher@harbor.example', paths: ['/dashboard', `/incidents/${incident}`, '/map', '/analytics', '/audit', '/teams', '/users'] },
    { who: 'responder', email: 'responder@harbor.example', paths: ['/assignments'] },
    { who: 'dmo', email: 'dmo@harbor.example', paths: ['/monitor'] },
    { who: 'admin', email: 'admin@harbor.example', paths: ['/admin'] },
  ];
  for (const plan of plans) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      if (plan.email) await login(page, plan.email);
      for (const p of plan.paths) {
        await page.goto(`${BASE}${p}`, { waitUntil: 'load' }).catch(() => {});
        await page.waitForTimeout(1000);
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const violations = result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes[0]?.target?.join(' ').slice(0, 120) }));
        out.push({ who: plan.who, path: p, width, violations, passes: result.passes.length });
        console.log(`${plan.who} ${p} @${width}: ${violations.length} violation types ${violations.map((v) => `${v.id}(${v.nodes})`).join(' ')}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'axe-sweep.json'), JSON.stringify(out, null, 2));
})().catch((e) => { console.error('script error', e); process.exit(1); });
