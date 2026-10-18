import { isOpen } from '../../src/domain/workflow.js';

const copy = (v) => structuredClone(v);
const byCreatedDesc = (a, b) => b.createdAt - a.createdAt || (b._seq - a._seq);
const strip = ({ _seq, ...rest }) => rest;

export function createMemoryRepo({ hotlines = { numbers: [] }, demo = null } = {}) {
  let seq = 0;
  const nextId = (p) => `${p}${++seq}`;
  const reports = new Map();
  const updates = new Map();
  const users = new Map();
  const teams = new Map();
  const submissions = new Map();
  const notifications = new Map();
  const devices = new Map(); // token -> uid
  const audits = [];

  const out = (r) => copy(strip(r));
  const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

  return {
    async getReport(id) {
      const r = reports.get(id);
      return r ? out(r) : null;
    },
    async listReports(f = {}) {
      return [...reports.values()]
        .filter((r) => (f.reporterId === undefined || r.reporterId === f.reporterId)
          && (f.assignedTeamId === undefined || r.assignedTeamId === f.assignedTeamId)
          && (f.status === undefined || r.status === f.status)
          && (f.type === undefined || r.type === f.type)
          && inRange(r.createdAt, f.from, f.to))
        .sort(byCreatedDesc).map(out);
    },
    async listOpenReports() {
      return [...reports.values()].filter((r) => isOpen(r.status)).sort(byCreatedDesc).map(out);
    },
    async createReport(data) {
      const id = nextId('r');
      const now = new Date();
      reports.set(id, { ...copy(data), id, createdAt: now, updatedAt: now, _seq: seq });
      return id;
    },
    // Atomic: check and write happen in one synchronous step, no await between.
    async updateReportIf(id, expectedStatus, patch) {
      const r = reports.get(id);
      if (!r || r.status !== expectedStatus) return false;
      reports.set(id, { ...r, ...copy(patch), id, updatedAt: new Date() });
      return true;
    },
    // Atomic: every check and write happens in one synchronous step, as in the transaction.
    async applyReportChange(reportId, expectedStatus, change) {
      const r = reports.get(reportId);
      if (!r) return { ok: false, reason: 'not_found' };
      if (r.status !== expectedStatus) return { ok: false, reason: 'conflict' };
      const team = change.team ? teams.get(change.team.id) : null;
      if (change.team?.claim) {
        if (!team) return { ok: false, reason: 'team_missing' };
        if (team.busy === true && team.currentReportId && team.currentReportId !== reportId) return { ok: false, reason: 'team_busy' };
      }
      reports.set(reportId, { ...r, ...copy(change.reportPatch), id: reportId, updatedAt: new Date() });
      if (change.team?.claim) teams.set(change.team.id, { ...team, busy: true, currentReportId: reportId });
      if (change.team?.release && team && team.currentReportId === reportId) {
        teams.set(change.team.id, { ...team, busy: false, currentReportId: null });
      }
      if (change.updateDoc) {
        if (!updates.has(reportId)) updates.set(reportId, []);
        updates.get(reportId).push({ ...copy(change.updateDoc), id: nextId('u') });
      }
      return { ok: true };
    },
    async claimSubmission(uid, key, { staleAfterMs }) {
      const k = `${uid}__${key}`;
      const now = Date.now();
      const d = submissions.get(k);
      if (d?.state === 'done') return { state: 'done', result: copy(d.result) };
      if (d?.state === 'pending' && now - d.startedAtMs < staleAfterMs) return { state: 'pending' };
      submissions.set(k, { state: 'pending', startedAtMs: now });
      return { state: 'new' };
    },
    async completeSubmission(uid, key, result) {
      submissions.set(`${uid}__${key}`, { state: 'done', result: copy(result) });
    },
    async addUpdate(reportId, update) {
      const id = nextId('u');
      if (!updates.has(reportId)) updates.set(reportId, []);
      updates.get(reportId).push({ ...copy(update), id });
      return id;
    },
    async listUpdates(reportId) { return copy(updates.get(reportId) ?? []); },

    async getUser(uid) { const u = users.get(uid); return u ? copy(u) : null; },
    async createUser(uid, data) { users.set(uid, { ...copy(data), uid, createdAt: data.createdAt ?? new Date() }); },
    async updateUser(uid, patch) {
      if (!users.has(uid)) throw new Error(`user not found: ${uid}`);
      users.set(uid, { ...users.get(uid), ...copy(patch) });
    },
    async listUsers() { return copy([...users.values()]); },
    // Atomic: the admin check and the write happen in one synchronous step, as in the transaction.
    // Same contract as the transaction: the guard sees the stored target and other active admins, then the write.
    async setStaffGuarded(uid, patch, guard) {
      const target = users.get(uid) ?? null;
      const others = [...users.values()].filter((u) => u.uid !== uid && u.role === 'admin' && u.active === true);
      const reason = guard(target ? copy(target) : null, copy(others));
      if (reason) return { ok: false, reason };
      users.set(uid, { ...target, ...copy(patch) });
      return { ok: true };
    },

    async getTeam(id) { const t = teams.get(id); return t ? copy(t) : null; },
    async listTeams() { return copy([...teams.values()]); },
    async saveTeam(id, data) {
      const tid = id ?? nextId('t');
      teams.set(tid, { ...(teams.get(tid) ?? {}), ...copy(data), id: tid });
      return tid;
    },

    async addNotification(n) {
      const id = nextId('n');
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
    async addDevice(uid, token) { devices.set(token, uid); },
    async listDevices(uid) { return [...devices].filter(([, u]) => u === uid).map(([t]) => t); },
    async removeDevice(token) { devices.delete(token); },

    async addAudit(entry) {
      const id = nextId('a');
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
    async saveHotlines(doc) { hotlines = copy(doc); },
    async getDemoConfig() { return demo ? copy(demo) : null; },

    // Test helper: backdate a report.
    _setCreatedAt(id, date) { reports.get(id).createdAt = date; },
  };
}
