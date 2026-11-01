// Chup anh xe voi rong, tia nuoc, hoi cay, luu dan choang, LRAD, vat can chay. Kiem tra loi console.
const { chromium } = require('/workspace/pw/node_modules/playwright-core');
const URL = process.env.URL || 'http://127.0.0.1:5199/riot-command/';
const PRE = process.env.PRE || 'tk';
const QS = process.env.QS || '?q=high';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/THREE.Clock/.test(m.text()))) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL + QS);
  await page.waitForFunction(() => window.__RC, { timeout: 30000 });
  await page.click('#btn-start');
  await page.waitForTimeout(400);
  const ev = (f, a) => page.evaluate(f, a);
  const focus = (x, z, zoom, yaw = 0) => ev(([x, z, zoom, yaw]) => { const c = window.__RC.cam; c.tx = x; c.tz = z; c.tzoom = zoom; c.tyaw = yaw; }, [x, z, zoom, yaw]);
  const shot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: `shots/${PRE}-${name}.png` }); console.log('shot', name); };
  await ev(() => { const s = window.__RC.store.getState(); s.select([0, 1, 2]); s.applyOrder('HOLD'); s.applyFormation('DOUBLE_LINE'); s.setSpeed(4); });
  // chay den khi dam dong keo toi (~t=40)
  await page.waitForFunction(() => window.__RC.simLoop.world.time > 38, { timeout: 120000 });
  await ev(() => window.__RC.store.getState().setSpeed(1));
  const info = () => ev(() => { const w = window.__RC.simLoop.world; const hot = w.units.filter((u) => u.team === 1 && u.active && ['APPROACH', 'ENGAGE', 'AGITATED'].includes(u.state)); return { t: +w.time.toFixed(1), hot: hot.length, truck: { x: w.truck.x, z: w.truck.z, water: w.truck.water, hp: w.truck.hp }, st: w.metrics.stats }; });
  console.log('A', JSON.stringify(await info()));
  // --- xe voi rong: dieu khien + phun ---
  await ev(() => { const w = window.__RC.simLoop.world; const t = w.truck; t.x = t.px = 2; t.z = t.pz = 8; t.heading = Math.PI; });
  await page.keyboard.press('KeyT');
  // dat cum nguoi bieu tinh truoc xe de tia nuoc co muc tieu
  const tgt = await ev(() => { const w = window.__RC.simLoop.world; const rs = w.units.filter((u) => u.team === 1 && u.active && u.state !== 'DOWN'); rs.sort((a, b) => a.z - b.z); const c = rs.slice(-1)[0]; const out = rs.filter((u) => Math.hypot(u.x - c.x, u.z - c.z) < 5); return { x: c.x, z: c.z, n: out.length }; });
  console.log('target', JSON.stringify(tgt));
  await ev(([x, z]) => { const w = window.__RC.simLoop.world; const rs = w.units.filter((u) => u.team === 1 && u.active).slice(0, 12); rs.forEach((u, i) => { u.x = u.px = 2 + (i % 4) * 1.1 - 1.5; u.z = u.pz = -2 - Math.floor(i / 4) * 1.2; u.state = 'ENGAGE'; u.agitation = 1; u.morale = 90; }); w.truck.aimX = 2; w.truck.aimZ = -4; w.truck.firing = true; }, [tgt.x, tgt.z]);
  await ev(() => { const a = window.__RC; a.cam.tx = 2; });
  await focus(2, 2, 28);
  await page.waitForTimeout(1500);
  await ev(() => window.__RC.store.getState().togglePause());
  await shot('01-water-jet');
  await focus(2, -2, 32, 0.5);
  await shot('02-water-knockdown');
  await ev(() => window.__RC.store.getState().togglePause());
  await page.waitForTimeout(2500);
  await ev(() => window.__RC.store.getState().togglePause());
  await focus(2, 0, 24, -0.4);
  await shot('03-puddles-ragdoll');
  console.log('B', JSON.stringify(await info()));
  await ev(() => { window.__RC.store.getState().truckSpray(false); window.__RC.store.getState().togglePause(); });
  // --- hoi cay ---
  await ev(() => { const w = window.__RC.simLoop.world; const rs = w.units.filter((u) => u.team === 1 && u.active).slice(0, 16); rs.forEach((u, i) => { u.x = u.px = -6 + (i % 4) * 1.3; u.z = u.pz = -8 - Math.floor(i / 4) * 1.3; u.state = 'APPROACH'; u.agitation = 1; u.morale = 80; u.knock = 0; }); });
  await page.keyboard.press('KeyY'); // tu dong
  await ev(() => { const w = window.__RC.simLoop.world; window.__RC.store.getState().fireTool('gas', -4.5, -9.5); });
  await page.waitForTimeout(3500);
  await ev(() => window.__RC.store.getState().togglePause());
  await focus(-4.5, -9, 26);
  await shot('04-tear-gas');
  await ev(() => window.__RC.store.getState().togglePause());
  // --- luu dan choang ---
  // luu dan choang: chay tay tung buoc de chup ngay luc no
  await ev(() => { window.__RC.store.getState().fireTool('flash', 3, -7); });
  await ev(() => { const { simLoop, stepWorld } = window.__RC; const w = simLoop.world; let n = 0; while (!w.fx.some((e) => e.kind === 'flash') && n++ < 90) stepWorld(w); for (let i = 0; i < 4; i++) stepWorld(w); });
  await focus(3, -6, 24);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `shots/${PRE}-05-flashbang.png` });
  console.log('shot 05-flashbang');
  // --- LRAD ---
  await ev(() => { window.__RC.store.getState().fireTool('lrad', 0, -14); });
  await page.waitForTimeout(1800);
  await ev(() => window.__RC.store.getState().togglePause());
  await focus(0, -4, 18);
  await shot('06-lrad');
  await ev(() => window.__RC.store.getState().togglePause());
  // --- vat can chay ---
  await ev(() => { const w = window.__RC.simLoop.world; w.burning.forEach((b, i) => { const o = w.map.obstacles[i]; if (o.kind === 'box' && (o.type === 'barrier' || o.type === 'van')) w.burning[i] = 40; }); });
  await ev(() => window.__RC.store.getState().selectTruck(false));
  await page.waitForTimeout(1500);
  await ev(() => window.__RC.store.getState().togglePause());
  await focus(-9, -3, 17);
  await shot('07-burning-barricades');
  await focus(-26, 9, 22);
  await shot('08-burning-van');
  await focus(0, 6, 15);
  await shot('09-hud');
  await ev(() => window.__RC.store.getState().togglePause());
  console.log('C', JSON.stringify(await info()));
  console.log('ERRORS', errs.length, errs.slice(0, 5));
  await browser.close();
})();
