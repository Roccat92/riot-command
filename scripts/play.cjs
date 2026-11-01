// Kich ban choi tu dong (headless): ra lenh, tua nhanh, chup anh, do hieu nang.
const { chromium } = require('/workspace/pw/node_modules/playwright-core');
const URL = process.env.URL || 'http://127.0.0.1:5199/riot-command/';
const SLICE = process.env.SLICE === '1';
const TAG = SLICE ? 's' : 'm';
const MODE = process.env.MODE || 'advance';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/THREE.Clock/.test(m.text()))) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL + (SLICE ? '?slice=1&q=high' : '?q=high'));
  await page.waitForFunction(() => window.__RC, { timeout: 30000 });
  await page.click('#btn-start');
  await page.waitForTimeout(500);
  const snap = () => page.evaluate(() => {
    const { simLoop, perf } = window.__RC; const w = simLoop.world; const c = {};
    for (const u of w.units) if (u.team === 1) { const k = u.state + (u.exited ? '(x)' : ''); c[k] = (c[k] || 0) + 1; }
    const m = w.metrics;
    return { t: +w.time.toFixed(1), police: w.units.filter(u => u.team === 0 && u.state !== 'DOWN').length, civ: w.units.filter(u => u.team === 2 && u.active && u.state !== 'DOWN').length, stab: Math.round(m.stability), safe: Math.round(m.safety), force: Math.round(m.force), riot: c, status: w.status, fps: +perf.fps.toFixed(1), frameMs: +perf.frameMs.toFixed(1), maxMs: +perf.maxMs.toFixed(1) };
  });
  // fps o toc do 1x trong 8 giay thuc, truoc khi tua
  await page.waitForTimeout(8000);
  const fps1 = await snap();
  console.log('PERF 1x idle', JSON.stringify(fps1));
  await page.evaluate(() => { const { store } = window.__RC; store.getState().select([0, 1, 2].filter(i => i < window.__RC.simLoop.world.squads.length)); });
  if (MODE === 'advance') {
    await page.keyboard.press('KeyF');
  } else if (MODE === 'hold') {
    await page.keyboard.press('KeyH');
  }
  await page.evaluate(() => window.__RC.store.getState().setSpeed(4));
  let shot = 0;
  let closed = false;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000);
    const s = await snap();
    if (!closed && (s.riot.ENGAGE || 0) >= 4) {
      closed = true;
      await page.evaluate(() => { const { simLoop, cam } = window.__RC; const e = simLoop.world.units.filter(u => u.team === 1 && u.state === 'ENGAGE'); const cx = e.reduce((a, u) => a + u.x, 0) / e.length, cz = e.reduce((a, u) => a + u.z, 0) / e.length; cam.tx = cx; cam.tz = cz; cam.tzoom = 58; simLoop.paused = true; });
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `shots/${TAG}-${MODE}-closeup.png` });
      await page.evaluate(() => { const { simLoop, cam } = window.__RC; cam.tx = 0; cam.tz = 11; cam.tzoom = 22; simLoop.paused = false; });
      await page.waitForTimeout(1200);
    }
    if (i % 3 === 0 || s.status !== 'playing') { console.log(JSON.stringify(s)); await page.screenshot({ path: `shots/${TAG}-${MODE}-${String(shot++).padStart(2, '0')}.png` }); }
    if (s.status !== 'playing') break;
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/${TAG}-${MODE}-end.png` });
  const s = await snap();
  console.log('END', JSON.stringify(s));
  console.log('RESULT', JSON.stringify(await page.evaluate(() => window.__RC.simLoop.world.result)));
  console.log('errors:', errs);
  await browser.close();
})();
