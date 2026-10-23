import { HttpError } from '../errors.js';
import { STATUS, assertTransition, isOpen } from '../domain/workflow.js';
import { projectReportForRole } from '../domain/privacy.js';
import { sanitizeText } from '../domain/validation.js';
import { record } from './auditService.js';
import { mutationEffects, tryMutationEffects } from './mutationEffectsService.js';
import { AWAITING_ACTION, compareOldestFirst, toMillis } from '../domain/queueOrder.js';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const notFound = () => new HttpError(404, 'not_found', 'Report not found');
export const conflict = () => new HttpError(409, 'conflict', 'The report was changed by someone else');

export async function safeAudit(repo, entry) {
  try { await record(repo, entry); } catch (e) { console.error('audit write failed', e); }
}
export async function safeNotify(fn) {
  try { await fn(); } catch (e) { console.error('notify failed', e); }
}
const reporterIntent = (report, title, body) => report.reporterId ? [{ target: { uid: report.reporterId }, payload: { title, body, reportId: report.id } }] : [];

export async function load(repo, id) {
  const report = await repo.getReport(id);
  if (!report) throw notFound();
  return report;
}

// One guarded status change: workflow check, atomic write, then audit.
export async function transition(repo, user, report, to, patch = {}, extra = {}) {
  assertTransition(report.status, to, user.role);
  const effects = mutationEffects([
    { actorUid: user.uid, action: 'status.change', reportId: report.id, before: { status: report.status }, after: { status: to } },
    ...(extra.audits ?? []),
  ], extra.notifications ?? []);
  const ok = await repo.updateReportIf(report.id, report.status, { ...patch, status: to }, effects);
  if (!ok) throw conflict();
  await tryMutationEffects({ repo, notifier: extra.notifier }, effects);
  return { ...report, ...patch, status: to };
}

export async function list({ repo }, user, query = {}) {
  const filter = {};
  let teamId;
  if (user.role === 'resident') filter.reporterId = user.uid;
  if (user.role === 'responder') {
    teamId = (await repo.getUser(user.uid))?.team;
    if (!teamId) return [];
    filter.assignedTeamId = teamId;
  }
  const str = (v) => (typeof v === 'string' && v ? v : undefined);
  if (str(query.status)) filter.status = query.status;
  if (str(query.type)) filter.type = query.type;
  let rows = await repo.listReports(filter);
  if (str(query.priority)) rows = rows.filter((r) => r.priority === query.priority);
  if (query.verified === 'true' || query.verified === 'false') {
    rows = rows.filter((r) => Boolean(r.verified) === (query.verified === 'true'));
  }
  // Professor clarification (2026-10-23): the staff queue is oldest first; priority does not reorder it.
  if (user.role === 'admin' || user.role === 'responder') rows = queueFirst(rows);
  else if (user.role === 'resident') rows = [...rows].sort(newestFirst);
  return rows.map((r) => projectReportForRole(r, user.role, user.uid, teamId)).filter(Boolean);
}

// Newest first; reports with no readable time go last.
const newestFirst = (a, b) => {
  const x = toMillis(a.createdAt);
  const y = toMillis(b.createdAt);
  if (x === y) return 0;
  if (x === Number.POSITIVE_INFINITY) return 1;
  if (y === Number.POSITIVE_INFINITY) return -1;
  return y - x;
};
// Open reports oldest first (the queue), then everything else newest first.
const queueFirst = (rows) => [
  ...rows.filter((r) => AWAITING_ACTION.has(r.status)).sort(compareOldestFirst),
  ...rows.filter((r) => !AWAITING_ACTION.has(r.status)).sort(newestFirst),
];

export async function get({ repo }, user, id) {
  const report = await repo.getReport(id);
  let teamId;
  if (report && user.role === 'responder') teamId = (await repo.getUser(user.uid))?.team;
  const out = projectReportForRole(report, user.role, user.uid, teamId);
  if (!out) throw notFound();
  return out;
}

