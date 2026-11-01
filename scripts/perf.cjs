const { chromium } = require('/workspace/pw/node_modules/playwright-core');
const URL = process.env.URL || 'http://127.0.0.1:5199/riot-command/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h] of [[1440, 810], [1280, 720], [960, 540]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(URL + (process.env.Q === 'high' ? '?q=high' : ''));
    await page.waitForFunction(() => window.__RC, { timeout: 30000 });
    await page.click('#btn-start');
    const measure = async (label) => {
      await page.waitForTimeout(label.includes('auto') ? 9000 : 2500);
      await page.evaluate(() => { window.__RC.perf.window.length = 0; });
      await page.waitForTimeout(8000);
      const r = await page.evaluate(() => { const p = window.__RC.perf; const gl = p.gl; return { fps: +p.fps.toFixed(1), frameMs: +p.frameMs.toFixed(1), maxMs: +p.maxMs.toFixed(1), simMs: +p.jsMs.toFixed(2), calls: gl.info.render.calls, tris: gl.info.render.triangles, dpr: gl.getPixelRatio() }; });
      console.log(`${w}x${h}`, label, JSON.stringify(r));
    };
    await measure('auto-quality (shadows ON initially)');
    await page.evaluate(() => { const gl = window.__RC.perf.gl; gl.shadowMap.enabled = false; gl.shadowMap.needsUpdate = true; });
    await measure('shadows OFF');
    await page.close();
  }
  await browser.close();
})();
