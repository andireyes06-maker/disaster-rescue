import { randomUUID } from 'node:crypto';
import { creationEventId } from '../domain/reportEffects.js';
import { createNotifier } from './notificationService.js';

export async function deliverReportEffects({ repo, notifier = createNotifier({ repo }) }, reportId, { now = Date.now(), leaseMs = 60_000 } = {}) {
  const owner = randomUUID();
  const job = await repo.claimReportEffects(reportId, { owner, now, leaseMs });
  if (!job) return false;
  const eventId = creationEventId(reportId);
  await repo.addAudit({ actorUid: job.actorUid, action: 'report.create', reportId,
    after: { status: job.status, type: job.type, reference: job.reference }, at: job.createdAt }, eventId);
  await notifier.notifyRole('dispatcher', {
    title: 'New report', body: `${job.type} report ${job.reference} submitted`, reportId,
    deliveryId: eventId, strict: true,
  });
  // If another worker took over while delivery ran, it alone may complete the job. Stable IDs protect in-app/audit writes.
  return repo.completeReportEffects(reportId, owner);
}

export async function drainReportEffects(deps, { limit = 25, now = Date.now() } = {}) {
  const jobs = await deps.repo.listReportEffects(now, limit);
  let completed = 0;
  for (const job of jobs) {
    try { if (await deliverReportEffects(deps, job.reportId)) completed++; }
    catch (error) { console.error('report effects retry pending', job.reportId, error.message); }
  }
  return completed;
}

export function startReportEffectsWorker(deps, { intervalMs = 10_000 } = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await drainReportEffects(deps); }
    catch (error) { console.error('report effects recovery unavailable', error.message); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => { void tick(); }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
