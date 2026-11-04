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

    console.log('Token:', token);

    const classes = [
        { id: '5004582066', name: '7A2AL', khoi: '7' },
        { id: '5004582046', name: '7A3AL', khoi: '7' },
        { id: '5004582186', name: '9A2AL', khoi: '9' }
    ];

    for (const cls of classes) {
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=app.sodaubai.serv.so_dau_bai&app_nam_hoc=2026&my_token=${token}`;
        const params = new URLSearchParams({
            my_token: token,
            my_user_id: '7365493419',
            app_nam_hoc: '2026',
            winId: 'win_' + cls.name,
            capHoc: '2',
            lopHoc: cls.id,
            khoiHoc: cls.khoi,
            tuanHoc: '8',
            show_goi_y: '0',
            diem_truong_id: '790826'
        });
        const res = await fetch(url, { method: 'POST', body: params });
        const html = await res.text();
        
        console.log(`\n=== TÌNH TRẠNG LỚP ${cls.name} (TUẦN 8) ===`);
        const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        rows.forEach(r => {
            if (r.includes('Huyên') || r.includes('Toán học') || r.includes('Hoạt động trải nghiệm') || r.includes('Ôn tập')) {
                const thu = r.match(/thu=["']?(\d+)["']?/i)?.[1];
                const buoi = r.match(/buoi(?:_hoc)?=["']?(\d+)["']?/i)?.[1];
                const tiet = r.match(/tiet=["']?(\d+)["']?/i)?.[1];
                const ppct = r.match(/tiet_ppct=["']?(\d+)["']?/i)?.[1];
                const clean = r.replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ').trim();
                console.log(`Thứ ${thu} | Buổi ${buoi === '1' ? 'Sáng' : 'Chiều'} | Tiết ${tiet} | PPCT: ${ppct} -> ${clean.substring(0, 100)}`);
            }
        });
    }

    await context.close();
})();
