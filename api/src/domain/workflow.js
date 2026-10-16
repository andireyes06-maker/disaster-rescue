import { grants } from '../middleware/auth.js';
import { HttpError } from '../errors.js';

export const STATUS = Object.freeze({
  SUBMITTED: 'Submitted', UNDER_VERIFICATION: 'Under Verification', VERIFIED: 'Verified',
  AWAITING_ASSIGNMENT: 'Awaiting Assignment', TEAM_ASSIGNED: 'Team Assigned',
  IN_PROGRESS: 'Rescue in Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
  REJECTED: 'Rejected', DUPLICATE: 'Duplicate', CANCELLED: 'Cancelled',
});
const S = STATUS;
const EDGES = [
  [S.SUBMITTED, S.UNDER_VERIFICATION, ['dispatcher']],
  [S.SUBMITTED, S.REJECTED, ['dispatcher']],
  [S.SUBMITTED, S.DUPLICATE, ['dispatcher']],
  [S.SUBMITTED, S.CANCELLED, ['resident']],
  [S.UNDER_VERIFICATION, S.VERIFIED, ['dispatcher']],
  [S.UNDER_VERIFICATION, S.REJECTED, ['dispatcher']],
  [S.UNDER_VERIFICATION, S.DUPLICATE, ['dispatcher']],
  [S.VERIFIED, S.AWAITING_ASSIGNMENT, ['dispatcher']],
  [S.AWAITING_ASSIGNMENT, S.TEAM_ASSIGNED, ['dispatcher']],
  [S.TEAM_ASSIGNED, S.IN_PROGRESS, ['responder']],
  [S.IN_PROGRESS, S.RESOLVED, ['responder']],
  [S.RESOLVED, S.CLOSED, ['dispatcher']],
];
const find = (from, to) => EDGES.find(([f, t]) => f === from && t === to);
export const canTransition = (from, to, role) => !!find(from, to) && grants(find(from, to)[2], role);
export function assertTransition(from, to, role) {
  const e = find(from, to);
  if (!e) throw new HttpError(409, 'illegal_transition', `Cannot move from ${from} to ${to}`);
  if (!grants(e[2], role)) throw new HttpError(403, 'forbidden', `Role ${role} cannot make this change`);
}
const CLOSED_SET = new Set([S.CLOSED, S.REJECTED, S.DUPLICATE, S.CANCELLED]);
export const isOpen = (status) => !CLOSED_SET.has(status);
