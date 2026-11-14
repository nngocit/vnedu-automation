const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Bắt đầu kiểm tra chi tiết luồng âm thanh WebRTC P2P (Desktop <-> Mobile)...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--ignore-certificate-errors'
    ]
  });

  // 1. Desktop
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['microphone'],
    ignoreHTTPSErrors: true
  });
  const pageDesktop = await ctxDesktop.newPage();
  await pageDesktop.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await pageDesktop.evaluate(() => {
    localStorage.setItem('v8.1.8-authf649fc9a5f55', JSON.stringify({
      id: 99,
      username: 'xuanngocit@gmail.com',
      fullname: 'Thầy Xuân Ngọc (Admin)',
      email: 'xuanngocit@gmail.com',
      roles: [1],
      authToken: 'admin_token_2026',
      companyName: 'Ban Quản Trị vnEdu'
    }));
    localStorage.setItem('kt_theme_mode_value', 'dark');
  });
  await pageDesktop.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'domcontentloaded' });
  await pageDesktop.waitForTimeout(2000);

  // 2. Mobile
  const ctxMobile = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    permissions: ['microphone'],
    ignoreHTTPSErrors: true
  });
  const pageMobile = await ctxMobile.newPage();
  await pageMobile.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await pageMobile.evaluate(() => {
    localStorage.setItem('v8.1.8-authf649fc9a5f55', JSON.stringify({
      id: 1,
      username: '051197003685',
      fullname: 'Cô Lê Thị Diệu Huyên',
      email: '051197003685@vnedu.vn',
      roles: [1],
      authToken: 'mock_token_session_2026',
      companyName: 'Trường THCS An Lập'
    }));
    localStorage.setItem('kt_theme_mode_value', 'light');
  });
  await pageMobile.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'domcontentloaded' });
  await pageMobile.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await pageMobile.waitForTimeout(1500);

  // Mobile mở chat với Thầy Xuân Ngọc
  await pageMobile.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.bottom-nav-item, .nav-item, button, span'));
    const chatTab = tabs.find(t => t.textContent && t.textContent.includes('Tin nhắn'));
    if (chatTab) chatTab.click();
  });
  await pageMobile.waitForTimeout(1000);

  await pageMobile.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.chat-contact-card'));
    const xnCard = cards.find(c => c.textContent && c.textContent.includes('Xuân Ngọc') && !c.textContent.includes('KTDL'));
    if (xnCard) xnCard.click();
  });
  await pageMobile.waitForTimeout(1000);

  // Mobile gọi thoại
  console.log('📞 Mobile bấm gọi...');
  await pageMobile.evaluate(() => {
    const callBtn = document.querySelector('.btn-chat-topbar-icon');
    if (callBtn) callBtn.click();
  });

  // Desktop chờ chuông và bấm nhận cuộc gọi
  await pageDesktop.waitForSelector('.btn-call-accept', { timeout: 8000 });
  console.log('🖥️ Desktop nhận cuộc gọi...');
  await pageDesktop.evaluate(() => {
    const btn = document.querySelector('.btn-call-accept');
    if (btn) btn.click();
  });

  // Chờ 3s để WebRTC handshake hoàn tất
  await pageDesktop.waitForTimeout(3000);
  await pageMobile.waitForTimeout(1000);

  // Kiểm tra trạng thái WebRTC Audio trên cả hai bên
  const desktopWebRTC = await pageDesktop.evaluate(() => {
    const audioEl = document.getElementById('vneduDesktopRemoteAudio');
    return {
      audioElementExists: !!audioEl,
      audioPaused: audioEl ? audioEl.paused : null,
      audioMuted: audioEl ? audioEl.muted : null,
      hasSrcObject: audioEl ? !!audioEl.srcObject : false,
      srcObjectTracks: audioEl && audioEl.srcObject ? audioEl.srcObject.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })) : []
    };
  });

  const mobileWebRTC = await pageMobile.evaluate(() => {
    const audioEl = document.getElementById('vneduMobileRemoteAudio');
    return {
      audioElementExists: !!audioEl,
      audioPaused: audioEl ? audioEl.paused : null,
      audioMuted: audioEl ? audioEl.muted : null,
      hasSrcObject: audioEl ? !!audioEl.srcObject : false,
      srcObjectTracks: audioEl && audioEl.srcObject ? audioEl.srcObject.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })) : []
    };
  });

  console.log('🎧 Desktop WebRTC Audio Status:', JSON.stringify(desktopWebRTC, null, 2));
  console.log('📱 Mobile WebRTC Audio Status:', JSON.stringify(mobileWebRTC, null, 2));

  await browser.close();
  console.log('✅ Kiểm tra hoàn tất!');
})();
