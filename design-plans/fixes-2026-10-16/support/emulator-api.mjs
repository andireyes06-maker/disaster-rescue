process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8180';
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
const base='/Users/rien/Documents/FINAL_PROJECT';
const {initializeApp}=await import(base+'/api/node_modules/firebase-admin/lib/esm/app/index.js');
const {getAuth}=await import(base+'/api/node_modules/firebase-admin/lib/esm/auth/index.js');
const {getFirestore}=await import(base+'/api/node_modules/firebase-admin/lib/esm/firestore/index.js');
const {buildApp}=await import(base+'/api/src/app.js');
const {createFirestoreRepo}=await import(base+'/api/src/adapters/firestoreRepo.js');
initializeApp({projectId:'demo-disaster-rescue'});
const auth=getAuth(),db=getFirestore();
for(const [role,name] of [['dispatcher','Jose Reyes'],['responder','Ana Cruz'],['dmo','Miguel Tan'],['resident','Maria Santos']]){
 const uid='audit-'+role;
 await auth.createUser({uid,email:role+'@audit.test',password:'AuditOnly#2026',displayName:name});
 await auth.setCustomUserClaims(uid,{active:true,role,...(role==='responder'?{team:'team-alpha'}:{})});
 await db.collection('users').doc(uid).set({name,email:role+'@audit.test',role,active:true,phone:'09170000000',...(role==='responder'?{team:'team-alpha'}:{})});
}
for(const [id,name,busy] of [['alpha','Team Alpha',true],['bravo','Team Bravo',false],['charlie','Team Charlie',false]])await db.collection('teams').doc('team-'+id).set({name,busy,members:id==='alpha'?['audit-responder']:[],currentReportId:busy?'audit-3':null});
const statuses=['Submitted','Awaiting Assignment','Team Assigned','Rescue in Progress','Resolved','Closed','Under Verification','Submitted'];
const descriptions=['Flood water has reached the first floor. Three residents need assistance, including an older person with limited mobility.','Smoke is coming from a residential building near the market. Residents have moved to the street.','A family is stranded near the river bridge. Road access is blocked by rising water.','Fallen debris is blocking access to the evacuation center. A team is on site.','Water has receded. All affected residents have reached the evacuation center.','The rescue is complete and the report has been reviewed.','A retaining wall has collapsed after heavy rain. Nearby houses may be affected.','A tree has fallen across the road outside the school.'];
for(let i=0;i<statuses.length;i++){
 const id='audit-'+(i+1),type=['flood','fire','flood','earthquake','flood','other','landslide','other'][i];
 await db.collection('reports').doc(id).set({reporterId:'audit-resident',type,description:descriptions[i],status:statuses[i],verified:![0,6,7].includes(i),priority:['critical','high','critical','high','medium','low','high','medium'][i],classification:'',location:{lat:14.85+i*.003,lng:120.81+i*.002,source:'gps'},coarseLocation:{lat:14.85,lng:120.81},addressText:['Barangay San Pablo, Malolos, Bulacan','Barangay Sto. Rosario, Malolos, Bulacan'][i%2],contact:{name:'Maria Santos',phone:'09170000000'},photos:[{url:'https://example.invalid/audit-photo.jpg'}],possibleDuplicates:i===0?['audit-8']:[],createdAt:new Date(Date.now()-i*3600000),updatedAt:new Date(),...([2,3].includes(i)?{assignedTeamId:'team-alpha'}:{})});
 if(i===3)await db.collection('reports').doc(id).collection('updates').doc('update-1').set({status:'Rescue in Progress',note:'Team reached the area and is assisting residents.',peopleRescued:2,at:new Date()});
 await db.collection('auditLogs').doc(id).set({actorUid:'audit-dispatcher',reportId:id,action:'verify_report',at:new Date(Date.now()-i*3600000),before:{status:'Submitted',verified:false},after:{status:statuses[i],verified:true}});
}
const app=buildApp({repo:createFirestoreRepo(db),auth,verifyToken:async token=>{const c=await auth.verifyIdToken(token);return{uid:c.uid,role:c.role,active:c.active};},uploader:{upload:async()=>{throw Error('Uploads disabled for audit');}},sender:{send:async()=>{}},corsOrigins:['http://127.0.0.1:5173'],trustProxy:false});
app.listen(3101,'127.0.0.1',()=>console.log('AUDIT_ONLY_API_READY 3101; synthetic emulator data seeded'));
