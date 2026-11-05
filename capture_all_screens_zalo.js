const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\xuann\\.gemini\\antigravity\\brain\\2b77183e-ec37-42a8-8442-0daab9963c95';

(async () => {
    console.log('🚀 Starting screenshot capture of unified Zalo Clean UI theme...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 1. Auth setup
    console.log('1. Setting up auth session...');
    await page.goto('http://localhost:3000/auth/login');
    await page.evaluate(() => {
        const user = {
            id: 1,
            username: '051197003685',
            fullname: 'Cô La Thị Diệu Huyền',
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

    // 2. Open Main Page with Tuesday as today
    console.log('2. Navigating to Sổ Đầu Bài with ?date=03/11/2026...');
    await page.goto('http://localhost:3000/vnedu/so-dau-bai?date=03/11/2026', { waitUntil: 'networkidle' });
    await page.waitForSelector('.day-card', { timeout: 20000 });
    await page.waitForTimeout(1500);

    // Capture Screen 1: Main Page
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'zalo_theme_screen1_main.png'), fullPage: false });
    console.log('📸 Screen 1 saved: zalo_theme_screen1_main.png');

    // 3. Open Attendance Modal
    console.log('3. Opening Attendance Modal...');
    const chip = page.locator('.attendance-compare-chip').first();
    await chip.click();
    await page.waitForSelector('.modal-attendance-pro, .modal-dialog-custom', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Capture Screen 2: Attendance Modal
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'zalo_theme_screen2_attendance_modal.png'), fullPage: false });
    console.log('📸 Screen 2 saved: zalo_theme_screen2_attendance_modal.png');

    // Close Attendance Modal
    const closeBtn = page.locator('.btn-close-custom').first();
    await closeBtn.click();
    await page.waitForTimeout(1000);

    // 4. Open Supervisor Scan Modal
    console.log('4. Opening Supervisor Scan Modal...');
    const scanBtn = page.locator('button:has-text("Quét SĐĐ Giám Thị")').first();
    await scanBtn.click();
    await page.waitForSelector('.scan-tabs-group', { timeout: 25000 });
    await page.waitForTimeout(1500);

    // Click on tab "Đã Khớp Hoàn Toàn" to show matched list matching image 3
    const matchedTab = page.locator('.scan-tab-btn:has-text("Đã Khớp Hoàn Toàn")').first();
    if (await matchedTab.count() > 0) {
        await matchedTab.click();
        await page.waitForTimeout(1000);
    }

    // Capture Screen 3: Supervisor Modal
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'zalo_theme_screen3_supervisor_modal.png'), fullPage: false });
    console.log('📸 Screen 3 saved: zalo_theme_screen3_supervisor_modal.png');

    await browser.close();
    console.log('🎉 All 3 screens captured successfully!');
})();
