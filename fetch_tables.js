const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');

(async () => {
    const context = await chromium.launchPersistentContext(USER_DATA, {
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });

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

    console.log('Token:', token);

    // Lấy bảng thời khóa biểu tuần 8 của lớp 7A2AL (id: 5004582066)
    const table7A2 = await page.evaluate(async (tok) => {
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=app.sodaubai.serv.so_dau_bai&app_nam_hoc=2026&my_token=${tok}`;
        const params = new URLSearchParams({
            my_token: tok,
            my_user_id: '7365493419',
            app_nam_hoc: '2026',
            winId: 'win_test',
            capHoc: '2',
            lopHoc: '5004582066', // 7A2AL
            khoiHoc: '7',
            tuanHoc: '8',
            show_goi_y: '0',
            diem_truong_id: '790826'
        });
        const res = await fetch(url, { method: 'POST', body: params });
        return await res.text();
    }, token);

    fs.writeFileSync('table_7A2.html', table7A2, 'utf-8');
    console.log('Đã lưu table_7A2.html');

    // Lấy bảng thời khóa biểu tuần 8 của lớp 9A2AL (id: 5004582186)
    const table9A2 = await page.evaluate(async (tok) => {
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=app.sodaubai.serv.so_dau_bai&app_nam_hoc=2026&my_token=${tok}`;
        const params = new URLSearchParams({
            my_token: tok,
            my_user_id: '7365493419',
            app_nam_hoc: '2026',
            winId: 'win_test',
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

    fs.writeFileSync('table_9A2.html', table9A2, 'utf-8');
    console.log('Đã lưu table_9A2.html');

    await context.close();
})();
