const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const context = await chromium.launchPersistentContext(path.join(__dirname, 'user_data'), { headless: true });
    const page = await context.newPage();
    
    // Listen for any request that has my_token!
    let capturedToken = null;
    let capturedUserId = null;
    
    page.on('request', req => {
        const url = req.url();
        const m = url.match(/my_token=([a-f0-9]+)/i);
        if (m) capturedToken = m[1];
        const u = url.match(/my_user_id=([0-9]+)/i) || (req.postData() && req.postData().match(/my_user_id=([0-9]+)/i));
        if (u) capturedUserId = u[1];
    });

    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', { waitUntil: 'networkidle', timeout: 30000 });
    
    if (page.url().includes('sso')) {
        await page.fill('#txtUsername', '051197003685');
        await page.fill('#txtPassword', 'Huyen0907@');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
            page.click('#btnLogin, input[type="submit"], button[type="submit"], .btn-login, #btnSubmit')
        ]);
    }
    
    // Đợi 4 giây cho các script trên trang vnEdu khởi động và gọi các API khởi tạo
    await page.waitForTimeout(4000);
    
    console.log('Captured Token from requests:', capturedToken);
    console.log('Captured UserId from requests:', capturedUserId);
    
    // Kiểm tra các biến toàn cục trên window
    const globals = await page.evaluate(() => {
        const found = {};
        for (let key in window) {
            if (key.toLowerCase().includes('token') || key.toLowerCase().includes('user') || key.toLowerCase().includes('id')) {
                try {
                    found[key] = String(window[key]).substring(0, 50);
                } catch(e) {}
            }
        }
        return found;
    });
    console.log('Globals:', globals);
    
    await context.close();
})();
