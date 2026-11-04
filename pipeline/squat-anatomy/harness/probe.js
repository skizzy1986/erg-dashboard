const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const [html, setJson, ptsJson] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.addInitScript(() => { const q=[]; let t=0; window.requestAnimationFrame=cb=>{q.push(cb);return q.length;}; window.__step=(n=1)=>{for(let i=0;i<n;i++){const c=q.splice(0);t+=16;c.forEach(f=>f(t));}}; });
  await page.route('**/three.min.js', r => r.fulfill({ path: path.join(__dirname,'node_modules/three/build/three.min.js'), contentType:'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body:'', contentType:'text/css' }));
  await page.goto('file://' + path.resolve(html));
  await page.waitForFunction(() => window.__squat && document.getElementById('status').hidden, null, {timeout:120000});
  await page.addStyleTag({content:'.panel:not(.tip){visibility:hidden!important}'});
  await page.evaluate(o => window.__squat.set(o), JSON.parse(setJson)); await page.evaluate(() => window.__step(3));
  for (const [x,y] of JSON.parse(ptsJson)) {
    await page.mouse.move(x,y); await page.evaluate(() => window.__step(1));
    const r=await page.evaluate(()=>{const t=document.getElementById('tip'); return t.style.opacity==='1'? t.innerText.split('\n').slice(0,6).join(' | '):'(none)';});
    console.log(x,y,'->',r.slice(0,90));
  }
  await browser.close();
})();
