import { HttpError } from '../errors.js';
import { STATUS, isOpen } from '../domain/workflow.js';
import { sanitizeText } from '../domain/validation.js';
import { load, transition, notFound, safeAudit, safeNotify } from './reviewService.js';

const RESPONDER_STATUSES = [STATUS.IN_PROGRESS, STATUS.RESOLVED];

// Responders see a report only through their own team. Other teams get 404, not 403,
// so the report's existence is not leaked.
async function ownTeamOrNotFound(repo, user, report) {
  const teamId = (await repo.getUser(user.uid))?.team;
  if (!teamId || report.assignedTeamId !== teamId) throw notFound();
}

export async function assign({ repo, notifier }, user, id, body) {
  const teamId = typeof body?.teamId === 'string' ? body.teamId.trim() : '';
  if (!teamId) throw new HttpError(400, 'invalid_team', 'teamId is required');
  const team = await repo.getTeam(teamId);
  if (!team) throw new HttpError(400, 'invalid_team', 'Team does not exist');
  // One rescue at a time per team. Closing frees the team only for its current report.
  if (team.busy && team.currentReportId && team.currentReportId !== id) {
    throw new HttpError(409, 'team_busy', 'This team is already on a rescue');
  }

  let report = await load(repo, id);
  // Verified reports advance to Awaiting Assignment first, so none get stuck.
  if (report.status === STATUS.VERIFIED) report = await transition(repo, user, report, STATUS.AWAITING_ASSIGNMENT);
  // Compare-and-set inside transition: of two concurrent assigns, one gets 409.
  report = await transition(repo, user, report, STATUS.TEAM_ASSIGNED, { assignedTeamId: teamId, assignedAt: new Date() });

  await repo.saveTeam(teamId, { busy: true, currentReportId: id });
  await safeAudit(repo, {
    actorUid: user.uid, action: 'report.assign', reportId: id,
    after: { status: STATUS.TEAM_ASSIGNED, assignedTeamId: teamId },
  });
  await safeNotify(() => notifier?.notifyUsers?.([report.reporterId], {
    title: 'Team assigned', body: `Report ${report.reference} has been assigned to a rescue team`, reportId: id,
  }));
  const members = (await repo.listUsers()).filter((u) => u.team === teamId && u.active !== false).map((u) => u.uid);
  if (members.length) {
    await safeNotify(() => notifier?.notifyUsers?.(members, {
      title: 'New assignment', body: `Report ${report.reference} assigned to ${team.name ?? 'your team'}`, reportId: id,
    }));
  }
  return { id, status: STATUS.TEAM_ASSIGNED, assignedTeamId: teamId };
}

export async function acknowledge({ repo }, user, id) {
  const report = await load(repo, id);
  await ownTeamOrNotFound(repo, user, report);
  if (!isOpen(report.status)) throw new HttpError(409, 'report_closed', 'Report is closed');
  await repo.addUpdate(id, { kind: 'acknowledge', byUid: user.uid, at: new Date() });
  await safeAudit(repo, { actorUid: user.uid, action: 'report.acknowledge', reportId: id, after: { status: report.status } });
  return { id, status: report.status };
}

export async function addUpdate({ repo }, user, id, body) {
  const report = await load(repo, id);
  await ownTeamOrNotFound(repo, user, report);

  const status = body?.status;
  if (!RESPONDER_STATUSES.includes(status)) {
    throw new HttpError(400, 'invalid_status', 'status must be Rescue in Progress or Resolved');
  }
  const peopleRescued = body?.peopleRescued === undefined ? 0 : body.peopleRescued;
  if (!Number.isInteger(peopleRescued) || peopleRescued < 0 || peopleRescued > 10000) {
    throw new HttpError(400, 'invalid_people_rescued', 'peopleRescued must be an integer from 0 to 10000');
  }
  const note = sanitizeText(body?.note ?? '', 1000);

  if (report.status !== status) {
    await transition(repo, user, report, status);
  } else if (status !== STATUS.IN_PROGRESS) {
    throw new HttpError(409, 'illegal_transition', `Report is already ${status}`);
  }
  await repo.addUpdate(id, { kind: 'status', status, note, peopleRescued, byUid: user.uid, at: new Date() });
  await safeAudit(repo, {
    actorUid: user.uid, action: 'report.update', reportId: id,
    before: { status: report.status }, after: { status, peopleRescued },
  });
  return { id, status, peopleRescued };
}

export async function close({ repo }, user, id) {
  const report = await load(repo, id);
  // Only Resolved -> Closed is an edge; anything else is 409 from assertTransition.
  await transition(repo, user, report, STATUS.CLOSED);
  const teamId = report.assignedTeamId;
  if (teamId && (await repo.getTeam(teamId))?.currentReportId === id) {
    await repo.saveTeam(teamId, { busy: false, currentReportId: null });
  }
  await safeAudit(repo, { actorUid: user.uid, action: 'report.close', reportId: id, after: { status: STATUS.CLOSED } });
  return { id, status: STATUS.CLOSED };
}
