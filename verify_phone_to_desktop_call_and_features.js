const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

(async () => {
  console.log('🚀 Bắt đầu kiểm thử E2E: Gọi điện thoại sang máy tính & Tính năng Chat chuẩn SQLite');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  // 1. Tạo Context Desktop cho Thầy Xuân Ngọc (Admin)
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['microphone']
  });
  const pageDesktop = await ctxDesktop.newPage();
  await pageDesktop.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await pageDesktop.evaluate(() => {
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
    localStorage.setItem('kt_theme_mode_value', 'dark');
  });
  await pageDesktop.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'domcontentloaded' });
  await pageDesktop.waitForTimeout(2000);
  console.log('✅ Desktop (Thầy Xuân Ngọc) đã sẵn sàng nhận cuộc gọi');

  // 2. Tạo Context Mobile cho Cô Lê Thị Diệu Huyên
  const ctxMobile = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    permissions: ['microphone'],
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  });
  const pageMobile = await ctxMobile.newPage();
  await pageMobile.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await pageMobile.evaluate(() => {
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
  await pageMobile.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'domcontentloaded' });
  await pageMobile.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await pageMobile.waitForTimeout(1500);
  console.log('✅ Mobile (Cô Diệu Huyên) đã mở Sổ Đầu Bài');

  // Chuyển sang tab Tin nhắn trên Mobile
  console.log('👉 Click tab Tin nhắn...');
  await pageMobile.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.bottom-nav-item, .nav-item, button, span'));
    const chatTab = tabs.find(t => t.textContent && t.textContent.includes('Tin nhắn'));
    if (chatTab) chatTab.click();
  });
  await pageMobile.waitForTimeout(1500);

  // Chụp ảnh danh sách tin nhắn / hội thoại trên mobile
  await pageMobile.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_chat_list_mobile.png') });
  console.log('📸 Đã chụp test_chat_list_mobile.png');

  // Kiểm tra mở nhóm KTDL_NHOM để kiểm tra Quote, Mention @Thái Cường, Reaction 👍
  console.log('👉 Mở nhóm KTDL_NHOM...');
  const openedKtdl = await pageMobile.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.chat-contact-card'));
    const ktdlCard = cards.find(c => c.textContent && c.textContent.includes('KTDL_NHOM'));
    if (ktdlCard) {
      ktdlCard.click();
      return true;
    }
    return false;
  });

  if (openedKtdl) {
    await pageMobile.waitForTimeout(2000);
    console.log('✅ Đã mở nhóm KTDL_NHOM');
    
    // Kiểm tra các thành phần giao diện đặc tả
    const featuresCheck = await pageMobile.evaluate(() => {
      const mentions = Array.from(document.querySelectorAll('.mention-tag, span')).filter(s => s.textContent && s.textContent.includes('@Thái Cường'));
      const quotes = Array.from(document.querySelectorAll('.quote-box, .reply-quote-preview, div')).filter(d => d.textContent && d.textContent.includes('Tin nhắn đã được thu hồi'));
      const reactions = Array.from(document.querySelectorAll('.reaction-chip, button, span')).filter(r => r.textContent && r.textContent.includes('👍'));
      return {
        hasMention: mentions.length > 0,
        hasQuote: quotes.length > 0,
        hasReaction: reactions.length > 0,
        messageCount: document.querySelectorAll('.chat-bubble-card, .chat-message-row').length
      };
    });
    console.log('📊 Kết quả kiểm tra UI KTDL_NHOM:', featuresCheck);

    // Chụp ảnh nhóm KTDL_NHOM với Mention, Quote, Reaction
    await pageMobile.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_ktdl_chat_features.png') });
    console.log('📸 Đã chụp test_ktdl_chat_features.png');

    // Quay lại danh sách hội thoại
    await pageMobile.evaluate(() => {
      const backBtn = document.querySelector('.btn-chat-nav-back');
      if (backBtn) backBtn.click();
    });
    await pageMobile.waitForTimeout(1000);
  }

  // Mở hội thoại với Thầy Xuân Ngọc
  console.log('👉 Mở hội thoại với Thầy Xuân Ngọc...');
  await pageMobile.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.chat-contact-card'));
    const xnCard = cards.find(c => c.textContent && c.textContent.includes('Xuân Ngọc') && !c.textContent.includes('KTDL'));
    if (xnCard) xnCard.click();
  });
  await pageMobile.waitForTimeout(1500);

  // Bấm gọi thoại từ Mobile sang Desktop
  console.log('📞 Mobile: Bấm nút Gọi thoại sang Thầy Xuân Ngọc...');
  const callStarted = await pageMobile.evaluate(() => {
    const callBtn = document.querySelector('.btn-chat-topbar-icon');
    if (callBtn) {
      callBtn.click();
      return true;
    }
    return false;
  });
  console.log('Call trigger status:', callStarted);
  await pageMobile.waitForTimeout(1500);

  // Chụp ảnh màn hình Đang đổ chuông trên Mobile
  await pageMobile.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_mobile_calling_screen.png') });
  console.log('📸 Đã chụp test_mobile_calling_screen.png');

  // 3. Kiểm tra phía Desktop (Thầy Xuân Ngọc): Nhận thông báo cuộc gọi
  console.log('🖥️ Desktop: Chờ modal cuộc gọi đến...');
  await pageDesktop.waitForSelector('.btn-call-accept', { timeout: 8000 });
  await pageDesktop.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_desktop_incoming_call.png') });
  console.log('📸 Đã chụp test_desktop_incoming_call.png');

  // Bấm "Nhận cuộc gọi" trên Desktop (.btn-call-accept) bằng evaluate để tránh vướng animation
  console.log('👉 Desktop: Bấm nút .btn-call-accept Nhận cuộc gọi...');
  await pageDesktop.evaluate(() => {
    const btn = document.querySelector('.btn-call-accept');
    if (btn) btn.click();
  });
  console.log('✅ Đã click .btn-call-accept trên Desktop');

  // Chờ 3 giây để WebRTC kết nối và SSE/signal cập nhật trạng thái cả 2 bên
  await pageDesktop.waitForTimeout(3000);
  await pageMobile.waitForTimeout(1500);

  // 4. Kiểm tra trạng thái cả hai bên:
  // - Desktop phải hiển thị Modal Đang đàm thoại (active call modal) với timer đếm giây
  const desktopCallStatus = await pageDesktop.evaluate(() => {
    const modal = document.querySelector('.desktop-active-call-modal');
    const timer = document.querySelector('.desktop-active-call-modal .call-timer, .desktop-active-call-modal span');
    return {
      hasActiveCallModal: !!modal,
      content: modal ? modal.textContent.trim().replace(/\s+/g, ' ') : '',
      timerText: timer ? timer.textContent.trim() : ''
    };
  });
  console.log('📊 Trạng thái Desktop sau khi nghe máy:', desktopCallStatus);
  await pageDesktop.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_desktop_connected_call.png') });
  console.log('📸 Đã chụp test_desktop_connected_call.png');

  // - Mobile phải chuyển trạng thái thành "connected" (không còn "Đang đổ chuông...") và có timer đếm giây
  const mobileCallStatus = await pageMobile.evaluate(() => {
    const fullCall = document.querySelector('.zalo-call-overlay');
    const ringingPill = document.querySelector('.call-ringing-pill');
    const timerPill = document.querySelector('.call-timer-pill');
    const allText = fullCall ? fullCall.textContent : document.body.textContent;
    return {
      hasCallScreen: !!fullCall,
      isRingingVisible: !!ringingPill,
      isTimerVisible: !!timerPill,
      timerText: timerPill ? timerPill.textContent.trim() : '',
      allText: allText.replace(/\s+/g, ' ')
    };
  });
  console.log('📊 Trạng thái Mobile sau khi Desktop nghe máy:', mobileCallStatus);
  await pageMobile.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_mobile_connected_call.png') });
  console.log('📸 Đã chụp test_mobile_connected_call.png');

  await browser.close();
  console.log('🎉 Hoàn thành kiểm thử E2E!');
})();
