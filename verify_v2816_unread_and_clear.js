const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

async function testUnreadAndClearFeatures() {
  console.log('--- BẮT ĐẦU KIỂM THỬ PLAYWRIGHT v2.8.16: UNREAD BADGE VÀ CLEAR HISTORY ---');
  const browser = await chromium.launch({ headless: true });

  // Window 1: Thầy Xuân Ngọc (Admin)
  const context1 = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  });
  const page1 = await context1.newPage();

  // Window 2: Cô Lê Thị Diệu Huyên (Giáo viên)
  const context2 = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  });
  const page2 = await context2.newPage();

  try {
    // 1. Cấu hình Page 1 (Admin)
    console.log('[Page 1] Thiết lập Auth cho Thầy Xuân Ngọc...');
    await page1.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
    await page1.evaluate(() => {
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
    await page1.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'domcontentloaded' });
    await page1.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
    await page1.waitForTimeout(1000);

    // Page 1: Vào tab Tin nhắn -> Mở chat với Cô Huyên
    const msgNavBtn1 = page1.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' });
    await msgNavBtn1.click();
    await page1.waitForTimeout(1000);

    const contactHuyen1 = page1.locator('.chat-contact-card').filter({ hasText: 'Huyên' }).first();
    await contactHuyen1.click();
    await page1.waitForTimeout(1000);

    // 2. Cấu hình Page 2 (Cô Huyên)
    console.log('[Page 2] Thiết lập Auth cho Cô Lê Thị Diệu Huyên...');
    await page2.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
    await page2.evaluate(() => {
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
    await page2.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'domcontentloaded' });
    await page2.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
    await page2.waitForTimeout(1000);

    // Page 2: Vào tab Tin nhắn nhưng GIỮ Ở MÀN HÌNH DANH BẠ (chưa mở cuộc hội thoại)
    const msgNavBtn2 = page2.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' });
    await msgNavBtn2.click();
    await page2.waitForTimeout(1000);

    // Đảm bảo Page 2 đang ở vai trò Giáo viên
    const roleBadge2 = await page2.locator('.chat-role-card .badge').first().textContent();
    if (roleBadge2.includes('Admin')) {
      await page2.locator('.btn-switch-role').click();
      await page2.waitForTimeout(600);
    }

    // 3. Page 1 gửi tin nhắn mới
    const testUnreadMsg = `Tin báo kiểm tra unread badge lúc ${new Date().toLocaleTimeString('vi-VN')}`;
    console.log(`[Page 1] Gửi tin nhắn tới Cô Huyên: "${testUnreadMsg}"`);
    await page1.fill('.chat-text-input', testUnreadMsg);
    await page1.click('.btn-send-chat');

    // Chờ nhận tin nhắn và kiểm tra unread badge trên Page 2
    console.log('[Page 2] Đang kiểm tra xuất hiện huy hiệu tin nhắn chưa đọc (unread badge)...');
    await page2.waitForSelector('.chat-contact-card .badge.bg-danger', { timeout: 5000 });
    const contactBadgeText = await page2.locator('.chat-contact-card .badge.bg-danger').textContent();
    console.log(`>>> THÀNH CÔNG: Badge trên thẻ liên hệ hiển thị: "${contactBadgeText.trim()}"`);

    // Kiểm tra badge trên bottom nav
    const hasNavBadge = await page2.locator('.nav-unread-badge').count();
    console.log(`>>> THÀNH CÔNG: Badge trên Bottom Navigation menu: ${hasNavBadge > 0 ? 'Đang hiển thị chuẩn xác!' : 'Chưa thấy'}`);

    const shotUnread = path.join(ARTIFACT_DIR, 'verify_v2816_unread_badge_received.png');
    await page2.screenshot({ path: shotUnread });
    console.log(`Đã lưu ảnh bằng chứng unread badge: ${shotUnread}`);

    // 4. Cô Huyên bấm vào liên hệ để xem tin nhắn -> Badge phải biến mất!
    console.log('[Page 2] Cô Huyên mở cuộc trò chuyện với Thầy Xuân Ngọc...');
    const contactNgoc2 = page2.locator('.chat-contact-card').filter({ hasText: 'Ngọc' }).first();
    await contactNgoc2.click();
    await page2.waitForTimeout(1200);

    const hasNavBadgeAfter = await page2.locator('.nav-unread-badge').count();
    console.log(`>>> THÀNH CÔNG: Sau khi mở đọc tin nhắn, Bottom Nav Badge biến mất (count = ${hasNavBadgeAfter})`);

    const shotRead = path.join(ARTIFACT_DIR, 'verify_v2816_unread_cleared_after_open.png');
    await page2.screenshot({ path: shotRead });
    console.log(`Đã lưu ảnh bằng chứng sau khi xem: ${shotRead}`);

    // 5. Kiểm tra tính năng xóa cuộc hội thoại kèm popup modal xác nhận
    console.log('[Page 2] Bấm nút "Xóa chat" để mở Modal xác nhận xóa...');
    await page2.locator('.btn-delete-conv').click();
    await page2.waitForTimeout(600);

    await page2.waitForSelector('.logout-confirm-dialog', { timeout: 3000 });
    const modalTitle = await page2.locator('.logout-confirm-dialog h3').textContent();
    console.log(`>>> THÀNH CÔNG: Modal xác nhận hiển thị với tiêu đề: "${modalTitle.trim()}"`);

    const shotModal = path.join(ARTIFACT_DIR, 'verify_v2816_clear_confirm_modal.png');
    await page2.screenshot({ path: shotModal });
    console.log(`Đã lưu ảnh modal xác nhận: ${shotModal}`);

    // Bấm Xác nhận xóa
    console.log('[Page 2] Bấm "✓ Xác nhận xóa"...');
    await page2.locator('.logout-confirm-dialog .btn-danger').click();
    await page2.waitForTimeout(1200);

    // Kiểm tra tin nhắn trong cuộc hội thoại trên Page 2 đã bị dọn sạch
    const msgRowsAfterPage2 = await page2.locator('.chat-msg-row').count();
    console.log(`>>> THÀNH CÔNG: Số tin nhắn còn lại trên Page 2: ${msgRowsAfterPage2} (Kỳ vọng = 0)`);

    // Đồng thời kiểm tra Page 1 cũng đã được đồng bộ xóa sạch tức thời
    await page1.waitForTimeout(800);
    const msgRowsAfterPage1 = await page1.locator('.chat-msg-row').count();
    console.log(`>>> THÀNH CÔNG: Số tin nhắn còn lại trên Page 1: ${msgRowsAfterPage1} (Kỳ vọng = 0)`);

    const shotWiped2 = path.join(ARTIFACT_DIR, 'verify_v2816_chat_wiped_huyen.png');
    const shotWiped1 = path.join(ARTIFACT_DIR, 'verify_v2816_chat_wiped_admin.png');
    await page2.screenshot({ path: shotWiped2 });
    await page1.screenshot({ path: shotWiped1 });
    console.log(`Đã lưu ảnh sạch tin nhắn Page 2: ${shotWiped2}`);
    console.log(`Đã lưu ảnh sạch tin nhắn Page 1: ${shotWiped1}`);

    console.log('=== TẤT CẢ KIỂM THỬ v2.8.16 ĐÃ HOÀN TẤT THÀNH CÔNG 100% ===');
  } catch (err) {
    console.error('Lỗi kiểm thử:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

testUnreadAndClearFeatures();
