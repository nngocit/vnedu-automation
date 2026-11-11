const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

async function setupAuth(page) {
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const user = {
      id: 1,
      username: '051197003685',
      fullname: 'Cô Lê Thị Diệu Huyên',
      email: '051197003685@vnedu.vn',
      phone: '051197003685',
      roles: [1],
      authToken: 'mock_token_session_2026',
      companyName: 'Trường THCS An Lập'
    };
    localStorage.setItem('v8.1.8-authf649fc9a5f55', JSON.stringify(user));
    localStorage.setItem('kt_theme_mode_value', 'light');
    document.documentElement.setAttribute('data-bs-theme', 'light');
    document.body.setAttribute('data-bs-theme', 'light');
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  console.log('1. Setting up auth...');
  await setupAuth(page);

  console.log('2. Navigating to http://localhost:3000/vnedu/so-dau-bai ...');
  await page.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await page.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Click vào Tab "Đồng bộ"
  console.log('3. Clicking Đồng bộ tab...');
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('.bottom-nav-item'));
    const syncTab = navItems.find(el => el.textContent.includes('Đồng bộ'));
    if (syncTab) syncTab.click();
  });
  await page.waitForTimeout(1000);

  // Chụp phần trên của trang Đồng bộ
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v2810_sync_top.png'), fullPage: false });
  console.log('-> Captured verify_v2810_sync_top.png');

  // Cuộn xuống một chút để xem danh sách các ngày
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v2810_sync_bottom.png'), fullPage: false });
  console.log('-> Captured verify_v2810_sync_bottom.png');

  await browser.close();
  console.log('Verification finished successfully!');
})();
