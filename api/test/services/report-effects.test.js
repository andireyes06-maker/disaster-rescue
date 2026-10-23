import { describe, it, expect, vi } from 'vitest';
import { createMemoryRepo } from '../fakes/memoryRepo.js';
import { deliverReportEffects, drainReportEffects, startReportEffectsWorker } from '../../src/services/reportEffectsService.js';
import { createNotifier } from '../../src/services/notificationService.js';
const report = { reporterId: 'resident', reference: 'DR-RECOVER', type: 'flood', status: 'Submitted' };
async function setup() {
 const repo=createMemoryRepo();await repo.createUser('dispatcher',{role:'admin',active:true});
 const id=await repo.createReport(report);const notifier=createNotifier({repo});return {repo,id,notifier};
}
describe('durable creation effects',()=>{
 it('recovers after report commit without inline follow-up',async()=>{const d=await setup();await drainReportEffects(d);expect(await d.repo.listAudit({action:'report.create'})).toHaveLength(1);expect(await d.repo.listNotifications('dispatcher')).toHaveLength(1);expect(await d.repo.listReportEffects(Date.now(),25)).toHaveLength(0)});
 it('[injected] retries a notification failure without duplicating audit or resetting read notifications',async()=>{const d=await setup();const add=d.repo.addNotification;let failed=true;d.repo.addNotification=async(...args)=>{const id=await add(...args);if(failed){failed=false;throw Error('lost notification reply')}return id};await expect(deliverReportEffects(d,d.id,{now:1000,leaseMs:10})).rejects.toThrow();let notifications=await d.repo.listNotifications('dispatcher');await d.repo.markRead(notifications[0].id,'dispatcher');await deliverReportEffects(d,d.id,{now:1011,leaseMs:10});expect(await d.repo.listAudit({action:'report.create'})).toHaveLength(1);notifications=await d.repo.listNotifications('dispatcher');expect(notifications).toHaveLength(1);expect(notifications[0].read).toBe(true)});
 it('leases concurrent workers and fences completion after a takeover',async()=>{const d=await setup();const a=await d.repo.claimReportEffects(d.id,{owner:'a',now:1000,leaseMs:10});expect(a).toBeTruthy();expect(await d.repo.claimReportEffects(d.id,{owner:'b',now:1001,leaseMs:10})).toBeNull();expect(await d.repo.claimReportEffects(d.id,{owner:'b',now:1011,leaseMs:10})).toBeTruthy();expect(await d.repo.completeReportEffects(d.id,'a')).toBe(false);expect(await d.repo.completeReportEffects(d.id,'b')).toBe(true)});
 it('[injected] a transient push failure leaves work recoverable',async()=>{const d=await setup();await d.repo.addDevice('dispatcher','fake-token');let calls=0;d.notifier=createNotifier({repo:d.repo,sender:{send:async()=>{if(++calls===1)throw Error('transient push');return {failedTokens:[]}}}});await expect(deliverReportEffects(d,d.id,{now:1000,leaseMs:10})).rejects.toThrow('transient push');await deliverReportEffects(d,d.id,{now:1011,leaseMs:10});expect(calls).toBe(2);expect(await d.repo.listNotifications('dispatcher')).toHaveLength(1)});
});

it('server worker drains at startup and polls later jobs without overlapping runs', async () => {
 const d = await setup();
 const stop = startReportEffectsWorker(d, { intervalMs: 10 });
 try {
  await vi.waitFor(async () => expect(await d.repo.listAudit({ action: 'report.create' })).toHaveLength(1));
  await d.repo.createReport({ ...report, reference: 'DR-LATER1' });
  await vi.waitFor(async () => expect(await d.repo.listAudit({ action: 'report.create' })).toHaveLength(2));
 } finally { stop(); }
});
