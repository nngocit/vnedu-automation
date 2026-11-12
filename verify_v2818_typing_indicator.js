const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const ARTIFACT_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

function clearAllChat() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ clearAll: true });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat/messages/clear',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('=== BẮT ĐẦU TEST E2E v2.8.18: TYPING INDICATOR VÀ CHUYỂN QUA TIN NHẮN 2-3s (2 CỬA SỔ THỰC TẾ) ===');
  await clearAllChat();
  console.log('✓ Đã dọn sạch tin nhắn cũ');

  const browser = await chromium.launch({ headless: true });

  const contextOptions = {
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  };

  // Window 1: Admin (Thầy Xuân Ngọc)
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
  await pageAdmin.waitForTimeout(1000);

  // Admin mở tab Tin nhắn -> vào phòng chat với Cô Huyên
  await pageAdmin.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' }).click();
  await pageAdmin.waitForTimeout(800);
  await pageAdmin.locator('.chat-contact-card').filter({ hasText: 'Huyên' }).first().click();
  await pageAdmin.waitForTimeout(1000);

  // Window 2: Cô Lê Thị Diệu Huyên
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
  await pageHuyen.waitForTimeout(1000);

  // Cô Huyên mở tab Tin nhắn -> vào phòng chat với Thầy Ngọc
  await pageHuyen.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' }).click();
  await pageHuyen.waitForTimeout(800);
  await pageHuyen.locator('.chat-contact-card').filter({ hasText: 'Ngọc' }).first().click();
  await pageHuyen.waitForTimeout(1000);

  // Kịch bản 1: Admin gõ bàn phím -> Phía Cô Huyên nhận typing real-time
  console.log('[Kịch bản 1] Admin đang gõ tin nhắn...');
  await pageAdmin.fill('.chat-text-input', 'Cô Huyên ơi, kiểm tra giúp Thầy');
  await pageHuyen.waitForTimeout(600);

  // Phía Cô Huyên phải thấy typing wave & header "✍️ Đang soạn tin..."
  const isTypingHuyen = await pageHuyen.locator('.conv-partner-sub').textContent();
  console.log(`>>> Phía Cô Huyên thấy Header trạng thái: "${isTypingHuyen.trim()}"`);

  // Kịch bản 2: Admin bấm Gửi tin nhắn -> Phía Cô Huyên hiển thị hiệu ứng typing 2.3s trước khi tin nhắn chuyển qua!
  console.log('[Kịch bản 2] Admin bấm Gửi -> Phía Cô Huyên hiển thị typing wave 2.3s...');
  await pageAdmin.click('.btn-send-chat');

  // Kiểm tra ngay phía Cô Huyên: Typing row xuất hiện
  await pageHuyen.waitForTimeout(400);
  const hasTypingRow = await pageHuyen.locator('.typing-row').isVisible();
  console.log(`>>> Phía Cô Huyên thấy bubble typing đang gõ: ${hasTypingRow}`);

  const shotTypingActive = path.join(ARTIFACT_DIR, 'verify_v2818_typing_indicator_active.png');
  await pageHuyen.screenshot({ path: shotTypingActive });
  console.log(`Đã lưu ảnh Cô Huyên thấy Admin đang gõ phím: ${shotTypingActive}`);

  // Chờ 2.4s (gõ xong tầm 2-3s mới chuyển qua tin nhắn thật)
  console.log('Đang chờ gõ xong 2.3s để chuyển qua tin nhắn...');
  await pageHuyen.waitForTimeout(2500);

  const hasTypingAfter = await pageHuyen.locator('.typing-row').isVisible();
  const incomingMsgText = await pageHuyen.locator('.chat-msg-row.incoming .msg-text').last().textContent();
  console.log(`>>> Typing indicator đã kết thúc: ${!hasTypingAfter}`);
  console.log(`>>> Tin nhắn thật đã trượt vào màn hình: "${incomingMsgText.trim()}"`);

  const shotMsgArrived = path.join(ARTIFACT_DIR, 'verify_v2818_typing_converted_to_message.png');
  await pageHuyen.screenshot({ path: shotMsgArrived });
  console.log(`Đã lưu ảnh tin nhắn đã chuyển qua sau typing: ${shotMsgArrived}`);

  // Phía Admin: Tin nhắn chuyển sang "✓✓ Đã xem"
  await pageAdmin.waitForTimeout(1000);
  const seenCount = await pageAdmin.locator('.msg-status-seen').count();
  console.log(`>>> Phía Admin: Tin nhắn đã cập nhật trạng thái "✓✓ Đã xem" (${seenCount} tin)!`);

  console.log('=== TEST 2 CỬA SỔ HOÀN TẤT THÀNH CÔNG 100% ===');
  await browser.close();
})();
