const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');

(async () => {
    console.log('🚀 Đang kết nối tới phiên trình duyệt vnEdu...');

    const context = await chromium.launchPersistentContext(USER_DATA, {
        headless: true, // Chạy ngầm rất nhanh
        args: ['--disable-blink-features=AutomationControlled']
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('🌐 Đang mở trang vnEdu để lấy phiên đăng nhập...');
    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', {
        waitUntil: 'domcontentloaded',
        timeout: 45000
    });

    // Lấy my_token và my_user_id từ trang
    const sessionInfo = await page.evaluate(() => {
        return {
            token: window.my_token || (typeof my_token !== 'undefined' ? my_token : null),
            userId: window.my_user_id || (typeof my_user_id !== 'undefined' ? my_user_id : null),
            namHoc: window.app_nam_hoc || 2026
        };
    });

    console.log('🔑 Thông tin phiên:', sessionInfo);

    if (!sessionInfo.token) {
        console.error('❌ Không tìm thấy token phiên. Hãy đảm bảo cô đã đăng nhập trên trình duyệt.');
        await context.close();
        return;
    }

    // Dữ liệu TEST nhìn vào biết ngay là do AI nhập
    const testData = {
        my_token: sessionInfo.token,
        my_user_id: sessionInfo.userId || '7365493419',
        app_nam_hoc: '2026',
        mon_hoc_id: '102',
        phan_mon_id: '1023',
        thu: '2',          // Thứ 2
        id: '0',           // Thêm mới
        tiet: '4',         // Tiết 4 (ngay sau tiết 3 cô vừa nhập)
        ngay: '26/10/2026',// Ngày 26/10/2026
        tiet_ppct: '99',
        soluong_nghi: '0',
        noi_dung: '[AI TEST] Tự động hóa sổ đầu bài vnEdu - Thành công!',
        dia_diem: '',
        kiem_tra_mieng: '',
        nhan_xet: '[ANTIGRAVITY AI TEST] Lớp học nghiêm túc, hệ thống điền tự động 100%!',
        diem: '20',
        diem_kl: '10',
        diem_vs: '10',
        cap_hoc: '2',
        lop_hoc_id: '5004582186', // Lớp 9A2AL
        tuan_hoc: '8',
        buoi_hoc: '2'      // Chiều
    };

    console.log('\n📤 Đang gửi dữ liệu test vào hệ thống vnEdu...');
    console.log('   Nội dung bài dạy:', testData.noi_dung);
    console.log('   Nhận xét:', testData.nhan_xet);
    console.log('   Vị trí: Lớp 9A2AL | Tuần 8 | Thứ 2 | Chiều | Tiết 4\n');

    // Gửi request trực tiếp từ context của page (có đầy đủ cookies & headers)
    const result = await page.evaluate(async (params) => {
        const bodyStr = new URLSearchParams(params).toString();
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=${params.app_nam_hoc}&my_token=${params.my_token}`;
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: bodyStr
        });
        return await res.json();
    }, testData);

    console.log('📥 Phản hồi từ máy chủ vnEdu:');
    console.log(JSON.stringify(result, null, 2));

    await context.close();
    console.log('\n🏁 Hoàn tất!');
})().catch(err => {
    console.error('❌ Lỗi:', err);
});
