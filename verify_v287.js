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

  console.log('--- 1. Testing Mobile Viewport (393 x 852) - Tab Tin nhắn ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await setupAuth(mobilePage);

  await mobilePage.goto('http://localhost:3000/vnedu/so-dau-bai', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('.mobile-app-wrapper', { timeout: 15000 });
  await mobilePage.waitForTimeout(2000);

  // Click on Tab 3: Tin nhắn (bottom nav item with text "Tin nhắn")
  console.log('Navigating to Tab Tin nhắn...');
  await mobilePage.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('.bottom-nav-item'));
    const msgTab = navItems.find(el => el.textContent.includes('Tin nhắn'));
    if (msgTab) msgTab.click();
  });

  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v287_tab_messages_list.png'),
    fullPage: false
  });
  console.log('Saved verify_v287_tab_messages_list.png');

  // Click on first teacher card (Thầy Nguyễn Hữu Trí or Thầy Trần Văn Nam)
  console.log('Opening chat conversation with teacher...');
  await mobilePage.evaluate(() => {
    const contactCards = Array.from(document.querySelectorAll('.chat-contact-card'));
    if (contactCards.length > 1) {
      contactCards[1].click(); // Click Thầy Trần Văn Nam
    } else if (contactCards.length > 0) {
      contactCards[0].click();
    }
  });

  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v287_chat_conversation.png'),
    fullPage: false
  });
  console.log('Saved verify_v287_chat_conversation.png');

  // Type a text message and click Send
  console.log('Sending text message...');
  const inputSelector = '.chat-text-input';
  await mobilePage.fill(inputSelector, 'Dạ em chào Thầy Nam, em đồng ý đổi tiết 3 sáng mai ạ!');
  await mobilePage.waitForTimeout(300);

  // Click send button
  await mobilePage.click('.btn-send-chat');
  await mobilePage.waitForTimeout(1000);

  // Take screenshot of conversation with sent message
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_v287_chat_sent_message.png'),
    fullPage: false
  });
  console.log('Saved verify_v287_chat_sent_message.png');

  await browser.close();
  console.log('Verification v2.8.7 finished successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
