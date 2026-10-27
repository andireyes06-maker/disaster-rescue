import PDFDocument from 'pdfkit';

export const CSV_COLUMNS = ['reference', 'type', 'status', 'priority', 'verified', 'createdAt',
  'assignedTeamId', 'lat', 'lng', 'addressText', 'description'];

// A text cell that starts with a formula character (after spaces or tabs), or has one
// at the start of a line, gets a leading apostrophe so spreadsheets read it as text.
const LEADING_FORMULA = /^\s*[=+\-@]/;
const LINE_FORMULA = /([\r\n]\s*)([=+\-@])/g;
function neutralize(v) {
  if (typeof v !== 'string') return v;
  const s = LEADING_FORMULA.test(v) ? `'${v}` : v;
  return s.replace(LINE_FORMULA, "$1'$2");
}

// Numbers and booleans are typed values, not formulas, so they pass through unchanged.
function cell(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = neutralize(String(v));
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// RFC 4180: CRLF line endings, quoted cells with doubled quotes.
export function toCsv(reports) {
  const rows = reports.map((r) => [
    r.reference, r.type, r.status, r.priority, r.verified, r.createdAt, r.assignedTeamId,
    r.location?.lat, r.location?.lng, r.addressText, r.description,
  ]);
  return [CSV_COLUMNS, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

// A readable summary: headline figures, one table per breakdown, and the incident list.
// Coordinates are never printed; each incident shows its place name, or its area when no name was given.
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

export function toPdf(stats, reports, { sampleLabel = null } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const LEFT = 50;
    const BOTTOM = 780;
    const room = (height = 20) => { if (doc.y + height > BOTTOM) doc.addPage(); };

    const heading = (text) => {
      room(40);
      doc.moveDown(0.6).font('Helvetica-Bold').fontSize(13).fillColor('#1e1b2e').text(text).font('Helvetica');
      doc.moveDown(0.2);
    };
    const line = (label, value) => {
      room();
      const y = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor('#1e1b2e');
      doc.text(label, LEFT, y, { width: 330 });
      doc.text(String(value), LEFT + 330, y, { width: 165, align: 'right' });
      doc.y = Math.max(doc.y, y + 14);
    };
    const breakdown = (text, obj, { label = cap, order = null } = {}) => {
      heading(text);
      const entries = Object.entries(obj ?? {});
      if (!entries.length) { line('No reports in this period', ''); return; }
      if (order) entries.sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
      for (const [k, v] of entries) line(label(k), v);
    };

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#1e1b2e').text('I-Report incident summary');
    doc.font('Helvetica').fontSize(10).fillColor('#5b5870').text(`Generated ${new Date().toISOString().slice(0, 10)}`);
    if (sampleLabel) doc.text(sampleLabel);

    heading('Key figures');
    line('Total reports', stats.total);
    line('Open', stats.open);
    line('Resolved or closed', stats.resolved);
    line('People rescued', stats.peopleRescued);
    line('Average response (minutes)', stats.avgResponseMinutes ?? 'not enough data');

    breakdown('Reports by type', stats.byType);
    breakdown('Reports by priority', stats.byPriority, { order: PRIORITY_ORDER });
    breakdown('Reports by status', stats.byStatus);
    breakdown('Reports by area', stats.byArea);
    heading('Reports per month');
    if (!stats.perMonth?.length) line('No reports in this period', '');
    for (const m of stats.perMonth ?? []) line(m.month, m.count);
    breakdown('Most reported places', stats.byPlace);

    heading('Incidents');
    const cols = [
      { h: 'Reference', x: LEFT, w: 75 },
      { h: 'Type', x: LEFT + 78, w: 60 },
      { h: 'Status', x: LEFT + 140, w: 95 },
      { h: 'Priority', x: LEFT + 238, w: 60 },
      { h: 'Area', x: LEFT + 302, w: 95 },
      { h: 'Place', x: LEFT + 400, w: 95 },
    ];
    const header = () => {
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#5b5870');
      for (const c of cols) doc.text(c.h, c.x, y, { width: c.w });
      doc.y = y + 14;
      doc.font('Helvetica').fillColor('#1e1b2e');
    };
    header();
    doc.fontSize(9);
    for (const r of reports) {
      room(16);
      if (doc.y < 60) header();
      const y = doc.y;
      const values = [r.reference ?? '', cap(r.type), cap(r.status), cap(r.priority), r.area ?? '', r.placeName || r.addressText || r.area || 'Not named'];
      cols.forEach((c, i) => doc.text(String(values[i]), c.x, y, { width: c.w - 4, ellipsis: true }));
      doc.y = y + 14;
    }
    if (!reports.length) line('No incidents in this period', '');
    doc.end();
  });
}
