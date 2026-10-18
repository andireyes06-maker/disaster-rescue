const { createRequire } = require('node:module');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/web/package.json');
const { chromium } = req('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto('http://localhost:5178/register', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('a')].filter(a => /sign in/i.test(a.textContent)).map(a => {
    const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
    return { text: a.textContent, cls: a.className, parent: a.parentElement.className, w: Math.round(r.width), h: Math.round(r.height), display: cs.display, minH: cs.minHeight };
  }))));
  await b.close();
})();
