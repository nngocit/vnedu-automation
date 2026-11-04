const { chromium } = require('playwright');
const path = require('path');

const USER_DATA = path.join(__dirname, 'user_data');

const THU_4_ENTRIES = [
    {
        thu: '4',
        ngay: '28/10/2026',
        buoi: '1', // Sáng
        tiet: '2',
        lop: '7A3AL',
        lop_id: '5004582046',
        cap_hoc: '2',
        mon_hoc_id: '1', // Toán học
        phan_mon_id: '0',
        ppct: '30',
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp học nghiêm túc, chú ý nghe giảng'
    },
    {
        thu: '4',
        ngay: '28/10/2026',
        buoi: '1', // Sáng
        tiet: '3',
        lop: '7A2AL',
        lop_id: '5004582066',
        cap_hoc: '2',
        mon_hoc_id: '1', // Toán học
        phan_mon_id: '0',
        ppct: '31',
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp học tốt, tích cực phát biểu'
    },
    {
        thu: '4',
        ngay: '28/10/2026',
        buoi: '1', // Sáng
        tiet: '4',
        lop: '7A2AL',
        lop_id: '5004582066',
        cap_hoc: '2',
        mon_hoc_id: '1', // Toán học
        phan_mon_id: '0',
        ppct: '32',
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp chú ý nghe giảng, hiểu bài'
    }
];

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

    // Đợi trang ổn định hoàn toàn
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    for (let i = 0; i < 10; i++) {
        if (token) break;
        await page.waitForTimeout(1000);
    }

    console.log('🎯 Token xác thực:', token);
    if (!token) {
        console.error('❌ Không lấy được token đăng nhập vnEdu.');
        await context.close();
        return;
    }

    console.log('\n========================================================================');
    console.log('   BẮT ĐẦU NHẬP SỔ ĐẦU BÀI NGÀY THỨ 4 (28/10/2026) - CÔ DIỆU HUYÊN');
    console.log('========================================================================\n');

    for (let i = 0; i < THU_4_ENTRIES.length; i++) {
        const item = THU_4_ENTRIES[i];
        const payload = {
            my_token: token,
            my_user_id: '7365493419',
            app_nam_hoc: '2026',
            mon_hoc_id: item.mon_hoc_id,
            phan_mon_id: item.phan_mon_id,
            thu: item.thu,
            id: '0',
            tiet: item.tiet,
            ngay: item.ngay,
            tiet_ppct: item.ppct,
            soluong_nghi: '0',
            noi_dung: item.bai,
            dia_diem: '',
            kiem_tra_mieng: '',
            nhan_xet: item.nhan_xet,
            diem: '20',
            diem_kl: '10',
            diem_vs: '10',
            cap_hoc: item.cap_hoc,
            lop_hoc_id: item.lop_id,
            tuan_hoc: '8',
            buoi_hoc: item.buoi
        };

        console.log(`📤 [${i + 1}/${THU_4_ENTRIES.length}] Đang lưu: Thứ 4 (${item.ngay}) - Buổi Sáng Tiết ${item.tiet} - Lớp ${item.lop}`);
        console.log(`   Môn: Toán học | Tiết PPCT: ${item.ppct} | Bài: ${item.bai}`);
        console.log(`   Nhận xét: ${item.nhan_xet}`);

        const saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=${payload.app_nam_hoc}&my_token=${payload.my_token}`;
        
        try {
            const resp = await context.request.post(saveUrl, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                form: payload
            });
            const result = await resp.json();
            if (result.success) {
                console.log(`   ✅ KẾT QUẢ: Thành công!\n`);
            } else {
                console.log(`   ❌ KẾT QUẢ: ${result.msg}\n`);
            }
        } catch(e) {
            console.log(`   ❌ LỖI GỬI: ${e.message}\n`);
        }

        await new Promise(r => setTimeout(r, 600));
    }

    console.log('========================================================================');
    console.log('🏁 ĐÃ HOÀN TẤT NHẬP CẢ 3 TIẾT NGÀY THỨ 4!');
    console.log('========================================================================');

    await context.close();
})();
