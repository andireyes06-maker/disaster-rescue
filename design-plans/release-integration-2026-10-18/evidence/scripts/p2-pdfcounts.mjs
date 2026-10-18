import { inflateSync } from 'node:zlib';
import { signIn, fsList } from './rel-lib.mjs';
const reports = await fsList('reports');
const count = (key) => reports.reduce((m, r) => ((m[r[key]] = (m[r[key]] ?? 0) + 1), m), {});
const tok = await signIn('marco.reyes@harbor.example');
const buf = Buffer.from(await (await fetch('http://localhost:3102/api/export/summary.pdf', { headers: { authorization: `Bearer ${tok}` } })).arrayBuffer());
let idx = 0; let all = '';
while ((idx = buf.indexOf('stream', idx)) !== -1) {
  const start = idx + 6 + (buf[idx + 6] === 0x0d ? 2 : 1); const end = buf.indexOf('endstream', start);
  if (end === -1) break; try { all += inflateSync(buf.subarray(start, end)).toString('latin1'); } catch {} idx = end + 9;
}
const text = [...all.matchAll(/<([0-9a-fA-F]+)>/g)].map((m) => Buffer.from(m[1], 'hex').toString('utf8')).join('');
const typeLine = text.match(/By type: ([^B]*?)By status/)?.[1]?.trim();
const statusLine = text.match(/By status: (.*?)(?=Total|Average|People|Open|\$|$)/)?.[1];
const pdfTypes = Object.fromEntries((typeLine ?? '').split(',').map((s) => s.trim().split(': ')).filter((a) => a.length === 2).map(([k, v]) => [k, Number(v)]));
const types = count('type');
const typesMatch = Object.entries(types).every(([k, v]) => pdfTypes[k] === v);
const statusStored = count('status');
console.log('PDF by type:', typeLine, '| stored:', JSON.stringify(types));
console.log('PDF by status:', JSON.stringify(text.slice(text.indexOf('By status'), text.indexOf('By status') + 260)), '| stored:', JSON.stringify(statusStored));
console.log(typesMatch ? 'PASS by-type counts match stored' : 'FAIL by-type counts differ');
const pdfStatus = Object.fromEntries((statusLine ?? '').split(',').map((s) => s.trim().split(': ')).filter((a) => a.length === 2).map(([k, v]) => [k, Number(v)]));
const statusMatch = Object.entries(statusStored).every(([k, v]) => pdfStatus[k] === v);
console.log(statusMatch ? 'PASS by-status counts match stored' : 'FAIL by-status counts differ (labels may differ from raw status values)');
// Direct check: each stored status count appears as "<status>: <n>" in the decoded summary text.
const direct = Object.entries(statusStored).map(([k, v]) => [k, text.includes(`${k}: ${v}`)]);
console.log(direct.every(([, ok]) => ok) ? 'PASS direct by-status counts match stored' : 'FAIL direct: ' + JSON.stringify(direct.filter(([, ok]) => !ok)));
