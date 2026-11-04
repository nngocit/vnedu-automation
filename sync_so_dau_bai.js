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

// Tìm file LBG mới nhất trong Downloads
function getLatestExcelFile() {
    const dlDir = 'C:\\Users\\DIEU HUYEN\\Downloads';
    const files = fs.readdirSync(dlDir)
        .filter(f => f.toLowerCase().startsWith('lbg_hk1_2026_2027') && f.endsWith('.xls'))
        .map(f => ({ name: f, time: fs.statSync(path.join(dlDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

    return files.length > 0 ? path.join(dlDir, files[0].name) : null;
}

(async () => {
    console.log('========================================================================');
    console.log('       CÔNG CỤ TỰ ĐỘNG ĐIỀN SỔ ĐẦU BÀI VNEDU - CÔ LÊ THỊ DIỆU HUYÊN     ');
    console.log('========================================================================\n');

    const excelFile = getLatestExcelFile();
    if (!excelFile) {
        console.error('❌ Không tìm thấy file lbg_hk1_2026_2027.xls trong thư mục Downloads!');
        return;
    }
    console.log('📂 Đang sử dụng file lịch báo giảng mới nhất:');
    console.log('   ->', excelFile, '\n');

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
        console.log('🔐 Đang đăng nhập tự động...');
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

    if (!token) {
        console.error('❌ Không lấy được token đăng nhập vnEdu.');
        await context.close();
        return;
    }

    console.log('🎯 Đăng nhập thành công! Token xác thực:', token);
    console.log('\n⚡ Đang đồng bộ các tiết dạy hợp lệ vào vnEdu...');

    // Đọc danh sách tiết dạy tuần 8 đã lập trình
    const { execSync } = require('child_process');
    
    // Gọi script import_tuan8
    require('./import_tuan8.js');
    
    await context.close();
})().catch(err => {
    console.error('❌ Lỗi:', err);
});
