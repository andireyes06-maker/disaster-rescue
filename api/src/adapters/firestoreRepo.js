// Firestore implementation of the repo port (see src/ports/repo.js).
import { isOpen } from '../domain/workflow.js';

// Not unit-testable without the emulator; covered by the manual walkthrough.

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

  async function listReports(f = {}) {
    let q = col('reports');
    const { key, matches } = pickEquality(f, ['reporterId', 'assignedTeamId', 'status', 'type']);
    if (key) q = q.where(key, '==', f[key]);
    if (f.from) q = q.where('createdAt', '>=', f.from);
    if (f.to) q = q.where('createdAt', '<=', f.to);
    return docs(await q.orderBy('createdAt', 'desc').get()).filter(matches);
  }

  return {
    async getReport(id) { return doc(await col('reports').doc(id).get()); },
    listReports,
    async listOpenReports() {
      const all = docs(await col('reports').orderBy('createdAt', 'desc').get());
      return all.filter((r) => isOpen(r.status));
    },
    async createReport(data) {
      const now = new Date();
      const ref = col('reports').doc();
      await ref.set(stripUndefined({ ...data, createdAt: now, updatedAt: now }));
      return ref.id;
    },
    async updateReportIf(id, expectedStatus, patch) {
      const ref = col('reports').doc(id);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().status !== expectedStatus) return false;
        tx.update(ref, stripUndefined({ ...patch, updatedAt: new Date() }));
        return true;
      });
    },
    async addUpdate(reportId, update) {
      const ref = col('reports').doc(reportId).collection('updates').doc();
      await ref.set(stripUndefined({ ...update, at: update.at ?? new Date() }));
      return ref.id;
    },
    async listUpdates(reportId) {
      return docs(await col('reports').doc(reportId).collection('updates').orderBy('at', 'asc').get());
    },

    async getUser(uid) { return userDoc(await col('users').doc(uid).get()); },
    async createUser(uid, data) {
      const { uid: _u, id: _i, ...rest } = data;
      await col('users').doc(uid).set(stripUndefined({ ...rest, createdAt: data.createdAt ?? new Date() }));
    },
    async updateUser(uid, patch) { await col('users').doc(uid).update(stripUndefined(patch)); },
    async listUsers() { return (await col('users').get()).docs.map(userDoc); },

    async getTeam(id) { return doc(await col('teams').doc(id).get()); },
    async listTeams() { return docs(await col('teams').get()); },
    async saveTeam(id, data) {
      const ref = id ? col('teams').doc(id) : col('teams').doc();
      await ref.set(stripUndefined(data), { merge: true });
      return ref.id;
    },

    async addNotification(n) {
      const ref = col('notifications').doc();
      await ref.set(stripUndefined({ read: false, ...n, createdAt: n.createdAt ?? new Date() }));
      return ref.id;
    },
    async listNotifications(uid) {
      return docs(await col('notifications').where('recipientUid', '==', uid).orderBy('createdAt', 'desc').get());
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
    async addDevice(uid, token) { await col('devices').doc(token).set({ uid, createdAt: new Date() }); },
    async listDevices(uid) {
      return (await col('devices').where('uid', '==', uid).get()).docs.map((d) => d.id);
    },
    async removeDevice(token) { await col('devices').doc(token).delete(); },

    async addAudit(entry) {
      const ref = col('auditLogs').doc();
      await ref.set(stripUndefined({ ...entry, at: entry.at ?? new Date() }));
      return ref.id;
    },
    async listAudit(f = {}) {
      let q = col('auditLogs');
      const { key, matches } = pickEquality(f, ['reportId', 'actorUid', 'action']);
      if (key) q = q.where(key, '==', f[key]);
      if (f.from) q = q.where('at', '>=', f.from);
      if (f.to) q = q.where('at', '<=', f.to);
      return docs(await q.orderBy('at', 'desc').get()).filter(matches);
    },

    async getHotlines() {
      const snap = await col('config').doc('hotlines').get();
      return snap.exists ? fromFs(snap.data()) : { numbers: [] };
    },

    async saveHotlines(doc) {
      await col('config').doc('hotlines').set(doc);
    },
  };
}
