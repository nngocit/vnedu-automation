const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');

(async () => {
    console.log('🚀 Đang khởi động Playwright...');
    const context = await chromium.launchPersistentContext(USER_DATA, {
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('🌐 Đang truy cập vnEdu...');
    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', {
        waitUntil: 'networkidle',
        timeout: 45000
    });

    console.log('URL hiện tại:', page.url());

    // Nếu đang ở trang SSO login, tự động điền tài khoản & mật khẩu
    if (page.url().includes('sso')) {
        console.log('🔐 Đang tự động đăng nhập vnEdu...');
        await page.fill('#txtUsername', '051197003685');
        await page.fill('#txtPassword', 'Huyen0907@');
        
        // Bấm nút đăng nhập
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
            page.click('#btnLogin, input[type="submit"], button[type="submit"], .btn-login, #btnSubmit')
        ]);
        console.log('Sau khi đăng nhập, URL là:', page.url());
    }

    // Đợi trang chính tải xong
    await page.waitForTimeout(3000);

    // Lấy token và user_id
    const session = await page.evaluate(() => {
        return {
            token: window.my_token || (typeof my_token !== 'undefined' ? my_token : null),
            userId: window.my_user_id || (typeof my_user_id !== 'undefined' ? my_user_id : null),
            url: window.location.href
        };
    });

    console.log('🔑 Thông tin phiên đăng nhập:', session);

    if (!session.token) {
        console.error('❌ Vẫn chưa lấy được token. Chụp ảnh màn hình để kiểm tra...');
        await page.screenshot({ path: 'login_state.png' });
        await context.close();
        return;
    }

    // BÂY GIỜ GỬI DỮ LIỆU TEST VÀO SỔ ĐẦU BÀI!
    console.log('\n======================================================');
    console.log('⚡ ĐANG GỬI DỮ LIỆU TEST VÀO VNEDU CHO CÔ HUYỀN...');
    console.log('   - Lớp: 9A2AL');
    console.log('   - Tuần: 8 | Thứ 2 (26/10/2026) | Chiều | Tiết 4');
    console.log('   - Tiết PPCT: 99');
    console.log('   - Tên bài: [TEST TỰ ĐỘNG ANTIGRAVITY AI] - Kiểm tra kết nối vnEdu');
    console.log('   - Nhận xét: [TEST BOT] Hệ thống tự động điền sổ đầu bài thành công 100%!');
    console.log('   - Điểm: 20 | Kỷ luật: 10 | Vệ sinh: 10 => 40 điểm');
    console.log('======================================================\n');

    const testPayload = {
        my_token: session.token,
        my_user_id: session.userId || '7365493419',
        app_nam_hoc: '2026',
        mon_hoc_id: '102',
        phan_mon_id: '1023',
        thu: '2',
        id: '0',
        tiet: '4',         // Tiết 4 chiều thứ 2
        ngay: '26/10/2026',
        tiet_ppct: '99',
        soluong_nghi: '0',
        noi_dung: '[TEST TỰ ĐỘNG ANTIGRAVITY AI] - Kiểm tra kết nối vnEdu',
        dia_diem: '',
        kiem_tra_mieng: '',
        nhan_xet: '[TEST BOT] Hệ thống tự động điền sổ đầu bài thành công 100%!',
        diem: '20',
        diem_kl: '10',
        diem_vs: '10',
        cap_hoc: '2',
        lop_hoc_id: '5004582186', // 9A2AL
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

    console.log('📥 KẾT QUẢ TỪ SERVER VNEDU:');
    console.log(JSON.stringify(res, null, 2));

    await context.close();
    console.log('\n🎉 ĐÃ HOÀN TẤT!');
})().catch(err => {
    console.error('❌ Lỗi:', err);
});
