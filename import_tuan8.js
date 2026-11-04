const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');

// Bảng ánh xạ lớp học
const CLASS_MAP = {
    '7A2AL': { id: '5004582066', cap: '2' },
    '7A3AL': { id: '5004582046', cap: '2' },
    '9A2AL': { id: '5004582186', cap: '2' }
};

// Danh sách 14 tiết dạy trong Tuần 8 trích xuất từ file mới lbg_hk1_2026_2027 (1).xls
const ENTRIES = [
    {
        thu: 2, ngay: '26/10/2026', buoi: 1, tiet: 2, lop: '9A2AL', mon: 'Hoạt động trải nghiệm, hướng nghiệp', mon_hoc_id: '102', phan_mon_id: '1022', ppct: 24,
        bai: 'Chia sẻ về những hành vi ứng xử có trách nhiệm của các bạn trong lớp',
        nhan_xet: 'Lớp học nghiêm túc, tham gia tích cực'
    },
    {
        thu: 2, ngay: '26/10/2026', buoi: 2, tiet: 1, lop: '7A3AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 29,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp chú ý nghe giảng, hiểu bài'
    },
    {
        thu: 2, ngay: '26/10/2026', buoi: 2, tiet: 2, lop: '7A2AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 29,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Nhiều em không chuẩn bị bài'
    },
    {
        thu: 2, ngay: '26/10/2026', buoi: 2, tiet: 3, lop: '9A2AL', mon: 'Hoạt động trải nghiệm, hướng nghiệp', mon_hoc_id: '102', phan_mon_id: '1023', ppct: 23,
        bai: 'Tìm hiểu về những việc đã làm để thể hiện là người có trách nhiệm với nhiệm vụ được giao + Tìm hiểu cách thực hiện có trách nhiệm các nhiệm vụ được giao',
        nhan_xet: 'Lớp học nghiêm túc, thảo luận sôi nổi'
    },
    {
        thu: 3, ngay: '27/10/2026', buoi: 1, tiet: 1, lop: '9A2AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 29,
        bai: 'Ôn tập giữa học kì I ( tiết 1)',
        nhan_xet: 'Lớp nghiêm túc'
    },
    {
        thu: 3, ngay: '27/10/2026', buoi: 1, tiet: 2, lop: '9A2AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 30,
        bai: 'Ôn tập giữa học kì I ( tiết 2)',
        nhan_xet: 'Lớp nghiêm túc'
    },
    {
        thu: 3, ngay: '27/10/2026', buoi: 1, tiet: 4, lop: '7A2AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 30,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp hiểu bài, tích cực phát biểu'
    },
    {
        thu: 3, ngay: '27/10/2026', buoi: 2, tiet: 1, lop: '9A2AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 31,
        bai: 'Bài tập cuối chương IV',
        nhan_xet: 'Lớp học nghiêm túc'
    },
    {
        thu: 4, ngay: '28/10/2026', buoi: 1, tiet: 2, lop: '7A3AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 30,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp chú ý nghe giảng'
    },
    {
        thu: 4, ngay: '28/10/2026', buoi: 1, tiet: 3, lop: '7A2AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 31,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp học tốt'
    },
    {
        thu: 4, ngay: '28/10/2026', buoi: 1, tiet: 4, lop: '7A2AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 32,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp học tốt'
    },
    {
        thu: 6, ngay: '30/10/2026', buoi: 1, tiet: 1, lop: '7A3AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 31,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp học nghiêm túc'
    },
    {
        thu: 6, ngay: '30/10/2026', buoi: 1, tiet: 2, lop: '7A3AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 32,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp học nghiêm túc'
    },
    {
        thu: 6, ngay: '30/10/2026', buoi: 1, tiet: 4, lop: '9A2AL', mon: 'Toán học', mon_hoc_id: '1', phan_mon_id: '0', ppct: 32,
        bai: 'Ôn tập giữa học kì I',
        nhan_xet: 'Lớp học nghiêm túc'
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

    for (let i = 0; i < 15; i++) {
        if (token) break;
        await page.waitForTimeout(1000);
    }

    console.log('🎯 Token xác thực:', token);
    if (!token) {
        console.error('❌ Không lấy được token!');
        await context.close();
        return;
    }

    console.log(`\n📋 BẮT ĐẦU NHẬP DỮ LIỆU TUẦN 8 (TỔNG CỘNG ${ENTRIES.length} TIẾT DẠY):`);
    console.log('========================================================================');

    const results = [];

    for (let i = 0; i < ENTRIES.length; i++) {
        const item = ENTRIES[i];
        const classInfo = CLASS_MAP[item.lop];
        if (!classInfo) {
            console.log(`⚠️ Bỏ qua lớp không xác định: ${item.lop}`);
            continue;
        }

        const payload = {
            my_token: token,
            my_user_id: '7365493419',
            app_nam_hoc: '2026',
            mon_hoc_id: item.mon_hoc_id,
            phan_mon_id: item.phan_mon_id || '0',
            thu: String(item.thu),
            id: '0',
            tiet: String(item.tiet),
            ngay: item.ngay,
            tiet_ppct: String(item.ppct),
            soluong_nghi: '0',
            noi_dung: item.bai,
            dia_diem: '',
            kiem_tra_mieng: '',
            nhan_xet: item.nhan_xet,
            diem: '20',
            diem_kl: '10',
            diem_vs: '10',
            cap_hoc: classInfo.cap,
            lop_hoc_id: classInfo.id,
            tuan_hoc: '8',
            buoi_hoc: String(item.buoi)
        };

        const res = await page.evaluate(async (params) => {
            const bodyStr = new URLSearchParams(params).toString();
            const saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=${params.app_nam_hoc}&my_token=${params.my_token}`;
            try {
                const response = await fetch(saveUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: bodyStr
                });
                return await response.json();
            } catch(e) {
                return { success: false, msg: e.message };
            }
        }, payload);

        const statusIcon = res.success ? '✅' : (res.msg && res.msg.includes('trước') ? '⏳' : '❌');
        console.log(`${statusIcon} [${i + 1}/${ENTRIES.length}] Thứ ${item.thu} (${item.ngay}) - Buổi ${item.buoi === 1 ? 'Sáng' : 'Chiều'} Tiết ${item.tiet} - Lớp ${item.lop} | PPCT: ${item.ppct}`);
        console.log(`   Bài: ${item.bai.substring(0, 60)}...`);
        console.log(`   Kết quả: ${res.success ? 'Thành công' : res.msg}\n`);

        results.push({ item, res });
        // Nghỉ 500ms giữa các request để bảo đảm ổn định
        await page.waitForTimeout(500);
    }

    console.log('========================================================================');
    const successCount = results.filter(r => r.res.success).length;
    const futureCount = results.filter(r => r.res.msg && r.res.msg.includes('trước')).length;
    console.log(`🏁 TỔNG KẾT TUẦN 8:`);
    console.log(`   - Nhập thành công ngay: ${successCount} tiết (các tiết Thứ 2 hôm nay)`);
    console.log(`   - Chờ đến ngày mở khóa TKB: ${futureCount} tiết (các ngày Thứ 3, 4, 6)`);
    console.log('========================================================================\n');

    await context.close();
})();
