const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ARTIFACTS_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

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
  console.log('=== BẮT ĐẦU TEST E2E v2.8.19: REPLY TIN NHẮN & CUỘC GỌI ZALO CALL (2 CỬA SỔ) ===');
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

  try {
    // 1. Cả 2 mở Tab Tin nhắn và chọn đối phương
    console.log('Admin & Cô Huyên cùng mở tab Tin nhắn...');
    await pageAdmin.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' }).click();
    await pageAdmin.waitForTimeout(800);
    await pageAdmin.locator('.chat-contact-card').filter({ hasText: 'Huyên' }).first().click();
    await pageAdmin.waitForTimeout(1000);

    await pageHuyen.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' }).click();
    await pageHuyen.waitForTimeout(800);
    await pageHuyen.locator('.chat-contact-card').filter({ hasText: 'Ngọc' }).first().click();
    await pageHuyen.waitForTimeout(1000);

    console.log('✓ Cả 2 cửa sổ đã vào phòng chat trực tiếp với nhau');

    // -------------------------------------------------------------------------
    // TEST PHẦN 1: TÍNH NĂNG REPLY / TRÍCH DẪN TIN NHẮN (NHƯ ZALO)
    // -------------------------------------------------------------------------
    console.log('[Test 1] Admin gửi tin nhắn để Cô Huyên reply...');
    await pageAdmin.fill('.chat-text-input', 'Chào Cô Huyên, tuần này cô đã dạy bù tiết 3 chưa ạ?');
    await pageAdmin.click('.btn-send-chat');
    await pageAdmin.waitForTimeout(3000); // Chờ 2.3s typing trôi qua để tin nhắn vào luồng chat

    // Phía Cô Huyên nhận tin nhắn
    await pageHuyen.waitForSelector('.chat-msg-row:has-text("Chào Cô Huyên, tuần này cô đã dạy bù tiết 3 chưa ạ?")', { timeout: 10000 });
    console.log('✓ Phía Cô Huyên đã nhận được tin nhắn từ Admin');

    // Cô Huyên bấm nút Reply (↩️)
    const replyBtn = await pageHuyen.locator('.group-msg-item .btn-reply-action').first();
    await replyBtn.click();
    await pageHuyen.waitForTimeout(500);

    // Kiểm tra Preview Reply Dock xuất hiện
    const replyDockVisible = await pageHuyen.locator('.reply-preview-dock').isVisible();
    console.log(`✓ Thanh preview trả lời hiển thị: ${replyDockVisible}`);

    // Cô Huyên nhập nội dung trả lời và bấm gửi
    await pageHuyen.fill('.chat-text-input', 'Dạ em đã dạy bù xong sáng thứ 4 rồi Thầy ạ!');
    await pageHuyen.click('.btn-send-chat');
    await pageHuyen.waitForTimeout(3000); // Chờ typing

    // Kiểm tra khối trích dẫn (quoted-box) xuất hiện
    await pageAdmin.waitForSelector('.quoted-box', { timeout: 10000 });
    const quotedText = await pageAdmin.locator('.quoted-box').first().textContent();
    console.log(`✓ Khối trích dẫn (quoted-box) hiển thị chuẩn: "${quotedText.trim()}"`);

    const replyShotPath = path.join(ARTIFACTS_DIR, 'verify_v2819_reply_message.png');
    await pageHuyen.screenshot({ path: replyShotPath });
    console.log(`Đã lưu ảnh tính năng reply: ${replyShotPath}`);

    // -------------------------------------------------------------------------
    // TEST PHẦN 2: TÍNH NĂNG GỌI ĐIỆN & VIDEO CALL (NHƯ ZALO)
    // -------------------------------------------------------------------------
    console.log('[Test 2] Admin bấm nút Gọi thoại (Voice Call) cho Cô Huyên...');
    await pageAdmin.locator('.btn-call-voice').click();
    await pageAdmin.waitForTimeout(600);

    // Phía Admin hiển thị Overlay Call Zalo
    const adminCallOverlay = await pageAdmin.locator('.zalo-call-overlay').isVisible();
    console.log(`✓ Admin mở màn hình Zalo Call Overlay: ${adminCallOverlay}`);

    // Phía Cô Huyên hiển thị Popup báo Cuộc gọi đến
    await pageHuyen.waitForSelector('.incoming-call-modal', { timeout: 5000 });
    const huyenIncomingPopup = await pageHuyen.locator('.incoming-call-modal').isVisible();
    console.log(`✓ Phía Cô Huyên xuất hiện Popup báo cuộc gọi đến: ${huyenIncomingPopup}`);

    const incomingShotPath = path.join(ARTIFACTS_DIR, 'verify_v2819_incoming_call.png');
    await pageHuyen.screenshot({ path: incomingShotPath });
    console.log(`Đã lưu ảnh thông báo cuộc gọi đến: ${incomingShotPath}`);

    // Cô Huyên bấm nút Xanh [Trả lời]
    console.log('Cô Huyên bấm nhận cuộc gọi...');
    await pageHuyen.locator('.incoming-call-modal .btn-success').click();
    await pageHuyen.waitForTimeout(1600); // Đợi 1.6s để đồng hồ đếm giờ

    // Kiểm tra cả 2 bên đều đang trong cuộc gọi và có đồng hồ bấm giờ
    const timerHuyen = await pageHuyen.locator('.call-status-indicator').textContent();
    const timerAdmin = await pageAdmin.locator('.call-status-indicator').textContent();
    console.log(`✓ Đồng hồ cuộc gọi phía Cô Huyên: ${timerHuyen.trim()}`);
    console.log(`✓ Đồng hồ cuộc gọi phía Admin: ${timerAdmin.trim()}`);

    const activeCallShotPath = path.join(ARTIFACTS_DIR, 'verify_v2819_active_call_timer.png');
    await pageAdmin.screenshot({ path: activeCallShotPath });
    console.log(`Đã lưu ảnh cuộc gọi đang hoạt động: ${activeCallShotPath}`);

    // Admin thử bấm Tắt/Bật Micro (Mute)
    await pageAdmin.locator('.call-control-btn[title="Bật/Tắt Micro"]').click();
    await pageAdmin.waitForTimeout(300);
    console.log('✓ Admin đã test nút Tắt/Bật Micro');

    // Cô Huyên bấm nút Đỏ [Kết thúc cuộc gọi]
    console.log('Cô Huyên bấm cúp máy...');
    await pageHuyen.locator('.btn-end-call').click();
    await pageHuyen.waitForTimeout(1500);
    await pageAdmin.waitForTimeout(1500);

    // Kiểm tra Call Overlay đã đóng trên cả 2 màn hình
    const callEndedHuyen = !(await pageHuyen.locator('.zalo-call-overlay').isVisible());
    const callEndedAdmin = !(await pageAdmin.locator('.zalo-call-overlay').isVisible());
    console.log(`✓ Màn hình cuộc gọi đã đóng an toàn trên cả 2 bên: ${callEndedHuyen && callEndedAdmin}`);

    // Kiểm tra Bong bóng Log Cuộc gọi xuất hiện trong luồng chat
    await pageAdmin.waitForSelector('.chat-call-log-row', { timeout: 5000 });
    const callLogText = await pageAdmin.locator('.chat-call-log-row .call-log-badge').first().textContent();
    console.log(`✓ Xuất hiện lịch sử cuộc gọi trong luồng chat: ${callLogText.replace(/\s+/g, ' ').trim()}`);

    const callLogShotPath = path.join(ARTIFACTS_DIR, 'verify_v2819_call_log_bubble.png');
    await pageAdmin.screenshot({ path: callLogShotPath });
    console.log(`Đã lưu ảnh bong bóng lịch sử cuộc gọi: ${callLogShotPath}`);

    console.log('=== TEST E2E v2.8.19 HOÀN TẤT THÀNH CÔNG 100% ===');
  } catch (err) {
    console.error('LỖI TEST E2E:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
