import { describe, it, expect } from 'vitest';
import { toCsv, toPdf } from '../../src/services/exportService.js';

// Minimal RFC 4180 parser used only to check round trips.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { /* the \n ends the row */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const base = {
  reference: 'DR-1', type: 'flood', status: 'Verified', priority: 'high', verified: true,
  createdAt: new Date('2026-10-01T10:00:00Z'), location: { lat: -33.9, lng: 151.2, source: 'gps' },
  reporterId: 'res-9', contact: { name: 'Maria Contact', phone: '+63 917 000 1111' },
  photos: [{ url: 'https://photos.example/p1.jpg' }],
};

describe('toCsv', () => {
  it('round-trips quotes, commas and newlines in one row', () => {
    const description = 'He said "help", now\n=cmd';
    const csv = toCsv([{ ...base, description }]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    const header = rows[0];
    expect(rows[1][header.indexOf('description')]).toBe('He said "help", now\n\'=cmd');
  });

  it('neutralizes leading =, +, - and @, including after whitespace', () => {
    const values = ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '   =HYPERLINK("x")', '\t+cmd'];
    const reports = values.map((addressText, i) => ({ ...base, reference: `DR-${i}`, addressText, description: 'ok' }));
    const rows = parseCsv(toCsv(reports));
    const header = rows[0];
    const col = header.indexOf('addressText');
    const cells = rows.slice(1).map((r) => r[col]);
    for (const cell of cells) expect(cell.trimStart().startsWith("'")).toBe(true);
    expect(cells[0]).toBe("'=1+1");
  });

  it('leaves numeric coordinates untouched', () => {
    const rows = parseCsv(toCsv([base]));
    const header = rows[0];
    expect(rows[1][header.indexOf('lat')]).toBe('-33.9');
    expect(rows[1][header.indexOf('lng')]).toBe('151.2');
  });

  it('never contains contact name, phone or photo URLs', () => {
    const csv = toCsv([base]);
    expect(csv).not.toContain('Maria Contact');
    expect(csv).not.toContain('000 1111');
    expect(csv).not.toContain('photos.example');
    expect(csv).not.toContain('reporterId');
    expect(csv).not.toContain('res-9');
  });
});

describe('toPdf', () => {
  it('returns a PDF buffer', async () => {
    const stats = { total: 1, open: 1, resolved: 0, byType: { flood: 1 }, byStatus: { Verified: 1 }, byPriority: { high: 1 }, perDay: [{ date: '2026-10-01', count: 1 }], avgResponseMinutes: null, peopleRescued: 0 };
    const buf = await toPdf(stats, [base]);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
