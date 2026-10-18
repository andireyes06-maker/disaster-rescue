import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root='/private/tmp/rescue-release-integration-2026-10-18';
const require=createRequire(root+'/api/package.json');
const {initializeApp}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8490';
const projectId='demo-recovery-runtime';initializeApp({projectId});const db=getFirestore();
const {createFirestoreRepo}=await import(root+'/api/src/adapters/firestoreRepo.js');
const repo=createFirestoreRepo(db);const dispatcher='dispatch-'+Date.now();
await repo.createUser(dispatcher,{role:'dispatcher',active:true});
// Persist the report, then start a different process without running service afterCreate.
const reportId=await repo.createReport({reporterId:'fictional-resident',type:'flood',status:'Submitted',reference:'DR-RECOVER'});
assert.equal((await db.collection('reportEffects').doc(reportId).get()).data().state,'pending');
const env={...process.env,PORT:'3107',FIREBASE_PROJECT_ID:projectId,GCLOUD_PROJECT:projectId,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9599',CORS_ORIGINS:'http://localhost:5180'};
for(const key of Object.keys(env))if(/GOOGLE_APPLICATION_CREDENTIALS|CLOUDINARY|^FIREBASE_CONFIG$/.test(key))delete env[key];
const server=spawn(process.execPath,['src/server.js'],{cwd:root+'/api',env,stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
try{
 const until=Date.now()+15000;let done=false;
 while(Date.now()<until){done=(await db.collection('reportEffects').doc(reportId).get()).data().state==='done';if(done)break;await new Promise(r=>setTimeout(r,200))}
 assert(done,'server startup worker did not recover pending work');
 assert.equal((await repo.listAudit({reportId})).length,1);assert.equal((await repo.listNotifications(dispatcher)).filter(n=>n.reportId===reportId).length,1);
 writeFileSync(new URL('./server-restart.json',import.meta.url),JSON.stringify({pass:true,projectId,reportId,separateServerProcess:true,port:3107,auditEntries:1,bellNotifications:1,providerDelivery:false},null,2));
 console.log('PASS separate API startup recovers committed report audit and bell work');
}finally{
 server.kill('SIGTERM');writeFileSync(new URL('./server-restart-server.log',import.meta.url),logs);await db.terminate();
}
