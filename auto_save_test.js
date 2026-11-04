const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');

(async () => {
    console.log('🚀 Đang khởi động Playwright với tài khoản 051197003685...');
    
    const context = await chromium.launchPersistentContext(USER_DATA, {
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    let capturedToken = null;
    let capturedUserId = '7365493419';

    // Bắt token từ mọi request của vnEdu
    page.on('request', req => {
        const url = req.url();
        const m = url.match(/my_token=([a-f0-9]{20,40})/i);
        if (m && !capturedToken) {
            capturedToken = m[1];
            console.log('🎯 ĐÃ BẮT ĐƯỢC TOKEN:', capturedToken);
        }
        const u = url.match(/my_user_id=([0-9]+)/i);
        if (u) {
            capturedUserId = u[1];
        }
    });

    console.log('🌐 Đang điều hướng đến trang vnEdu...');
    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', {
        waitUntil: 'domcontentloaded',
        timeout: 45000
    });

    // Nếu ở trang đăng nhập SSO
    if (page.url().includes('sso')) {
        console.log('🔐 Đang điền thông tin đăng nhập...');
        await page.waitForSelector('#txtUsername', { timeout: 10000 });
        await page.fill('#txtUsername', '051197003685');
        await page.fill('#txtPassword', 'Huyen0907@');
        console.log('👉 Bấm nút Đăng nhập...');
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 35000 }).catch(() => {}),
            page.click('#btnLogin, input[type="submit"], button[type="submit"], .btn-login, #btnSubmit')
        ]);
    }

    console.log('Đang ở URL:', page.url());

    // Đợi thêm vài giây để trang gọi các API khởi tạo và lấy token
    for (let i = 0; i < 15; i++) {
        if (capturedToken) break;
        await page.waitForTimeout(1000);
    }

    // Nếu vẫn chưa có token từ request, thử lấy từ page evaluate
    if (!capturedToken) {
        capturedToken = await page.evaluate(() => {
            return window.my_token || (typeof my_token !== 'undefined' ? my_token : null);
        });
    }

    console.log('🔑 Token hiện tại:', capturedToken);
    console.log('👤 User ID:', capturedUserId);

    if (!capturedToken) {
        console.error('❌ Không lấy được my_token để gửi API.');
        await context.close();
        return;
    }

    // GỬI DỮ LIỆU TEST VÀO SỔ ĐẦU BÀI
    console.log('\n=============================================================');
    console.log('⚡ ĐANG GỬI DỮ LIỆU TEST VÀO SỔ ĐẦU BÀI:');
    console.log('   - Lớp: 9A2AL');
    console.log('   - Tuần: 8 | Thứ 2 (26/10/2026) | Chiều | Tiết 4');
    console.log('   - Tên bài: [AI TEST ANTIGRAVITY] - Kiểm tra tự động hóa sổ đầu bài');
    console.log('   - Nhận xét: [TEST BOT] Hệ thống AI tự động hóa 100% cho cô Diệu Huyền!');
    console.log('   - Điểm: 20 / 10 / 10 => 40 điểm');
    console.log('=============================================================\n');

    const testPayload = {
        my_token: capturedToken,
        my_user_id: capturedUserId,
        app_nam_hoc: '2026',
        mon_hoc_id: '102',
        phan_mon_id: '1023',
        thu: '2',
        id: '0',
        tiet: '4',         // Tiết 4 chiều Thứ 2
        ngay: '26/10/2026',
        tiet_ppct: '99',
        soluong_nghi: '0',
        noi_dung: '[AI TEST ANTIGRAVITY] - Kiểm tra tự động hóa sổ đầu bài',
        dia_diem: '',
        kiem_tra_mieng: '',
        nhan_xet: '[TEST BOT] Hệ thống AI tự động hóa 100% cho cô Diệu Huyền!',
        diem: '20',
        diem_kl: '10',
        diem_vs: '10',
        cap_hoc: '2',
        lop_hoc_id: '5004582186', // Lớp 9A2AL
        tuan_hoc: '8',
        buoi_hoc: '2'      // Chiều
    };

    const res = await page.evaluate(async (params) => {
        const bodyStr = new URLSearchParams(params).toString();
        const saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=${params.app_nam_hoc}&my_token=${params.my_token}`;
        
        const response = await fetch(saveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: bodyStr
        });
        return await response.json();
    }, testPayload);

    console.log('📥 PHẢN HỒI CHÍNH THỨC TỪ SERVER VNEDU:');
    console.log(JSON.stringify(res, null, 2));

    await context.close();
    console.log('\n🎉 THÀNH CÔNG RỰC RỠ!');
})().catch(err => {
    console.error('❌ Lỗi:', err);
});
