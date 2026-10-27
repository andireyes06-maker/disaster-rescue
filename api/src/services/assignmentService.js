import { createHash } from 'node:crypto';
import { mutationEffects, tryMutationEffects } from './mutationEffectsService.js';
import { HttpError } from '../errors.js';
import { STATUS, isOpen, assertTransition } from '../domain/workflow.js';
import { sanitizeText } from '../domain/validation.js';
import { load, transition, notFound, conflict } from './reviewService.js';

const RESPONDER_STATUSES = [STATUS.IN_PROGRESS, STATUS.RESOLVED];

// Maps a refused atomic change to the same responses the single-document path gives.
function throwIfRejected(result) {
  if (result.ok) return;
  if (result.reason === 'report_closed') throw new HttpError(409, 'report_closed', 'Report is closed');
  if (result.reason === 'team_busy') throw new HttpError(409, 'team_busy', 'This team is already on a rescue');
  if (result.reason === 'team_missing') throw new HttpError(400, 'invalid_team', 'Team does not exist');
  if (result.reason === 'not_found') throw notFound();
  throw conflict();
}

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

  let report = await load(repo, id);
  // Verified reports advance to Awaiting Assignment first, so none get stuck.
  if (report.status === STATUS.VERIFIED) report = await transition(repo, user, report, STATUS.AWAITING_ASSIGNMENT);
  assertTransition(report.status, STATUS.TEAM_ASSIGNED, user.role);
  // Authoritative: the team claim and the report change commit together, so one team can serve one report.
  // Two different reports racing for the same free team get one success and one team_busy.
  const previous = report.status;
  const assignedAt = new Date();
  const effects = mutationEffects([
    { actorUid: user.uid, action: 'status.change', reportId: id, before: { status: previous }, after: { status: STATUS.TEAM_ASSIGNED } },
    { actorUid: user.uid, action: 'report.assign', reportId: id, after: { status: STATUS.TEAM_ASSIGNED, assignedTeamId: teamId } },
  ], [
    ...(report.reporterId ? [{ target: { uid: report.reporterId }, payload: { title: 'Team assigned', body: `Report ${report.reference} has been assigned to a rescue team`, reportId: id } }] : []),
    { target: { teamId }, payload: { title: 'New assignment', body: `Report ${report.reference} assigned to ${team.name ?? 'your team'}`, reportId: id } },
  ]);
  throwIfRejected(await repo.applyReportChange(id, previous, {
    reportPatch: { status: STATUS.TEAM_ASSIGNED, assignedTeamId: teamId, assignedAt },
    team: { id: teamId, claim: true }, effects,
  }));
  report = { ...report, status: STATUS.TEAM_ASSIGNED, assignedTeamId: teamId, assignedAt };
  await tryMutationEffects({ repo, notifier }, effects);
  return { id, status: STATUS.TEAM_ASSIGNED, assignedTeamId: teamId };
}

