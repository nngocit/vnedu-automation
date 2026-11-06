const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  // Seed authentication
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.setItem('vnedu_token', 'mock_token_huyen');
    localStorage.setItem('v8.1.8-authf649fc9a5f55', JSON.stringify({
      authToken: 'mock_token_huyen',
      refreshToken: 'mock_refresh',
      user: {
        id: 1,
        fullname: 'Cô Lê Thị Diệu Huyên',
        email: 'dieuhuyen@thcsanlap.edu.vn',
        roles: [1]
      }
    }));
  });

  await page.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const buttons = await page.$$eval('button, a.btn, .pill-btn', els => els.map(e => ({
    tag: e.tagName,
    text: e.innerText.trim().replace(/\n+/g, ' '),
    className: e.className,
    disabled: e.disabled
  })));

  console.log('Total buttons/action elements found:', buttons.length);
  buttons.forEach((b, i) => {
    console.log(`[${i+1}] ${b.tag}: "${b.text}" (class: ${b.className}, disabled: ${b.disabled})`);
  });

  await browser.close();
})();
