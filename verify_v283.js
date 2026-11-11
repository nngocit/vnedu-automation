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

  console.log('Testing Mobile Viewport (393 x 852)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await setupAuth(mobilePage);

  await mobilePage.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await mobilePage.waitForTimeout(3000);

  // Measure typography on mobile
  const typographyReport = await mobilePage.evaluate(() => {
    const getStyles = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        color: s.color,
        lineHeight: s.lineHeight
      };
    };
    return {
      body: getStyles('body'),
      headerAppTitle: getStyles('.header-app-title'),
      headerAppSub: getStyles('.header-app-sub'),
      teacherName: getStyles('.teacher-name-heading'),
      badgeVerified: getStyles('.badge-verified-tnvn'),
      badgeVersion: getStyles('.badge-version-tnvn'),
      dayPillName: getStyles('.day-pill-btn.active .day-pill-name') || getStyles('.day-pill-name'),
      dayPillDate: getStyles('.day-pill-btn.active .day-pill-date') || getStyles('.day-pill-date'),
      bannerDayTitle: getStyles('.banner-day-title'),
      slotTietHeading: getStyles('.slot-tiet-heading'),
      slotTimeText: getStyles('.slot-time-text'),
      subjectTitle: getStyles('.subject-title'),
      ppctLabel: getStyles('.ppct-label'),
      inputPpct: getStyles('.input-ppct-tnvn'),
      formLabel: getStyles('.form-field-label'),
      inputForm: getStyles('.input-form-tnvn'),
      selectForm: getStyles('.select-form-tnvn'),
      bottomNavLabel: getStyles('.mobile-bottom-nav .active .nav-label')
    };
  });
  console.log('Typography report:', JSON.stringify(typographyReport, null, 2));

  // Screenshot 1: Mobile Top / Profile / Week / Days
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v283_mobile_home.png'),
    fullPage: false
  });
  console.log('Saved verify_v283_mobile_home.png');

  // Scroll down to inspect slot card inputs clearly
  await mobilePage.evaluate(() => window.scrollBy(0, 340));
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v283_mobile_slot.png'),
    fullPage: false
  });
  console.log('Saved verify_v283_mobile_slot.png');

  // Desktop View
  console.log('Testing Desktop Viewport (1440 x 900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  await setupAuth(desktopPage);
  await desktopPage.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(3000);

  await desktopPage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v283_desktop.png'),
    fullPage: false
  });
  console.log('Saved verify_v283_desktop.png');

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
