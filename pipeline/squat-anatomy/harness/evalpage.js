const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const [html, js] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errs=[]; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.addInitScript(() => { const q=[]; let t=0; window.requestAnimationFrame=cb=>{q.push(cb);return q.length;}; window.__step=(n=1)=>{for(let i=0;i<n;i++){const c=q.splice(0);t+=16;c.forEach(f=>f(t));}}; });
  await page.route('**/three.min.js', r => r.fulfill({ path: path.join(__dirname,'node_modules/three/build/three.min.js'), contentType:'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body:'', contentType:'text/css' }));
  await page.goto('file://' + path.resolve(html));
  await page.waitForFunction(() => window.__squat && document.getElementById('status').hidden, null, {timeout:120000});
  const out = await page.evaluate(js); console.log(JSON.stringify(out, null, 1)); console.log('errors:', errs);
  await browser.close();
})();
