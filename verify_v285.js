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

  console.log('Testing Mobile Viewport (393 x 852) - Clean Header without duplicate subtabs...');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await setupAuth(mobilePage);

  await mobilePage.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await mobilePage.waitForTimeout(2500);

  // Check if header-subtabs-row is removed
  const subtabsExist = await mobilePage.$('.header-subtabs-row');
  console.log('Is header-subtabs-row present?', !!subtabsExist);

  // Take screenshot of top area (focusing on the new clean header)
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v285_mobile_clean_header.png'),
    fullPage: false
  });
  console.log('Saved verify_v285_mobile_clean_header.png');

  await browser.close();
  console.log('Verification finished successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
