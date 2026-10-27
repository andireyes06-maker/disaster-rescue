import { AggregateField, FieldValue } from 'firebase-admin/firestore';
import { HttpError } from '../errors.js';
import { reportEffectsJob } from '../domain/reportEffects.js';
// Firestore implementation of the repo port (see src/ports/repo.js).
import { createHash } from 'node:crypto';
import { isOpen } from '../domain/workflow.js';
import { decideClaim, decideCommit, decideRelease } from '../domain/submission.js';
import { isAssignedTo } from '../domain/assignedTeams.js';
import {
  decideReserve, decideAttach, decideAccepted, planAbandon, planDestroyOutcome, reservedRow, OPEN_STATES, DESTROYABLE_STATES,
} from '../domain/photoLedger.js';

// Unit tests use the in-memory repo. Submission transactions are also covered against the real emulator
// (test/adapters/submission.emulator.test.js, run by `npm run test:submission-emulator`).
const withoutClaim = ({ claim, ...rest }) => rest;

// Unambiguous claim document id: SHA-256 of the canonical JSON pair. Two different (uid, key) pairs can never produce the same text.
export function claimDocId(uid, key) {
  return createHash('sha256').update(JSON.stringify([uid, key])).digest('hex');
}

const isTimestamp = (v) => v && typeof v === 'object' && typeof v.toDate === 'function';

function fromFs(v) {
  if (isTimestamp(v)) return v.toDate();
  if (Array.isArray(v)) return v.map(fromFs);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromFs(x)]));
  }
  return v;
}

function stripUndefined(v) {
  if (Array.isArray(v)) return v.map(stripUndefined);
  if (v && typeof v === 'object' && !(v instanceof Date) && !isTimestamp(v)) {
    return Object.fromEntries(
      Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, stripUndefined(x)]),
    );
  }
  return v;
}

const doc = (snap) => (snap.exists ? { id: snap.id, ...fromFs(snap.data()) } : null);
const userDoc = (snap) => {
  if (!snap.exists) return null;
  return { uid: snap.id, ...fromFs(snap.data()) };
};
const docs = (qs) => qs.docs.map(doc);

// Firestore needs a composite index per equality-field combination. To keep the
// index list small and exact, send at most ONE equality filter (the first present
// key in priority order) and apply the others in memory on the results.
function pickEquality(f, priority) {
  const key = priority.find((k) => f[k] !== undefined);
  const rest = priority.filter((k) => k !== key && f[k] !== undefined);
  return { key, matches: (row) => rest.every((k) => row[k] === f[k]) };
}

