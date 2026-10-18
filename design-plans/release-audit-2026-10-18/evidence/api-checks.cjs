// Reproduces F01, F03, F04, F05, F09, F10 against the release-audit API (3105) and Auth/Firestore emulators.
// Every request is a real HTTP call. Only the emulator project may be used.
const fs = require('node:fs');
const path = require('node:path');
const API = 'http://localhost:3105/api';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'AuditOnly-Rescue-2026';
const results = [];
const note = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(detail)}`); };

async function signIn(email) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.idToken) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(j)}`);
  return { token: j.idToken, uid: j.localId };
}
async function call(method, p, token, body, extra = {}) {
  const headers = { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra.headers };
  let payload;
  if (extra.form) payload = extra.form;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(`${API}${p}`, { method, headers, body: payload });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json, text };
}

(async () => {
  const admin = await signIn('admin@harbor.example');
  const dispatcher = await signIn('dispatcher@harbor.example');
  const responder = await signIn('responder@harbor.example');
  const resident = await signIn('resident@harbor.example');

  // F01: role demotion and deactivation take effect on the next request, with the same token.
  const before = await call('GET', '/users', dispatcher.token);
  await call('PATCH', `/users/${dispatcher.uid}`, admin.token, { role: 'resident' });
  const afterDemote = await call('GET', '/users', dispatcher.token);
  note('F01-demotion', before.status === 200 && afterDemote.status === 403, { before: before.status, afterDemote: afterDemote.status });
  await call('PATCH', `/users/${dispatcher.uid}`, admin.token, { role: 'dispatcher' });
  const dispatcher2 = await signIn('dispatcher@harbor.example');
  await call('PATCH', `/users/${dispatcher2.uid}`, admin.token, { active: false });
  const afterDeactivate = await call('GET', '/users', dispatcher2.token);
  note('F01-deactivation', afterDeactivate.status === 403, { afterDeactivate: afterDeactivate.status, error: afterDeactivate.body?.error });
  await call('PATCH', `/users/${dispatcher2.uid}`, admin.token, { active: true });

  // F03: a responder can be linked to a team and unlinked again; an unknown team is refused.
  const link = await call('PATCH', `/users/${responder.uid}`, admin.token, { team: 'team-bravo' });
  const unlink = await call('PATCH', `/users/${responder.uid}`, admin.token, { team: 'team-alpha' });
  note('F03-team-assign', link.status === 200 && unlink.status === 200, { link: link.status, unlink: unlink.status });
  const badTeam = await call('PATCH', `/users/${responder.uid}`, admin.token, { team: 'no-such-team' });
  note('F03-invalid-team-refused', badTeam.status === 400 && badTeam.body?.error === 'invalid_team', { status: badTeam.status, error: badTeam.body?.error });

  // F04: the CSV for a type filter must match the stats count for that filter.
  const stats = await call('GET', '/stats?type=flood', dispatcher.token);
  const csv = await call('GET', '/export/incidents.csv?type=flood', dispatcher.token);
  const csvRows = csv.text.trim().split(/\r?\n/).slice(1).filter(Boolean);
  note('F04-csv-matches-stats', csv.status === 200 && csvRows.length === stats.body?.total, { statsTotal: stats.body?.total, csvRows: csvRows.length, csvStatus: csv.status });
  const pdf = await call('GET', '/export/summary.pdf?type=flood', dispatcher.token);
  note('F04-pdf-responds', pdf.status === 200, { status: pdf.status, note: 'PDF totals are not parsed in this script' });

  // F05: reusing an Idempotency-Key for a different report is refused, and the first report stays.
  const key = `audit-key-${Date.now()}-abcdef`;
  const form = (desc) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ type: 'flood', description: desc, lat: '14.5901', lng: '120.9810', source: 'gps' })) f.append(k, v);
    return f;
  };
  const first = await call('POST', '/reports', resident.token, undefined, { form: form('Audit idempotency original'), headers: { 'Idempotency-Key': key } });
  const second = await call('POST', '/reports', resident.token, undefined, { form: form('Audit idempotency DIFFERENT'), headers: { 'Idempotency-Key': key } });
  note('F05-body-mismatch-refused', first.status === 201 && second.status === 409 && second.body?.error === 'idempotency_conflict', { first: first.status, second: second.status, error: second.body?.error });

  // F09: team create and rename are audited.
  const created = await call('POST', '/teams', dispatcher.token, { name: `Audit Team ${Date.now()}` });
  const renamed = await call('PATCH', `/teams/${created.body?.id}`, dispatcher.token, { name: 'Audit Team renamed' });
  const audit = await call('GET', '/audit', dispatcher.token);
  const actions = (Array.isArray(audit.body) ? audit.body : []).map((a) => a.action);
  note('F09-team-audit', created.status === 201 && renamed.status === 200 && actions.includes('team.create') && actions.includes('team.update'), { create: created.status, rename: renamed.status, hasCreate: actions.includes('team.create'), hasUpdate: actions.includes('team.update') });

  // F10: settings refuse empty required fields.
  const empty = await call('PUT', '/admin/settings', admin.token, { hotline: '', residentNotice: '' });
  note('F10-empty-settings-refused', empty.status === 400, { status: empty.status, error: empty.body?.error });

  // Authorization spot checks (not findings).
  const resList = await call('GET', '/users', resident.token);
  const respExport = await call('GET', '/export/incidents.csv', responder.token);
  note('AUTHZ-resident-cannot-list-users', resList.status === 403, { status: resList.status });
  note('AUTHZ-responder-cannot-export', respExport.status === 403, { status: respExport.status });

  fs.writeFileSync(path.join(__dirname, 'api-checks.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
})().catch((e) => { console.error('script error', e); process.exit(1); });
