#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const req=createRequire(new URL('../api/package.json',import.meta.url));
const PROJECT='demo-disaster-rescue';
const PORTS=[9407,8407,3407,5407,4407,4507,9157];
const inside=process.argv.includes('--inside');
const env={...process.env,FIREBASE_PROJECT_ID:PROJECT,GCLOUD_PROJECT:PROJECT,METADATA_SERVER_DETECTION:'none',DEBUG:''};
for(const key of Object.keys(env)) if(/GOOGLE_APPLICATION_CREDENTIALS|CLOUDINARY|^FIREBASE_CONFIG$/.test(key)) delete env[key];
const children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children){try{if(!inside&&process.platform!=='win32')process.kill(-child.pid,'SIGTERM');else child.kill('SIGTERM');}catch(e){if(e.code!=='ESRCH')console.error(e.message);}}process.exitCode=code;}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
function run(command,args,cwd=ROOT,variables=env){const child=spawn(command,args,{cwd,env:variables,stdio:'inherit',detached:!inside&&process.platform!=='win32'});children.push(child);child.on('error',e=>{console.error(e.message);stop(1);});child.on('exit',(code,signal)=>{if(!stopping)stop(code??(signal?1:0));});return child;}
async function free(port,host){await new Promise((resolve,reject)=>{const s=createServer();s.once('error',()=>reject(new Error(`Port ${port} is busy. No existing process will be reused or stopped.`)));s.listen(port,host,()=>s.close(resolve));});}
async function main(){
 if(!inside){for(const port of PORTS){await free(port,'127.0.0.1');await free(port,'::1');}delete env.FIRESTORE_EMULATOR_HOST;delete env.FIREBASE_AUTH_EMULATOR_HOST;run(process.env.RESCUE_FIREBASE_BIN||'firebase',['emulators:exec','--config','firebase/firebase.submission.json','--only','auth,firestore','--project',PROJECT,'node scripts/submission-demo.mjs --inside']);return;}
 if(!['127.0.0.1:8407','localhost:8407'].includes(env.FIRESTORE_EMULATOR_HOST)||!['127.0.0.1:9407','localhost:9407'].includes(env.FIREBASE_AUTH_EMULATOR_HOST))throw Error('Refusing a non-submission emulator environment.');
 const {initializeApp}=req('firebase-admin/app');const {getFirestore}=req('firebase-admin/firestore');const{getAuth}=req('firebase-admin/auth');initializeApp({projectId:PROJECT});const db=getFirestore();if(!(await db.collection('reports').limit(1).get()).empty)throw Error('Refusing to replace populated demo data. Stop and restart this dedicated workspace for a fresh session.');
 const {seedDemo}=await import('../api/scripts/seed-demo.js');await seedDemo({db,auth:getAuth()},{reset:false,now:new Date().toISOString(),scenario:'default'});
 await db.doc('config/hotlines').set({numbers:[],residentNotice:'If you are in immediate danger, call your local emergency number. Reporting here does not guarantee immediate rescue.'});
 run(process.execPath,['src/server.js'],ROOT+'api',{...env,PORT:'3407',CORS_ORIGINS:'http://localhost:5407,http://localhost:5507'});
 run(process.execPath,['node_modules/vite/bin/vite.js','--host','localhost','--port','5407','--strictPort'],ROOT+'web',{...env,VITE_API_BASE_URL:'http://localhost:3407/api',VITE_FIREBASE_API_KEY:'demo-emulator-key',VITE_FIREBASE_AUTH_DOMAIN:PROJECT+'.firebaseapp.com',VITE_FIREBASE_PROJECT_ID:PROJECT,VITE_FIREBASE_APP_ID:'submission-local-web',VITE_USE_EMULATORS:'true',VITE_AUTH_EMULATOR_PORT:'9407',VITE_FIRESTORE_EMULATOR_PORT:'8407'});
 console.log('Submission demo: http://localhost:5407 | API3407 | Auth9407 | Firestore8407. Fictional local data only.');
}
main().catch(e=>{console.error(e.message);stop(1);});
