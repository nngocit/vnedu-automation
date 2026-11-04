const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const SESSION_CACHE_FILE = path.join(__dirname, 'session_cache.json');

// USER_DATA no longer required (Playwright removed)
const DOWNLOADS_DIR = 'C:\\Users\\DIEU HUYEN\\Downloads';

const CLASS_MAP = {
    '7A2AL': { id: '5004582066', cap: '2', khoi: '7', sodaubaiId: '8130546' },
    '7A3AL': { id: '5004582046', cap: '2', khoi: '7', sodaubaiId: '8087046' },
    '9A2AL': { id: '5004582186', cap: '2', khoi: '9', sodaubaiId: '8139046' }
};

const CURRENT_FILE_OVERRIDE = path.join(__dirname, 'current_lbg.xls');

// Đặt file Excel tải lên
function setExcelFileBuffer(filename, buffer) {
    fs.writeFileSync(CURRENT_FILE_OVERRIDE, buffer);
    return { name: filename, fullPath: CURRENT_FILE_OVERRIDE, time: Date.now(), isCustom: true };
}

// Xóa file tải lên để dùng lại file trong Downloads
function resetToDefaultExcel() {
    if (fs.existsSync(CURRENT_FILE_OVERRIDE)) {
        try { fs.unlinkSync(CURRENT_FILE_OVERRIDE); } catch (e) { }
    }
}

