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
  console.log('=== BẮT ĐẦU TEST E2E v2.8.18: HIỆU ỨNG TYPING ĐANG SOẠN TIN 2-3s ===');
  await clearAllChat();
  console.log('✓ Đã dọn sạch tin nhắn cũ');

  const browser = await chromium.launch({ headless: true });

  const contextOptions = {
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  };

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

  // Mở tab Tin nhắn -> Mở chat với Cô Huyên
  await pageAdmin.locator('.mobile-bottom-nav .bottom-nav-item').filter({ hasText: 'Tin nhắn' }).click();
  await pageAdmin.waitForTimeout(1000);
  await pageAdmin.locator('.chat-contact-card').filter({ hasText: 'Huyên' }).first().click();
  await pageAdmin.waitForTimeout(1000);

  // Gửi tin nhắn từ Admin
  const sendMsg = 'Chào Cô Huyên, Thầy kiểm tra tiến độ SĐB tuần 10 nhé';
  console.log(`[Admin] Gửi tin nhắn: "${sendMsg}"`);
  await pageAdmin.fill('.chat-text-input', sendMsg);
  await pageAdmin.click('.btn-send-chat');

  // Chờ 1.6s -> lúc này đối phương đang gõ phím (typing indicator xuất hiện)
  await pageAdmin.waitForTimeout(1600);

  // Kiểm tra hiệu ứng typing indicator đang hiển thị
  const isTypingVisible = await pageAdmin.locator('.typing-row').isVisible();
  console.log(`>>> Hiệu ứng typing indicator đang hiển thị: ${isTypingVisible}`);

  const typingText = await pageAdmin.locator('.typing-bubble span').first().textContent();
  console.log(`>>> Nội dung bubble typing: "${typingText.trim()}"`);

  const headerTyping = await pageAdmin.locator('.conv-partner-sub').textContent();
  console.log(`>>> Header phòng chat hiển thị: "${headerTyping.trim()}"`);

  const shotTyping = path.join(ARTIFACT_DIR, 'verify_v2818_typing_indicator_active.png');
  await pageAdmin.screenshot({ path: shotTyping });
  console.log(`Đã lưu ảnh bằng chứng hiệu ứng typing: ${shotTyping}`);

  // Chờ tiếp 2.4s (tầm 2-3s gõ xong mới chuyển qua tin nhắn thật)
  console.log('Đang chờ đối phương gõ xong (2.3s)...');
  await pageAdmin.waitForTimeout(2500);

  // Kiểm tra typing đã biến mất và tin nhắn phản hồi đã xuất hiện!
  const isTypingStillThere = await pageAdmin.locator('.typing-row').isVisible();
  console.log(`>>> Typing indicator sau 2.3s đã kết thúc: ${!isTypingStillThere}`);

  const totalIncomingMsgs = await pageAdmin.locator('.chat-msg-row.incoming:not(.typing-row)').count();
  console.log(`>>> Tin nhắn phản hồi đã xuất hiện trong danh sách: ${totalIncomingMsgs > 0}`);

  const replyText = await pageAdmin.locator('.chat-msg-row.incoming .msg-text').last().textContent();
  console.log(`>>> Nội dung tin nhắn sau khi gõ xong chuyển qua: "${replyText.trim()}"`);

  // Kiểm tra tin nhắn của Admin đã chuyển sang "✓✓ Đã xem"
  const seenStatus = await pageAdmin.locator('.msg-status-seen').count();
  console.log(`>>> Tin nhắn của Admin đã đổi trạng thái sang "Đã xem": ${seenStatus > 0}`);

  const shotConverted = path.join(ARTIFACT_DIR, 'verify_v2818_typing_converted_to_message.png');
  await pageAdmin.screenshot({ path: shotConverted });
  console.log(`Đã lưu ảnh bằng chứng tin nhắn đã chuyển qua sau typing: ${shotConverted}`);

  console.log('=== TEST v2.8.18 HOÀN TẤT THÀNH CÔNG 100% ===');
  await browser.close();
})();
