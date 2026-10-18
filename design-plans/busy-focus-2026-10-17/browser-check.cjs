const {chromium,webkit}=require('/Users/rien/Documents/FINAL_PROJECT/web/node_modules/playwright');
const fs=require('fs');
(async()=>{
const engine=process.argv[2]||'Chromium'; const width=Number(process.argv[3]||1440); const b=await (engine==='WebKit'?webkit:chromium).launch(engine==='WebKit'?{executablePath:'/Users/rien/Library/Caches/ms-playwright/webkit-2359/pw_run.sh'}:{}); const p=await b.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
await p.goto('http://localhost:5174/login');
const cfg=await p.evaluate(async()=>{const a=(await import('/src/firebase-auth.ts')).getFirebaseAuth();return{project:a.app.options.projectId,emulator:!!a.emulatorConfig}});
if(!cfg.project.startsWith('demo-')||!cfg.emulator)throw Error('Non-demo environment');
await p.getByLabel('Email',{exact:true}).fill('demo-admin@demo.test'); await p.getByLabel('Password',{exact:true}).fill('Demo-Sample#2026');await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL('**/admin');
let release;let count=0;const results=[];
await p.route('**/api/**',async route=>{if(['POST','PATCH'].includes(route.request().method()) || route.request().url().includes('/export/')){count++;await new Promise(r=>release=r);await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'audit_delayed_failure'})});}else await route.continue();});
async function check(name,button){const before=count;await button.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-busy')==='true');const focused=await button.evaluate(e=>e===document.activeElement&&!e.disabled);await p.keyboard.press('Enter');await p.waitForTimeout(150);const requests=count-before;if(!focused||requests!==1)throw Error(name+' failed '+requests);release();await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-busy')==='false');results.push({name,focusDuringSave:focused,requests,focusAfterFailure:await button.evaluate(e=>e===document.activeElement)});}
await p.goto('http://localhost:5174/teams');await p.getByText('Create team',{exact:true}).first().click();await p.getByLabel('New team name').fill('Audit only, never persisted');await check('Create team',p.getByRole('button',{name:'Create team',exact:true}));
const edit=p.locator('summary').filter({hasText:'Edit name'}).first();await edit.click();await check('Rename team',p.getByRole('button',{name:'Save name'}).first());
await p.goto('http://localhost:5174/users');await p.locator('summary').filter({hasText:'Create staff account'}).click();await p.getByLabel('Email',{exact:true}).fill('audit-never-created@example.test');await p.getByLabel('Name',{exact:true}).fill('Audit only');await check('Create staff account',p.getByRole('button',{name:'Create account'}));
await check('Account status',p.getByRole('button',{name:/Deactivate /}).first());
await p.goto('http://localhost:5174/analytics');await check('Download CSV',p.getByRole('button',{name:'Download CSV'}));
const out='/Users/rien/Documents/FINAL_PROJECT/design-plans/busy-focus-2026-10-17';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/browser-'+engine+'-'+width+'.json',JSON.stringify({environment:cfg,engine,viewport:width,mutationResponses:'intercepted 503; no writes persisted',results},null,2));console.log(results);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
