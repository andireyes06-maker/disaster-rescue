import { initializeTestEnvironment, assertSucceeds, assertFails } from '/Users/rien/Documents/FINAL_PROJECT/firebase/node_modules/@firebase/rules-unit-testing/dist/esm/index.esm.js';
import { readFileSync } from 'node:fs';
const env=await initializeTestEnvironment({projectId:'demo-predeploy-security-audit',firestore:{host:'127.0.0.1',port:8180,rules:readFileSync('/Users/rien/Documents/FINAL_PROJECT/firebase/firestore.rules','utf8')}});
try{
await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await db.doc('users/staff').set({role:'resident',active:false});await db.doc('reports/synthetic').set({reporterId:'another',assignedTeamId:null,contact:{name:'SYNTHETIC',phone:'0000000000'},location:{lat:14,lng:121},status:'Submitted'});});
await assertSucceeds(env.authenticatedContext('staff',{role:'dispatcher',active:true}).firestore().doc('reports/synthetic').get());
console.log('old_active_staff_claims_still_read_private_report_with_user_doc_disabled_or_demoted:true');
await assertFails(env.authenticatedContext('staff',{role:'resident',active:false}).firestore().doc('reports/synthetic').get());
console.log('new_disabled_claims_denied:true');
}finally{await env.clearFirestore();await env.cleanup();}
