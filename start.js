const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');
const API_FILE = path.join(__dirname, 'api_records.json');
const LOG_FILE = path.join(__dirname, 'edit_logs.txt');

fs.writeFileSync(LOG_FILE, `=== BẮT ĐẦU THEO DÕI THAO TÁC VNEDU [${new Date().toLocaleString()}] ===\n\n`, 'utf-8');

const records = [];

function writeLog(msg) {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
}

(async () => {
    writeLog('🚀 Đang khởi động trình duyệt Chrome...');
    
    let context;
    try {
        context = await chromium.launchPersistentContext(USER_DATA, {
            channel: 'chrome',
            headless: false,
            viewport: null,
            args: [
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    } catch (e) {
        writeLog('⚠️ Chuyển sang dùng Chromium của Playwright...');
        context = await chromium.launchPersistentContext(USER_DATA, {
            headless: false,
            viewport: null,
            args: [
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    }

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // Lắng nghe mọi request gửi đi
    page.on('request', req => {
        const url = req.url();
        const method = req.method();
        // Bắt các request API/XHR
        if (url.includes('vnedu.vn') && 
            !url.endsWith('.png') && !url.endsWith('.jpg') && !url.endsWith('.css') && 
            !url.endsWith('.gif') && !url.endsWith('.ico') && !url.endsWith('.woff2')) {
            
            const postData = req.postData();
            const entry = {
                time: new Date().toISOString(),
                method: method,
                url: url,
                payload: postData || null
            };
            records.push(entry);

            if (method === 'POST' || url.includes('.php') || url.includes('direct') || url.includes('so-dau-bai') || url.includes('save') || url.includes('update')) {
                writeLog(`📡 [GỬI ${method}] ${url}`);
                if (postData) {
                    writeLog(`   Payload: ${postData.length > 300 ? postData.substring(0, 300) + '...' : postData}`);
                }
            }
        }
    });

    // Lắng nghe response trả về
    page.on('response', async res => {
        const url = res.url();
        if (url.includes('vnedu.vn') && (res.request().method() === 'POST' || url.includes('.php') || url.includes('direct') || url.includes('save'))) {
            let body = '';
            try {
                body = await res.text();
            } catch(e) {
                body = '[Không thể lấy text body]';
            }

            writeLog(`📥 [NHẬN ${res.status()}] ${url}`);
            if (body && body.length < 500) {
                writeLog(`   Response: ${body}`);
            } else if (body) {
                writeLog(`   Response (trích đoạn): ${body.substring(0, 300)}...`);
            }

            // Cập nhật vào records
            const target = records.find(r => r.url === url && !r.status);
            if (target) {
                target.status = res.status();
                target.response = body.length > 5000 ? body.substring(0, 5000) + '...[truncated]' : body;
            }
            fs.writeFileSync(API_FILE, JSON.stringify(records, null, 2), 'utf-8');
        }
    });

    writeLog('🌐 Đang điều hướng đến trang vnEdu...');
    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    writeLog('\n============================================================');
    writeLog('🎉 TRÌNH DUYỆT ĐÃ MỞ TRÊN MÀN HÌNH!');
    writeLog('👉 Cô hãy đăng nhập tài khoản vnEdu.');
    writeLog('👉 Vào mục "Quản lý sổ đầu bài", chọn Tuần và Lớp.');
    writeLog('👉 Thử nhập / sửa / lưu 1 vài ô để hệ thống bắt chính xác API.');
    writeLog('👉 Khi xong, cô ĐÓNG CỬA SỔ TRÌNH DUYỆT này lại.');
    writeLog('============================================================\n');

    await new Promise((resolve) => {
        context.on('close', () => {
            writeLog('🏁 Đã đóng trình duyệt. Kết thúc theo dõi!');
            resolve();
        });
    });

})().catch(err => {
    writeLog('❌ Lỗi: ' + err.message);
});
