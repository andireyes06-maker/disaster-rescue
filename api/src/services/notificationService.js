import { notificationEventId } from '../domain/reportEffects.js';
// In-app notifications first, then FCM push. Normal callers keep best-effort behavior.
// Durable creation jobs opt into strict errors so the worker can retry without failing report receipt.

export async function notifyUsers({ repo, sender }, uids, { title, body, reportId, deliveryId, strict = false }) {
  try {
    const recipients = [...new Set(uids)];
    for (const uid of recipients) {
      await repo.addNotification({ recipientUid: uid, title, body, reportId, read: false, createdAt: new Date() }, deliveryId ? notificationEventId(deliveryId, uid) : undefined);
    }

    const bindings = await Promise.all(recipients.map(async uid => (await repo.listDevices(uid)).map(token => [token, uid])));
    const owners = new Map(bindings.flat());
    const tokens = [...owners.keys()];
    if (!tokens.length || !sender) return;

    const { failedTokens = [] } = await sender.send(tokens, { title, body, reportId }) ?? {};
    for (const token of failedTokens) {
      const owner = owners.get(token);
      if (owner) await repo.removeDeviceOwned(owner, token);
    }
  } catch (e) {
    if (strict) throw e;
    console.error('notification delivery failed', e);
  }
}

export async function notifyRole({ repo, sender }, role, payload) {
  try {
    // Admins hold every dispatcher permission, so they also receive dispatcher notifications.
    for await (const uids of repo.recipientPages({ role })) {
      if (uids.length) await notifyUsers({ repo, sender }, uids, payload);
    }
  } catch (e) {
    if (payload.strict) throw e;
    console.error('notification delivery failed', e);
  }
}

// The notifier object the services receive: { notifyUsers(uids, payload), notifyRole(role, payload) }.
export function createNotifier({ repo, sender }) {
  return {
    notifyUsers: (uids, payload) => notifyUsers({ repo, sender }, uids, payload),
    notifyRole: (role, payload) => notifyRole({ repo, sender }, role, payload),
  };
}
