// In-app notifications first, then FCM push. Never throws to the caller: a report
// operation must not fail because a notification could not be delivered.

export async function notifyUsers({ repo, sender }, uids, { title, body, reportId }) {
  try {
    const recipients = [...new Set(uids)];
    for (const uid of recipients) {
      await repo.addNotification({ recipientUid: uid, title, body, reportId, read: false, createdAt: new Date() });
    }

    const tokens = [...new Set((await Promise.all(recipients.map((uid) => repo.listDevices(uid)))).flat())];
    if (!tokens.length || !sender) return;

    const { failedTokens = [] } = await sender.send(tokens, { title, body, reportId }) ?? {};
    for (const token of failedTokens) await repo.removeDevice(token);
  } catch (e) {
    console.error('notification delivery failed', e);
  }
}

export async function notifyRole({ repo, sender }, role, payload) {
  try {
    const uids = (await repo.listUsers()).filter((u) => u.role === role && u.active === true).map((u) => u.uid);
    if (uids.length) await notifyUsers({ repo, sender }, uids, payload);
  } catch (e) {
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
