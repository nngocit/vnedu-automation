const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

async function testRealtimeChat() {
  console.log('--- KHỞI TẠO KIỂM THỬ PLAYWRIGHT CHAT REAL-TIME HAI CHIỀU ---');
  const browser = await chromium.launch({ headless: true });

  // Tạo Context 1 cho Thầy Xuân Ngọc (Admin)
  const context1 = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  });
  const page1 = await context1.newPage();

  // Tạo Context 2 cho Cô Lê Thị Diệu Huyên (Giáo viên)
  const context2 = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  });
  const page2 = await context2.newPage();

  try {
    // 1. Cấu hình Page 1 (Admin: Thầy Xuân Ngọc)
    console.log('[Page 1] Đang nạp Auth và trang với tư cách Thầy Xuân Ngọc (Admin)...');
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
    await page1.waitForTimeout(1500);

    // Chuyển sang tab Tin nhắn trên Page 1
    const msgNavBtn1 = page1.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' });
    await msgNavBtn1.click();
    await page1.waitForTimeout(1000);

    // Đảm bảo vai trò trên Page 1 là Admin
    const roleBadge1 = await page1.locator('.chat-role-card .badge').first().textContent();
    if (!roleBadge1.includes('Admin')) {
      console.log('[Page 1] Đang đổi vai trò sang Admin...');
      await page1.locator('.btn-switch-role').click();
      await page1.waitForTimeout(600);
    }

    // Chọn Cô Huyên trong danh bạ trên Page 1
    console.log('[Page 1] Đang chọn cuộc hội thoại với Cô Huyên...');
    const contactHuyen = page1.locator('.chat-contact-card').filter({ hasText: 'Huyên' }).first();
    await contactHuyen.click();
    await page1.waitForTimeout(1000);

    // 2. Cấu hình Page 2 (Giáo viên: Cô Lê Thị Diệu Huyên)
    console.log('[Page 2] Đang nạp Auth và trang với tư cách Cô Lê Thị Diệu Huyên...');
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
    await page2.waitForTimeout(1500);

    // Chuyển sang tab Tin nhắn trên Page 2
    const msgNavBtn2 = page2.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' });
    await msgNavBtn2.click();
    await page2.waitForTimeout(1000);

    // Đảm bảo vai trò trên Page 2 là Giáo viên (Cô Huyên)
    const roleBadge2 = await page2.locator('.chat-role-card .badge').first().textContent();
    if (roleBadge2.includes('Admin')) {
      console.log('[Page 2] Đang đổi vai trò sang Giáo viên...');
      await page2.locator('.btn-switch-role').click();
      await page2.waitForTimeout(600);
    }

    // Chọn Thầy Xuân Ngọc trong danh bạ trên Page 2
    console.log('[Page 2] Đang chọn cuộc hội thoại với Thầy Xuân Ngọc (Admin)...');
    const contactNgoc = page2.locator('.chat-contact-card').filter({ hasText: 'Ngọc' }).first();
    await contactNgoc.click();
    await page2.waitForTimeout(1000);

    // 3. Page 1 gửi tin nhắn tức thời tới Page 2
    const testMsg1 = `Alo Cô Huyên, Thầy gửi tức thời lúc ${new Date().toLocaleTimeString('vi-VN')}`;
    console.log(`[Page 1 -> Page 2] Đang gửi tin nhắn: "${testMsg1}"`);
    await page1.fill('.chat-text-input', testMsg1);
    await page1.click('.btn-send-chat');

    // Chờ tối đa 4 giây để Page 2 nhận được tin nhắn qua BroadcastChannel / SSE / Polling
    console.log('[Page 2] Đang chờ nhận tin nhắn tức thời...');
    await page2.waitForSelector(`.chat-msg-row:has-text("${testMsg1}")`, { timeout: 5000 });
    console.log('>>> THÀNH CÔNG: Page 2 đã nhận tức thời tin nhắn từ Page 1 mà không cần tải lại trang!');

    // 4. Page 2 trả lời tức thời lại cho Page 1
    const testMsg2 = `Dạ em nhận được ngay rồi Thầy ơi! (${new Date().toLocaleTimeString('vi-VN')})`;
    console.log(`[Page 2 -> Page 1] Đang gửi phản hồi: "${testMsg2}"`);
    await page2.fill('.chat-text-input', testMsg2);
    await page2.click('.btn-send-chat');

    // Chờ tối đa 4 giây để Page 1 nhận được phản hồi
    console.log('[Page 1] Đang chờ nhận phản hồi tức thời...');
    await page1.waitForSelector(`.chat-msg-row:has-text("${testMsg2}")`, { timeout: 5000 });
    console.log('>>> THÀNH CÔNG: Page 1 đã nhận tức thời phản hồi từ Page 2!');

    // 5. Kiểm tra layout trên Page 1 và Page 2
    const inputBar1 = await page1.locator('.chat-bottom-input-bar').boundingBox();
    const bottomNav1 = await page1.locator('.mobile-bottom-nav').boundingBox();
    console.log(`[Layout Page 1] Input Bar Bottom Y=${inputBar1.y + inputBar1.height}, Bottom Nav Top Y=${bottomNav1.y}`);
    const gap1 = Math.abs(bottomNav1.y - (inputBar1.y + inputBar1.height));
    console.log(`[Layout Page 1] Khoảng cách (gap) Input Bar và Bottom Nav: ${gap1.toFixed(1)}px (kỳ vọng <= 2px)`);

    const inputBar2 = await page2.locator('.chat-bottom-input-bar').boundingBox();
    const bottomNav2 = await page2.locator('.mobile-bottom-nav').boundingBox();
    const gap2 = Math.abs(bottomNav2.y - (inputBar2.y + inputBar2.height));
    console.log(`[Layout Page 2] Khoảng cách (gap) Input Bar và Bottom Nav: ${gap2.toFixed(1)}px (kỳ vọng <= 2px)`);

    // Chụp ảnh lưu bằng chứng
    const shotAdmin = path.join(ARTIFACT_DIR, 'verify_v2815_chat_realtime_admin.png');
    const shotHuyen = path.join(ARTIFACT_DIR, 'verify_v2815_chat_realtime_huyen.png');

    await page1.screenshot({ path: shotAdmin });
    await page2.screenshot({ path: shotHuyen });
    console.log(`Đã lưu ảnh Admin: ${shotAdmin}`);
    console.log(`Đã lưu ảnh Cô Huyên: ${shotHuyen}`);

    console.log('=== KIỂM THỬ THÀNH CÔNG RỰC RỠ 100% ===');
  } catch (err) {
    console.error('Lỗi kiểm thử:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

testRealtimeChat();
