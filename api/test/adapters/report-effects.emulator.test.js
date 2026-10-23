import { describe, it, expect, beforeAll } from 'vitest';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { createFirestoreRepo } from '../../src/adapters/firestoreRepo.js';
import { deliverReportEffects } from '../../src/services/reportEffectsService.js';
import { createNotifier } from '../../src/services/notificationService.js';
import { create } from '../../src/services/reportService.js';
import { createFakeUploader } from '../fakes/fakeUploader.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('durable report effects on Firestore',()=>{
 let db,repo;
 beforeAll(()=>{const app=getApps()[0]??initializeApp({projectId:'demo-idem-test'});db=getFirestore(app);repo=createFirestoreRepo(db)});
 const record=()=>({reporterId:'recovery-'+randomUUID(),reference:'DR-RECOVER',type:'flood',status:'Submitted'});
 it('persists recovery work with a no-key report and a new worker recovers it',async()=>{
  const report=record();const dispatcher='admin-'+randomUUID();await repo.createUser(dispatcher,{role:'admin',active:true});
  const id=await repo.createReport(report);expect((await db.collection('reportEffects').doc(id).get()).data().state).toBe('pending');
  const restarted=createFirestoreRepo(db);await deliverReportEffects({repo:restarted,notifier:createNotifier({repo:restarted})},id);
  expect((await repo.listAudit({reportId:id})).filter(a=>a.action==='report.create')).toHaveLength(1);
  expect((await repo.listNotifications(dispatcher)).filter(n=>n.reportId===id)).toHaveLength(1);
  expect((await db.collection('reportEffects').doc(id).get()).data().state).toBe('done');
 });
 it('[injected] a lost notification write reply retries once without resetting read state',async()=>{
  const report=record();const dispatcher='admin-'+randomUUID();await repo.createUser(dispatcher,{role:'admin',active:true});const id=await repo.createReport(report);
  const original=repo.addNotification;let fail=true;const faulty={...repo,addNotification:async(...args)=>{const value=await original(...args);if(fail && args[0].recipientUid===dispatcher){fail=false;throw Error('lost notification reply')}return value}};
  await expect(deliverReportEffects({repo:faulty,notifier:createNotifier({repo:faulty})},id,{now:1000,leaseMs:10})).rejects.toThrow();
  const before=(await repo.listNotifications(dispatcher)).find(n=>n.reportId===id);
  expect(before).toBeDefined();await repo.markRead(before.id,dispatcher);
  await deliverReportEffects({repo,notifier:createNotifier({repo})},id,{now:1011,leaseMs:10});
  const after=(await repo.listNotifications(dispatcher)).filter(n=>n.reportId===id);expect(after).toHaveLength(1);expect(after[0].read).toBe(true);
  expect(await repo.listAudit({reportId:id})).toHaveLength(1);
 });
 it('leases concurrent workers and fences old completion',async()=>{
  const id=await repo.createReport(record());const got=await Promise.all(['a','b','c'].map(owner=>repo.claimReportEffects(id,{owner,now:1000,leaseMs:10})));expect(got.filter(Boolean)).toHaveLength(1);
  await repo.claimReportEffects(id,{owner:'new',now:1011,leaseMs:10});expect(await repo.completeReportEffects(id,'a')).toBe(false);expect(await repo.completeReportEffects(id,'new')).toBe(true);
 },30000);
 it('[injected] keyed commit followed by process loss leaves one recoverable job; replay adds none',async()=>{
  const uid='recover-keyed-'+randomUUID(),key=randomUUID();const original=repo.commitSubmission;
  const stopped={...repo,commitSubmission:async(...args)=>{const result=await original(...args);throw Error('lost commit acknowledgement')}};
  const input={type:'flood',description:'Recovery test report',lat:14.6,lng:121,source:'manual'};
  // Also deny the outcome read, modelling process loss before any inline effect runs.
  stopped.getSubmission=async()=>{throw Error('process unavailable')};
  await expect(create({repo:stopped,uploader:createFakeUploader()}, {uid},input,[],key)).rejects.toThrow();
  const reports=await repo.listReports({reporterId:uid});expect(reports).toHaveLength(1);const id=reports[0].id;
  expect((await db.collection('reportEffects').doc(id).get()).data().state).toBe('pending');
  await deliverReportEffects({repo,notifier:createNotifier({repo})},id);
  const replay=await create({repo,uploader:createFakeUploader()}, {uid},input,[],key);expect(replay.id).toBe(id);expect(await repo.listReports({reporterId:uid})).toHaveLength(1);expect(await repo.listAudit({reportId:id})).toHaveLength(1);
 });
});
