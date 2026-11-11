const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Desktop viewport
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('1. Setting up auth on desktop...');
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

  console.log('2. Navigating to desktop http://localhost:3000/vnedu/so-dau-bai ...');
  await page.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Kiểm tra xem chuỗi "Biểu Đồ XYZ" có còn trên DOM không
  const chartExists = await page.evaluate(() => {
    return document.body.innerText.includes('Biểu Đồ XYZ Tỉ Lệ Chuyên Cần');
  });
  console.log('Chart "Biểu Đồ XYZ" exists on DOM?', chartExists);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v2811_desktop_hero.png'), fullPage: false });
  console.log('-> Captured verify_v2811_desktop_hero.png');

  await browser.close();
  console.log('Verification finished successfully!');
})();
