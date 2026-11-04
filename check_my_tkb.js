const { chromium } = require('playwright');
const path = require('path');

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

    // Kiểm tra các tiết của lớp 9A2AL (id: 5004582186) và 7A2AL (id: 5004582066)
    // Các ngày từ Thứ 2 (26/10) đến Thứ 7 (31/10)
    const dates = [
        { thu: 2, ngay: '26/10/2026' },
        { thu: 3, ngay: '27/10/2026' },
        { thu: 4, ngay: '28/10/2026' },
        { thu: 5, ngay: '29/10/2026' },
        { thu: 6, ngay: '30/10/2026' },
        { thu: 7, ngay: '31/10/2026' }
    ];

    const classes = [
        { id: '5004582186', name: '9A2AL' },
        { id: '5004582066', name: '7A2AL' }
    ];

    console.log('🔍 Đang kiểm tra các tiết trên TKB của cô Lê Thị Diệu Huyền...');

    const mySlots = await page.evaluate(async ({ dates, classes, tok }) => {
        const slots = [];
        for (const cls of classes) {
            for (const d of dates) {
                for (let buoi = 1; buoi <= 2; buoi++) {
                    for (let tiet = 1; tiet <= 5; tiet++) {
                        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.getGoiYSoDauBai&app_nam_hoc=2026&my_token=${tok}`;
                        const params = new URLSearchParams({
                            my_token: tok,
                            my_user_id: '7365493419',
                            app_nam_hoc: '2026',
                            cap_hoc: '2',
                            ngay: d.ngay,
                            mon_hoc_id: '',
                            lop_hoc_id: cls.id,
                            tiet: String(tiet),
                            buoi: String(buoi),
                            tuan: '8'
                        });
                        try {
                            const res = await fetch(url, { method: 'POST', body: params });
                            const json = await res.json();
                            if (json.success && json.data) {
                                const data = json.data;
                                // Kiểm tra xem có phải cô Huyền không
                                if (data.gv_ho_va_ten && (data.gv_ho_va_ten.includes('Huyên') || data.gv_ho_va_ten.includes('Huyền'))) {
                                    slots.push({
                                        lopId: cls.id,
                                        lopName: cls.name,
                                        thu: d.thu,
                                        ngay: d.ngay,
                                        buoi: buoi,
                                        tiet: tiet,
                                        monHocId: data.mon_hoc_id || null,
                                        gv: data.gv_ho_va_ten,
                                        raw: data
                                    });
                                }
                            }
                        } catch(e) {}
                    }
                }
            }
        }
        return slots;
    }, { dates, classes, tok: token });

    console.log('🎯 TÌM THẤY CÁC TIẾT CỦA CÔ TRÊN TKB:', mySlots.length);
    mySlots.forEach(s => {
        console.log(`Lớp ${s.lopName} | Thứ ${s.thu} (${s.ngay}) | Buổi ${s.buoi === 1 ? 'Sáng' : 'Chiều'} | Tiết ${s.tiet} | Môn: ${s.monHocId || JSON.stringify(s.raw)}`);
    });

    await context.close();
})();
