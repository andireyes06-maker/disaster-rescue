import type { Report } from '../../types/domain';

// Single owner of which staff actions a report offers. The API still enforces every transition.
export const awaitingVerify = (r: Pick<Report, 'status'>): boolean =>
  r.status === 'Submitted' || r.status === 'Under Verification';

export const canAssign = (r: Pick<Report, 'status'>): boolean =>
  r.status === 'Verified' || r.status === 'Awaiting Assignment';

export interface NextStep {
  title: string;
  body: string;
  // Where the action is performed. Only dispatchers see the link; others read the text.
  action: 'verify' | 'assign' | null;
}

export function nextStep(r: Pick<Report, 'status'>): NextStep {
  if (awaitingVerify(r)) {
    return { title: 'Verify the report', body: 'Check the report before assigning a rescue team.', action: 'verify' };
  }
  if (canAssign(r)) {
    return { title: 'Assign a rescue team', body: 'The report is verified and waiting for a team.', action: 'assign' };
  }
  if (r.status === 'Team Assigned' || r.status === 'Rescue in Progress') {
    return { title: 'Rescue in progress', body: 'A team is responding. Follow the rescue updates.', action: null };
  }
  return { title: 'No action needed', body: 'This report is closed or has no staff action at this stage.', action: null };
}
