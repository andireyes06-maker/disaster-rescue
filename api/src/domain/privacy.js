const STEP = 0.005;
const PUBLIC_STATUSES = new Set(['Verified', 'Awaiting Assignment', 'Team Assigned', 'Rescue in Progress', 'Resolved']);
const snap = (x) => Number((Math.round(x / STEP) * STEP).toFixed(3));

export const coarsen = (lat, lng) => ({ lat: snap(lat), lng: snap(lng) });

export function projectReportForRole(report, role, uid, teamId) {
  if (!report) return null;
  if (role === 'dispatcher' || role === 'dmo' || role === 'admin') return report;
  if (uid && report.reporterId === uid) return report;
  if (role === 'responder') {
    return teamId && report.assignedTeamId === teamId ? report : null;
  }
  if (!PUBLIC_STATUSES.has(report.status)) return null;
  const { id, type, status, priority, coarseLocation, createdAt } = report;
  return { id, type, status, priority, coarseLocation, createdAt };
}