// Any responder on the assigned team may acknowledge, wherever they are. Distance still limits addUpdate.
export async function acknowledge({ repo }, user, id) {
  const report = await load(repo, id);
  await ownTeamOrNotFound(repo, user, report);
  const effects = mutationEffects([{ actorUid: user.uid, action: 'report.acknowledge', reportId: id }]);
  const result = await repo.acknowledgeReport(id, user.uid, effects);
  throwIfRejected(result);
  if (!result.duplicate) await tryMutationEffects({ repo }, effects);
  return { id, status: result.status };
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;

// A key from the Idempotency-Key header becomes a fixed document id, scoped to the responder, so the same
// key from two accounts can never share a row. Without a key the update is recorded as before.
function updateIdFor(uid, key) {
  return 'upd-' + createHash('sha256').update(`${uid}\n${key}`).digest('hex');
}

// Replays the row a completed request wrote. Only the responder who wrote it may replay it.
function replayed(prior, user, id) {
  if (prior.byUid !== user.uid) throw new HttpError(409, 'idempotency_conflict', 'This request key was used by another account');
  return { id, status: prior.status, peopleRescued: prior.peopleRescued };
}

// Read-only lookup for an uncertain update: did the server record it under this key? It never writes, and it applies
// the current team check first, so a responder who has left the team gets a 404 rather than a receipt.
export async function findUpdateReceipt({ repo }, user, id, idempotencyKey) {
  if (typeof idempotencyKey !== 'string' || !IDEMPOTENCY_KEY.test(idempotencyKey)) {
    throw new HttpError(400, 'invalid_idempotency_key', 'Idempotency-Key must be 8 to 128 letters, digits, - or _');
  }
  const report = await load(repo, id);
  await ownTeamOrNotFound(repo, user, report);
  const prior = await repo.getReportUpdate(id, updateIdFor(user.uid, idempotencyKey));
  if (!prior) return { saved: false };
  if (prior.byUid !== user.uid) throw notFound();
  return { saved: true, id, status: prior.status, peopleRescued: prior.peopleRescued };
}

export async function addUpdate({ repo }, user, id, body, idempotencyKey) {
  if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY.test(idempotencyKey)) {
    throw new HttpError(400, 'invalid_idempotency_key', 'Idempotency-Key must be 8 to 128 letters, digits, - or _');
  }
  const updateId = idempotencyKey === undefined ? undefined : updateIdFor(user.uid, idempotencyKey);
  // Current permissions come first: a retry after the responder left the team is refused, never replayed.
  const report = await load(repo, id);
  await ownTeamOrNotFound(repo, user, report);
  if (updateId) {
    const prior = await repo.getReportUpdate(id, updateId);
    if (prior) return replayed(prior, user, id);
  }

  const status = body?.status;
  if (!RESPONDER_STATUSES.includes(status)) {
    throw new HttpError(400, 'invalid_status', 'status must be Rescue in Progress or Resolved');
  }
  const peopleRescued = body?.peopleRescued === undefined ? 0 : body.peopleRescued;
  if (!Number.isInteger(peopleRescued) || peopleRescued < 0 || peopleRescued > 10000) {
    throw new HttpError(400, 'invalid_people_rescued', 'peopleRescued must be an integer from 0 to 10000');
  }
  const note = sanitizeText(body?.note ?? '', 1000);

  const update = { kind: 'status', status, note, peopleRescued, byUid: user.uid, at: new Date() };
  const effects = mutationEffects([
    ...(report.status !== status ? [{ actorUid: user.uid, action: 'status.change', reportId: id, before: { status: report.status }, after: { status } }] : []),
    { actorUid: user.uid, action: 'report.update', reportId: id, before: { status: report.status }, after: { status, peopleRescued } },
  ]);
  if (report.status !== status) {
    // The status change and its update record commit together, so a failure never leaves a Resolved report without its note.
    assertTransition(report.status, status, user.role);
    const result = await repo.applyReportChange(id, report.status, { reportPatch: { status }, updateDoc: update, updateId, responderUid: user.uid, effects });
    throwIfRejected(result);
    if (result.duplicate) return replayed(result.update, user, id);
  } else if (status !== STATUS.IN_PROGRESS) {
    throw new HttpError(409, 'illegal_transition', `Report is already ${status}`);
  } else {
    const result = await repo.applyReportChange(id, report.status, { reportPatch: {}, updateDoc: update, updateId, responderUid: user.uid, effects });
    throwIfRejected(result);
    if (result.duplicate) return replayed(result.update, user, id);
  }
  await tryMutationEffects({ repo }, effects);
  return { id, status, peopleRescued };
}

export async function close({ repo }, user, id) {
  const report = await load(repo, id);
  // Only Resolved -> Closed is an edge; anything else is 409 from assertTransition.
  assertTransition(report.status, STATUS.CLOSED, user.role);
  const teamId = report.assignedTeamId;
  // The status change and the team release commit together, so a team is never left busy after its report closed.
  const effects = mutationEffects([
    { actorUid: user.uid, action: 'status.change', reportId: id, before: { status: report.status }, after: { status: STATUS.CLOSED } },
    { actorUid: user.uid, action: 'report.close', reportId: id, after: { status: STATUS.CLOSED } },
  ]);
  throwIfRejected(await repo.applyReportChange(id, report.status, {
    reportPatch: { status: STATUS.CLOSED },
    team: teamId ? { id: teamId, release: true } : undefined, effects,
  }));
  await tryMutationEffects({ repo }, effects);
  return { id, status: STATUS.CLOSED };
}
