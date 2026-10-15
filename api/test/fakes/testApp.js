import { buildApp } from '../../src/app.js';
import { createMemoryRepo } from './memoryRepo.js';
import { createFakeUploader } from './fakeUploader.js';
import { createFakeSender } from './fakeSender.js';

export function makeTestApp({ notifier } = {}) {
  const repo = createMemoryRepo();
  const uploader = createFakeUploader();
  const sender = createFakeSender();
  const noop = notifier ?? { notifyUsers: async () => {}, notifyRole: async () => {} };
  const verifyToken = async (token) => {
    const [role, uid] = String(token).split(':');
    if (!role || !uid) throw new Error('bad token');
    if (role === 'off') return { uid, role: 'resident', active: false };
    return { uid, role, active: true };
  };
  const app = buildApp({ repo, uploader, sender, verifyToken, notifier: noop });
  const as = (role, uid = `${role}-1`) => `Bearer ${role}:${uid}`;
  return { app, repo, uploader, sender, notifier: noop, as };
}
