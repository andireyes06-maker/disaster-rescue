import { inflateSync } from 'node:zlib';

import { signIn, api, fsList } from './rel-lib.mjs';

const rec = (name, ok, detail) => console.log(ok ? 'PASS' : 'FAIL', name, detail ?? '');

const reports = await fsList('reports');
const storedRefs = new Set(reports.map((r) => r.reference));
console.log('stored reports:', reports.length, 'distinct references:', storedRefs.size);

const who = { dispatcher: 'marco.reyes', dmo: 'adrian.santos', admin: 'elena.cruz' };
for (const [role, user] of Object.entries(who)) {
  const tok = await signIn(`${user}@harbor.example`);
  const r = await fetch('http://localhost:3102/api/export/incidents.csv', { headers: { authorization: `Bearer ${tok}` } });
  const text = await r.text();
  const lines = text.split('\r\n').filter(Boolean);
  const header = lines[0];
  const refs = new Set(lines.slice(1).map((l) => l.split(',')[0]));
  const same = refs.size === storedRefs.size && [...refs].every((x) => storedRefs.has(x));
  rec(`${role} CSV 200 and row set equals stored reports`, r.status === 200 && same,
    `status ${r.status}, type ${r.headers.get('content-type')}, file ${r.headers.get('content-disposition')}, rows ${lines.length - 1}, stored ${reports.length}, header ok ${header.startsWith('reference,type,status')}`);

  const p = await fetch('http://localhost:3102/api/export/summary.pdf', { headers: { authorization: `Bearer ${tok}` } });
  const buf = Buffer.from(await p.arrayBuffer());
  const head = buf.subarray(0, 5).toString();
  // Inflate every compressed stream and collect text so report references can be searched.
  let text2 = '';
  let idx = 0;
  while ((idx = buf.indexOf('stream', idx)) !== -1) {
    const start = idx + 6 + (buf[idx + 6] === 0x0d ? 2 : 1);
    const end = buf.indexOf('endstream', start);
    if (end === -1) break;
    try { text2 += inflateSync(buf.subarray(start, end)).toString('latin1'); } catch {}
    idx = end + 9;
  }
  const found = [...storedRefs].filter((ref) => text2.includes(ref)).length;
  rec(`${role} PDF 200, %PDF header, lists stored references`, p.status === 200 && head === '%PDF-' && found > 0,
    `status ${p.status}, type ${p.headers.get('content-type')}, bytes ${buf.length}, refs found in text ${found}/${storedRefs.size}`);

  const range = await fetch('http://localhost:3102/api/export/incidents.csv?from=2000-01-01&to=2000-01-02', { headers: { authorization: `Bearer ${tok}` } });
  const rangeLines = (await range.text()).split('\r\n').filter(Boolean);
  rec(`${role} CSV honours an empty date range`, range.status === 200 && rangeLines.length === 1, `status ${range.status}, data rows ${rangeLines.length - 1}`);
}

const resTok = await signIn('maya.torres@harbor.example');
const rc = await fetch('http://localhost:3102/api/export/incidents.csv', { headers: { authorization: `Bearer ${resTok}` } });
const rp = await fetch('http://localhost:3102/api/export/summary.pdf', { headers: { authorization: `Bearer ${resTok}` } });
rec('resident refused CSV and PDF', rc.status === 403 && rp.status === 403, `csv ${rc.status}, pdf ${rp.status}`);
const anon = await fetch('http://localhost:3102/api/export/incidents.csv');
rec('anonymous refused CSV', anon.status === 401, `status ${anon.status}`);
const bad = await fetch('http://localhost:3102/api/export/incidents.csv?from=2026-13-40', { headers: { authorization: `Bearer ${await signIn('marco.reyes@harbor.example')}` } });
rec('malformed date refused', bad.status === 400, `status ${bad.status}`);
