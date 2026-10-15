import { buildApp } from '../../src/app.js';
import { createMemoryRepo } from './memoryRepo.js';
import { createFakeUploader } from './fakeUploader.js';
import { createFakeSender } from './fakeSender.js';
import { createFakeAuth } from './fakeAuth.js';
import { createNotifier } from '../../src/services/notificationService.js';

export function makeTestApp({ notifier, sender = createFakeSender() } = {}) {
  const repo = createMemoryRepo();
  const uploader = createFakeUploader();
  const auth = createFakeAuth();
  // Default notifier is the real service wired to the fake sender, so no FCM call is made.
  const noop = notifier ?? createNotifier({ repo, sender });
  // Token forms: "<role>:<uid>" for staff claims, "new:<uid>[:<email>]" for a signed-in
  // account with no claims yet, "off:<uid>" for a deactivated account.
  const verifyToken = async (token) => {
    const [role, uid, email] = String(token).split(':');
    if (!role || !uid) throw new Error('bad token');
    if (role === 'new') {
      // A verified token proves the Firebase account exists, so register it in the fake.
      if (!auth.users.has(uid)) auth.users.set(uid, { uid, email, disabled: false, customClaims: undefined });
      return { uid, ...(email ? { email } : {}) };
    }
    if (role === 'off') return { uid, role: 'resident', active: false };
    return { uid, role, active: true };
  };
  const app = buildApp({ repo, uploader, sender, verifyToken, notifier: noop, auth });
  const as = (role, uid = `${role}-1`) => `Bearer ${role}:${uid}`;
  return { app, repo, uploader, sender, notifier: noop, auth, as };
}