export function createFirestoreRepo(db) {
  const col = (n) => db.collection(n);
  // Unambiguous claim address, and the old "uid__key" address that legacy records still use (read only with an ownership check).
  const claimRef = (uid, key) => col('submissions').doc(claimDocId(uid, key));
  const legacyRef = (uid, key) => col('submissions').doc(`${uid}__${key}`);
  // Photo ledger row. Asset ids contain "/", which Firestore forbids in document ids, so the row is keyed by a SHA-256 of the id.
  const photoRef = (assetId) => col('photoAssets').doc(createHash('sha256').update(assetId).digest('hex'));

  const writeEffects = (writer, effects) => { if (effects) writer.set(col('mutationEffects').doc(effects.id), stripUndefined(effects)); };

  // Every database read is bounded. Refuse an oversized response explicitly rather
  // than silently truncating exports, counts or filtered staff queues.
  async function collectPaged(q, maximum = 10000) {
    const rows = []; let cursor;
    while (true) {
      const snap = await (cursor ? q.startAfter(cursor) : q).limit(500).get();
      if (rows.length + snap.size > maximum) throw new HttpError(413, 'result_too_large', 'Too many results. Narrow the date range or filters and try again.');
      rows.push(...docs(snap));
      if (snap.size < 500) return rows;
      cursor = snap.docs.at(-1);
    }
  }
  async function listReports(f = {}) {
    const dated = (q) => {
      let x = q;
      if (f.from) x = x.where('createdAt', '>=', f.from);
      if (f.to) x = x.where('createdAt', '<=', f.to);
      return collectPaged(x.orderBy('createdAt', 'desc'));
    };
    // A team's reports: older reports name one team in assignedTeamId, newer ones list every team in assignedTeamIds.
    if (f.assignedTeamId !== undefined) {
      const { matches } = pickEquality(f, ['reporterId', 'status', 'type']);
      const [single, many] = await Promise.all([
        dated(col('reports').where('assignedTeamId', '==', f.assignedTeamId)),
        dated(col('reports').where('assignedTeamIds', 'array-contains', f.assignedTeamId)),
      ]);
      const byId = new Map();
      for (const r of [...single, ...many]) byId.set(r.id, r);
      return [...byId.values()].filter(matches).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    const { key, matches } = pickEquality(f, ['reporterId', 'status', 'type']);
    let q = col('reports');
    if (key) q = q.where(key, '==', f[key]);
    return (await dated(q)).filter(matches);
  }

  return {
    async getReport(id) { return doc(await col('reports').doc(id).get()); },
    listReports,
    async listOpenReports() {
      const all = await collectPaged(col('reports').orderBy('createdAt', 'desc'));
      return all.filter((r) => isOpen(r.status));
    },
    async createReport(data) {
      const now = new Date();
      const ref = col('reports').doc();
      const batch = db.batch();
      batch.set(ref, stripUndefined({ ...data, createdAt: now, updatedAt: now }));
      batch.set(col('reportEffects').doc(ref.id), stripUndefined(reportEffectsJob(ref.id, data, now)));
      await batch.commit();
      return ref.id;
    },
    async updateReportIf(id, expectedStatus, patch, effects) {
      const ref = col('reports').doc(id);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().status !== expectedStatus) return false;
        tx.update(ref, stripUndefined({ ...patch, updatedAt: new Date() }));
        writeEffects(tx, effects);
        return true;
      });
    },
    // One transaction for a status change and the team it claims or frees, plus its update record.
    // Reads come first (report, then team), then all writes, so a conflict on either document retries cleanly.
    async applyReportChange(reportId, expectedStatus, change) {
      const ref = col('reports').doc(reportId);
      const teams = change.teams ?? [];
      const teamRefs = teams.map((t) => col('teams').doc(t.id));
      // A responder update with an idempotency key has a fixed document id. Finding it already written
      // means this exact request committed earlier, so nothing is written again and the stored row is returned.
      const updateRef = change.updateId ? ref.collection('updates').doc(change.updateId) : null;
      return db.runTransaction(async (tx) => {
        if (updateRef) {
          const prior = await tx.get(updateRef);
          if (prior.exists) return { ok: true, duplicate: true, update: prior.data() };
        }
        const report = await tx.get(ref);
        if (!report.exists) return { ok: false, reason: 'not_found' };
        if (report.data().status !== expectedStatus) return { ok: false, reason: 'conflict' };
        if (change.responderUid) {
          const actor = await tx.get(col('users').doc(change.responderUid));
          const u = actor.exists ? actor.data() : null;
          if (!u?.active || !['responder', 'admin'].includes(u.role) || !u.team || !isAssignedTo(report.data(), u.team)) return { ok: false, reason: 'not_found' };
        }
        // Every team is read before anything is written, so a claim covers all of them or none.
        const docs = await Promise.all(teamRefs.map((r) => tx.get(r)));
        for (let i = 0; i < teams.length; i++) {
          if (!teams[i].claim) continue;
          if (!docs[i].exists) return { ok: false, reason: 'team_missing' };
          const t = docs[i].data();
          if (t.busy === true && t.currentReportId && t.currentReportId !== reportId) return { ok: false, reason: 'team_busy' };
        }
        tx.update(ref, stripUndefined({ ...change.reportPatch, updatedAt: new Date() }));
        teams.forEach((t, i) => {
          if (t.claim) tx.set(teamRefs[i], { busy: true, currentReportId: reportId }, { merge: true });
          if (t.release && docs[i].exists && docs[i].data().currentReportId === reportId) {
            tx.set(teamRefs[i], { busy: false, currentReportId: null }, { merge: true });
          }
        });
        if (change.updateDoc) {
          const update = change.updateDoc;
          tx.set(updateRef ?? ref.collection('updates').doc(), stripUndefined({ ...update, at: update.at ?? new Date() }));
        }
        writeEffects(tx, change.effects);
        return { ok: true };
      });
    },
    // Idempotent report submission. A claim is addressed by claimDocId(uid, key), a hash of the canonical [uid, key] pair, so
    // no two account/key pairs share a document. A record under the old "uid__key" text is read only when its stored owner is the
    // caller (legacy handling). Each operation runs in one transaction; the decision (domain/submission.js) reads the claim
    // inside it, so Firestore's conflict check and the generation fence still refuse a stale worker.
    async claimSubmission(uid, key, { fingerprint, now, reportId, reference, leaseMs }) {
      const ref = claimRef(uid, key);
      const old = legacyRef(uid, key);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) {
          const stored = snap.data();
          if (stored.uid !== uid || stored.key !== key) return { mode: 'conflict' };
          const d = decideClaim(stored, { fingerprint, now, reportId, reference, leaseMs });
          if (d.claim) tx.set(ref, stripUndefined({ ...d.claim, uid, key }));
          return stripUndefined(withoutClaim(d));
        }
        const legacy = await tx.get(old);
        if (legacy.exists && legacy.data()?.uid === uid) {
          // Legacy records have no reserved report id, so they can only replay, conflict, wait or be reported unresolved.
          const d = decideClaim(legacy.data(), { fingerprint, now, reportId, reference, leaseMs });
          return d.mode === 'run' ? { mode: 'unresolved' } : stripUndefined(withoutClaim(d));
        }
        const d = decideClaim(null, { fingerprint, now, reportId, reference, leaseMs });
        if (d.claim) tx.set(ref, stripUndefined({ ...d.claim, uid, key }));
        return stripUndefined(withoutClaim(d));
      });
    },
    // Writes the report under its reserved id and completes the claim in the same transaction. Callers keep uploads and
    // notifications outside this callback, so a retried transaction can repeat only these writes.
    async commitSubmission(uid, key, { generation, reportId, report, assetIds = [], now = Date.now() }) {
      const ref = claimRef(uid, key);
      const photoRefs = assetIds.map(photoRef);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const stored = snap.exists ? snap.data() : null;
        if (stored && (stored.uid !== uid || stored.key !== key)) return { mode: 'fenced' };
        const d = decideCommit(stored, generation);
        if (d.mode !== 'commit') return d;
        // Ledger rows are read before any write. An abandoned or foreign row refuses the whole commit (no report).
        const rows = photoRefs.length ? (await tx.getAll(...photoRefs)).map((s) => (s.exists ? s.data() : null)) : [];
        if (rows.some((row) => decideAttach(row, { claimId: ref.id, generation, reportId }) !== 'attach')) return { mode: 'assets_unavailable' };
        const at = new Date();
        const result = { id: reportId, status: report.status, reference: report.reference };
        tx.set(col('reports').doc(reportId), stripUndefined({ ...report, createdAt: at, updatedAt: at }));
        tx.set(ref, stripUndefined({ ...stored, state: 'done', result, completedAt: at }));
        tx.set(col('reportEffects').doc(reportId), stripUndefined(reportEffectsJob(reportId, report, at)));
        photoRefs.forEach((r, i) => tx.set(r, stripUndefined({ ...rows[i], state: 'committed', nextAttemptAtMs: null, committedAtMs: now })));
        return { mode: 'commit', result };
      });
    },
    // Photo ledger (server-only collection photoAssets). Ids are reserved in the same claim-guarded way as the report.
    async reservePhotoAssets(uid, key, { generation, reportId, assetIds, now }) {
      const ref = claimRef(uid, key);
      const photoRefs = assetIds.map(photoRef);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const stored = snap.exists ? snap.data() : null;
        if (stored && (stored.uid !== uid || stored.key !== key)) return { mode: 'fenced' };
        const d = decideReserve(stored, { generation, reportId });
        if (d.mode !== 'reserve') return stripUndefined(d);
        const existing = photoRefs.length ? await tx.getAll(...photoRefs) : [];
        if (existing.some((s) => s.exists)) return { mode: 'collision' };
        assetIds.forEach((assetId, i) => tx.set(photoRefs[i], stripUndefined(reservedRow({ assetId, claimId: ref.id, uid, generation, reportId, now }))));
        return { mode: 'reserve' };
      });
    },
    async recordPhotoAccepted(uid, key, { generation, reportId, assetId, sizeBytes, mimeType }) {
      const ref = photoRef(assetId);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const row = snap.exists ? snap.data() : null;
        if (decideAccepted(row, { claimId: claimDocId(uid, key), generation, reportId }) !== 'accept') return false;
        tx.set(ref, stripUndefined({ ...row, state: 'accepted', sizeBytes, mimeType }));
        return true;
      });
    },
    // Rows whose next check is due. Committed and deleted rows carry nextAttemptAtMs null, so the range never returns them.
    async listDuePhotoAssets(now, limit = 10) {
      return docs(await col('photoAssets').where('nextAttemptAtMs', '<=', now).orderBy('nextAttemptAtMs').limit(limit).get());
    },
    // Reconciliation backlog: a count aggregation plus the single oldest row (needs the state + reconcileSinceMs index).
    async summarizePhotoReconciliation(now) {
      const open = col('photoAssets').where('state', '==', 'reconciling');
      const [countSnap, oldestSnap] = await Promise.all([open.count().get(), open.orderBy('reconcileSinceMs').limit(1).get()]);
      const rows = countSnap.data().count;
      const oldest = oldestSnap.docs[0]?.data().reconcileSinceMs;
      return { rows, oldestAgeMs: rows && Number.isFinite(oldest) ? now - oldest : 0 };
    },
    async claimPhotoAssetForCleanup(assetId, { owner, now, leaseMs }) {
      const ref = photoRef(assetId);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const row = snap.exists ? snap.data() : null;
        if (!row || row.nextAttemptAtMs == null || row.nextAttemptAtMs > now) return null;
        if (DESTROYABLE_STATES.includes(row.state)) {
          if (row.leaseUntilMs > now) return null;
          const next = { ...row, owner, leaseUntilMs: now + leaseMs };
          tx.set(ref, stripUndefined(next));
          return next;
        }
        if (!OPEN_STATES.includes(row.state)) return null;
        const claimSnap = await tx.get(col('submissions').doc(row.claimId));
        const plan = planAbandon(row, claimSnap.exists ? claimSnap.data() : null, now);
        if (plan.action === 'abandon') {
          const next = { ...row, state: 'abandoned', abandonedAtMs: now, nextAttemptAtMs: now, owner, leaseUntilMs: now + leaseMs };
          tx.set(ref, stripUndefined(next));
          return next;
        }
        tx.update(ref, { nextAttemptAtMs: plan.action === 'recheck' ? plan.nextAttemptAtMs : null });
        return null;
      });
    },
    async finishPhotoAssetCleanup(assetId, owner, outcome, now) {
      const ref = photoRef(assetId);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const row = snap.exists ? snap.data() : null;
        if (!row || !DESTROYABLE_STATES.includes(row.state) || row.owner !== owner) return false;
        tx.set(ref, stripUndefined({ ...row, ...planDestroyOutcome(row, outcome, now) }));
        return true;
      });
    },
    async releaseSubmission(uid, key, generation) {
      const ref = claimRef(uid, key);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const stored = snap.exists ? snap.data() : null;
        if (stored && (stored.uid !== uid || stored.key !== key)) return false;
        const d = decideRelease(stored, generation);
        if (d.write) tx.set(ref, stripUndefined(d.write));
        return Boolean(d.write);
      });
    },
    async getSubmission(uid, key) {
      const snap = await claimRef(uid, key).get();
      if (!snap.exists) return null;
      const stored = snap.data();
      return stored.uid === uid && stored.key === key ? stored : null;
    },
    async listReportEffects(now, limit = 25) {
      return docs(await col('reportEffects').where('nextAttemptAtMs', '<=', now).limit(limit).get());
    },
    async claimReportEffects(reportId, { owner, now, leaseMs }) {
      const ref = col('reportEffects').doc(reportId);
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().state !== 'pending' || snap.data().nextAttemptAtMs > now) return null;
        tx.update(ref, { owner, nextAttemptAtMs: now + leaseMs });
        return fromFs(snap.data());
      });
    },
    async completeReportEffects(reportId, owner) {
      const ref = col('reportEffects').doc(reportId);
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().state !== 'pending' || snap.data().owner !== owner) return false;
        // Keep completed work for diagnostics, but exclude it from the due-work index.
        const { nextAttemptAtMs, ...done } = snap.data();
        tx.set(ref, { ...done, state: 'done', completedAt: new Date() });
        return true;
      });
    },
    async addUpdate(reportId, update) {
      const ref = col('reports').doc(reportId).collection('updates').doc();
      await ref.set(stripUndefined({ ...update, at: update.at ?? new Date() }));
      return ref.id;
    },
    // One acknowledgement per team. The first team to acknowledge starts the rescue (Team Assigned becomes Rescue in Progress);
    // every assigned team records its own acknowledgement on the report, in the same transaction.
    async acknowledgeReport(reportId, uid, effects) {
      const ref = col('reports').doc(reportId);
      const userRef = col('users').doc(uid);
      return db.runTransaction(async tx => {
        const [report, actor] = await Promise.all([tx.get(ref), tx.get(userRef)]);
        const u = actor.exists ? actor.data() : null;
        if (!report.exists || !u?.active || !['responder', 'admin'].includes(u.role) || !u.team || !isAssignedTo(report.data(), u.team)) return { ok: false, reason: 'not_found' };
        const team = u.team;
        const status = report.data().status;
        if (!['Team Assigned', 'Rescue in Progress'].includes(status)) return { ok: false, reason: 'report_closed' };
        const teamAck = ref.collection('updates').doc('ack-team-' + createHash('sha256').update(team).digest('hex'));
        const acked = (report.data().acknowledgedTeamIds ?? []).includes(team);
        // Acknowledgements recorded per person before this change are still honoured for that person.
        const legacyAck = ref.collection('updates').doc('ack-' + createHash('sha256').update(uid).digest('hex'));
        const [existing, legacyExisting] = await Promise.all([tx.get(teamAck), tx.get(legacyAck)]);
        if (acked || existing.exists || legacyExisting.exists) return { ok: true, duplicate: true, status };
        tx.set(teamAck, { kind: 'acknowledge', byUid: uid, teamId: team, at: new Date() });
        const next = status === 'Team Assigned' ? 'Rescue in Progress' : status;
        tx.update(ref, { status: next, updatedAt: new Date(), acknowledgedTeamIds: FieldValue.arrayUnion(team) });
        writeEffects(tx, effects ? { ...effects, audits: effects.audits.map(a => ({ ...a, after: { ...a.after, status: next, teamId: team } })) } : null);
        return { ok: true, duplicate: false, status: next };
      });
    },
    async listUpdates(reportId) {
      return collectPaged(col('reports').doc(reportId).collection('updates').orderBy('at', 'asc'));
    },
    async getReportUpdate(reportId, updateId) {
      const snap = await col('reports').doc(reportId).collection('updates').doc(updateId).get();
      return snap.exists ? snap.data() : null;
    },
    async sumPeopleRescued(reportId) {
      const snap = await col('reports').doc(reportId).collection('updates').aggregate({total: AggregateField.sum('peopleRescued')}).get();
      return snap.data().total ?? 0;
    },

    async getLoginAttempt(key) {
      const snap = await col('loginAttempts').doc(key).get();
      return snap.exists ? snap.data() : null;
    },
    // Reads and writes the record in one transaction, so concurrent failures never lose a count.
    async mutateLoginAttempt(key, mutate) {
      const ref = col('loginAttempts').doc(key);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const next = mutate(snap.exists ? snap.data() : null);
        if (next === null) tx.delete(ref);
        else tx.set(ref, next);
        return next;
      });
    },
    // Password help requests from the sign-in pages. One record per email, keyed by a hash of it.
    // Read and write in one transaction: an open or recently closed request is never overwritten.
    async mutatePasswordHelp(key, mutate) {
      const ref = col('passwordHelp').doc(key);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? snap.data() : null;
        const next = mutate(current);
        if (JSON.stringify(next) !== JSON.stringify(current)) tx.set(ref, next);
        return next;
      });
    },
    async listPasswordHelp() {
      const snap = await col('passwordHelp').where('status', '==', 'open').get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async closePasswordHelp(key, closedBy, at) { await col('passwordHelp').doc(key).update({ status: 'closed', closedBy, closedAt: at }); },
    async getUser(uid) { return userDoc(await col('users').doc(uid).get()); },
    async createUser(uid, data) {
      const { uid: _u, id: _i, ...rest } = data;
      await col('users').doc(uid).set(stripUndefined({ ...rest, createdAt: data.createdAt ?? new Date() }));
    },
    async completeUserProvisioning(uid, provisioningId, effects) {
      const ref = col('users').doc(uid);
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().provisioningId !== provisioningId || snap.data().active !== false) return false;
        tx.update(ref, { active: true, provisioningId: null, provisioningCompletedId: provisioningId });
        writeEffects(tx, effects);
        return true;
      });
    },
    async discardUserProvisioning(uid, provisioningId) {
      const ref = col('users').doc(uid);
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().provisioningId !== provisioningId || snap.data().active !== false) return false;
        tx.delete(ref);
        return true;
      });
    },
    async updateUser(uid, patch) { await col('users').doc(uid).update(stripUndefined(patch)); },
    async listUsers() { return (await col('users').get()).docs.map(userDoc); },
    // Serialized through a transaction: the admin set is read in the same transaction as the write,
    // so two concurrent demotions of different admins cannot both see the other as still active.
    // The guard runs inside the transaction on the target and the other active admins it reads, so the
    // decision and the write see the same state. Two concurrent demotions of different admins conflict and retry.
    async setStaffGuarded(uid, patch, guard, effects) {
      const ref = col('users').doc(uid);
      const admins = col('users').where('role', '==', 'admin');
      return db.runTransaction(async (tx) => {
        const target = await tx.get(ref);
        const others = (await tx.get(admins)).docs
          .filter((d) => d.id !== uid && d.data().active === true)
          .map((d) => d.data());
        const reason = guard(target.exists ? target.data() : null, others);
        if (reason) return { ok: false, reason };
        tx.update(ref, stripUndefined(patch));
        writeEffects(tx, effects);
        return { ok: true };
      });
    },

    async getTeam(id) { return doc(await col('teams').doc(id).get()); },
    async listTeams() { return docs(await col('teams').get()); },
    async saveTeam(id, data, effects) {
      const ref = id ? col('teams').doc(id) : col('teams').doc();
      const batch = db.batch();
      batch.set(ref, stripUndefined(data), { merge: true });
      writeEffects(batch, effects);
      await batch.commit();
      return ref.id;
    },

    async addNotification(n, eventId) {
      const ref = eventId ? col('notifications').doc(eventId) : col('notifications').doc();
      if (eventId) {
        await db.runTransaction(async tx => {
          const snap = await tx.get(ref);
          if (!snap.exists) tx.set(ref, stripUndefined({ read: false, ...n, createdAt: n.createdAt ?? new Date() }));
        });
        return ref.id;
      }
      await ref.set(stripUndefined({ read: false, ...n, createdAt: n.createdAt ?? new Date() }));
      return ref.id;
    },
    async listNotifications(uid) {
      return collectPaged(col('notifications').where('recipientUid', '==', uid).orderBy('createdAt', 'desc'));
    },
    async markRead(id, uid) {
      const ref = col('notifications').doc(id);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().recipientUid !== uid) return false;
        tx.update(ref, { read: true });
        return true;
      });
    },

    // Devices stored as devices/{token} = {uid, createdAt}; token is the doc id.
    async getDeviceOwner(token) { const d = await col('devices').doc(token).get(); return d.exists ? d.data().uid : null; },
    async claimDevice(uid, token) {
      const ref = col('devices').doc(token);
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (snap.exists && snap.data().uid !== uid) return false;
        tx.set(ref, { uid, createdAt: snap.exists ? snap.data().createdAt : new Date() });
        return true;
      });
    },
    async removeDeviceOwned(uid, token) {
      const ref = col('devices').doc(token);
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().uid !== uid) return false;
        tx.delete(ref);
        return true;
      });
    },
    async addDevice(uid, token) { await col('devices').doc(token).set({ uid, createdAt: new Date() }); },
    async listDevices(uid) {
      return (await col('devices').where('uid', '==', uid).get()).docs.map((d) => d.id);
    },
    async removeDevice(token) { await col('devices').doc(token).delete(); },

    async addAudit(entry, eventId) {
      const ref = eventId ? col('auditLogs').doc(eventId) : col('auditLogs').doc();
      if (eventId) {
        await db.runTransaction(async tx => {
          const snap = await tx.get(ref);
          if (!snap.exists) tx.set(ref, stripUndefined(entry));
        });
        return ref.id;
      }
      await ref.set(stripUndefined({ ...entry, at: entry.at ?? new Date() }));
      return ref.id;
    },
    async listAudit(f = {}) {
      let q = col('auditLogs');
      const { key, matches } = pickEquality(f, ['reportId', 'actorUid', 'action']);
      if (key) q = q.where(key, '==', f[key]);
      if (f.from) q = q.where('at', '>=', f.from);
      if (f.to) q = q.where('at', '<=', f.to);
      return (await collectPaged(q.orderBy('at', 'desc'))).filter(matches);
    },

    async getHotlines() {
      const snap = await col('config').doc('hotlines').get();
      return snap.exists ? fromFs(snap.data()) : { numbers: [] };
    },

    async saveSettingsWithAudit(doc, entry) {
      const batch = db.batch();
      batch.set(col('config').doc('hotlines'), stripUndefined(doc));
      batch.set(col('auditLogs').doc(), stripUndefined(entry));
      await batch.commit();
    },
    async saveHotlines(doc) {
      await col('config').doc('hotlines').set(doc);
    },

    async *recipientPages({role,teamId} = {}) {
      let cursor;
      for (;;) {
        let q = col('users').where('active', '==', true);
        if (teamId) q = q.where('team', '==', teamId);
        else if (role) q = role === 'dispatcher' ? q.where('role', 'in', ['dispatcher', 'admin']) : q.where('role', '==', role);
        q = q.orderBy('__name__').limit(200);
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.get();
        if (snap.empty) return;
        yield snap.docs.map(d => d.id);
        if (snap.docs.length < 200) return;
        cursor = snap.docs.at(-1);
      }
    },
    async listMutationEffects(now, limit = 25) { return docs(await col('mutationEffects').where('nextAttemptAtMs', '<=', now).limit(limit).get()).filter(j => j.state === 'pending'); },
    async claimMutationEffects(id, {owner,now,leaseMs}) {
      const ref = col('mutationEffects').doc(id);
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().state !== 'pending' || snap.data().nextAttemptAtMs > now) return null;
        tx.update(ref, { owner, nextAttemptAtMs: now + leaseMs });
        return { id, ...fromFs(snap.data()) };
      });
    },
    async completeMutationEffects(id, owner) {
      const ref = col('mutationEffects').doc(id);
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().state !== 'pending' || snap.data().owner !== owner) return false;
        const { nextAttemptAtMs, ...job } = snap.data();
        tx.set(ref, { ...job, state: 'done', completedAt: new Date() });
        return true;
      });
    },
    async getDemoConfig() {
      const snap = await col('config').doc('demo').get();
      return snap.exists ? fromFs(snap.data()) : null;
    },
  };
}
