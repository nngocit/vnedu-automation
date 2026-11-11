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

async function run() {
  const browser = await chromium.launch({ headless: true });

  console.log('Testing Mobile Viewport (393 x 852) - 5 Tabs & Logout...');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await setupAuth(mobilePage);

  await mobilePage.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await mobilePage.waitForTimeout(2500);

  // Tab 1: Lịch dạy
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v284_tab1_schedule.png'),
    fullPage: false
  });
  console.log('Saved verify_v284_tab1_schedule.png');

  // Tab 2: Đồng bộ (Dedicated Sync Page, NOT a modal!)
  console.log('Switching to Tab 2: Đồng bộ...');
  const navButtons = mobilePage.locator('.mobile-bottom-nav .bottom-nav-item');
  await navButtons.nth(1).click();
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v284_tab2_sync.png'),
    fullPage: false
  });
  console.log('Saved verify_v284_tab2_sync.png');

  // Tab 3: Tin nhắn (Coming soon)
  console.log('Switching to Tab 3: Tin nhắn...');
  await navButtons.nth(2).click();
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v284_tab3_messages.png'),
    fullPage: false
  });
  console.log('Saved verify_v284_tab3_messages.png');

  // Tab 4: Khám phá (Coming soon)
  console.log('Switching to Tab 4: Khám phá...');
  await navButtons.nth(3).click();
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v284_tab4_discover.png'),
    fullPage: false
  });
  console.log('Saved verify_v284_tab4_discover.png');

  // Tab 5: Cá nhân (User Profile & Logout)
  console.log('Switching to Tab 5: Cá nhân...');
  await navButtons.nth(4).click();
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v284_tab5_profile.png'),
    fullPage: false
  });
  console.log('Saved verify_v284_tab5_profile.png');

  // Test Logout button in Profile View
  console.log('Clicking Logout button...');
  const logoutBtn = mobilePage.locator('.btn-mobile-logout');
  await logoutBtn.click();
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v284_logout_modal.png'),
    fullPage: false
  });
  console.log('Saved verify_v284_logout_modal.png');

  // Close logout dialog
  const cancelBtn = mobilePage.locator('.logout-confirm-dialog .btn-light');
  await cancelBtn.click();
  await mobilePage.waitForTimeout(300);

  await browser.close();
  console.log('All 5 tabs & logout verified successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
