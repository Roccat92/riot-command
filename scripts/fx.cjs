// Chup anh cac hieu ung nem / vong canh bao / vung lua / ne bang cach tam dung mo phong dung luc. Kiem tra loi console.
const { chromium } = require('/workspace/pw/node_modules/playwright-core');
const URL = process.env.URL || 'http://127.0.0.1:5199/riot-command/';
const PRE = process.env.PRE || 'fx';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/THREE.Clock/.test(m.text()))) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL + '?q=high');
  await page.waitForFunction(() => window.__RC, { timeout: 30000 });
  await page.screenshot({ path: `shots/${PRE}-01-briefing.png` });
  await page.click('#btn-start');
  await page.waitForTimeout(500);
  await page.evaluate(() => { const { store } = window.__RC; store.getState().select([0, 1, 2]); });
  await page.keyboard.press('KeyH');
  await page.keyboard.press('Digit3');
  await page.evaluate(() => window.__RC.store.getState().setSpeed(4));
  const focus = (x, z, zoom) => page.evaluate(([x, z, zoom]) => { const c = window.__RC.cam; c.tx = x; c.tz = z; c.tzoom = zoom; c.tyaw = 0; }, [x, z, zoom]);
  const shots = {};
  const want = ['throw', 'molotov', 'fire', 'dodge', 'wave'];
  let dodgedPressed = false;
  for (let i = 0; i < 400 && want.some((k) => !shots[k]); i++) {
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const w = window.__RC.simLoop.world;
      const ps = w.projectiles.filter((p) => p.active).map((p) => ({ k: p.kind, tx: p.tx, tz: p.tz, pr: p.t / p.dur }));
      const fs = w.fires.filter((f) => f.active).map((f) => ({ x: f.x, z: f.z, t: f.t }));
      const dodgers = w.units.filter((u) => u.team === 0 && u.anim === 'DODGE' && u.animT > 0).length;
      const a = w.alert && w.time - w.alert.t < 3 ? w.alert.text : null;
      return { t: w.time, ps, fs, dodgers, alert: a, st: w.metrics.stats };
    });
    const pause = async (name, x, z, zoom) => {
      await page.evaluate(() => window.__RC.store.getState().togglePause());
      await focus(x, z, zoom);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `shots/${PRE}-${name}.png` });
      console.log('shot', name, 't=' + info.t.toFixed(1), JSON.stringify({ proj: info.ps.length, fires: info.fs.length }));
      shots[name.split('-')[1]] = true;
      await page.evaluate(() => window.__RC.store.getState().togglePause());
    };
    if (!shots.wave && info.alert) await pause('02-wave', 0, 0, 14).then(() => (shots.wave = true));
    else if (!shots.molotov && info.ps.some((p) => p.k === 2 && p.pr > 0.3 && p.pr < 0.8)) {
      const p = info.ps.find((p) => p.k === 2);
      await pause('03-molotov-warning', p.tx, p.tz + 2, 38).then(() => (shots.molotov = true));
    } else if (!shots.throw && info.ps.some((p) => p.k !== 2 && p.pr > 0.3 && p.pr < 0.8)) {
      const p = info.ps.find((p) => p.k !== 2);
      await pause('04-throw-ring', p.tx, p.tz + 2, 38).then(() => (shots.throw = true));
    } else if (!shots.fire && info.fs.some((f) => f.t > 1.5)) {
      const f = info.fs[0];
      await pause('05-fire-zone', f.x, f.z + 1, 34).then(() => (shots.fire = true));
    } else if (!shots.dodge && info.dodgers > 0) {
      await pause('06-dodge', 0, 6, 20).then(() => (shots.dodge = true));
    }
    if (!dodgedPressed && info.t > 20) {
      dodgedPressed = true;
      await page.keyboard.press('KeyV');
    }
    if (info.t > 220) break;
  }
  await page.evaluate(() => { const c = window.__RC.cam; c.tx = 0; c.tz = 4; c.tzoom = 17; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/${PRE}-07-hud.png` });
  const final = await page.evaluate(() => { const w = window.__RC.simLoop.world; return { t: +w.time.toFixed(1), stats: w.metrics.stats, hud: window.__RC.store.getState().hud }; });
  console.log('FINAL', JSON.stringify({ t: final.t, thrown: final.stats.thrown, molotovs: final.stats.molotovs, fires: final.stats.fireZones, blocked: final.stats.blocked, dodged: final.stats.dodged, hudThrown: final.hud.thrown, hudFires: final.hud.fireTotal }));
  console.log('shots', JSON.stringify(shots));
  console.log('ERRORS', errs.length, errs.slice(0, 5));
  await browser.close();
})();
