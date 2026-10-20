import { randomUUID } from 'node:crypto';
import { createNotifier } from './notificationService.js';

// Persist this plan in the SAME transaction/batch as its primary mutation.
// Stable delivery IDs create audit/in-app records once; push is at-least-once.
export function mutationEffects(audits = [], notifications = []) {
  return {
    id: randomUUID(),
    audits: audits.map(audit => ({ ...audit, at: audit.at ?? new Date() })),
    notifications,
    createdAt: new Date(),
    state: 'pending',
    nextAttemptAtMs: 0,
  };
}

export async function deliverMutationEffects(
  { repo, notifier = createNotifier({ repo }) }, id,
  { now = Date.now(), leaseMs = 60000 } = {},
) {
  const owner = randomUUID();
  const job = await repo.claimMutationEffects(id, { owner, now, leaseMs });
  if (!job) return false;

  for (const [index, audit] of job.audits.entries()) {
    await repo.addAudit(audit, `mutation-${id}-audit-${index}`);
  }
  for (const [index, intent] of job.notifications.entries()) {
    const payload = { ...intent.payload, deliveryId: `mutation-${id}-notification-${index}`, strict: true };
    if (intent.target.role) await notifier.notifyRole(intent.target.role, payload);
    else if (intent.target.uid) await notifier.notifyUsers([intent.target.uid], payload);
    else if (intent.target.teamId) {
      for await (const users of repo.recipientPages({ teamId: intent.target.teamId })) {
        await notifier.notifyUsers(users, payload);
      }
    }
  }
  return repo.completeMutationEffects(id, owner);
}

export async function tryMutationEffects(deps, plan) {
  try { await deliverMutationEffects(deps, plan.id); }
  catch (error) { console.error('mutation effects retry pending', plan.id, error?.name ?? 'Error'); }
}

export async function drainMutationEffects(deps, { now = Date.now(), limit = 25 } = {}) {
  let done = 0;
  for (const job of await deps.repo.listMutationEffects(now, limit)) {
    try { if (await deliverMutationEffects(deps, job.id, { now })) done++; }
    catch (error) { console.error('mutation effects retry pending', job.id, error?.name ?? 'Error'); }
  }
  return done;
}

export function startMutationEffectsWorker(deps, { intervalMs = 10000 } = {}) {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try { await drainMutationEffects(deps); }
    catch (error) { console.error('mutation recovery unavailable', error?.name ?? 'Error'); }
    finally { busy = false; }
  };
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
