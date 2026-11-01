// Kiem thu headless (playwright-core + Chrome): input, formation, di chuyen, AI, hieu nang. Anh vao shots/.
const { chromium } = require('/workspace/pw/node_modules/playwright-core');
const URL = process.env.URL || 'http://127.0.0.1:5199/riot-command/';
const SLICE = process.env.SLICE === '1';
const TAG = SLICE ? 's' : 'm';
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/THREE.Clock/.test(m.text()))) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL + (SLICE ? '?slice=1&q=high' : '?q=high'));
  await page.waitForFunction(() => window.__RC, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/${TAG}-01-briefing.png` });
  await page.click('#btn-start');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/${TAG}-02-start.png` });
  // helper: toa do man hinh cua mot diem the gioi
  const toScreen = (x, z, y = 0.9) => page.evaluate(([x, z, y]) => {
    const { camRef } = window.__RC; const c = camRef.current;
    const v = c.position.clone().set(x, y, z).project(c);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }, [x, z, y]);
  const state = () => page.evaluate(() => {
    const { simLoop, store } = window.__RC; const w = simLoop.world;
    return { sel: store.getState().selection, squads: w.squads.map(s => ({ id: s.id, f: s.formation, o: s.order, cx: +s.cx.toFixed(1), cz: +s.cz.toFixed(1), h: +s.heading.toFixed(2), err: +s.slotError.toFixed(2), dest: s.dest })), t: +w.time.toFixed(1), status: w.status };
  });
  const results = {};
  // 1. click chon squad 1
  let sq0 = await page.evaluate(() => { const s = window.__RC.simLoop.world.squads[0]; return { x: s.cx, z: s.cz }; });
  let p = await toScreen(sq0.x, sq0.z);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(300);
  let st = await state();
  results.clickSelect = JSON.stringify(st.sel) === '[0]';
  log('click select squad0 ->', st.sel);
  // 2. phim 2/3/1 doi hinh
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(100);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `shots/${TAG}-03-double-line.png` });
  st = await state(); results.formationDouble = st.squads[0].f === 'DOUBLE_LINE'; log('after 2:', st.squads[0].f, 'slotErr', st.squads[0].err);
  await page.keyboard.press('Digit3');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `shots/${TAG}-04-compact.png` });
  st = await state(); results.formationCompact = st.squads[0].f === 'COMPACT'; log('after 3:', st.squads[0].f, 'slotErr', st.squads[0].err);
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(2500);
  st = await state(); results.formationLine = st.squads[0].f === 'LINE'; log('after 1:', st.squads[0].f, 'slotErr', st.squads[0].err);
  // 3. chuot phai: di chuyen
  const before = (await state()).squads[0];
  p = await toScreen(-6, 4, 0);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/${TAG}-05-move-path.png` });
  st = await state(); log('after right click dest:', JSON.stringify(st.squads[0].dest), 'order', st.squads[0].o);
  results.moveOrder = st.squads[0].o === 'MOVE' && !!st.squads[0].dest;
  // do giu doi hinh khi di chuyen: slotError trung binh
  let errMax = 0, errSum = 0, n = 0;
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(400); const s = (await state()).squads[0]; errMax = Math.max(errMax, s.err); errSum += s.err; n++; }
  const after = (await state()).squads[0];
  log('moved from', before.cx, before.cz, 'to', after.cx, after.cz, 'slotErr avg', (errSum / n).toFixed(2), 'max', errMax.toFixed(2));
  results.moved = Math.hypot(after.cx - before.cx, after.cz - before.cz) > 5;
  results.keepsFormation = errMax < 2.5;
  await page.screenshot({ path: `shots/${TAG}-06-arrived.png` });
  // 4. keo chon nhieu squad
  const a = await toScreen(-14, 13, 0), b = await toScreen(14, 22, 0);
  await page.mouse.move(Math.min(a.x, b.x), 150);
  await page.mouse.down();
  await page.mouse.move(Math.max(a.x, b.x), 700, { steps: 8 });
  await page.screenshot({ path: `shots/${TAG}-07-box-select.png` });
  await page.mouse.up();
  await page.waitForTimeout(300);
  st = await state(); log('box select ->', st.sel);
  results.boxSelect = st.sel.length === (SLICE ? 2 : 3);
  // 5. camera: Q/E, wheel, WASD
  const camBefore = await page.evaluate(() => ({ ...window.__RC.cam, keys: undefined }));
  await page.keyboard.down('KeyD'); await page.waitForTimeout(500); await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyE'); await page.waitForTimeout(600); await page.keyboard.up('KeyE');
  await page.mouse.move(700, 400); await page.mouse.wheel(0, -500);
  await page.waitForTimeout(700);
  const camAfter = await page.evaluate(() => ({ ...window.__RC.cam, keys: undefined }));
  results.camera = camAfter.x > camBefore.x + 1 && camAfter.yaw > camBefore.yaw + 0.3 && camAfter.zoom > camBefore.zoom;
  log('camera', camBefore.x.toFixed(1), '->', camAfter.x.toFixed(1), 'yaw', camBefore.yaw.toFixed(2), '->', camAfter.yaw.toFixed(2), 'zoom', camBefore.zoom.toFixed(1), '->', camAfter.zoom.toFixed(1));
  await page.screenshot({ path: `shots/${TAG}-08-camera-rot.png` });
  // reset camera
  await page.evaluate(() => { const c = window.__RC.cam; c.tx = 0; c.tz = 11; c.tyaw = 0; c.tzoom = 22; });
  await page.waitForTimeout(900);
  // 6. space pause
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  const t1 = (await state()).t; await page.waitForTimeout(800); const t2 = (await state()).t;
  results.pause = t1 === t2;
  await page.keyboard.press('Space'); await page.waitForTimeout(500);
  const t3 = (await state()).t; results.resume = t3 > t2;
  log('pause test', t1, t2, t3);
  await browser.close();
  log('RESULTS', JSON.stringify(results));
  log('errors:', errs);
})();
