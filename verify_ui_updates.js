const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Set auth tokens in localStorage before loading
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

  console.log('Navigating to http://localhost:3000/vnedu/so-dau-bai ...');
  await page.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Screenshot Dashboard Top & Weather Widget
  const outDir = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';
  await page.screenshot({ path: path.join(outDir, 'verified_weather_and_hero.png'), clip: { x: 0, y: 0, width: 1440, height: 750 } });
  console.log('Saved verified_weather_and_hero.png');

  // 2. Hover over Class Row 7A2AL to verify rich tooltip
  const classRow = page.locator('.class-stat-row').first();
  if (await classRow.count() > 0) {
    await classRow.hover();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'verified_class_tooltip_hover.png'), clip: { x: 280, y: 200, width: 900, height: 500 } });
    console.log('Saved verified_class_tooltip_hover.png');
  }

  // 3. Hover over Spark column to verify spark tooltip
  const sparkCol = page.locator('.spark-column-item').first();
  if (await sparkCol.count() > 0) {
    await sparkCol.hover();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'verified_spark_tooltip_hover.png'), clip: { x: 700, y: 200, width: 700, height: 500 } });
    console.log('Saved verified_spark_tooltip_hover.png');
  }

  // 4. Scroll down to check table rows and bottom right corner (no duplicate scrolltop, clean "Sửa / Lưu lại" link)
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'verified_table_action_and_scrolltop.png') });
  console.log('Saved verified_table_action_and_scrolltop.png');

  // 5. Switch to Dark Mode and capture table
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.body.setAttribute('data-bs-theme', 'dark');
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'verified_dark_mode_contrast.png') });
  console.log('Saved verified_dark_mode_contrast.png');

  await browser.close();
  console.log('All verification screenshots captured!');
})();
