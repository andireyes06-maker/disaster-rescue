const {chromium}=require('/Users/rien/Documents/FINAL_PROJECT/web/node_modules/playwright');
const fs=require('fs');
const out='/Users/rien/Documents/FINAL_PROJECT/design-plans/predeployment-audit-2026-10-16';
fs.mkdirSync(out+'/screenshots',{recursive:true});
const base='http://127.0.0.1:5175';
const results=[], errors=[], probes={};
const save=()=>{fs.writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2));fs.writeFileSync(out+'/browser-probes.json',JSON.stringify(probes,null,2));fs.writeFileSync(out+'/browser-console.json',JSON.stringify(errors,null,2));};
(async()=>{
 const browser=await chromium.launch({headless:true});
 async function context(){
  const c=await browser.newContext({viewport:{width:1440,height:900}});
  await c.route('**/*',r=>{const h=new URL(r.request().url()).hostname;return ['127.0.0.1','localhost'].includes(h)||h.endsWith('tile.openstreetmap.org')?r.fallback():r.abort();});
  await c.route('**/src/firebase.ts*',async r=>{const response=await r.fetch();const body=(await response.text()).replace(/8080/g,'8380').replace(/9099/g,'9299');await r.fulfill({response,body});});
  c.on('page',p=>{p.on('pageerror',e=>errors.push({url:p.url(),kind:'pageerror',message:e.message}));p.on('console',m=>{if(m.type()==='error')errors.push({url:p.url(),kind:'console',message:m.text().slice(0,300)});});});
  return c;
 }
 async function capture(p,name,route,width){
  await p.setViewportSize({width,height:900});
  if(route)await p.goto(base+route,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(450);
  await p.waitForFunction(()=>!document.querySelector('.loading'),{timeout:2500}).catch(()=>{});
  await p.screenshot({path:out+'/screenshots/'+name+'-'+width+'.png',fullPage:true});
  const m=await p.evaluate(()=>({url:location.pathname,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.title,h1:[...document.querySelectorAll('h1')].map(e=>e.innerText),headings:[...document.querySelectorAll('h2')].map(e=>e.innerText),text:document.body.innerText,mainCount:document.querySelectorAll('main').length,mapHeight:document.querySelector('.leaflet-container')?.getBoundingClientRect().height||0,smallTargets:[...document.querySelectorAll('a,button,input,select,summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<44||r.width<44)}).map(e=>({label:(e.innerText||e.getAttribute('aria-label')||e.id).slice(0,60),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).slice(0,20)}));
  results.push({name,width,...m});save();console.log(name,width,m.scrollWidth,m.h1.join('|'));
 }
 async function login(p,role){await p.goto(base+'/login');await p.getByLabel('Email',{exact:true}).fill(role+'@audit.test');await p.getByLabel('Password',{exact:true}).fill('AuditOnly#2026');await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL(u=>u.pathname!='/login',{timeout:20000});}
 let c=await context(),p=await c.newPage();
 for(const [name,path]of [['landing','/'],['login','/login'],['register','/register'],['forbidden','/forbidden']])for(const w of [1440,768,390,320])await capture(p,name,path,w);
 await c.close();
 const roles={dispatcher:[['dashboard','/dashboard'],['incident-submitted','/incidents/audit-1'],['incident-awaiting','/incidents/audit-2'],['incident-active','/incidents/audit-4'],['map','/map'],['analytics','/analytics'],['audit','/audit'],['teams','/teams'],['users','/users']],resident:[['resident','/my'],['resident-form','/my/report'],['resident-detail','/my/reports/audit-1']],admin:[['admin','/admin'],['admin-dashboard','/dashboard']],dmo:[['monitor','/monitor']],responder:[['assignments','/assignments']]};
 for(const [role,pages]of Object.entries(roles)){
  c=await context();p=await c.newPage();await login(p,role);
  for(const [name,path]of pages)for(const w of [1440,768,390,320])await capture(p,name,path,w);
  if(role==='dispatcher'){
   await p.setViewportSize({width:390,height:900});await p.goto(base+'/dashboard');await p.waitForTimeout(900);
   const rows=p.locator('.inbox__row');if(await rows.count()>1){await rows.nth(1).click();probes.mobileSelection=await p.evaluate(()=>({scrollY,viewportHeight:innerHeight,previewTop:document.querySelector('.inbox-preview')?.getBoundingClientRect().top,selected:document.querySelector('.inbox__row[aria-pressed="true"]')?.innerText,active:document.activeElement?.className}));await capture(p,'mobile-selected-preview',null,390);}
   await p.getByRole('button',{name:'Filters',exact:true}).click();await p.getByLabel('Type',{exact:true}).selectOption('fire');await p.goto(base+'/incidents/audit-2');await p.goBack();await p.waitForTimeout(500);probes.backState={url:p.url(),filterVisible:await p.getByLabel('Type',{exact:true}).isVisible().catch(()=>false),selectedCount:await p.locator('.inbox__row').count()};
   await p.goto(base+'/incidents/audit-2');await p.waitForTimeout(700);
   await p.route('**/api/teams',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"audit_failure"}'}));
   const assign=p.getByRole('button',{name:'Assign team',exact:true});if(await assign.count()){await assign.click();await p.waitForTimeout(500);probes.assignmentFailure=await p.locator('[role="dialog"]').evaluate(e=>({text:e.innerText,buttons:[...e.querySelectorAll('button')].map(x=>x.innerText),state:e.getAttribute('data-state'),dataOpen:e.hasAttribute('data-open'),animation:getComputedStyle(e).animationName,transform:getComputedStyle(e).transform}));await capture(p,'assignment-error-dialog',null,390);await p.keyboard.press('Escape');probes.assignmentEscape={dialogCount:await p.locator('[role="dialog"]').count(),focused:await p.evaluate(()=>document.activeElement?.textContent)};}
   await p.unroute('**/api/teams');
   await p.goto(base+'/dashboard');await p.waitForTimeout(500);await p.setViewportSize({width:768,height:900});await p.getByRole('button',{name:'Menu',exact:true}).click();await capture(p,'mobile-menu-open',null,768);await p.keyboard.press('Escape');probes.menuEscape={expanded:await p.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded')};
   await p.emulateMedia({reducedMotion:'reduce'});await p.goto(base+'/incidents/audit-2');await p.waitForTimeout(500);if(await p.getByRole('button',{name:'Assign team',exact:true}).count()){await p.getByRole('button',{name:'Assign team',exact:true}).click();probes.reducedDialog=await p.locator('[role="dialog"]').evaluate(e=>({animation:getComputedStyle(e).animationName,state:e.getAttribute('data-state')}));await p.keyboard.press('Escape');}
  }
  if(role==='admin'){await p.goto(base+'/dashboard');await p.waitForTimeout(700);probes.adminPreview={canSeeVerify:await p.locator('.inbox-preview').getByRole('link',{name:'Verify report',exact:true}).count(),body:(await p.locator('.inbox-preview').innerText()).slice(0,1300)};}
  if(role==='resident'){
   await p.goto(base+'/my');await p.waitForTimeout(600);probes.publicMap={emptyText:await p.getByText('No open incidents in this area right now.',{exact:true}).count()};
   await p.goto(base+'/my/report');await p.getByLabel('What is happening?',{exact:true}).fill('Audit draft typed but not submitted');await p.getByRole('link',{name:'My reports',exact:true}).click();await p.getByRole('link',{name:'Report an emergency',exact:true}).first().click();probes.residentDraft={description:await p.getByLabel('What is happening?',{exact:true}).inputValue()};
   await p.getByRole('button',{name:'Send report',exact:true}).count().then(async n=>{if(n){await p.getByRole('button',{name:'Send report',exact:true}).click();probes.invalidFormFocus=await p.evaluate(()=>({active:document.activeElement?.id,alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.innerText)}));}});
   await p.route('**/api/public/incidents',async r=>{await new Promise(x=>setTimeout(x,5000));await r.fulfill({status:200,contentType:'application/json',body:'{"incidents":[]}'}).catch(()=>{});});
   await p.goto(base+'/my');await p.waitForTimeout(800);probes.delayedMap=await p.getByRole('heading',{name:'Incidents near you',exact:true}).locator('..').evaluate(e=>({height:e.getBoundingClientRect().height,text:e.innerText}));await capture(p,'resident-delayed-map',null,390);
  }
  await c.close();save();
 }
 await browser.close();save();console.log('DONE',results.length,'captures');
})().catch(e=>{probes.fatal={message:e.message,stack:e.stack};save();console.error(e);process.exit(1);});
