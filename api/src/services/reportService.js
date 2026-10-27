import { createHash, randomBytes, randomInt } from 'node:crypto';
import { parseReportInput, validatePhotos } from '../domain/validation.js';
import { coarsen } from '../domain/privacy.js';
import { findPossibleDuplicates } from '../domain/duplicates.js';
import { STATUS } from '../domain/workflow.js';
import { deliverReportEffects } from './reportEffectsService.js';
import { HttpError } from '../errors.js';
import { newAssetId } from '../domain/photoLedger.js';

// Keys are client-generated: 16 to 100 URL-safe characters.
const KEY_RE = /^[A-Za-z0-9_-]{16,100}$/;
// A worker's lease. Once it expires, a retry with the same key and the same content may take the claim over.
// The takeover keeps the reserved report id and reference, and fences the previous worker (domain/submission.js).
const LEASE_MS = 120_000;

export function makeReference() {
  let s = '';
  for (let i = 0; i < 6; i++) s += randomInt(36).toString(36).toUpperCase();
  return `DR-${s}`;
}

// Reserved report id, fixed when the claim is first written. 20 URL-safe characters, unrelated to the reference.
export function makeReportId() {
  return randomBytes(15).toString('base64url').slice(0, 20);
}

// Canonical JSON (keys sorted at every level) so the same submission always gives the same fingerprint.
const stable = (v) => {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]));
  return v;
};
// Bind the key to validated fields and actual photo content (type, length and SHA-256 of each file, in order).
// Equal-sized files can contain different evidence and must not silently replay a previous submission.
export function submissionFingerprint(data, files = []) {
  const body = JSON.stringify(stable({ data, photos: files.map((f) => [f.mimetype, f.buffer.length, createHash('sha256').update(f.buffer).digest('hex')]) }));
  return createHash('sha256').update(body).digest('hex');
}

const photosExpired = () => new HttpError(409, 'photos_expired', 'The photos for this report were not attached in time and were discarded. Send the report again.');
const busy = () => new HttpError(409, 'submission_in_progress', 'This report is already being sent. Wait a moment, then check My reports before sending again.');

function buildReport(data, user, reference, now) {
  const report = {
    reference,
    type: data.type,
    description: data.description,
    status: STATUS.SUBMITTED,
    verified: false,
    // A resident's severity starts the priority, capped at high: only an administrator can mark a report critical.
    priority: data.severity === 'critical' ? 'high' : data.severity,
    location: { lat: data.lat, lng: data.lng, source: data.source },
    coarseLocation: coarsen(data.lat, data.lng),
    reporterId: user.uid,
    photos: [],
    createdAt: now,
  };
  if (data.addressText) report.addressText = data.addressText;
  if (data.area) report.area = data.area;
  if (data.placeName) report.placeName = data.placeName;
  if (data.locality) report.locality = data.locality;
  report.severity = data.severity;
  report.affectedRadiusM = data.affectedRadiusM ?? 500;
  if (data.contact) report.contact = data.contact;
  return report;
}

// Audit and notification run only after a report has been written by this request. Their failures never fail the request.
async function afterCreate(deps, user, report, id) {
  // The pending work was persisted with the report; failure here must not turn receipt into a failed send.
  try { await deliverReportEffects(deps, id); }
  catch (error) { console.error('report effects pending recovery', id, error.message); }
}

async function removeUploads(uploader, uploaded) {
  if (!uploaded.length) return;
  try { await uploader.remove(uploaded); } catch (re) { console.error('photo cleanup failed', re); }
}

// After a commit call throws, the outcome can be unclear: the transaction may have committed and the reply been lost.
// Read the claim to decide. Only a proven "not committed" releases this attempt's photos.
async function resolveCommitOutcome(repo, uid, key, reportId) {
  try {
    const stored = await repo.getSubmission(uid, key);
    if (!stored) return { outcome: 'unknown' };
    if (stored.state === 'done' && stored.result?.id === reportId) return { outcome: 'committed', result: stored.result };
    return { outcome: 'not-committed' };
  } catch (e) {
    console.error('could not read submission after a failed commit', e);
    return { outcome: 'unknown' };
  }
}

