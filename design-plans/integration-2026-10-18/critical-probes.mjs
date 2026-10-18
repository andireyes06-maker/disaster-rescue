import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
const require = createRequire('/private/tmp/rescue-release-integration-2026-10-18/api/package.json');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8490'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9599';
const { initializeApp } = require('firebase-admin/app'); const { getFirestore } = require('firebase-admin/firestore'); const { getAuth } = require('firebase-admin/auth');
initializeApp({ projectId: 'demo-integrated-release' }); const db = getFirestore(), auth = getAuth();
const out = { checks: [], observations: [] }; const password = 'Demo-Sample#2026';
const save = () => writeFileSync(new URL('./critical-results.json', import.meta.url), JSON.stringify(out, null, 2));
async function check(name, fn) { try { await fn(); out.checks.push({name,pass:true});console.log('PASS',name); } catch(e) {out.checks.push({name,pass:false,detail:e.message});console.log('FAIL',name,e.message);}save();}
async function login(email) {const r=await fetch('http://127.0.0.1:9599/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-functional-key',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});const j=await r.json();assert(r.ok,`Auth ${r.status}`);return j.idToken;}
async function api(method,path,token,body) {const r=await fetch('http://localhost:3106/api'+path,{method,headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const b=Buffer.from(await r.arrayBuffer());let j;try{j=JSON.parse(b.toString());}catch{j=b.toString();}return{status:r.status,data:j,bytes:b};}
const admin=await login('elena.cruz@harbor.example');
await check('responder aggregate stats access is intentionally allowed',async()=>assert.equal((await api('GET','/stats',await login('daniel.flores@harbor.example'))).status,200));
function pdfText(buf) {let i=0,s='';while((i=buf.indexOf('stream',i))!==-1){const a=i+6+(buf[i+6]===13?2:1),b=buf.indexOf('endstream',a);if(b<0)break;try{s+=inflateSync(buf.subarray(a,b)).toString('latin1');}catch{}i=b+9;}return [...s.matchAll(/<([0-9a-fA-F]+)>/g)].map(m=>Buffer.from(m[1],'hex').toString()).join('');}
for(const query of ['type=flood','status=Submitted']) await check('exports honor Analytics filter '+query,async()=>{
 const stats=await api('GET','/stats?'+query,admin);const csv=await api('GET','/export/incidents.csv?'+query,admin);const pdf=await api('GET','/export/summary.pdf?'+query,admin);
 const stored=(await db.collection('reports').get()).docs.map(x=>x.data());const [key,value]=query.split('=');const excluded=stored.filter(x=>x[key]!==value);
 const leaks=excluded.filter(x=>csv.data.includes(x.reference)).map(x=>x.reference);const text=pdfText(pdf.bytes);
 out.observations.push({kind:'export-filter',query,expectedTotal:stats.data.total,excludedReferencesInCsv:leaks,pdfTotal:text.match(/Total: (\d+)/)?.[1]});
 writeFileSync(new URL('./filtered-'+key+'.csv',import.meta.url),csv.bytes);writeFileSync(new URL('./filtered-'+key+'.pdf',import.meta.url),pdf.bytes);
 assert.equal(Number(text.match(/Total: (\d+)/)?.[1]),stats.data.total,'PDF total must match filtered Analytics');assert(excluded.every(x=>!text.includes(x.reference)),'PDF contains excluded references');
 assert.equal(leaks.length,0,`filtered total ${stats.data.total}; CSV still contains ${leaks.length} excluded incidents; PDF ${text.match(/Total: (\d+)/)?.[1]}`);
});
await check('revoked dispatcher token loses privileged access even on a same-second role change',async()=>{
 const details=[];
 for(const mode of ['immediate','delayed']){
  const email=`audit-revoke-${mode}@harbor.example`;const created=await api('POST','/users',admin,{email,name:'Audit Revocation '+mode,role:'dispatcher'});assert.equal(created.status,201);const uid=created.data.uid;
  await auth.updateUser(uid,{password});const token=await login(email);const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  if(mode==='delayed')await new Promise(r=>setTimeout(r,1200));
  const changed=await api('PATCH','/users/'+uid,admin,{role:'resident'});assert.equal(changed.status,200);
  await new Promise(r=>setTimeout(r,1200));
  const oldAccess=await api('GET','/users',token);const user=await auth.getUser(uid);details.push({mode,authTime:claims.auth_time,revokedAfter:user.tokensValidAfterTime,storedRole:(await db.collection('users').doc(uid).get()).data().role,oldTokenUsersStatus:oldAccess.status});
 }
 out.observations.push({kind:'revocation-granularity',details}); assert(details.every(x=>[401,403].includes(x.oldTokenUsersStatus)),JSON.stringify(details));
});
await check('two-admin concurrent demotions leave one active admin',async()=>{
 const email='audit-race-admin@harbor.example';const created=await api('POST','/users',admin,{email,name:'Audit Race Admin',role:'admin'});assert.equal(created.status,201);const uid=created.data.uid;await auth.updateUser(uid,{password});
 for(let i=0;i<3;i++){
  let elena=await login('elena.cruz@harbor.example');let other=await login(email);
  const e=(await db.collection('users').doc('demo-admin').get()).data();const o=(await db.collection('users').doc(uid).get()).data();
  if(e.role!=='admin')assert.equal((await api('PATCH','/users/demo-admin',other,{role:'admin'})).status,200);
  if(o.role!=='admin')assert.equal((await api('PATCH','/users/'+uid,elena,{role:'admin'})).status,200);
  elena=await login('elena.cruz@harbor.example');other=await login(email);
  const rs=await Promise.all([api('PATCH','/users/'+uid,elena,{role:'responder'}),api('PATCH','/users/demo-admin',other,{role:'responder'})]);
  const roles=await Promise.all(['demo-admin',uid].map(async id=>(await db.collection('users').doc(id).get()).data().role));
  out.observations.push({kind:'last-admin-race',round:i+1,statuses:rs.map(x=>x.status),codes:rs.map(x=>x.data?.error),roles});
  assert.deepEqual(rs.map(x=>x.status).sort(),[200,409]);assert.equal(roles.filter(x=>x==='admin').length,1);
 }
 // Restore the seeded admin using the survivor, then keep the temporary admin out of later runs.
 if((await db.collection('users').doc('demo-admin').get()).data().role!=='admin')await api('PATCH','/users/demo-admin',await login(email),{role:'admin'});
 if((await db.collection('users').doc(uid).get()).data().role==='admin')await api('PATCH','/users/'+uid,await login('elena.cruz@harbor.example'),{role:'responder'});
});
out.summary={total:out.checks.length,passed:out.checks.filter(x=>x.pass).length,failed:out.checks.filter(x=>!x.pass).length};save();console.log('COMPLETE',JSON.stringify(out.summary));await db.terminate();
