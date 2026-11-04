const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');

(async () => {
    const context = await chromium.launchPersistentContext(USER_DATA, { headless: true });
    const page = await context.newPage();
    let token = null;

    page.on('request', req => {
        const m = req.url().match(/my_token=([a-f0-9]{20,40})/i);
        if (m && !token) token = m[1];
    });

    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    if (page.url().includes('sso')) {
        await page.fill('#txtUsername', '051197003685');
        await page.fill('#txtPassword', 'Huyen0907@');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
            page.click('#btnLogin, input[type="submit"], button[type="submit"], .btn-login, #btnSubmit')
        ]);
    }

    for (let i = 0; i < 10; i++) {
        if (token) break;
        await page.waitForTimeout(1000);
    }

    // Tải lại bảng lớp 9A2AL Tuần 8
    const table9A2 = await page.evaluate(async (tok) => {
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=app.sodaubai.serv.so_dau_bai&app_nam_hoc=2026&my_token=${tok}`;
        const params = new URLSearchParams({
            my_token: tok,
            my_user_id: '7365493419',
            app_nam_hoc: '2026',
            winId: 'win_check',
            capHoc: '2',
            lopHoc: '5004582186', // 9A2AL
            khoiHoc: '9',
            tuanHoc: '8',
            show_goi_y: '0',
            diem_truong_id: '790826'
        });
        const res = await fetch(url, { method: 'POST', body: params });
        return await res.text();
    }, token);

    // Kiểm tra các dòng thứ 2 chiều tiết 3
    const rows = table9A2.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    console.log('=== KIỂM TRA CÁC DÒNG CỦA 9A2AL HIỆN TẠI ===');
    rows.forEach((r, idx) => {
        if (r.includes('Huyên') || r.includes('Hoạt động trải nghiệm') || r.includes('antigravity') || r.includes('Tìm hiểu')) {
            const clean = r.replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ').trim();
            console.log(`[Dòng ${idx}] ${clean}`);
        }
    });

    await context.close();
})();
