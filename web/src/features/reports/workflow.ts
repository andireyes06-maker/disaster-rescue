import type { Report } from '../../types/domain';

// Single owner of which staff actions a report offers. The API still enforces every transition.
export const awaitingVerify = (r: Pick<Report, 'status'>): boolean =>
  r.status === 'Submitted' || r.status === 'Under Verification';

export const canAssign = (r: Pick<Report, 'status'>): boolean =>
  r.status === 'Verified' || r.status === 'Awaiting Assignment';

// Staff actions on reports. The website is for administrators only: they validate, assign and close.
// Other roles read here. Rescuers record field progress in the mobile app or on this website; residents use the mobile app.
export const canActOnReports = (role: string | null | undefined): boolean => role === 'admin';

export interface NextStep {
  title: string;
  body: string;
  // Where the action is performed. Only staff who can act see the link; others read the text.
  action: 'verify' | 'assign' | 'close' | null;
}

export function nextStep(r: Pick<Report, 'status'>): NextStep {
  if (awaitingVerify(r)) {
    return { title: 'Validate the report', body: 'Check the report and its photos before assigning a rescue team.', action: 'verify' };
  }
  if (canAssign(r)) {
    return { title: 'Assign a rescue team', body: 'The report is verified and waiting for a team.', action: 'assign' };
  }
  if (r.status === 'Resolved') {
    return { title: 'Close the report', body: 'The rescue is complete. Closing the report frees the team.', action: 'close' };
  }
  if (r.status === 'Team Assigned') {
    return { title: 'Team assigned', body: 'Check the assigned team’s acknowledgement and field updates.', action: null };
  }
  if (r.status === 'Rescue in Progress') {
    return { title: 'Rescue in progress', body: 'A team is responding. Follow the rescue updates.', action: null };
  }
  return { title: 'No action needed', body: 'This report is closed or has no staff action at this stage.', action: null };
}
