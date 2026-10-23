import { createHash } from 'node:crypto';

// Only operational identifiers and category/reference; never resident free text, contact information or photo URLs.
export function reportEffectsJob(reportId, report, at = new Date()) {
  return {
    reportId, actorUid: report.reporterId, type: report.type, reference: report.reference,
    status: report.status, createdAt: at, nextAttemptAtMs: 0, state: 'pending',
  };
}
export const creationEventId = (reportId) => `report-create-${reportId}`;
export const notificationEventId = (eventId, uid) => createHash('sha256').update(JSON.stringify([eventId, uid])).digest('hex');
