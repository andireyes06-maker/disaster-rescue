// The teams a report is assigned to. Reports assigned before several teams could share one carry only assignedTeamId.
export function teamIdsOf(report) {
  if (Array.isArray(report?.assignedTeamIds) && report.assignedTeamIds.length) return report.assignedTeamIds;
  return report?.assignedTeamId ? [report.assignedTeamId] : [];
}

export function isAssignedTo(report, teamId) {
  return Boolean(teamId) && teamIdsOf(report).includes(teamId);
}
