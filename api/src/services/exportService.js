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

export function toPdf(stats, reports, { sampleLabel = null } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const list = (obj) => Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none';
    doc.fontSize(18).text('Incident summary');
    if (sampleLabel) doc.fontSize(10).text(sampleLabel);
    doc.moveDown();
    doc.fontSize(11)
      .text(`Total: ${stats.total}   Open: ${stats.open}   Resolved: ${stats.resolved}`)
      .text(`Average response (minutes): ${stats.avgResponseMinutes ?? 'n/a'}`)
      .text(`People rescued: ${stats.peopleRescued}`)
      .text(`By type: ${list(stats.byType)}`)
      .text(`By status: ${list(stats.byStatus)}`)
      .text(`By priority: ${list(stats.byPriority)}`);
    doc.moveDown();
    doc.fontSize(13).text('Incidents');
    doc.fontSize(9);
    for (const r of reports) {
      const at = r.location ? `${r.location.lat}, ${r.location.lng}` : 'no location';
      doc.text(`${r.reference} | ${r.type} | ${r.status} | ${r.priority} | ${at}`);
    }
    doc.end();
  });
}
