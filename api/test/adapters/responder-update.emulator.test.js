import {beforeAll,describe,it,expect} from 'vitest';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {createFirestoreRepo} from '../../src/adapters/firestoreRepo.js';
const suite=process.env.FIRESTORE_EMULATOR_HOST?describe:describe.skip;
suite('responder update idempotency on actual emulator transactions',()=>{
 let db,repo;beforeAll(async()=>{db=getFirestore(initializeApp({projectId:'demo-responder-idem'},'responder-idem'));repo=createFirestoreRepo(db);await db.doc('auditBoot/ready').get();},30000);
 it('simultaneous deliveries of one keyed update write exactly one row',async()=>{const uid=randomUUID(),team=randomUUID();await repo.createUser(uid,{role:'responder',active:true,team});const id=await repo.createReport({status:'Rescue in Progress',assignedTeamId:team});const updateId='upd-'+randomUUID().replaceAll('-','');const change=()=>({reportPatch:{},updateDoc:{kind:'status',status:'Rescue in Progress',note:'',peopleRescued:4,byUid:uid,at:new Date()},updateId,responderUid:uid,effects:null});const rs=await Promise.all([repo.applyReportChange(id,'Rescue in Progress',change()),repo.applyReportChange(id,'Rescue in Progress',change())]);expect(rs.every(r=>r.ok)).toBe(true);expect(rs.filter(r=>r.duplicate)).toHaveLength(1);expect(await repo.listUpdates(id)).toHaveLength(1);expect(await repo.getReportUpdate(id,updateId)).toMatchObject({byUid:uid,peopleRescued:4});});
});
