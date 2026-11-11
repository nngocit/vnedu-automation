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

  console.log('--- 1. Testing Mobile Viewport (393 x 852) - Loaded Blue Card ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await setupAuth(mobilePage);

  await mobilePage.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await mobilePage.waitForTimeout(2000);

  // Capture Mobile Blue Profile Card
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v286_mobile_blue_card.png'),
    fullPage: false
  });
  console.log('Saved verify_v286_mobile_blue_card.png');

  // --- 2. Test Real Facebook Shimmer Skeleton loading state by delaying API ---
  console.log('--- 2. Intercepting API to capture real Facebook Shimmer Skeleton ---');
  const shimmerPage = await mobileContext.newPage();
  await setupAuth(shimmerPage);

  // Delay schedule requests by 5s to capture the real loading skeleton
  await shimmerPage.route('**/api/**', async route => {
    const url = route.request().url();
    if (url.includes('schedule') || url.includes('so-dau-bai')) {
      await new Promise(r => setTimeout(r, 6000));
    }
    await route.continue();
  });

  // Navigate and immediately wait for .mobile-skeleton-wrapper
  shimmerPage.goto('http://localhost:3000/vnedu/so-dau-bai');
  try {
    await shimmerPage.waitForSelector('.mobile-skeleton-wrapper', { timeout: 6000 });
    console.log('Found .mobile-skeleton-wrapper on page!');
    await shimmerPage.waitForTimeout(800);
    await shimmerPage.screenshot({
      path: path.join(ARTIFACT_DIR, 'verify_v286_mobile_shimmer.png'),
      fullPage: false
    });
    console.log('Saved verify_v286_mobile_shimmer.png (real skeleton loading state)');
  } catch (e) {
    console.log('Could not capture delayed skeleton via route:', e.message);
  }

  // --- 3. Desktop Check ---
  console.log('--- 3. Testing Desktop Viewport (1440 x 900) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  await setupAuth(desktopPage);
  await desktopPage.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v286_desktop.png'),
    fullPage: false
  });
  console.log('Saved verify_v286_desktop.png');

  await browser.close();
  console.log('Verification v2.8.6 completed successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