// Tìm file Excel mới nhất
function getLatestExcelFile() {
    if (fs.existsSync(CURRENT_FILE_OVERRIDE)) {
        return {
            name: 'File tải lên tùy chọn',
            fullPath: CURRENT_FILE_OVERRIDE,
            time: fs.statSync(CURRENT_FILE_OVERRIDE).mtime.getTime(),
            isCustom: true
        };
    }

    if (!fs.existsSync(DOWNLOADS_DIR)) return null;
    const files = fs.readdirSync(DOWNLOADS_DIR)
        .filter(f => f.toLowerCase().startsWith('lbg') && (f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx')))
        .map(f => ({ name: f, fullPath: path.join(DOWNLOADS_DIR, f), time: fs.statSync(path.join(DOWNLOADS_DIR, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

    return files.length > 0 ? files[0] : null;
}

// Danh sách tuần đã có kế hoạch dạy học trên vnEdu (Khởi tạo sẵn 11 tuần đã có)
const knownVnEduWeeks = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

// Đọc toàn bộ danh sách các tuần trong file Excel và bổ sung đầy đủ tuần học cả năm kèm phân loại trạng thái
function getAvailableWeeks(source = 'vnedu') {
    const fileInfo = getLatestExcelFile();
    const excelWeeks = new Set();
    if (fileInfo) {
        try {
            const wb = xlsx.readFile(fileInfo.fullPath);
            wb.SheetNames.forEach(name => {
                if (name.toLowerCase().startsWith('tuan_')) {
                    const num = parseInt(name.replace(/[^0-9]/g, '')) || 0;
                    if (num > 0) excelWeeks.add(num);
                }
            });
        } catch (e) { }
    }

    // Tính toán tuần hiện tại dựa trên ngày thực tế (Học kỳ 1 năm học 2026-2027 bắt đầu 07/09/2026)
    const SEMESTER_1_START = new Date(2026, 8, 7); // 07/09/2026
    const now = new Date();
    const diffDays = Math.floor((now - SEMESTER_1_START) / (1000 * 60 * 60 * 24));
    const currentRealWeek = Math.max(1, Math.min(35, Math.floor(diffDays / 7) + 1));
    const nextRealWeek = currentRealWeek + 1;
    const isSemester2Unlocked = currentRealWeek >= 20;

    const weeks = [];
    for (let i = 1; i <= 35; i++) {
        const hasVnEdu = knownVnEduWeeks.has(i);
        const hasExcel = excelWeeks.has(i);
        // Ở chế độ vnEdu trực tiếp: chỉ có data khi vnEdu đã có lịch (Tuần 1 - 11...)
        // Ở chế độ Excel: chỉ có data khi file Excel có sheet đó (Tuần 1 - 19)
        const hasData = source === 'vnedu' ? hasVnEdu : hasExcel;

        weeks.push({
            sheetName: `Tuan_${i}`,
            weekNumber: i,
            title: `Tuần ${i}`,
            hasData: hasData,
            hasVnEdu: hasVnEdu,
            hasExcel: hasExcel,
            isCurrentRealWeek: i === currentRealWeek,
            isNextRealWeek: i === nextRealWeek,
            isPast: i < currentRealWeek,
            isFuture: i > currentRealWeek
        });
    }

    return {
        weeks,
        currentRealWeek,
        nextRealWeek,
        currentSemester: currentRealWeek >= 20 ? 2 : 1,
        semester2Unlocked: isSemester2Unlocked
    };
}

    // Phân tích lịch dạy của 1 tuần từ Excel
    function parseWeekSchedule(weekNumber = 8) {
        const fileInfo = getLatestExcelFile();
        if (!fileInfo) throw new Error('Không tìm thấy file Excel lịch báo giảng trong Downloads');

        const wb = xlsx.readFile(fileInfo.fullPath);
        const sheetName = `Tuan_${weekNumber}`;
        const sheet = wb.Sheets[sheetName];
        if (!sheet) {
            throw new Error(`Không tìm thấy sheet ${sheetName} trong file Excel`);
        }

        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        // Tìm ngày bắt đầu tuần (từ ô "Từ ngày:")
        let tuNgayStr = '';
        for (let r = 0; r < 5; r++) {
            const row = rows[r] || [];
            for (let c = 0; c < row.length; c++) {
                const val = String(row[c] || '').trim();
                if (val.includes('Từ ngày') || val.includes('T? ngy')) {
                    // Ô kế tiếp hoặc ngay trong ô
                    const nextVal = String(row[c + 1] || '').trim();
                    const m = nextVal.match(/\d{2}\/\d{2}\/\d{4}/) || val.match(/\d{2}\/\d{2}\/\d{4}/);
                    if (m) tuNgayStr = m[0];
                }
            }
        }

        // Nếu không tìm thấy ngày trong header, tính sơ bộ theo tuần (tuần 8 = 26/10/2026)
        let mondayDate;
        if (tuNgayStr) {
            const [d, m, y] = tuNgayStr.split('/').map(Number);
            mondayDate = new Date(y, m - 1, d);
        } else {
            mondayDate = new Date(2026, 9, 26); // 26/10/2026
        }

        function getDateStr(thuNum) {
            // thuNum: 2 = Mon (offset 0), 3 = Tue (offset 1)... 7 = Sat (offset 5)
            const offset = thuNum - 2;
            const cur = new Date(mondayDate);
            cur.setDate(cur.getDate() + offset);
            const dd = String(cur.getDate()).padStart(2, '0');
            const mm = String(cur.getMonth() + 1).padStart(2, '0');
            const yyyy = cur.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        }

        const schedule = [];
        let currentThu = 2;
        let currentBuoi = 1;

        for (let r = 4; r < rows.length; r++) {
            const row = rows[r] || [];
            const tkbKey = String(row[1] || '').trim(); // e.g. "2-1", "2-2", "3-1"
            if (tkbKey.includes('-')) {
                const parts = tkbKey.split('-');
                currentThu = parseInt(parts[0]) || currentThu;
                currentBuoi = parseInt(parts[1]) || currentBuoi;
            }

            const tietStr = String(row[3] || '').trim();
            const mon = String(row[4] || '').trim();
            const lop = String(row[5] || '').trim();
            const ppctStr = String(row[6] || '').trim();
            const phanMon = String(row[7] || '').trim();
            const tenBai = String(row[8] || '').trim();
            const ghiChu = String(row[9] || '').trim();

            if (mon || lop || tenBai) {
                const tiet = parseInt(tietStr) || 1;
                const ppct = parseInt(ppctStr) || 1;
                const ngay = getDateStr(currentThu);

                let monHocId = '1'; // Mặc định Toán học
                let phanMonId = '0';
                if (mon.includes('Hoạt động trải nghiệm') || mon.includes('HĐTN')) {
                    monHocId = '102';
                    phanMonId = phanMon.includes('Sinh hoạt lớp') ? '1022' : '1023';
                }

                schedule.push({
                    index: schedule.length + 1,
                    rowInExcel: r + 1,
                    thu: currentThu,
                    ngay: ngay,
                    buoi: currentBuoi, // 1: Sáng, 2: Chiều
                    tiet: tiet,
                    lop: lop,
                    mon: mon,
                    monHocId: monHocId,
                    phanMonId: phanMonId,
                    phanMon: phanMon,
                    ppct: ppct,
                    tenBai: tenBai,
                    ghiChu: ghiChu,
                    nhanXetDefault: ghiChu && !ghiChu.includes('PPCT') ? ghiChu : 'Lớp học nghiêm túc, tích cực'
                });
            }
        }

        return {
            source: 'excel',
            fileName: fileInfo.name,
            lastModified: fileInfo.time,
            weekNumber: weekNumber,
            tuNgay: getDateStr(2),
            denNgay: getDateStr(7),
            schedule: applyPpctRules(schedule, weekNumber)
        };
    }

    // Quản lý phiên đăng nhập và Cookie xác thực siêu tốc (HTTP Fetch thuần - Không dùng Playwright)
    let cachedToken = null;
    let cachedCookies = null;
    let cachedUserId = '7365493419';
    let tokenRefreshPromise = null;

    function mergeCookies(oldCookies, newCookiesHeaders) {
        const map = new Map();
        if (oldCookies) {
            oldCookies.split(';').forEach(part => {
                const trimmed = part.trim();
                if (!trimmed) return;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) map.set(trimmed.substring(0, eqIdx).trim(), trimmed.substring(eqIdx + 1));
            });
        }
        const headersList = Array.isArray(newCookiesHeaders) ? newCookiesHeaders : [newCookiesHeaders];
        headersList.filter(Boolean).forEach(raw => {
            const first = raw.split(';')[0].trim();
            const eqIdx = first.indexOf('=');
            if (eqIdx !== -1) map.set(first.substring(0, eqIdx).trim(), first.substring(eqIdx + 1));
        });
        return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    }

    function loadSessionCache() {
        try {
            if (fs.existsSync(SESSION_CACHE_FILE)) {
                const data = JSON.parse(fs.readFileSync(SESSION_CACHE_FILE, 'utf-8'));
                if (data && data.token) return data;
            }
        } catch (e) { }
        return null;
    }

    function saveSessionCache(session) {
        try {
            fs.writeFileSync(SESSION_CACHE_FILE, JSON.stringify(session, null, 2), 'utf-8');
        } catch (e) {
            console.warn('Không thể lưu session_cache.json:', e.message);
        }
    }

    function setSessionToken(token, cookies = '', userId = '7365493419') {
        if (!token) return;
        cachedToken = token;
        if (cookies) cachedCookies = cookies;
        if (userId) cachedUserId = userId;
        saveSessionCache({
            token: cachedToken,
            cookies: cachedCookies || '',
            userId: cachedUserId,
            updatedAt: new Date().toISOString()
        });
    }

    function getSessionStatus() {
        const session = loadSessionCache();
        const token = cachedToken || (session || {}).token;
        return {
            connected: !!token,
            token: token || null,
            userId: cachedUserId
        };
    }

    // Đăng nhập vnEdu siêu tốc bằng HTTP thuần (Khoảng 1 giây, loại bỏ hoàn toàn Playwright)
    async function loginVnEduHttp(username = '051197003685', password = 'Huyen0907@') {
        try {
            const ssoPageUrl = 'https://user.vnedu.vn/sso/?app_id=3&continue=http%3A%2F%2Fuaevcmanmsgdbinhduong.vnedu.vn%3A80%2Fv5%2F%3Fcall%3Dauth.loginSSO';
            const initResp = await fetch(ssoPageUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            let cookies = mergeCookies('', initResp.headers.getSetCookie ? initResp.headers.getSetCookie() : [initResp.headers.get('set-cookie')]);

            const callUrl = 'https://user.vnedu.vn/sso/?call=auth.login';
            const bodyParams = new URLSearchParams({
                continue: 'aHR0cDovL3VhZXZjbWFubXNnZGJpbmhkdW9uZy52bmVkdS52bjo4MC92NS8/Y2FsbD1hdXRoLmxvZ2luU1NP',
                app_id: '3',
                loginQrToken: 'web_' + Date.now(),
                txtUsername: username,
                txtPassword: password
            });

            const res = await fetch(callUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Cookie': cookies,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': ssoPageUrl,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: bodyParams.toString()
            });
            cookies = mergeCookies(cookies, res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')]);

            const respText = await res.text();
            let json = null;
            try {
                json = JSON.parse(respText);
            } catch (pe) {
                return { success: false, msg: 'Cổng vnEdu phản hồi không hợp lệ: ' + respText.substring(0, 100) };
            }
            if (!json.success || !json.data) {
                return {
                    success: false,
                    msg: json.msg || 'Đăng nhập vnEdu không thành công. Cô vui lòng kiểm tra lại tài khoản hoặc mật khẩu.'
                };
            }

            const finalResp = await fetch(json.data, {
                redirect: 'manual',
                headers: { 'Cookie': cookies, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            cookies = mergeCookies(cookies, finalResp.headers.getSetCookie ? finalResp.headers.getSetCookie() : [finalResp.headers.get('set-cookie')]);

            const homeResp = await fetch('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', {
                headers: {
                    'Cookie': cookies,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            cookies = mergeCookies(cookies, homeResp.headers.getSetCookie ? homeResp.headers.getSetCookie() : [homeResp.headers.get('set-cookie')]);

            const html = await homeResp.text();
            const tokenMatch = html.match(/login\|([a-f0-9]{32})/);
            const token = tokenMatch ? tokenMatch[1] : null;

            if (!token) {
                return { success: false, msg: 'Đăng nhập thành công nhưng không lấy được mã Token bảo mật của trường.' };
            }

            cachedToken = token;
            cachedCookies = cookies;
            cachedUserId = '7365493419';

            saveSessionCache({
                token: cachedToken,
                cookies: cachedCookies,
                userId: cachedUserId,
                updatedAt: new Date().toISOString()
            });

            return {
                success: true,
                token: cachedToken,
                cookies: cachedCookies,
                userId: cachedUserId,
                msg: 'Đăng nhập vnEdu thành công! Chào cô Lê Thị Diệu Huyên.'
            };
        } catch (err) {
            return { success: false, msg: 'Lỗi kết nối cổng đăng nhập vnEdu: ' + err.message };
        }
    }

    // Lấy Token xác thực vnEdu (Có bộ nhớ đệm cực nhanh & tự động làm mới qua HTTP)
    async function ensureVnEduToken(forceRefresh = false) {
        if (!forceRefresh && cachedToken && cachedCookies) {
            return { token: cachedToken, cookies: cachedCookies, userId: cachedUserId };
        }

        if (!forceRefresh) {
            const loaded = loadSessionCache();
            if (loaded && loaded.token && loaded.cookies) {
                cachedToken = loaded.token;
                cachedCookies = loaded.cookies;
                cachedUserId = loaded.userId || '7365493419';
                return { token: cachedToken, cookies: cachedCookies, userId: cachedUserId };
            }
        }

        if (tokenRefreshPromise) {
            return tokenRefreshPromise;
        }

        tokenRefreshPromise = (async () => {
            try {
                const res = await loginVnEduHttp('051197003685', 'Huyen0907@');
                if (!res.success || !res.token) {
                    throw new Error(res.msg || 'Không thể lấy mã Token xác thực từ vnEdu.');
                }
                return { token: res.token, cookies: res.cookies, userId: res.userId };
            } finally {
                tokenRefreshPromise = null;
            }
        })();

        return tokenRefreshPromise;
    }

    // Helper: Thực hiện POST API tới vnEdu bằng HTTP fetch thuần với Cookie và Token
    async function vnEduPost(url, params, customHeaders = {}) {
        let { token, cookies } = await ensureVnEduToken();
        const bodyParams = params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams();
        if (!(params instanceof URLSearchParams)) {
            for (const key in params) {
                bodyParams.set(key, params[key]);
            }
        }
        if (!bodyParams.has('my_token') && token) {
            bodyParams.set('my_token', token);
        }

        // Chỉ lọc bỏ sso_key_login (> 2KB) đối với request load HTML sổ đầu bài (tránh lỗi ECONNRESET do buffer quá lớn trên vnEdu)
        // Các API lưu (call=app.sodaubai.serv.so_dau_bai.save, saveHocSinhVang) BẮT BUỘC phải giữ sso_key_login để xác thực quyền ghi
        let sendCookies = cookies || '';
        if (url.includes('load=app.sodaubai.serv.so_dau_bai') && cookies) {
            sendCookies = cookies.split(';')
                .map(c => c.trim())
                .filter(c => !c.startsWith('sso_key_login'))
                .join('; ');
        }

        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': sendCookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...customHeaders
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers,
                body: bodyParams.toString(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return resp;
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    }

    function parseTableRows(html, className, liveEntries) {
        const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        rows.forEach(r => {
            if (r.includes('Huyên') || r.includes('Diệu Huyên')) {
                const thu = parseInt(r.match(/thu=["']?(\d+)["']?/i)?.[1]);
                const buoi = parseInt(r.match(/buoi(?:_hoc)?=["']?(\d+)["']?/i)?.[1]);
                const tiet = parseInt(r.match(/tiet=["']?(\d+)["']?/i)?.[1]);
                const id = r.match(/chitiet_id=["']?(\d+)["']?/i)?.[1];
                const ppct = r.match(/tiet_ppct=["']?(\d+)["']?/i)?.[1];
                const noiDung = r.match(/noi_dung=["']([^"']*)["']?/i)?.[1];

                // Trích xuất số lượng học sinh vắng & danh sách vắng phép / không phép
                const soluongMatch = r.match(/soluong_nghi=["']?(\d+)["']?/i);
                const soLuongNghi = soluongMatch ? parseInt(soluongMatch[1]) : 0;
                const pMatches = r.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
                const dsHsVang = pMatches.map(p => p.replace(/<[^>]+>/g, '').trim()).filter(Boolean);

                if (thu && tiet) {
                    liveEntries.push({
                        lop: className,
                        thu,
                        buoi,
                        tiet,
                        chitietId: id,
                        ppct,
                        noiDung,
                        soLuongNghi,
                        dsHsVang
                    });
                }
            }
        });
    }

    // Kiểm tra trạng thái các tiết đã nhập trên vnEdu
    async function checkLiveStatus(weekNumber = 8) {
        let { token, context, userId } = await ensureVnEduToken();
        const liveEntries = [];

        const classes = [
            { id: '5004582066', name: '7A2AL', khoi: '7' },
            { id: '5004582046', name: '7A3AL', khoi: '7' },
            { id: '5004582186', name: '9A2AL', khoi: '9' }
        ];

        await Promise.allSettled(classes.map(async (cls) => {
            const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=app.sodaubai.serv.so_dau_bai&app_nam_hoc=2026&my_token=${token}`;
            const params = new URLSearchParams({
                my_token: token,
                my_user_id: userId || cachedUserId,
                app_nam_hoc: '2026',
                winId: 'check_' + cls.name,
                capHoc: '2',
                lopHoc: cls.id,
                khoiHoc: cls.khoi,
                tuanHoc: String(weekNumber),
                show_goi_y: '0',
                diem_truong_id: '790826'
            });

            try {
                let resp = await vnEduPost(url, params);
                let html = await resp.text();

                if (!html.includes('<table') && (html.includes('cas.vnedu.vn') || html.includes('Phiên làm việc hết hạn') || html.includes('top.location'))) {
                    console.warn('vnEdu token expired, refreshing token...');
                    const refreshed = await ensureVnEduToken(true);
                    token = refreshed.token;
                    params.set('my_token', token);
                    const retryUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=app.sodaubai.serv.so_dau_bai&app_nam_hoc=2026&my_token=${token}`;
                    resp = await vnEduPost(retryUrl, params);
                    html = await resp.text();
                }

                parseTableRows(html, cls.name, liveEntries);
            } catch (e) {
                console.error(`Lỗi kiểm tra lớp ${cls.name}:`, e.message);
            }
        }));

        return liveEntries;
    }

    // Lưu 1 tiết vào vnEdu
    async function saveSlotToVnEdu(item, weekNumber = 8) {
        let { token, context } = await ensureVnEduToken();
        const classInfo = CLASS_MAP[item.lop];
        if (!classInfo) {
            return { success: false, msg: `Không tìm thấy thông tin cấu hình cho lớp ${item.lop}` };
        }

        const buildPayload = (currToken) => ({
            my_token: currToken,
            my_user_id: cachedUserId,
            app_nam_hoc: '2026',
            mon_hoc_id: String(item.monHocId || '1'),
            phan_mon_id: String(item.phanMonId || '0'),
            thu: String(item.thu),
            id: item.chitietId || item.liveId || '0',
            tiet: String(item.tiet),
            ngay: item.ngay,
            tiet_ppct: String(item.ppct || ''),
            soluong_nghi: String(item.soLuongNghi !== undefined ? item.soLuongNghi : (item.hsVangList ? item.hsVangList.length : 0)),
            noi_dung: item.tenBai || item.baiDay || item.noiDung || '',
            dia_diem: '',
            kiem_tra_mieng: '',
            nhan_xet: item.nhanXet || 'Lớp học nghiêm túc, tích cực',
            diem: String(item.diem || '20'),
            diem_kl: String(item.diemKl || '10'),
            diem_vs: String(item.diemVs || '10'),
            cap_hoc: classInfo.cap,
            lop_hoc_id: classInfo.id,
            tuan_hoc: String(weekNumber),
            buoi_hoc: String(item.buoi || (Number(item.tiet) <= 5 ? 1 : 2))
        });

        let payload = buildPayload(token);
        let saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=${payload.app_nam_hoc}&my_token=${payload.my_token}`;

        try {
            let resp = await vnEduPost(saveUrl, payload, { 'X-Requested-With': 'XMLHttpRequest' });
            let json = await resp.json();

            // Tự động gia hạn token nếu báo lỗi token hoặc hết hạn phiên
            if (json && json.success === false && typeof json.msg === 'string' && (json.msg.includes('token') || json.msg.includes('hết hạn') || json.msg.includes('đăng nhập') || json.msg.includes('quyền'))) {
                console.warn('vnEdu token expired during save, refreshing token...');
                const refreshed = await ensureVnEduToken(true);
                token = refreshed.token;
                payload = buildPayload(token);
                saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=${payload.app_nam_hoc}&my_token=${payload.my_token}`;
                resp = await vnEduPost(saveUrl, payload, { 'X-Requested-With': 'XMLHttpRequest' });
                json = await resp.json();
            }

            if (json && json.success) {
                let assignedId = item.chitietId || item.liveId || null;
                if (!assignedId || assignedId === '0') {
                    try {
                        const liveList = await checkLiveStatus(weekNumber);
                        const matched = liveList.find(l =>
                            (l.lop === item.lop || l.lop === item.lop + 'AL' || (item.lop && item.lop.includes(l.lop))) &&
                            Number(l.thu) === Number(item.thu) &&
                            Number(l.tiet) === Number(item.tiet)
                        );
                        if (matched && matched.chitietId) {
                            assignedId = matched.chitietId;
                        }
                    } catch (checkErr) {
                        console.warn('Lỗi tra cứu live chitietId sau khi lưu:', checkErr.message);
                    }
                }
                json.chitietId = assignedId;
            }

            return json;
        } catch (e) {
            return { success: false, msg: e.message };
        }
    }

    // Tính ngày bắt đầu và kết thúc tuần học
    function getWeekDateRange(weekNumber) {
        const baseDate = new Date(2026, 8, 7); // 07/09/2026 (Thứ Hai Tuần 1)
        const mon = new Date(baseDate.getTime() + (weekNumber - 1) * 7 * 86400000);
        const sun = new Date(mon.getTime() + 6 * 86400000);
        const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        return { tuNgay: fmt(mon), denNgay: fmt(sun) };
    }

    // Lấy lịch báo giảng trực tiếp từ cổng vnEdu (cho các tuần mới không có trong Excel)
    async function getWeekScheduleFromVnEdu(weekNumber) {
        let { token, context } = await ensureVnEduToken();
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=edu.lich_bao_giang.lich_bao_giang&app_nam_hoc=2026&my_token=${token}`;
        const params = new URLSearchParams({
            my_token: token,
            my_user_id: cachedUserId,
            app_nam_hoc: '2026',
            winId: 'get_lbg_' + weekNumber,
            namHoc: '2026',
            capHoc: '2',
            giaoVienId: '5003929486',
            tuanHoc: String(weekNumber),
            iNgayTacDung: '2026-10-26 00:00:00',
            diemTruongKHDH: '0',
            isEdit: '0'
        });

        let html = '';
        try {
            let resp = await vnEduPost(url, params);
            html = await resp.text();
            if (html.includes('cas.vnedu.vn') || html.includes('Phiên làm việc hết hạn') || html.includes('top.location')) {
                const ref = await ensureVnEduToken(true);
                token = ref.token;
                params.set('my_token', token);
                const retryUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=edu.lich_bao_giang.lich_bao_giang&app_nam_hoc=2026&my_token=${token}`;
                resp = await vnEduPost(retryUrl, params);
                html = await resp.text();
            }
        } catch (err) {
            throw err;
        }
        const classIdToName = {
            '5004582066': '7A2AL',
            '5004582046': '7A3AL',
            '5004582186': '9A2AL'
        };
        const monIdToName = {
            '1': 'Toán học',
            '102': 'HĐ trải nghiệm, hướng nghiệp'
        };

        const dateRange = getWeekDateRange(weekNumber);
        const slots = [];
        const rows = html.match(/<tr[^>]*data_stt=["'](\d+)_(\d+)_(\d+)["'][\s\S]*?<\/tr>/gi) || [];

        const baseDate = new Date(2026, 8, 7);
        const monDate = new Date(baseDate.getTime() + (weekNumber - 1) * 7 * 86400000);

        rows.forEach(r => {
            const sttM = r.match(/data_stt=["'](\d+)_(\d+)_(\d+)["']/i);
            const lopM = r.match(/data_lop_hoc_id\s*=\s*["'](\d+)["']/i);
            const monM = r.match(/data_mon_hoc_id\s*=\s*["'](\d+)["']/i);
            const ppctM = r.match(/data_tiet_ppct\s*=\s*["'](\d+)["']/i);

            if (sttM && lopM && lopM[1] && lopM[1] !== '0') {
                const thu = parseInt(sttM[1]);
                const buoi = parseInt(sttM[2]);
                const tiet = parseInt(sttM[3]);
                const lopId = lopM[1];
                const lopName = classIdToName[lopId] || lopId;
                const monId = monM ? monM[1] : '1';
                const monName = monIdToName[monId] || 'Toán học';
                const ppct = ppctM ? ppctM[1] : '';

                const tds = r.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                let tenBai = '';
                let phanMon = '';
                let ghiChu = `Tuần PPCT ${weekNumber}`;

                if (tds.length >= 3) {
                    tenBai = tds[tds.length - 3].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
                    const rawGhiChu = tds[tds.length - 2].replace(/<[^>]+>/g, '').trim();
                    if (rawGhiChu) ghiChu = rawGhiChu;
                    if (tds.length >= 4) {
                        phanMon = tds[tds.length - 4].replace(/<[^>]+>/g, '').trim();
                    }
                }

                let phanMonId = '0';
                if (monId === '102') {
                    if (phanMon.includes('Sinh hoạt lớp') || (thu === 2 && buoi === 1)) {
                        phanMonId = '1022';
                        phanMon = 'Sinh hoạt lớp';
                    } else {
                        phanMonId = '1023';
                        phanMon = 'Hoạt động giáo dục theo chủ đề';
                    }
                }

                const slotDate = new Date(monDate.getTime() + (thu - 2) * 86400000);
                const ngayStr = `${String(slotDate.getDate()).padStart(2, '0')}/${String(slotDate.getMonth() + 1).padStart(2, '0')}/${slotDate.getFullYear()}`;

                slots.push({
                    index: slots.length + 1,
                    thu,
                    buoi,
                    tiet,
                    ngay: ngayStr,
                    lop: lopName,
                    mon: monName,
                    monHocId: monId,
                    phanMonId: phanMonId,
                    phanMon: phanMon,
                    ppct: ppct ? (parseInt(ppct) || ppct) : '',
                    tenBai: tenBai || 'Tiết dạy theo TKB',
                    ghiChu: ghiChu,
                    nhanXetDefault: ghiChu && !ghiChu.includes('PPCT') ? ghiChu : 'Lớp học nghiêm túc, tích cực',
                    diemDefault: 20
                });
            }
        });

        return {
            source: 'vnedu',
            fileName: 'Cổng vnEdu Online (Trực tiếp)',
            lastModified: new Date().toISOString(),
            weekNumber: weekNumber,
            tuNgay: dateRange.tuNgay,
            denNgay: dateRange.denNgay,
            schedule: applyPpctRules(slots, weekNumber)
        };
    }

    // Tự động lập kế hoạch dạy học tuần mới lên vnEdu
    async function autoGenerateAndSaveWeekPlan(weekNumber) {
        const { token, context } = await ensureVnEduToken();
        const dateRange = getWeekDateRange(weekNumber);

        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=edu.lich_bao_giang.genLichBaoGiangTuan&app_nam_hoc=2026&my_token=${token}`;
        const params = {
            my_token: token,
            my_user_id: cachedUserId,
            app_nam_hoc: '2026',
            nam_hoc: '2026',
            cap_hoc: '2',
            gv_id: '5003929486',
            tuan: String(weekNumber),
            tu_ngay: dateRange.tuNgay,
            den_ngay: dateRange.denNgay
        };

        const resp = await vnEduPost(url, params);

        const json = await resp.json();
        if (json && (json.status === 'success' || json.code === 0 || json.success)) {
            knownVnEduWeeks.add(Number(weekNumber));
        }
        return json;
    }

    // Quản lý Cấu hình Số tiết Phân phối chương trình (PPCT)
    function getPpctConfig() {
        const configPath = path.join(__dirname, 'ppct-config.json');
        try {
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch(e) {}
        return {
            hdtn: {
                mode: 'auto',
                weeks: {
                    "8": { "tiet1": 24, "tiet2": 23 },
                    "9": { "tiet1": 27, "tiet2": 26 },
                    "10": { "tiet1": 30, "tiet2": 29 },
                    "11": { "tiet1": 33, "tiet2": 32 }
                }
            },
            autoSyncToVnEdu: true
        };
    }

    function savePpctConfig(newConfig) {
        const configPath = path.join(__dirname, 'ppct-config.json');
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
        return newConfig;
    }

    // Chuẩn hóa số tiết PPCT theo cấu hình người dùng (Môn HĐTN tiết đầu phải là 24, 27, 30...)
    function applyPpctRules(slots, weekNumber) {
        const config = getPpctConfig();
        const weekNum = Number(weekNumber);
        return (slots || []).map(slot => {
            if (slot.mon && slot.mon.includes('trải nghiệm')) {
                const weekStr = String(weekNum);
                const customWeek = config.hdtn && config.hdtn.weeks && config.hdtn.weeks[weekStr];
                const isSinhHoatLop = slot.phanMon && (slot.phanMon.includes('Sinh hoạt') || slot.phanMonId === '1022');
                
                if (customWeek) {
                    slot.ppct = isSinhHoatLop ? Number(customWeek.tiet1) : Number(customWeek.tiet2);
                } else {
                    // Tự động theo công thức chuẩn: Tiết đầu (Sinh hoạt lớp) = week * 3, Tiết sau = week * 3 - 1
                    slot.ppct = isSinhHoatLop ? (weekNum * 3) : (weekNum * 3 - 1);
                }
            }
            return slot;
        });
    }

    // Tra cứu danh sách điểm danh học sinh vắng của tiết học
    async function getDaSachHocSinhVang(lopName, weekNumber, thu, tiet, chitietId = '') {
        const classInfo = CLASS_MAP[lopName] || CLASS_MAP[lopName + 'AL'] || CLASS_MAP[Object.keys(CLASS_MAP).find(k => k.includes(lopName))];
        if (!classInfo) return { success: false, msg: 'Không tìm thấy lớp ' + lopName };

        let { token, context } = await ensureVnEduToken();
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.getDaSachHocSinhVangByLop&app_nam_hoc=2026&my_token=${token}`;

        const params = new URLSearchParams({
            my_token: token,
            app_nam_hoc: '2026',
            lop_id: classInfo.id,
            cap_hoc: classInfo.cap,
            tuan_hoc: String(weekNumber),
            sodaubai_id: String(classInfo.sodaubaiId || '8130546'),
            chitiet_id: String(chitietId || ''),
            tiet: String(tiet),
            thu: String(thu)
        });

        try {
            let resp = await vnEduPost(url, params);
            let json = await resp.json();

            // Nếu vnEdu báo token hết hạn hoặc mất quyền truy cập phiên
            if (json && json.success === false && typeof json.msg === 'string' && (json.msg.includes('token') || json.msg.includes('hết hạn') || json.msg.includes('đăng nhập') || json.msg.includes('quyền'))) {
                console.warn('vnEdu session expired or lacks permission in getDaSachHocSinhVang, refreshing...');
                const refreshed = await ensureVnEduToken(true);
                token = refreshed.token;
                params.set('my_token', token);
                const retryUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.getDaSachHocSinhVangByLop&app_nam_hoc=2026&my_token=${token}`;
                resp = await vnEduPost(retryUrl, params);
                json = await resp.json();
            }

            if (json && json.success === false) {
                console.error('getDaSachHocSinhVang error from vnEdu:', json.msg);
                return { success: false, msg: json.msg || 'Không có quyền truy cập', total: 0, students: [] };
            }

            let list = (json && Array.isArray(json.aRoot)) ? json.aRoot : [];

            // Nếu có truyền chitiet_id mà vnEdu trả về rỗng, tự động gọi lại không kèm chitiet_id để lấy trọn vẹn danh sách lớp
            if (list.length === 0 && chitietId) {
                params.set('chitiet_id', '');
                try {
                    const fallbackResp = await vnEduPost(url, params);
                    const fallbackJson = await fallbackResp.json();
                    if (fallbackJson && Array.isArray(fallbackJson.aRoot) && fallbackJson.aRoot.length > 0) {
                        list = fallbackJson.aRoot;
                    }
                } catch(e) {}
            }

            if (list.length === 0) {
                console.warn('getDaSachHocSinhVang empty aRoot for:', lopName, 'resp json:', json);
            }

            return {
                success: true,
                total: list.length,
                absentCount: list.filter(s => s.co_phep === 1 || s.khong_phep === 1).length,
                students: list.map(s => ({
                    id: s.id,
                    fullName: s.full_name || s.ho_ten,
                    maHs: s.ma_hoc_sinh || s.ma_hs_str,
                    coPhep: s.co_phep === 1,
                    khongPhep: s.khong_phep === 1,
                    statusText: s.co_phep === 1 ? 'Nghỉ có phép (P)' : (s.khong_phep === 1 ? 'Nghỉ không phép (K)' : 'Có mặt')
                }))
            };
        } catch (err) {
            console.error('getDaSachHocSinhVang error:', err.message);
            return { success: false, msg: err.message, total: 0, students: [] };
        }
    }

    // Lưu danh sách học sinh vắng vào vnEdu
    async function saveHocSinhVangToVnEdu(chitietId, studentsData) {
        if (!chitietId) return { success: false, msg: 'Tiết học chưa có ID trên Sổ đầu bài' };

        const absents = (studentsData || []).filter(s => s.coPhep || s.khongPhep || s.co_phep || s.khong_phep);
        if (absents.length === 0) {
            // Cả lớp đi học đầy đủ: vnEdu không có học sinh để lưu, thành công ngay
            return { success: true, msg: 'Cả lớp đi học đầy đủ', data: [] };
        }

        let { token, context } = await ensureVnEduToken();
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.saveHocSinhVang&app_nam_hoc=2026&my_token=${token}`;

        // Build form params mimicking jQuery $.ajax data format
        const formObj = {
            chitiet_id: String(chitietId),
            my_token: token,
            app_nam_hoc: '2026'
        };

        absents.forEach((s, idx) => {
            formObj[`data[${idx}][id]`] = String(s.id);
            formObj[`data[${idx}][co_phep]`] = String(s.coPhep || s.co_phep ? 1 : 0);
            formObj[`data[${idx}][khong_phep]`] = String(s.khongPhep || s.khong_phep ? 1 : 0);
            formObj[`data[${idx}][ma_hoc_sinh]`] = String(s.maHs || s.ma_hoc_sinh || '');
            formObj[`data[${idx}][full_name]`] = String(s.fullName || s.full_name || '');
        });

        try {
            const resp = await vnEduPost(url, formObj);
            const json = await resp.json();
            return json;
        } catch (err) {
            return { success: false, msg: err.message };
        }
    }

    // Bộ nhớ đệm Sổ Điểm Danh Năm Học theo tháng và lớp (tránh fetch lặp lại nhiều lần)
    const sddCache = {};

    // Lấy dữ liệu Sổ Điểm Danh Năm Học theo lớp và tháng
    async function getSoDiemDanhNamHoc(lopName, thangNam, namHoc = '2026') {
        const cacheKey = `${lopName}_${thangNam}_${namHoc}`;
        if (sddCache[cacheKey] && Date.now() - sddCache[cacheKey].time < 60000) {
            return sddCache[cacheKey].data;
        }

        const classInfo = CLASS_MAP[lopName] || CLASS_MAP[lopName + 'AL'] || CLASS_MAP[Object.keys(CLASS_MAP).find(k => k.includes(lopName))];
        if (!classInfo) return { success: false, msg: 'Không tìm thấy lớp ' + lopName, absentByDay: {} };

        let { token, context } = await ensureVnEduToken();
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?load=edu.so_diem_danh.nhap&app_nam_hoc=${namHoc}&my_token=${token}`;

        const params = new URLSearchParams({
            my_token: token,
            app_nam_hoc: namHoc,
            winid: 'check_sdd_' + lopName,
            nam_hoc: namHoc,
            lop: classInfo.id,
            thang: thangNam,
            ten_thang: 'Tháng ' + thangNam.replace('-', ' - '),
            khoi: classInfo.khoi
        });

        try {
            const res = await vnEduPost(url, params);
            const html = await res.text();
            const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
            const absentByDay = {}; // day (int) -> { morning: [], afternoon: [] }

            for (let i = 3; i < rows.length; i++) {
                const r = rows[i];
                const tds = r.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                if (tds.length < 5) continue;

                const maHs = tds[1].replace(/<[^>]+>/g, '').trim();
                const hoDem = tds[2].replace(/<[^>]+>/g, '').trim();
                const ten = tds[3].replace(/<[^>]+>/g, '').trim();
                const fullName = `${hoDem} ${ten}`.trim();
                const trId = (r.match(/<tr[^>]*id=['"]?(\d+)['"]?/i) || [])[1];

                const inputs = r.match(/<input[^>]*id=['"]?txt_\d+_\d+['"]?[^>]*>/gi) || [];
                // Quét cả ô <input> tự nhập và ô <div> đã được trường/giám thị khóa duyệt
                const tdsInRow = r.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                tdsInRow.forEach(td => {
                    const titleMatch = td.match(/title=['"]([^'"]*Ngày\s*(\d+)[\/\-](\d+)[\/\-](\d+)[^'"]*)['"]/i);
                    let day = null;
                    let cleanVal = '';
                    let stuId = trId;

                    if (titleMatch) {
                        day = parseInt(titleMatch[2]);
                        const divMatch = td.match(/<div[^>]*>([\s\S]*?)<\/div>/i);
                        const inputMatch = td.match(/<input[^>]*value=['"]?([^'"]*)['"]?[^>]*>/i);
                        if (divMatch) {
                            cleanVal = divMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim().toUpperCase();
                        } else if (inputMatch) {
                            cleanVal = inputMatch[1].trim().toUpperCase();
                        }
                    } else {
                        const inp = td.match(/<input[^>]*id=['"]?txt_(\d+)_(\d+)['"]?[^>]*>/i);
                        if (inp) {
                            day = parseInt((td.match(/c=['"]?(\d+)['"]/) || [])[1]);
                            cleanVal = ((td.match(/value=['"]?([^'"]*)['"]/) || [])[1] || '').trim().toUpperCase();
                            stuId = (td.match(/a=['"]?(\d+)['"]/) || [])[1] || trId;
                        }
                    }

                    if (!day || !cleanVal) return;

                    if (!absentByDay[day]) {
                        absentByDay[day] = { morning: [], afternoon: [] };
                    }

                    // Sáng nghỉ: SP, SK, P, K, SPCP
                    if (cleanVal.includes('S') || cleanVal === 'P' || cleanVal === 'K' || cleanVal.includes('SP')) {
                        absentByDay[day].morning.push({
                            id: stuId,
                            maHs,
                            fullName,
                            coPhep: cleanVal.includes('P') || cleanVal.includes('CP'),
                            khongPhep: cleanVal.includes('K') || cleanVal.includes('KP'),
                            symbol: cleanVal
                        });
                    }

                    // Chiều nghỉ: CP, CK, P, K, SPCP
                    if (cleanVal.includes('C') || cleanVal === 'P' || cleanVal === 'K' || cleanVal.includes('CP')) {
                        absentByDay[day].afternoon.push({
                            id: stuId,
                            maHs,
                            fullName,
                            coPhep: cleanVal.includes('P') || cleanVal.includes('CP'),
                            khongPhep: cleanVal.includes('K') || cleanVal.includes('KP'),
                            symbol: cleanVal
                        });
                    }
                });
            }

            const result = { success: true, absentByDay };
            sddCache[cacheKey] = { time: Date.now(), data: result };
            return result;
        } catch (err) {
            return { success: false, msg: err.message, absentByDay: {} };
        }
    }

    function clearSession() {
        cachedToken = null;
        cachedCookies = null;
        try {
            if (fs.existsSync(SESSION_CACHE_FILE)) {
                fs.unlinkSync(SESSION_CACHE_FILE);
            }
        } catch (e) {
            saveSessionCache({});
        }
    }

    async function getSchoolInfoFromVnEdu() {
        try {
            const token = await ensureVnEduToken();
            if (!token) {
                return { school: 'Trường THCS An Lập', branch: 'Phân hiệu An Lập' };
            }
            const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=edu.so_diem_danh.getDiemTruongTheoQuyen&my_token=${token}&my_user_id=${cachedUserId || '7365493419'}&app_nam_hoc=2026`;
            const res = await fetchWithTimeout(url, {
                headers: {
                    'Cookie': cachedCookies || '',
                    'User-Agent': 'Mozilla/5.0'
                }
            }, 6000);
            const data = await res.json();
            if (Array.isArray(data)) {
                const anLap = data.find(d => d.id === 790826 || (d.ten && d.ten.toLowerCase().includes('an lập')));
                if (anLap) {
                    return {
                        school: 'Trường THCS An Lập',
                        branch: anLap.ten || 'THCS Thanh An - PH An Lập',
                        diemTruongId: anLap.id
                    };
                }
                const first = data.find(d => d.id !== 0 && d.ten);
                if (first) {
                    return {
                        school: first.ten,
                        branch: first.ten,
                        diemTruongId: first.id
                    };
                }
            }
        } catch (e) {
            console.warn('Lỗi lấy thông tin trường từ vnEdu:', e.message);
        }
        return { school: 'Trường THCS An Lập', branch: 'Phân hiệu An Lập' };
    }

    module.exports = {
        getLatestExcelFile,
        getAvailableWeeks,
        parseWeekSchedule,
        ensureVnEduToken,
        loginVnEduHttp,
        getSessionStatus,
        getSchoolInfoFromVnEdu,
        setSessionToken,
        clearSession,
        checkLiveStatus,
        saveSlotToVnEdu,
        setExcelFileBuffer,
        resetToDefaultExcel,
        getWeekScheduleFromVnEdu,
        autoGenerateAndSaveWeekPlan,
        knownVnEduWeeks,
        getPpctConfig,
        savePpctConfig,
        applyPpctRules,
        getDaSachHocSinhVang,
        saveHocSinhVangToVnEdu,
        getSoDiemDanhNamHoc,
        CLASS_MAP
    };
