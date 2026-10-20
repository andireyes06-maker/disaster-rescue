const fs=require('fs'),path=require('path');
const {Document,Packer,Paragraph,TextRun,HeadingLevel,Table,TableRow,TableCell,WidthType,ShadingType,PageBreak,Footer,PageNumber,AlignmentType}=require(process.env.RESCUE_DOCX_MODULE||'docx');
const out=process.env.RESCUE_ASSIGNMENT_OUT||'submission-output/Progress-Update';fs.mkdirSync(out,{recursive:true});
const p=(text,opts={})=>new Paragraph({spacing:{after:130,line:270},children:[new TextRun({text,size:21,color:'292438'})],...opts});
const h=(text)=>p(text,{heading:HeadingLevel.HEADING_1,spacing:{before:190,after:140},children:[new TextRun({text,size:26,bold:true,color:'241747'})]});
const table=(heads,rows,widths)=>new Table({width:{size:10080,type:WidthType.DXA},columnWidths:widths,rows:[heads,...rows].map((row,i)=>new TableRow({tableHeader:i===0,children:row.map((text,j)=>new TableCell({width:{size:widths[j],type:WidthType.DXA},margins:{top:110,bottom:110,left:120,right:120},shading:i===0?{type:ShadingType.CLEAR,fill:'241747'}:{type:ShadingType.CLEAR,fill:i%2?'F5F3FA':'FFFFFF'},children:[p(text,{spacing:{after:20,line:250},children:[new TextRun({text,size:20,color:i===0?'FFFFFF':'292438',bold:i===0})]})]}))}))});
const group=['Lopez, Raymond DG','De Leon, Justine','Cabuguang, Liam','[Owner’s submission name to confirm]'];
const children=[
 p('RESCUE REPORTS',{children:[new TextRun({text:'RESCUE REPORTS',size:22,bold:true,color:'6D28D9'})]}),
 p('System Progress Update',{heading:HeadingLevel.TITLE,spacing:{before:150,after:180},children:[new TextRun({text:'System Progress Update',size:42,bold:true,color:'241747'})]}),
 p('Reporting period: October 12–19, 2026',{children:[new TextRun({text:'Reporting period: October 12–19, 2026',size:26,bold:true,color:'241747'})]}),
 p('Prepared October 20, 2026 • Status is reported as of October 19, 2026.'),
 h('Project and group'),
 p('Rescue Reports is a web and mobile emergency-reporting and response-coordination system. Residents submit and track reports; dispatchers verify and assign teams; responders provide field updates; monitoring officers and administrators use authorized web workspaces.'),
 table(['Group members','Confirmation'],group.map((n,i)=>[n,i===3?'Full submission name to confirm':'Name supplied by the project owner']),[6000,4080]),
 p('Assigned roles and individual contributions remain unconfirmed. This report describes the system’s aggregate progress and does not attribute unverified work to a member.'),
 h('Overall status at the cutoff'),
 p('The core web workflows and resident/responder mobile features were implemented and under final integration testing. Web and API release records exist by October 19. Local automated and browser checks supported substantial functional progress, while hosted/provider, device, accessibility and native release gates remained open. The system was not certified for public emergency-service operation.'),
 p('The October 20 Flutter visual redesign, Android emulator checks and final presentation preparation are subsequent work. They are not counted as accomplishments during October 12–19.'),
 new Paragraph({children:[new PageBreak()]}),
 h('1. Activities completed during October 12–19'),
 table(['Dated evidence window','Completed or improved work'],[
 ['October 12–15','The assigned development window began October 12. Requirements, architecture and schema artifacts exist, but the retained evidence does not establish exact daily completion dates for these early activities. No day-by-day accomplishment is invented.'],
 ['October 16','Resident reporting/tracking and admin web workspaces were recorded in commits. The indigo/violet interface, dispatcher inbox, resident layouts, admin permissions and public incident-area map were improved.'],
 ['October 17–18','Page and interaction audits drove access-form validation, landmarks, focus handling, required/error presentation, notification-bell behavior and finite page/panel motion. API and release findings were repaired and tested.'],
 ['October 18–19','Integration work hardened submission retries, permissions, live profile synchronization, bounded history and upload/effect recovery. Independent follow-up probes addressed stale-session and retry-identity failures.'],
 ['October 19','Native follow-up added progress history, live-access holds/recovery and responder retry safeguards. The dated native snapshot reports clean analysis and 210 passing tests after the two independent-review repairs.']
 ],[2300,7780]),
 h('2. Features and modules developed or improved'),
 table(['Area','Status as of October 19'],[
 ['Public/access','Landing and sign-in/registration/recovery flows; validation and access-denied states implemented.'],
 ['Resident','Create and track reports, status/history, notifications and uncertain-send/retry guidance implemented.'],
 ['Staff and responder','Verification, assignment, field updates, closure, recently closed views, monitoring, analytics and admin workspaces implemented in their supported clients.'],
 ['Backend and data','Authenticated workflow mutations, role/team restrictions, idempotency claims, bounded history, security rules, indexes and recovery ledgers implemented and locally tested.']
 ],[2300,7780]),
 new Paragraph({children:[new PageBreak()]}),
 h('3. Challenges encountered and solutions'),
 table(['Challenge','Solution and remaining qualification'],[
 ['Lost replies and duplicate writes','Stable idempotency identities preserve unresolved payloads and prevent silent eviction. The server checks ownership and permission before replaying a result. Native A→B→A retry regressions were added.'],
 ['Stale team/role access and async races','Profile synchronization holds protected views until claims agree; listeners/drafts clear on identity changes. Session tokens prevent an old refresh from ending a fresh same-account session. Offline revocation is not instantaneous.'],
 ['Long history and photo cleanup','History queries are bounded and load older updates explicitly. Photo cleanup uses durable reconciliation and ownership fencing. Real Cloudinary behavior remains a provider verification gate.'],
 ['Diverging source trees and evidence','An authoritative integration, hashed manifests and extract-checked recovery bundles separated current source from historical working trees. Test counts from different snapshots were kept distinct.']
 ],[2800,7280]),
 h('4. Pending tasks and next-phase plan'),
 p('October 20–21: finish the native visual review and local demo build, refresh guide/screenshots, prepare the disclosed narrated walkthrough, and submit one Gantt chart plus this progress report. Confirm the marked member name and contribution entries.'),
 p('October 21–26: complete available hosted Auth/index/listener, real photo, email/push and device checks; obtain official hotline, authority, privacy/retention and support details. These depend on approved resources and owner input.'),
 p('October 23–29: repair remaining prioritized findings, rerun affected checks, review member explanations and rehearse the complete resident-to-response workflow. October 30: freeze the reviewed source and final demonstration package.'),
 h('Evidence and reporting basis'),
 p('Sources: repository commits dated October 16 (including 47252c3, 6439330, 52e8156 and e9c6426); October 18 release-audit commits; design-plans/full-repair-2026-10-19/RELEASE-LEDGER.md; NATIVE-FOLLOWUP-2026-10-19.md and NATIVE-INDEPENDENT-REVIEW-2026-10-19.md. The accompanying Gantt distinguishes verified activity, work in progress, proposed future work and reconstructed early baseline planning.'),
 p('Owner review required before upload: replace the marked full submission name and confirm actual individual roles/contributions. A system progress report does not substitute for the final individual contribution declaration.')
];
const doc=new Document({creator:'Rescue Reports project',title:'Rescue Reports — System Progress Update, October 12–19, 2026',styles:{default:{document:{run:{font:'Arial',size:21},paragraph:{spacing:{line:270}}}},heading1:{run:{font:'Arial',size:26,bold:true,color:'241747'}},title:{run:{font:'Arial',size:40,bold:true,color:'241747'}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:850,bottom:850,left:913,right:913}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'Rescue Reports • October 12–19, 2026   |   ',size:18,color:'6F687F'}),new TextRun({children:[PageNumber.CURRENT],size:18})]})]})},children}]});
Packer.toBuffer(doc).then(b=>fs.writeFileSync(path.join(out,'Rescue-Reports-Progress-October-12-19.docx'),b));
