import { reportEffectsJob } from '../../src/domain/reportEffects.js';
import { isOpen } from '../../src/domain/workflow.js';
import { isAssignedTo } from '../../src/domain/assignedTeams.js';
import { decideClaim, decideCommit, decideRelease } from '../../src/domain/submission.js';
import {
  decideReserve, decideAttach, decideAccepted, planAbandon, planDestroyOutcome, reservedRow, OPEN_STATES, DESTROYABLE_STATES,
} from '../../src/domain/photoLedger.js';

const copy = (v) => structuredClone(v);
const byCreatedDesc = (a, b) => b.createdAt - a.createdAt || (b._seq - a._seq);
const strip = ({ _seq, ...rest }) => rest;
const withoutClaim = ({ claim, ...rest }) => rest;
// Same unambiguous address rule as the Firestore adapter: the canonical JSON pair.
const sub = (uid, key) => JSON.stringify([uid, key]);

export function createMemoryRepo({ hotlines = { numbers: [] }, demo = null } = {}) {
  let seq = 0;
  const nextId = (p) => `${p}${++seq}`;
  const reports = new Map();
  const updates = new Map();
  const users = new Map();
  const loginAttempts = new Map();
  const passwordHelp = new Map();
  const teams = new Map();
  const submissions = new Map();
  const notifications = new Map();
  const mutationJobs = new Map();
  const writeEffects = effects => { if (effects) mutationJobs.set(effects.id, copy(effects)); };
  const devices = new Map(); // token -> uid
  const audits = [];
  const effects = new Map();
  const photoAssets = new Map(); // assetId -> ledger row (ids and states only)

  const out = (r) => copy(strip(r));
  const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

  return {
    async listReportEffects(now, limit = 25) {
      return [...effects.values()].filter(j => j.state === 'pending' && j.nextAttemptAtMs <= now).slice(0, limit).map(copy);
    },
    async claimReportEffects(id, { owner, now, leaseMs }) {
      const job = effects.get(id);
      if (!job || job.state !== 'pending' || job.nextAttemptAtMs > now) return null;
      const before = copy(job);
      effects.set(id, { ...job, owner, nextAttemptAtMs: now + leaseMs });
      return before;
    },
    async completeReportEffects(id, owner) {
      const job = effects.get(id);
      if (!job || job.state !== 'pending' || job.owner !== owner) return false;
      effects.set(id, { ...job, state: 'done' });
      return true;
    },
    async getReport(id) {
      const r = reports.get(id);
      return r ? out(r) : null;
    },
    async listReports(f = {}) {
      return [...reports.values()]
        .filter((r) => (f.reporterId === undefined || r.reporterId === f.reporterId)
          && (f.assignedTeamId === undefined || isAssignedTo(r, f.assignedTeamId))
          && (f.status === undefined || r.status === f.status)
          && (f.type === undefined || r.type === f.type)
          && inRange(r.createdAt, f.from, f.to))
        .sort(byCreatedDesc).map(out);
    },
    async listRecentReports(limit) {
      return [...reports.values()].sort(byCreatedDesc).slice(0, limit).map(out);
    },
    async listOpenReports() {
      return [...reports.values()].filter((r) => isOpen(r.status)).sort(byCreatedDesc).map(out);
    },
    async createReport(data) {
      const id = nextId('r');
      const now = new Date();
      reports.set(id, { ...copy(data), id, createdAt: now, updatedAt: now, _seq: seq });
      effects.set(id, reportEffectsJob(id, data, now));
      return id;
    },
    // Atomic: check and write happen in one synchronous step, no await between.
    async updateReportIf(id, expectedStatus, patch, effects) {
      const r = reports.get(id);
      if (!r || r.status !== expectedStatus) return false;
      reports.set(id, { ...r, ...copy(patch), id, updatedAt: new Date() });
      writeEffects(effects);
      return true;
    },
    // Atomic: every check and write happens in one synchronous step, as in the transaction.
    async applyReportChange(reportId, expectedStatus, change) {
      // Same rule as the transaction: a keyed update that already exists is returned, not written again.
      const prior = change.updateId ? (updates.get(reportId) ?? []).find((u) => u.id === change.updateId) : undefined;
      if (prior) return { ok: true, duplicate: true, update: copy(prior) };
      const r = reports.get(reportId);
      if (!r) return { ok: false, reason: 'not_found' };
      if (r.status !== expectedStatus) return { ok: false, reason: 'conflict' };
      if (change.responderUid) {
        const actor = users.get(change.responderUid);
        if (!actor?.active || !['responder', 'admin'].includes(actor.role) || !actor.team || !isAssignedTo(r, actor.team)) return { ok: false, reason: 'not_found' };
      }
      const teamList = change.teams ?? [];
      const docs = teamList.map((t) => (teams.get(t.id) ? { ...teams.get(t.id) } : null));
      for (let i = 0; i < teamList.length; i++) {
        if (!teamList[i].claim) continue;
        if (!docs[i]) return { ok: false, reason: 'team_missing' };
        if (docs[i].busy === true && docs[i].currentReportId && docs[i].currentReportId !== reportId) return { ok: false, reason: 'team_busy' };
      }
      reports.set(reportId, { ...r, ...copy(change.reportPatch), id: reportId, updatedAt: new Date() });
      teamList.forEach((t, i) => {
        if (t.claim) teams.set(t.id, { ...docs[i], busy: true, currentReportId: reportId });
        if (t.release && docs[i] && docs[i].currentReportId === reportId) teams.set(t.id, { ...docs[i], busy: false, currentReportId: null });
      });
      if (change.updateDoc) {
        if (!updates.has(reportId)) updates.set(reportId, []);
        updates.get(reportId).push({ ...copy(change.updateDoc), id: change.updateId ?? nextId('u') });
      }
      writeEffects(change.effects);
      return { ok: true };
    },
    // Each submission method is one synchronous step: the decision and its write cannot interleave (as in the transaction).
    async claimSubmission(uid, key, { fingerprint, now, reportId, reference, leaseMs }) {
      const k = sub(uid, key);
      const d = decideClaim(submissions.get(k) ?? null, { fingerprint, now, reportId, reference, leaseMs });
      if (d.claim) submissions.set(k, copy(d.claim));
      return copy(withoutClaim(d));
    },
    async commitSubmission(uid, key, { generation, reportId, report, assetIds = [], now = Date.now() }) {
      const k = sub(uid, key);
      const stored = submissions.get(k) ?? null;
      const d = decideCommit(stored, generation);
      if (d.mode !== 'commit') return copy(d);
      // Every asset must still be open and reserved by this generation for this report, decided before any write.
      const owner = { claimId: k, generation, reportId };
      if (assetIds.some((id) => decideAttach(photoAssets.get(id) ?? null, owner) !== 'attach')) return { mode: 'assets_unavailable' };
      const at = new Date();
      reports.set(reportId, { ...copy(report), id: reportId, createdAt: at, updatedAt: at, _seq: ++seq });
      for (const id of assetIds) photoAssets.set(id, { ...photoAssets.get(id), state: 'committed', nextAttemptAtMs: null, committedAtMs: now });
      const result = { id: reportId, status: report.status, reference: report.reference };
      submissions.set(k, { ...copy(stored), state: 'done', result: copy(result), completedAt: at });
      effects.set(reportId, reportEffectsJob(reportId, report, at));
      return { mode: 'commit', result: copy(result) };
    },
    // Photo ledger. Each call is one synchronous step, as its transaction is in the Firestore adapter.
    async reservePhotoAssets(uid, key, { generation, reportId, assetIds, now }) {
      const k = sub(uid, key);
      const d = decideReserve(submissions.get(k) ?? null, { generation, reportId });
      if (d.mode !== 'reserve') return copy(d);
      if (assetIds.some((id) => photoAssets.has(id))) return { mode: 'collision' };
      for (const assetId of assetIds) photoAssets.set(assetId, reservedRow({ assetId, claimId: k, uid, generation, reportId, now }));
      return { mode: 'reserve' };
    },
    async recordPhotoAccepted(uid, key, { generation, reportId, assetId, sizeBytes, mimeType }) {
      const row = photoAssets.get(assetId) ?? null;
      if (decideAccepted(row, { claimId: sub(uid, key), generation, reportId }) !== 'accept') return false;
      photoAssets.set(assetId, { ...row, state: 'accepted', sizeBytes, mimeType });
      return true;
    },
    async listDuePhotoAssets(now, limit = 10) {
      return [...photoAssets.values()]
        .filter((r) => r.nextAttemptAtMs != null && r.nextAttemptAtMs <= now)
        .sort((a, b) => a.nextAttemptAtMs - b.nextAttemptAtMs)
        .slice(0, limit).map(copy);
    },
    async claimPhotoAssetForCleanup(assetId, { owner, now, leaseMs }) {
      const row = photoAssets.get(assetId) ?? null;
      if (!row || row.nextAttemptAtMs == null || row.nextAttemptAtMs > now) return null;
      if (DESTROYABLE_STATES.includes(row.state)) {
        if (row.leaseUntilMs > now) return null;
        const next = { ...row, owner, leaseUntilMs: now + leaseMs };
        photoAssets.set(assetId, next);
        return copy(next);
      }
      if (!OPEN_STATES.includes(row.state)) return null;
      const plan = planAbandon(row, submissions.get(row.claimId) ?? null, now);
      if (plan.action === 'abandon') {
        const next = { ...row, state: 'abandoned', abandonedAtMs: now, nextAttemptAtMs: now, owner, leaseUntilMs: now + leaseMs };
        photoAssets.set(assetId, next);
        return copy(next);
      }
      photoAssets.set(assetId, { ...row, nextAttemptAtMs: plan.action === 'recheck' ? plan.nextAttemptAtMs : null });
      return null;
    },
    async finishPhotoAssetCleanup(assetId, owner, outcome, now) {
      const row = photoAssets.get(assetId) ?? null;
      if (!row || !DESTROYABLE_STATES.includes(row.state) || row.owner !== owner) return false;
      photoAssets.set(assetId, { ...row, ...planDestroyOutcome(row, outcome, now) });
      return true;
    },
    // Test-only accessor: every ledger row, for asserting what the ledger holds.
    listPhotoAssets() { return copy([...photoAssets.values()]); },
    // Reconciliation backlog: how many rows are unconfirmed, and how long the oldest has been waiting. Counts only.
    async summarizePhotoReconciliation(now) {
      const rows = [...photoAssets.values()].filter((r) => r.state === 'reconciling');
      const oldest = rows.reduce((min, r) => Math.min(min, r.reconcileSinceMs ?? now), Infinity);
      return { rows: rows.length, oldestAgeMs: rows.length ? now - oldest : 0 };
    },
    async releaseSubmission(uid, key, generation) {
      const k = sub(uid, key);
      const d = decideRelease(submissions.get(k) ?? null, generation);
      if (d.write) submissions.set(k, copy(d.write));
      return Boolean(d.write);
    },
    async getSubmission(uid, key) {
      const d = submissions.get(sub(uid, key));
      return d ? copy(d) : null;
    },
    // Test-only: writes a claim in an earlier format (for example a legacy claim with no reserved report id).
    seedSubmission(uid, key, doc) {
      submissions.set(sub(uid, key), copy(doc));
    },
    async addUpdate(reportId, update) {
      const id = nextId('u');
      if (!updates.has(reportId)) updates.set(reportId, []);
      updates.get(reportId).push({ ...copy(update), id });
      return id;
    },
    // One acknowledgement per team, as in the database transaction.
    async acknowledgeReport(reportId, uid, effects) {
      const r = reports.get(reportId), actor = users.get(uid);
      if (!r || !actor?.active || !['responder', 'admin'].includes(actor.role) || !actor.team || !isAssignedTo(r, actor.team)) return { ok: false, reason: 'not_found' };
      if (!['Team Assigned', 'Rescue in Progress'].includes(r.status)) return { ok: false, reason: 'report_closed' };
      const team = actor.team;
      const acked = r.acknowledgedTeamIds ?? [];
      if (acked.includes(team)) return { ok: true, duplicate: true, status: r.status };
      const rows = updates.get(reportId) ?? [];
      rows.push({ kind: 'acknowledge', byUid: uid, teamId: team, at: new Date(), id: nextId('u') });
      updates.set(reportId, rows);
      const next = r.status === 'Team Assigned' ? 'Rescue in Progress' : r.status;
      reports.set(reportId, { ...r, status: next, updatedAt: new Date(), acknowledgedTeamIds: [...acked, team] });
      writeEffects(effects ? { ...effects, audits: effects.audits.map(a => ({ ...a, after: { ...a.after, status: next, teamId: team } })) } : null);
      return { ok: true, duplicate: false, status: next };
    },
    async listUpdates(reportId) { return copy(updates.get(reportId) ?? []); },
    async getReportUpdate(reportId, updateId) {
      const row = (updates.get(reportId) ?? []).find((u) => u.id === updateId);
      return row ? copy(row) : null;
    },

    async getLoginAttempt(key) { const a = loginAttempts.get(key); return a ? copy(a) : null; },
    // Synchronous read-modify-write, the same contract as the Firestore transaction.
    async mutateLoginAttempt(key, mutate) {
      const next = mutate(loginAttempts.has(key) ? copy(loginAttempts.get(key)) : null);
      if (next === null) loginAttempts.delete(key);
      else loginAttempts.set(key, copy(next));
      return next;
    },
    async mutatePasswordHelp(key, mutate) {
      const current = passwordHelp.has(key) ? copy(passwordHelp.get(key)) : null;
      const next = mutate(current);
      if (JSON.stringify(next) !== JSON.stringify(current)) passwordHelp.set(key, copy(next));
      return next;
    },
    async listPasswordHelp() { return [...passwordHelp].filter(([, v]) => v.status === 'open').map(([id, v]) => ({ id, ...copy(v) })); },
    async closePasswordHelp(key, closedBy, at) {
      const v = passwordHelp.get(key);
      if (!v) return 'missing';
      if (v.status === 'closed') return 'already';
      passwordHelp.set(key, { ...v, status: 'closed', closedBy, closedAt: at });
      return 'closed';
    },
    async getUser(uid) { const u = users.get(uid); return u ? copy(u) : null; },
    async createUser(uid, data) { users.set(uid, { ...copy(data), uid, createdAt: data.createdAt ?? new Date() }); },
    async completeUserProvisioning(uid, provisioningId, effects) {
      const u = users.get(uid);
      if (!u || u.provisioningId !== provisioningId || u.active !== false) return false;
      users.set(uid, { ...u, active: true, provisioningId: null, provisioningCompletedId: provisioningId });
      writeEffects(effects);
      return true;
    },
    async discardUserProvisioning(uid, provisioningId) {
      const u = users.get(uid);
      if (!u || u.provisioningId !== provisioningId || u.active !== false) return false;
      users.delete(uid);
      return true;
    },
    async updateUser(uid, patch) {
      if (!users.has(uid)) throw new Error(`user not found: ${uid}`);
      users.set(uid, { ...users.get(uid), ...copy(patch) });
    },
    async listUsers() { return copy([...users.values()]); },
    // Atomic: the admin check and the write happen in one synchronous step, as in the transaction.
    // Same contract as the transaction: the guard sees the stored target and other active admins, then the write.
    async setStaffGuarded(uid, patch, guard, effects) {
      const target = users.get(uid) ?? null;
      const others = [...users.values()].filter((u) => u.uid !== uid && u.role === 'admin' && u.active === true);
      const reason = guard(target ? copy(target) : null, copy(others));
      if (reason) return { ok: false, reason };
      users.set(uid, { ...target, ...copy(patch) });
      writeEffects(effects);
      return { ok: true };
    },

    async getTeam(id) { const t = teams.get(id); return t ? copy(t) : null; },
    async listTeams() { return copy([...teams.values()]); },
    async saveTeam(id, data, effects) {
      const tid = id ?? nextId('t');
      teams.set(tid, { ...(teams.get(tid) ?? {}), ...copy(data), id: tid });
      writeEffects(effects);
      return tid;
    },

    async addNotification(n, eventId) {
      const id = eventId ?? nextId('n');
      if (notifications.has(id)) return id;
      notifications.set(id, { read: false, ...copy(n), id, createdAt: n.createdAt ?? new Date(), _seq: seq });
      return id;
    },
    async listNotifications(uid) {
      return [...notifications.values()].filter((n) => n.recipientUid === uid).sort(byCreatedDesc).map(out);
    },
    async markRead(id, uid) {
      const n = notifications.get(id);
      if (!n || n.recipientUid !== uid) return false;
      n.read = true;
      return true;
    },

    async getDeviceOwner(token) { return devices.get(token) ?? null; },
    async claimDevice(uid, token) {
      // The phone belongs to whoever is signed in on it now: a takeover moves the token to this account.
      devices.set(token, uid); return true;
    },
    async removeDeviceOwned(uid, token) {
      if (devices.get(token) !== uid) return false;
      devices.delete(token); return true;
    },
    async addDevice(uid, token) { devices.set(token, uid); },
    async listDevices(uid) { return [...devices].filter(([, u]) => u === uid).map(([t]) => t); },
    async removeDevice(token) { devices.delete(token); },

    async addAudit(entry, eventId) {
      const id = eventId ?? nextId('a');
      if (audits.some(a => a.id === id)) return id;
      audits.push({ ...copy(entry), id, at: entry.at ?? new Date() });
      return id;
    },
    async listAudit(f = {}) {
      return copy(audits.filter((a) => (f.actorUid === undefined || a.actorUid === f.actorUid)
        && (f.reportId === undefined || a.reportId === f.reportId)
        && (f.action === undefined || a.action === f.action)
        && inRange(a.at, f.from, f.to)).sort((x, y) => y.at - x.at));
    },

    async getHotlines() { return copy(hotlines); },
    async saveSettingsWithAudit(doc, entry) {
      await this.addAudit(entry);
      hotlines = copy(doc);
    },
    async saveHotlines(doc) { hotlines = copy(doc); },
    async *recipientPages({role,teamId} = {}) {
      const rows = [...users.values()].filter(u => u.active === true && (teamId ? u.team === teamId : !role || u.role === role || (role === 'dispatcher' && u.role === 'admin')));
      for (let i = 0; i < rows.length; i += 200) yield rows.slice(i, i + 200).map(u => u.uid);
    },
    async listMutationEffects(now, limit = 25) { return [...mutationJobs.values()].filter(j => j.state === 'pending' && j.nextAttemptAtMs <= now).slice(0, limit).map(copy); },
    async claimMutationEffects(id, {owner,now,leaseMs}) {
      const job = mutationJobs.get(id);
      if (!job || job.state !== 'pending' || job.nextAttemptAtMs > now) return null;
      const before = copy(job); mutationJobs.set(id, { ...job, owner, nextAttemptAtMs: now + leaseMs }); return before;
    },
    async completeMutationEffects(id, owner) {
      const job = mutationJobs.get(id); if (!job || job.state !== 'pending' || job.owner !== owner) return false;
      const { nextAttemptAtMs, ...rest } = job; mutationJobs.set(id, { ...rest, state: 'done' }); return true;
    },
    async getDemoConfig() { return demo ? copy(demo) : null; },

    // Test helper: backdate a report.
    _setCreatedAt(id, date) { reports.get(id).createdAt = date; },
  };
}
