const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ARTIFACTS_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

(async () => {
  console.log('=== TEST VIDEO CALL v2.8.19 ===');
  const browser = await chromium.launch({ headless: true });

  const contextOptions = {
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  };

  // Window 1: Cô Huyên
  const ctxHuyen = await browser.newContext(contextOptions);
  const pageHuyen = await ctxHuyen.newPage();
  await pageHuyen.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await pageHuyen.evaluate(() => {
    const huyenUser = {
      id: 1,
      username: '051197003685',
      fullname: 'Cô Lê Thị Diệu Huyên',
      email: '051197003685@vnedu.vn',
      phone: '051197003685',
      roles: [1],
      authToken: 'mock_token_session_2026',
      companyName: 'Trường THCS An Lập'
    };
    localStorage.setItem('v8.1.8-authf649fc9a5f55', JSON.stringify(huyenUser));
    localStorage.setItem('kt_theme_mode_value', 'light');
  });
  await pageHuyen.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'domcontentloaded' });
  await pageHuyen.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });

  // Window 2: Admin
  const ctxAdmin = await browser.newContext(contextOptions);
  const pageAdmin = await ctxAdmin.newPage();
  await pageAdmin.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await pageAdmin.evaluate(() => {
    const adminUser = {
      id: 99,
      username: 'xuanngocit@gmail.com',
      fullname: 'Thầy Xuân Ngọc (Admin)',
      email: 'xuanngocit@gmail.com',
      roles: [1],
      authToken: 'admin_token_2026',
      companyName: 'Ban Quản Trị vnEdu'
    };
    localStorage.setItem('v8.1.8-authf649fc9a5f55', JSON.stringify(adminUser));
    localStorage.setItem('kt_theme_mode_value', 'light');
  });
  await pageAdmin.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'domcontentloaded' });
  await pageAdmin.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });

  try {
    await pageHuyen.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' }).click();
    await pageHuyen.waitForTimeout(600);
    await pageHuyen.locator('.chat-contact-card').filter({ hasText: 'Ngọc' }).first().click();
    await pageHuyen.waitForTimeout(800);

    await pageAdmin.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' }).click();
    await pageAdmin.waitForTimeout(600);
    await pageAdmin.locator('.chat-contact-card').filter({ hasText: 'Huyên' }).first().click();
    await pageAdmin.waitForTimeout(800);

    // Cô Huyên bấm nút Gọi Video (📹)
    console.log('Cô Huyên bấm gọi video...');
    await pageHuyen.locator('.btn-call-video').click();
    await pageHuyen.waitForTimeout(500);

    // Admin thấy popup cuộc gọi video đến
    await pageAdmin.waitForSelector('.incoming-call-modal', { timeout: 5000 });
    console.log('Admin nhận popup video call');

    // Admin bấm nhận cuộc gọi
    await pageAdmin.locator('.incoming-call-modal .btn-success').click();
    await pageAdmin.waitForTimeout(1500);

    // Chụp ảnh màn hình Video Call với luồng video & PIP
    const videoShotPath = path.join(ARTIFACTS_DIR, 'verify_v2819_active_video_call.png');
    await pageAdmin.screenshot({ path: videoShotPath });
    console.log(`Đã lưu ảnh Video Call: ${videoShotPath}`);

    // Admin bấm cúp máy
    await pageAdmin.locator('.btn-end-call').click();
    await pageAdmin.waitForTimeout(800);

    // Xác nhận log cuộc gọi video xuất hiện
    const lastMsgText = await pageHuyen.locator('.chat-call-log-row .call-log-badge').last().textContent();
    console.log(`Log video call: ${lastMsgText.replace(/\s+/g, ' ').trim()}`);

    console.log('=== TEST VIDEO CALL HOÀN TẤT THÀNH CÔNG ===');
  } catch (err) {
    console.error('LỖI TEST VIDEO CALL:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
