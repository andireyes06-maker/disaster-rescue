const {chromium}=require('/Users/rien/Documents/FINAL_PROJECT/app/web/node_modules/@playwright/test');
const fs=require('fs');
const out='/Users/rien/Documents/FINAL_PROJECT/app/videos/ireport-landing/evidence';
(async()=>{const browser=await chromium.launch({headless:true});const results=[];
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5718/',{waitUntil:'domcontentloaded'});
 const film=page.getByRole('figure',{name:'I-Report: report-to-response video'});await film.scrollIntoViewIfNeeded();
 const video=film.locator('video');await video.waitFor();await page.waitForFunction(()=>{const v=document.querySelector('.response-film video');return v&&v.readyState>=2&&v.currentTime>0&&!v.paused;});
 const initial=await video.evaluate(v=>({src:v.currentSrc,duration:v.duration,muted:v.muted,loop:v.loop,currentTime:v.currentTime,paused:v.paused}));
 if(!initial.src.endsWith('/media/ireport-response.mp4')||initial.duration!==16||!initial.muted||!initial.loop)throw Error('media contract');
 await film.getByRole('button',{name:'Pause video',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.response-film video').paused);
 for(const [label,start] of [['02 Coordinate',5],['03 Stay informed',10.5]]){
  await film.getByRole('button',{name:`Watch: ${label}`,exact:true}).click();
  await page.waitForFunction(s=>{const v=document.querySelector('.response-film video');return !v.paused&&v.currentTime>=s&&v.currentTime<s+2;},start);
 }
 await film.getByRole('button',{name:'Pause video',exact:true}).click();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('overflow');
 await page.screenshot({path:`${out}/landing-${width}.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await film.locator('img').waitFor();
 const poster=await film.locator('img').getAttribute('src');if(!poster.endsWith('ireport-response-poster.png'))throw Error('poster');
 await film.getByRole('button',{name:'Play video',exact:true}).click();await video.waitFor();
 results.push({width,initial,pause:true,chapters:true,poster,explicitPlay:true,overflow,pageErrors:errors});await page.close();
}
await browser.close();fs.writeFileSync(`${out}/player-check.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));})().catch(e=>{console.error(e);process.exit(1)});
