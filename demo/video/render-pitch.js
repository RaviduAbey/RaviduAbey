const { chromium } = require('playwright');
(async () => {
  const FPS = 30;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/pitch.html');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  const total = Math.round((await p.evaluate(() => window.DURATION)) * FPS);
  for (let f = 0; f < total; f++) {
    await p.evaluate((x) => window.renderAt(x), f / FPS);
    await p.screenshot({ path: `pframes/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (f % 120 === 0) console.log('frame', f, '/', total);
  }
  console.log('done', total, 'errors', JSON.stringify(errs));
  await b.close();
})();