// Keyed submission. The caller holds the claim (generation, reserved id and reference) and must end it: commit, or give it back.
async function runClaimed(deps, user, data, files, key, held, observed) {
  const { repo, uploader } = deps;
  const { generation, reportId, reference } = held;
  const now = new Date();
  const nowMs = deps.clock ? deps.clock() : Date.now();
  let uploaded = [];
  let commitStarted = false;
  let committed;
  const report = buildReport(data, user, reference, now);
  // Photo ids are reserved in the server-only ledger before any bytes are sent (PHOTO-CLEANUP-SPEC, item 1).
  const assetIds = files?.length ? files.map(() => newAssetId()) : [];
  try {
    // Read before uploading so a failure here leaves no orphaned assets.
    report.possibleDuplicates = findPossibleDuplicates(report, await repo.listOpenReports());
    if (assetIds.length) {
      const reserved = await repo.reservePhotoAssets(user.uid, key, { generation, reportId, assetIds, now: nowMs });
      if (reserved.mode === 'replay') { observed.replayed = true; return reserved.result; }
      if (reserved.mode !== 'reserve') throw busy(); // taken over, or the ids collided: this attempt must not upload
    }
    uploaded = assetIds.length ? await uploader.upload(files, { publicIds: assetIds }) : [];
    // Acceptance is recorded durably. If this write fails, the row stays reserved and the commit still checks it.
    for (const [i, photo] of uploaded.entries()) {
      await repo.recordPhotoAccepted(user.uid, key, { generation, reportId, assetId: assetIds[i], sizeBytes: photo.sizeBytes, mimeType: photo.mimeType })
        .catch((re) => console.error('photo acceptance not recorded', re?.name ?? 'error'));
    }
    // publicId is internal (for cleanup) and never stored on the report.
    report.photos = uploaded.map(({ publicId, ...photo }) => photo);
    commitStarted = true;
    committed = await repo.commitSubmission(user.uid, key, { generation, reportId, report, assetIds, now: nowMs });
  } catch (e) {
    if (commitStarted) {
      const { outcome, result } = await resolveCommitOutcome(repo, user.uid, key, reportId);
      if (outcome === 'committed') { await afterCreate(deps, user, report, reportId); return result; } // the report exists: the lost reply is recovered as a success
      if (outcome === 'unknown') throw e; // cannot prove the outcome, so keep the photos rather than risk the winner's
    }
    await removeUploads(uploader, uploaded);
    await repo.releaseSubmission(user.uid, key, generation).catch((re) => console.error('claim release failed', re));
    throw e;
  }

  if (committed.mode === 'commit') {
    await afterCreate(deps, user, report, reportId);
    return committed.result;
  }
  if (committed.mode === 'assets_unavailable') {
    // Cleanup abandoned these photos before the commit, so nothing was attached. The ledger, not this request,
    // removes them: an immediate destroy here could race a late upload. The claim is released so a retry can run.
    await repo.releaseSubmission(user.uid, key, generation).catch((re) => console.error('claim release failed', re));
    throw photosExpired();
  }
  // The claim was completed by another worker, or taken over. This attempt wrote nothing, so its photos are not referenced.
  await removeUploads(uploader, uploaded);
  if (committed.mode === 'replay') { observed.replayed = true; return committed.result; }
  throw busy();
}

// `observed.replayed` is set when the answer came from a key that had already completed (the route reports it in a header).
export async function create(deps, user, input, files, idempotencyKey, observed = {}) {
  const { repo, uploader } = deps;
  // Validate everything before any side effect.
  const data = parseReportInput(input);
  validatePhotos(files);
  if (idempotencyKey !== undefined && !KEY_RE.test(idempotencyKey)) {
    throw new HttpError(400, 'invalid_idempotency_key', 'Idempotency-Key must be 16 to 100 letters, digits, hyphens, or underscores');
  }

  // No client key: the server gives this attempt its own identity. It is generated here, never sent to or accepted from the
  // client, and it is new for every request, so it does not deduplicate client retries (those still need a key). It gives
  // every upload the same ledger reservation, fencing and reconciliation as a keyed submission (C1, no untracked uploads).
  const key = idempotencyKey || randomBytes(24).toString('base64url');
  const fingerprint = submissionFingerprint(data, files);
  const now = deps.clock ? deps.clock() : Date.now();
  const decision = await repo.claimSubmission(user.uid, key, {
    fingerprint, now, reportId: makeReportId(), reference: makeReference(), leaseMs: LEASE_MS,
  });
  switch (decision.mode) {
    case 'replay': observed.replayed = true; return decision.result;
    case 'conflict':
      throw new HttpError(409, 'idempotency_conflict', 'This Idempotency-Key was already used for a different report. Send the report again with a new key.');
    case 'pending': throw busy();
    case 'unresolved':
      throw new HttpError(409, 'submission_unresolved', 'An earlier attempt to send this report could not be confirmed. Check My reports before sending it again.');
    case 'run':
      return runClaimed(deps, user, data, files, key, decision, observed);
    default:
      throw new Error(`unexpected claim decision: ${decision.mode}`);
  }
}

export const reportService = { create };
