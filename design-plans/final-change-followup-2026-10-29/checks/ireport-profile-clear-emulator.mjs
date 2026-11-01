import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const req=createRequire('/Users/rien/Documents/FINAL_PROJECT/app/api/package.json');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8637';process.env.GCLOUD_PROJECT='demo-disaster-rescue';delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const {initializeApp,deleteApp}=req('firebase-admin/app');const {getFirestore}=req('firebase-admin/firestore');
const app=initializeApp({projectId:'demo-disaster-rescue'},'local-profile-clear-check');const db=getFirestore(app);
const {createFirestoreRepo}=await import('/Users/rien/Documents/FINAL_PROJECT/app/api/src/adapters/firestoreRepo.js');
const {removePhoto}=await import('/Users/rien/Documents/FINAL_PROJECT/app/api/src/services/profilePhotoService.js');
const uid='local-clear-'+randomUUID();const doc=db.doc('users/'+uid);const removed=[];
try{await doc.set({name:'Synthetic clear check',role:'resident',active:true,photo:{publicId:'synthetic-only',url:'https://example.test/profile.png',updatedAt:new Date()}});const repo=createFirestoreRepo(db);const response=await removePhoto({repo,uploader:{remove:async items=>removed.push(...items)}},uid);const stored=(await doc.get()).data();if(response.photoUrl!==null||stored.photo!==null||removed[0]?.publicId!=='synthetic-only')throw Error('Photo clear failed');const out={result:'pass',firestore:'real local emulator on8637',provider:'fake removal; noCloudinaryrequest',storedPhoto:stored.photo,response,removedAssetCount:removed.length,productionTouched:false};writeFileSync('/Users/rien/Documents/FINAL_PROJECT/app/design-plans/final-change-followup-2026-10-29/PHOTO-CLEAR-EMULATOR.json',JSON.stringify(out,null,2));console.log(out);}finally{await doc.delete();await deleteApp(app);}
