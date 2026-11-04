const { chromium } = require('playwright');
const path = require('path');

const USER_DATA = path.join(__dirname, 'user_data');

(async () => {
    console.log('🚀 Đang kết nối tới vnEdu bằng tài khoản 051197003685...');
    
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

    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', {
        waitUntil: 'domcontentloaded',
        timeout: 45000
    });

    if (page.url().includes('sso')) {
        await page.waitForSelector('#txtUsername', { timeout: 10000 });
        await page.fill('#txtUsername', '051197003685');
        await page.fill('#txtPassword', 'Huyen0907@');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 35000 }).catch(() => {}),
            page.click('#btnLogin, input[type="submit"], button[type="submit"], .btn-login, #btnSubmit')
        ]);
    }

    for (let i = 0; i < 15; i++) {
        if (token) break;
        await page.waitForTimeout(1000);
    }

    console.log('🎯 Token bắt được:', token);

    // Gửi tiết test chuẩn TKB: Lớp 7A2AL | Thứ 3 (27/10/2026) | Sáng | Tiết 4 | Môn Toán
    const payload = {
        my_token: token,
        my_user_id: '7365493419',
        app_nam_hoc: '2026',
        mon_hoc_id: '1',         // Toán học
        phan_mon_id: '0',
        thu: '3',               // Thứ 3
        id: '0',                // Tiết mới
        tiet: '4',              // Tiết 4
        ngay: '27/10/2026',
        tiet_ppct: '30',
        soluong_nghi: '0',
        noi_dung: '[AI TEST ANTIGRAVITY] - Ôn tập giữa kì I (Tự động điền bởi AI)',
        dia_diem: '',
        kiem_tra_mieng: '',
        nhan_xet: '[TEST BOT] Lớp học nghiêm túc, AI tự động hóa thành công 100%!',
        diem: '20',
        diem_kl: '10',
        diem_vs: '10',
        cap_hoc: '2',
        lop_hoc_id: '5004582066', // Lớp 7A2AL
        tuan_hoc: '8',
        buoi_hoc: '1'           // Sáng
    };

    console.log('\n📤 ĐANG GỬI DỮ LIỆU TEST VÀO SỔ ĐẦU BÀI:');
    console.log('   - Lớp: 7A2AL (Tuần 8)');
    console.log('   - Thứ 3 (27/10/2026) | Buổi Sáng | Tiết 4');
    console.log('   - Môn: Toán học | Tiết PPCT: 30');
    console.log('   - Nội dung bài dạy:', payload.noi_dung);
    console.log('   - Nhận xét:', payload.nhan_xet);
    console.log('   - Điểm: 20 / 10 / 10 => 40 điểm\n');

    const result = await page.evaluate(async (params) => {
        const bodyStr = new URLSearchParams(params).toString();
        const saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=${params.app_nam_hoc}&my_token=${params.my_token}`;
        
        const res = await fetch(saveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: bodyStr
        });
        return await res.json();
    }, payload);

    console.log('📥 PHẢN HỒI CHÍNH THỨC TỪ SERVER VNEDU:');
    console.log(JSON.stringify(result, null, 2));

    await context.close();
})();