export async function verify({ repo, notifier }, user, id) {
  let report = await load(repo, id);
  if (report.status !== STATUS.SUBMITTED && report.status !== STATUS.UNDER_VERIFICATION) {
    throw new HttpError(409, 'illegal_transition', `Cannot verify a report that is ${report.status}`);
  }
  if (report.status === STATUS.SUBMITTED) report = await transition(repo, user, report, STATUS.UNDER_VERIFICATION);
  // The validator and time are recorded on the report and in the audit trail (manual admin review, not a photo check).
  const verifiedBy = { uid: user.uid, name: (await repo.getUser(user.uid))?.name ?? null };
  const verifiedAt = new Date();
  report = await transition(repo, user, report, STATUS.VERIFIED, { verified: true, verifiedBy, verifiedAt });
  report = await transition(repo, user, report, STATUS.AWAITING_ASSIGNMENT, {}, {
    audits: [{ actorUid: user.uid, action: 'report.verify', reportId: id, after: { status: STATUS.AWAITING_ASSIGNMENT, verified: true, verifiedBy } }],
    notifications: reporterIntent(report, 'Report verified', `Report ${report.reference} was verified`), notifier,
  });
  return { id, status: report.status, verified: true, verifiedBy, verifiedAt };
}

async function simpleEdit(repo, user, id, patch, action, pick) {
  const report = await load(repo, id);
  if (!isOpen(report.status)) throw new HttpError(409, 'report_closed', 'Report is closed');
  const effects = mutationEffects([{ actorUid: user.uid, action, reportId: id, before: pick(report), after: pick({ ...report, ...patch }) }]);
  const ok = await repo.updateReportIf(id, report.status, patch, effects);
  if (!ok) throw conflict();
  await tryMutationEffects({ repo }, effects);
  return { id, ...patch };
}

export async function setPriority({ repo }, user, id, body) {
  const priority = body?.priority;
  if (!PRIORITIES.includes(priority)) throw new HttpError(400, 'invalid_priority', 'priority must be low, medium, high or critical');
  return simpleEdit(repo, user, id, { priority }, 'priority.change', (r) => ({ priority: r.priority }));
}

export async function classify({ repo }, user, id, body) {
  const c = typeof body?.classification === 'string' ? sanitizeText(body.classification, 1000) : '';
  if (!c || c.length > 100) throw new HttpError(400, 'invalid_classification', 'classification must be 1 to 100 characters');
  return simpleEdit(repo, user, id, { classification: c }, 'report.classify', (r) => ({ classification: r.classification ?? null }));
}

export async function reject({ repo, notifier }, user, id, body) {
  const raw = typeof body?.reason === 'string' ? body.reason : '';
  const reason = sanitizeText(raw, 10000);
  if (!reason) throw new HttpError(400, 'reason_required', 'A reason is required');
  if (reason.length > 500) throw new HttpError(400, 'reason_too_long', 'Reason must be 500 characters or fewer');
  const report = await load(repo, id);
  await transition(repo, user, report, STATUS.REJECTED, { rejectionReason: reason }, {
    audits: [{ actorUid: user.uid, action: 'report.reject', reportId: id, after: { status: STATUS.REJECTED, reason } }],
    notifications: reporterIntent(report, 'Report rejected', `Report ${report.reference} was rejected. Open the report to read the reason.`), notifier,
  });
  return { id, status: STATUS.REJECTED };
}

export async function markDuplicate({ repo, notifier }, user, id, body) {
  const dup = body?.duplicateOf;
  if (typeof dup !== 'string' || !dup || dup === id) throw new HttpError(400, 'invalid_duplicate', 'duplicateOf must be another report');
  const original = await repo.getReport(dup);
  if (!original) throw new HttpError(400, 'invalid_duplicate', 'duplicateOf report does not exist');
  const report = await load(repo, id);
  await transition(repo, user, report, STATUS.DUPLICATE, { duplicateOf: dup }, {
    audits: [{ actorUid: user.uid, action: 'report.duplicate', reportId: id, after: { status: STATUS.DUPLICATE, duplicateOf: dup } }],
    notifications: reporterIntent(report, 'Report marked duplicate', `Report ${report.reference} duplicates an existing report`), notifier,
  });
  return { id, status: STATUS.DUPLICATE };
}

export async function cancel({ repo, notifier }, user, id) {
  const report = await load(repo, id);
  if (report.reporterId !== user.uid) throw notFound();
  await transition(repo, user, report, STATUS.CANCELLED, {}, {
    audits: [{ actorUid: user.uid, action: 'report.cancel', reportId: id, after: { status: STATUS.CANCELLED } }],
    notifications: [{ target: { role: 'dispatcher' }, payload: { title: 'Report cancelled', body: `Report ${report.reference} was cancelled by the reporter`, reportId: id } }], notifier,
  });
  return { id, status: STATUS.CANCELLED };
}
