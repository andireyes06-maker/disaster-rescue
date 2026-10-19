import {beforeAll,describe,it,expect} from 'vitest';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {createFirestoreRepo} from '../../src/adapters/firestoreRepo.js';
import {mutationEffects,deliverMutationEffects} from '../../src/services/mutationEffectsService.js';
const suite=process.env.FIRESTORE_EMULATOR_HOST?describe:describe.skip;
suite('durable effects on actual Firestore transactions',()=>{
 let db,repo; beforeAll(async()=>{db=getFirestore(initializeApp({projectId:'demo-repair-effects'},'repair-effects'));repo=createFirestoreRepo(db);await db.doc('boot/check').get();},30000);
 it('primary write and plan survive worker replacement, delivery is create-once',async()=>{const id=await repo.createReport({status:'Submitted'});const plan=mutationEffects([{actorUid:'dispatcher',action:'test.recovery',reportId:id}]);expect(await repo.updateReportIf(id,'Submitted',{status:'Verified'},plan)).toBe(true);const recovered=createFirestoreRepo(db);expect((await recovered.listMutationEffects(Date.now())).some(x=>x.id===plan.id)).toBe(true);expect(await deliverMutationEffects({repo:recovered},plan.id)).toBe(true);expect(await deliverMutationEffects({repo},plan.id)).toBe(false);expect((await repo.listAudit({reportId:id}))).toHaveLength(1);},30000);
 it('a rejected transaction leaves no plan and a stale lease cannot complete',async()=>{const id=await repo.createReport({status:'Closed'});const rejected=mutationEffects([{action:'never'}]);expect(await repo.updateReportIf(id,'Submitted',{status:'Verified'},rejected)).toBe(false);expect((await db.doc('mutationEffects/'+rejected.id).get()).exists).toBe(false);const plan=mutationEffects([{action:'lease'}]);await repo.updateReportIf(id,'Closed',{status:'Closed'},plan);await repo.claimMutationEffects(plan.id,{owner:'old',now:100,leaseMs:10});expect(await repo.claimMutationEffects(plan.id,{owner:'new',now:111,leaseMs:10})).toBeTruthy();expect(await repo.completeMutationEffects(plan.id,'old')).toBe(false);expect(await repo.completeMutationEffects(plan.id,'new')).toBe(true);},30000);
 it('legacy rescue counts are aggregated without fetching history or losing old rows',async()=>{const id=await repo.createReport({status:'Closed'});for(const n of [2,3,8])await repo.addUpdate(id,{at:new Date(),peopleRescued:n});await repo.addUpdate(id,{at:new Date(),note:'not a rescue count'});expect(await repo.sumPeopleRescued(id)).toBe(13);});
});
