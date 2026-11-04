// usage: node shot.js <html> <outprefix> '<json shots>' [W H]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [html, outp, shotsJson, W, H] = process.argv.slice(2);
  const shots = JSON.parse(shotsJson);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +(W||1100), height: +(H||760) }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => {
    // manual frame stepping: the page's rAF loop only advances when __step() is called
    const q = []; let t = 0;
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.__step = (n = 1, dt = 16) => { const t0 = performance.now(); for (let i = 0; i < n; i++) { const cbs = q.splice(0); t += dt; cbs.forEach(cb => cb(t)); } return performance.now() - t0; };
  });
  await page.route('**/three.min.js', r => r.fulfill({ path: path.join(__dirname, 'node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('file://' + path.resolve(html));
  await page.waitForFunction(() => window.__squat && document.getElementById('status').hidden, null, { timeout: 120000 }).catch(e => logs.push('WAIT FAIL ' + e.message));
  for (const s of shots) {
    if (s.css) await page.addStyleTag({ content: s.css });
    await page.evaluate(o => window.__squat.set(o), s.set || {});
    if (s.js) await page.evaluate(s.js);
    const ms = await page.evaluate(n => window.__step(n), s.steps || 3);
    logs.push(`${s.name}: ${ms.toFixed(0)} ms for ${s.steps || 3} frames`);
    await page.screenshot({ path: `${outp}_${s.name}.png`, timeout: 90000 });
  }
  fs.writeFileSync(outp + '_log.txt', logs.join('\n'));
  await browser.close();
})();
