const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  console.log('1. Setting up auth...');
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

  console.log('2. Navigating to so-dau-bai mobile schedule...');
  await page.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await page.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Check attendance chip text
  const attendanceChips = await page.$$('.attendance-pill');
  if (attendanceChips.length > 0) {
    const text0 = await attendanceChips[0].innerText();
    console.log('First attendance chip text:', text0);
  }

  // Check footer status and button
  const statusInfo = await page.$$('.slot-status-info');
  if (statusInfo.length > 0) {
    const statusText = await statusInfo[0].innerText();
    console.log('First slot status text:', statusText);
  }

  const slotActions = await page.$$('.btn-slot-action');
  if (slotActions.length > 0) {
    const actionText = await slotActions[0].innerText();
    console.log('First slot action button text:', actionText);
  }

  // Take screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_v2813_mobile_compact_slot.png') });
  console.log('-> Captured verify_v2813_mobile_compact_slot.png');

  console.log('Verification v2.8.13 finished successfully!');
  await browser.close();
})();
