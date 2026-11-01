const { chromium } = require('/workspace/pw/node_modules/playwright-core');
const URL = process.env.URL || 'http://127.0.0.1:5199/riot-command/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL + '?slice=1');
  await page.waitForFunction(() => window.__RC, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/s1-briefing.png' });
  await page.click('#btn-start');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/s1-start.png' });
  console.log('errors:', errs);
  await browser.close();
})();
