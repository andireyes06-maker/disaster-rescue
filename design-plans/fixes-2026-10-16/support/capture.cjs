const {chromium}=require('/Users/rien/Documents/FINAL_PROJECT/web/node_modules/playwright');
const fs=require('fs');
const out=process.env.RESCUE_AUDIT_OUT || '/Users/rien/Documents/FINAL_PROJECT/design-plans/fixes-2026-10-16';
fs.mkdirSync(out+'/screenshots',{recursive:true});
const results=[];
(async()=>{
 const browser=await chromium.launch({headless:true});
 async function capture(page,label,route,width){
  await page.setViewportSize({width,height:900});
  if(route)await page.goto(route,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(600);
  await page.waitForFunction(()=>!document.querySelector('.loading'),{timeout:8000}).catch(()=>{});
  await page.waitForTimeout(300);
  await page.screenshot({path:out+'/screenshots/'+label+'-'+width+'.png',fullPage:true});
  const metrics=await page.evaluate(()=>{
   const style=s=>{const el=document.querySelector(s);if(!el)return null;const c=getComputedStyle(el),r=el.getBoundingClientRect();return{font:c.fontFamily,color:c.color,background:c.backgroundColor,width:r.width,height:r.height,x:r.x,y:r.y};};
   const els=[...document.querySelectorAll('body *')];
   return{url:location.href,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.title,headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>({tag:e.tagName,text:e.textContent})),body:style('body'),primary:style('.btn'),muted:style('.summary__label'),map:style('.leaflet-container'),main:style('main'),text:document.body.innerText,overflow:els.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)}).slice(0,12).map(e=>({tag:e.tagName,class:e.className})),smallTargets:[...document.querySelectorAll('a,button,input,select,textarea')].map(e=>({text:e.textContent?.trim().slice(0,70)||e.getAttribute('aria-label')||e.id,r:e.getBoundingClientRect()})).filter(e=>e.r.width>0&&(e.r.width<44||e.r.height<44)).map(e=>({text:e.text,width:e.r.width,height:e.r.height}))};
  });
  results.push({label,width,...metrics});
  fs.writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2));
  console.log(label,width,'scroll',metrics.scrollWidth,'map',metrics.map?.height||'-');
 }
 const local=await browser.newContext({viewport:{width:1440,height:900}});
 await local.route('**/src/firebase.ts*',async route=>{const r=await route.fetch();const body=await r.text();await route.fulfill({response:r,body:body.replace(/8080/g,'8180')});});
 await local.route('**/*',route=>{const h=new URL(route.request().url()).hostname;return ['127.0.0.1','localhost'].includes(h)||h.endsWith('tile.openstreetmap.org')?route.fallback():route.abort();});
 const page=await local.newPage();
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);fs.writeFileSync(out+'/console.json',JSON.stringify(errors,null,2));});page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.type()+': '+m.text().slice(0,350));});
 for(const [label,path] of [['landing','/'],['login','/login'],['forbidden','/forbidden']])for(const w of [1440,768,390,320])await capture(page,label,'http://127.0.0.1:5173'+path,w);
 await page.goto('http://127.0.0.1:5173/login');
 await page.getByLabel('Email',{exact:true}).fill('dispatcher@audit.test');await page.getByLabel('Password',{exact:true}).fill('AuditOnly#2026');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/dashboard',{timeout:20000});
 for(const [label,path] of [['dashboard','/dashboard'],['incident-submitted','/incidents/audit-1'],['incident-assignment','/incidents/audit-2'],['incident-active','/incidents/audit-4'],['incident-missing','/incidents/missing'],['map','/map'],['analytics','/analytics'],['audit','/audit'],['teams','/teams'],['users','/users']])for(const w of [1440,768,390,320])await capture(page,label,'http://127.0.0.1:5173'+path,w);
 await page.goto('http://127.0.0.1:5173/dashboard');await page.getByRole('button',{name:'Filters',exact:true}).click();await capture(page,'dashboard-filters',null,1440);await capture(page,'dashboard-filters',null,390);
 await page.getByLabel('Status',{exact:true}).selectOption('Rejected');await capture(page,'dashboard-empty',null,390);
 await page.goto('http://127.0.0.1:5173/incidents/audit-2');await page.getByRole('button',{name:'Assign team',exact:true}).click();await capture(page,'assign-dialog',null,1440);await capture(page,'assign-dialog',null,390);await page.keyboard.press('Escape');
 results.push({label:'assign-dialog-escape-focus',focused:await page.evaluate(()=>document.activeElement.textContent)});
 await page.goto('http://127.0.0.1:5173/incidents/audit-1');await page.getByRole('button',{name:'Reject',exact:true}).click();await capture(page,'reject-dialog',null,390);await page.keyboard.press('Escape');
 await page.goto('http://127.0.0.1:5173/users');await page.locator('.management-create > summary').click();await page.getByLabel('Email',{exact:true}).fill('new@audit.test');await page.getByLabel('Name',{exact:true}).fill('x'.repeat(101));await page.getByRole('button',{name:'Create account',exact:true}).click();await capture(page,'users-invalid',null,390);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL('**/login');
 for(const role of ['dmo','responder']){
  await page.getByLabel('Email',{exact:true}).fill(role+'@audit.test');await page.getByLabel('Password',{exact:true}).fill('AuditOnly#2026');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(role==='dmo'?'**/monitor':'**/assignments');
  const pages=role==='dmo'?[['monitor','/monitor'],['dmo-incident','/incidents/audit-4']]:[['assignments','/assignments']];
  for(const [label,path]of pages)for(const w of [1440,768,390,320])await capture(page,label,'http://127.0.0.1:5173'+path,w);
  if(role==='responder'){await page.getByRole('button',{name:'Post an update',exact:true}).first().click();await capture(page,'operation-form',null,1440);await capture(page,'operation-form',null,390);}
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL('**/login');
 }
 fs.writeFileSync(out+'/console.json',JSON.stringify(errors,null,2));
 await local.close();
 /* Production is unchanged; local verification only. */ const live=await browser.newContext();const lp=await live.newPage();
 for(const [label,path]of [])for(const w of [1440,390])try{await capture(lp,label,'https://disaster-rescue-web.vercel.app'+path,w);}catch(e){results.push({label,width:w,error:e.message});}
 fs.writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
