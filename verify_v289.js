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
  await page.waitForTimeout(1500);

  // 1. Chụp màn hình Lịch dạy hôm nay (xác nhận phiên bản v2.8.9 và không có nút robot nổi che góc)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v289_mobile_schedule.png'), fullPage: false });
  console.log('-> Captured verify_v289_mobile_schedule.png');

  // 2. Chuyển sang Tab "Khám phá"
  console.log('3. Clicking Khám phá tab...');
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('.bottom-nav-item'));
    const discoverTab = navItems.find(el => el.textContent.includes('Khám phá'));
    if (discoverTab) discoverTab.click();
  });
  await page.waitForTimeout(1000);

  // Chụp màn hình Khám phá -> Tài Liệu (kiểm tra ô tìm kiếm phẳng, độ rộng 100%, viền các card không bị cấn lề phải, nút Tải về không bị đè)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v289_discover_docs.png'), fullPage: false });
  console.log('-> Captured verify_v289_discover_docs.png');

  // 3. Chuyển sang Subtab "Tiện Ích TT22"
  console.log('4. Clicking Tiện Ích TT22 subtab...');
  await page.evaluate(() => {
    const subtabs = Array.from(document.querySelectorAll('.discover-subtab-btn'));
    const toolsTab = subtabs.find(el => el.textContent.includes('Tiện Ích TT22'));
    if (toolsTab) toolsTab.click();
  });
  await page.waitForTimeout(800);

  // Chụp phần trên của Tiện ích TT22 (kiểm tra các ô nhập điểm phẳng, không bị chìm 3D)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v289_discover_tools_top.png'), fullPage: false });
  console.log('-> Captured verify_v289_discover_tools_top.png');

  // Cuộn xuống dưới cùng để xác nhận không bị Bottom Nav che mất nút Sao chép
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v289_discover_tools_bottom.png'), fullPage: false });
  console.log('-> Captured verify_v289_discover_tools_bottom.png');

  // 4. Chuyển sang Tab "Tin nhắn" để kiểm tra thanh tìm kiếm phẳng
  console.log('5. Clicking Tin nhắn tab...');
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('.bottom-nav-item'));
    const msgTab = navItems.find(el => el.textContent.includes('Tin nhắn'));
    if (msgTab) msgTab.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v289_chat_flat_search.png'), fullPage: false });
  console.log('-> Captured verify_v289_chat_flat_search.png');

  await browser.close();
  console.log('All verifications complete successfully!');
})();
