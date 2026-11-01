// Do hieu nang khi tat ca hieu ung (tia nuoc, hoi cay, lua, khoi, LRAD) cung bat. QS = chuoi query (vd "?quality=low" hoac "?q=high").
const { chromium } = require('/workspace/pw/node_modules/playwright-core');
const URL = process.env.URL || 'http://127.0.0.1:5199/riot-command/';
const QS = process.env.QS || '?q=high';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h] of [[1280, 720]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(URL + QS);
    await page.waitForFunction(() => window.__RC, { timeout: 30000 });
    await page.click('#btn-start');
    await page.evaluate(() => { const s = window.__RC.store.getState(); s.select([0, 1, 2]); s.applyOrder('HOLD'); s.setSpeed(4); });
    await page.waitForFunction(() => window.__RC.simLoop.world.time > 36, { timeout: 120000 });
    if (process.env.NOFX) { await page.evaluate(() => window.__RC.store.getState().setSpeed(1)); } else await page.evaluate(() => {
      const s = window.__RC.store.getState(); s.setSpeed(1);
      const wd = window.__RC.simLoop.world;
      wd.truck.x = 0; wd.truck.z = 14; s.truckAutoToggle();
      wd.burning.forEach((b, i) => { const o = wd.map.obstacles[i]; if (o.kind === 'box' && o.type !== 'bench') wd.burning[i] = 600; });
      s.fireTool('gas', 0, -10); s.fireTool('lrad', 0, -12);
    });
    const measure = async (label, ms = 9000) => {
      await page.evaluate(() => { window.__RC.perf.window.length = 0; });
      await page.waitForTimeout(ms);
      const r = await page.evaluate(() => { const p = window.__RC.perf; const gl = p.gl; return { fps: +p.fps.toFixed(1), frameMs: +p.frameMs.toFixed(1), maxMs: +p.maxMs.toFixed(1), simMs: +p.jsMs.toFixed(2), calls: gl.info.render.calls, tris: gl.info.render.triangles, dpr: gl.getPixelRatio(), shadows: gl.shadowMap.enabled }; });
      console.log(`${w}x${h}`, QS, label, JSON.stringify(r));
    };
    await page.waitForTimeout(3000);
    await measure('heavy fx');
    await page.evaluate(() => { const gl = window.__RC.perf.gl; gl.shadowMap.enabled = false; gl.shadowMap.needsUpdate = true; });
    await measure('heavy fx, shadows off');
    await page.close();
  }
  await browser.close();
})();
