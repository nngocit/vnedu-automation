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

  console.log('--- 1. Testing Mobile Viewport (393 x 852) - Tab Khám phá ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await setupAuth(mobilePage);

  await mobilePage.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await mobilePage.waitForTimeout(2000);

  // Click on Tab 4: Khám phá (bottom nav item with text "Khám phá")
  console.log('Navigating to Tab Khám phá...');
  await mobilePage.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('.bottom-nav-item'));
    const discoverTab = navItems.find(el => el.textContent.includes('Khám phá'));
    if (discoverTab) discoverTab.click();
  });

  await mobilePage.waitForTimeout(1000);

  // Screenshot 1: Sub-tab Tài Liệu (Document library)
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v288_discover_docs.png'),
    fullPage: false
  });
  console.log('Saved verify_v288_discover_docs.png');

  // Click on Sub-tab 2: Tiện Ích TT22
  console.log('Switching to Sub-tab Tiện ích TT22...');
  await mobilePage.evaluate(() => {
    const subtabs = Array.from(document.querySelectorAll('.discover-subtab-btn'));
    const toolsTab = subtabs.find(el => el.textContent.includes('Tiện Ích'));
    if (toolsTab) toolsTab.click();
  });

  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v288_discover_tools.png'),
    fullPage: false
  });
  console.log('Saved verify_v288_discover_tools.png');

  // Click on Sub-tab 3: Bản Tin
  console.log('Switching to Sub-tab Bản Tin...');
  await mobilePage.evaluate(() => {
    const subtabs = Array.from(document.querySelectorAll('.discover-subtab-btn'));
    const newsTab = subtabs.find(el => el.textContent.includes('Bản Tin'));
    if (newsTab) newsTab.click();
  });

  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v288_discover_news.png'),
    fullPage: false
  });
  console.log('Saved verify_v288_discover_news.png');

  await browser.close();
  console.log('Verification v2.8.8 completed successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
