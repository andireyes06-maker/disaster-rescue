import { isAssignedTo } from './assignedTeams.js';
const STEP = 0.005;
const PUBLIC_STATUSES = new Set(['Verified', 'Awaiting Assignment', 'Team Assigned', 'Rescue in Progress', 'Resolved']);
const snap = (x) => Number((Math.round(x / STEP) * STEP).toFixed(3));

export const coarsen = (lat, lng) => ({ lat: snap(lat), lng: snap(lng) });

export function projectReportForRole(report, role, uid, teamId) {
  if (!report) return null;
  if (role === 'admin') return report;
  if (uid && report.reporterId === uid) return report;
  if (role === 'responder') {
    if (!isAssignedTo(report, teamId)) return null;
    // Defence in depth: reporter name and phone are never shown to responders, even if a stored record carries them.
    const { reporterName, reporterPhone, ...forResponder } = report;
    return forResponder;
  }
  if (!PUBLIC_STATUSES.has(report.status)) return null;
  const { id, type, status, priority, coarseLocation, createdAt } = report;
  return { id, type, status, priority, coarseLocation, createdAt };
}
