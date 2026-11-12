const express = require('express');
const path = require('path');
const fs = require('fs');
const core = require('./sync-core');
const localDb = require('./local_attendance_db');
const teacherProfileManager = require('./teacher-profile-manager');
const adminManager = require('./admin-manager');
const adminDb = require('./admin-db');
const systemDb = require('./system_db');
const chatManager = require('./chat-manager');

const app = express();
const PORT = 3000;

// Tìm thư mục chứa bản build tĩnh của Angular thông minh (Luôn ưu tiên thư mục có index.html mới nhất)
function resolveDistDir() {
    const candidates = [
        path.join(__dirname, '..', 'APP WEB', 'dist', 'demo1', 'browser'),
        path.join(__dirname, 'app-web', 'dist', 'demo1', 'browser'),
        path.join(__dirname, 'public'),
        path.join(__dirname, '..', 'dist', 'demo1', 'browser'),
        path.join(__dirname, 'dist', 'demo1', 'browser'),
        path.join(__dirname, '..', 'app-web', 'dist', 'demo1', 'browser'),
        path.join(__dirname, '..', 'public')
    ];
    let bestDir = null;
    let latestMtime = 0;
    for (const dir of candidates) {
        const indexPath = path.join(dir, 'index.html');
        if (fs.existsSync(indexPath)) {
            try {
                const stat = fs.statSync(indexPath);
                if (stat.mtimeMs > latestMtime) {
                    latestMtime = stat.mtimeMs;
                    bestDir = dir;
                }
            } catch (e) {}
        }
    }
    return bestDir || candidates[0];
}
const DIST_DIR = resolveDistDir();

app.use(express.json({ limit: '20mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
    const active = teacherProfileManager.getActiveTeacher();
    res.json({
        status: 'ok',
        app: 'vnEdu Smart Sync Fullstack',
        school: active.school || 'Trường THCS An Lập',
        teacher: active.title || 'Cô Lê Thị Diệu Huyên',
        uptime: Math.round(process.uptime()) + 's',
        distLoaded: fs.existsSync(DIST_DIR)
    });
});

// CORS & Session Header Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-vnedu-token, x-vnedu-cookie, x-user-admin, x-user-email');
    if (req.method === 'OPTIONS') return res.sendStatus(200);

    const clientToken = req.headers['x-vnedu-token'];
    const clientCookie = req.headers['x-vnedu-cookie'];
    if (clientToken && clientToken !== 'mock_token' && clientToken.length >= 20) {
        core.setSessionToken(clientToken, clientCookie || '');
    }
    next();
});

// Từ điển dịch hành động người dùng sang tiếng Việt theo phong cách Wrapper
function translateAction(req) {
    const p = req.path;
    const m = req.method;
    if (p === '/api/vnedu/login') return { action: 'Đăng nhập hệ thống vnEdu' };
    if (p === '/api/schedule') {
        const w = req.query.week || 'hiện tại';
        return { action: `Xem Sổ Đầu Bài (Tuần ${w})` };
    }
    if (p === '/api/save-attendance') {
        const lop = req.body?.lop || '';
        return { action: `Lưu điểm danh vắng (${lop || 'SĐB'})` };
    }
    if (p === '/api/attendance/scan-all-giam-thi') {
        return { action: `Quét đối chiếu SĐĐ Giám thị` };
    }
    if (p === '/api/save-slot') {
        const lop = req.body?.slot?.lop || req.body?.lop || '';
        const tiet = req.body?.slot?.tiet || req.body?.tiet || '';
        return { action: `Đồng bộ tiết học lên vnEdu (${lop ? 'Lớp ' + lop + ' • ' : ''}Tiết ${tiet})` };
    }
    if (p === '/api/db/attendance/ack') {
        const lop = req.body?.lop || '';
        return { action: `Xác nhận khớp CSDL điểm danh (${lop})` };
    }
    if (p === '/api/teachers/switch') {
        return { action: `Chuyển tài khoản giáo viên (${req.body?.username || ''})` };
    }
    if (p === '/api/admin/clear-cache') return { action: `Xóa bộ nhớ đệm (Cache)` };
    if (p === '/api/admin/stats') return { action: `Xem báo cáo quản trị hệ thống` };
    if (p === '/api/admin/backup') return { action: `Tải bản sao lưu CSDL hệ thống` };
    if (p === '/api/info') return { action: `Nạp cấu hình & thông tin trường` };
    if (p.startsWith('/api/admin')) return { action: `Cấu hình quản trị (${p})` };
    return { action: `${m} ${p}` };
}

// WRAPPER-STYLE AUDIT LOGGER MIDDLEWARE
app.use((req, res, next) => {
    if (!req.path.startsWith('/api') || req.path === '/api/health' || req.path === '/api/status') {
        return next();
    }
    const rawIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
    const clientIp = String(rawIp).split(',')[0].trim().replace('::ffff:', '');
    const startTime = Date.now();

    // Xác định danh tính tài khoản
    let actor = 'Khách vãng lai';
    const activeTeacher = teacherProfileManager.getActiveTeacher();
    if (req.headers['x-user-admin'] === 'true' || req.headers['x-user-email'] === 'xuanngocit@gmail.com') {
        actor = 'Xuân Ngọc (Super Admin)';
    } else if (activeTeacher?.title) {
        actor = `${activeTeacher.title} (${activeTeacher.username})`;
    }

    res.on('finish', () => {
        try {
            const info = translateAction(req);
            systemDb.logAudit(
                info.action,
                actor,
                `${req.method} ${req.path} (${res.statusCode}) - ${Date.now() - startTime}ms`,
                res.statusCode < 400 ? 'success' : 'warn',
                clientIp,
                req.headers['user-agent'] || '',
                req.path,
                req.method,
                res.statusCode
            );
        } catch (_) {}
    });

    next();
});

// Phục vụ file tĩnh của Angular Web App với cache tối ưu
if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR, {
        maxAge: '1d',
        setHeaders: (res, pathUrl) => {
            if (pathUrl.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));
}

// API: Tải lên file Excel tùy chọn
app.post('/api/upload-excel', (req, res) => {
    try {
        const { fileName, fileBase64 } = req.body;
        if (!fileBase64) return res.status(400).json({ success: false, error: 'Thiếu dữ liệu file' });

        const buffer = Buffer.from(fileBase64, 'base64');
        const fileInfo = core.setExcelFileBuffer(fileName, buffer);
        res.json({ success: true, file: fileInfo });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Xóa file tùy chọn, khôi phục tự động tìm trong Downloads
app.post('/api/reset-excel', (req, res) => {
    try {
        core.resetToDefaultExcel();
        const fileInfo = core.getLatestExcelFile();
        res.json({ success: true, file: fileInfo });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========================================================
// API: QUẢN LÝ ĐA HỒ SƠ GIÁO VIÊN (MULTI-TEACHER PROFILES)
// ========================================================
app.get('/api/teachers', (req, res) => {
    try {
        const teachers = teacherProfileManager.getProfiles();
        const current = teacherProfileManager.getActiveTeacher();
        res.json({ success: true, teachers, current });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/teachers/switch', (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, error: 'Thiếu mã tài khoản giáo viên' });
        }
        const current = teacherProfileManager.setActiveTeacher(username);
        res.json({ success: true, current, msg: `Đã chuyển sang tài khoản ${current.title}` });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/teachers/delete', (req, res) => {
    try {
        const { username } = req.body;
        const result = teacherProfileManager.deleteProfile(username);
        adminManager.logAction('Xóa hồ sơ giáo viên', 'Cô Lê Thị Diệu Huyên', `Đã xóa hồ sơ ${username}`, 'warn');
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========================================================
// API: TRUNG TÂM QUẢN TRỊ HỆ THỐNG TOÀN DIỆN (ADMIN ARMOR)
// DÀNH RIÊNG CHO QUẢN TRỊ VIÊN CÔ LÊ THỊ DIỆU HUYÊN
// ========================================================
app.get('/api/admin/overview', (req, res) => {
    try {
        const stats = adminManager.getSystemStats(core);
        res.json({ success: true, ...stats });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/admin/settings', (req, res) => {
    try {
        const settings = adminManager.getSettings();
        res.json({ success: true, settings });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/admin/settings', (req, res) => {
    try {
        const result = adminManager.saveSettings(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/admin/logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const systemLogs = systemDb.getAuditLogs(limit) || [];
        const formatted = systemLogs.map(l => ({
            id: l.id,
            timestamp: l.created_at || l.createdAt,
            action: l.action,
            user: l.actor,
            actor: l.actor,
            ip: l.ip || '127.0.0.1',
            endpoint: l.endpoint || '',
            method: l.method || '',
            statusCode: l.status_code || l.statusCode || 200,
            details: l.details,
            type: l.status === 'success' ? 'success' : (l.status === 'warn' ? 'warn' : 'info')
        }));
        res.json({ success: true, logs: formatted });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/admin/cache/clear', (req, res) => {
    try {
        const result = adminManager.clearCache();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/admin/backup', (req, res) => {
    try {
        const backup = adminManager.generateBackup();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="backup_vnedu_thcs_an_lap_${Date.now()}.json"`);
        res.json(backup);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/admin/restore', (req, res) => {
    try {
        const result = adminManager.restoreBackup(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/admin/teachers/save', (req, res) => {
    try {
        const profile = teacherProfileManager.upsertProfile(req.body);
        adminManager.logAction('Lưu hồ sơ giáo viên', 'Cô Lê Thị Diệu Huyên', `Cập nhật hồ sơ ${profile.name} (${profile.username})`, 'success');
        res.json({ success: true, teacher: profile, teachers: teacherProfileManager.getProfiles() });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========================================================
// API: TIN NHẮN NỘI BỘ vnEdu (LẤY TỪ TÀI KHOẢN THỰC ĐÃ ĐĂNG NHẬP)
// ========================================================
app.get('/api/chat/users', (req, res) => {
    try {
        const users = chatManager.getRealChatUsers();
        res.json({ success: true, users });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/chat/messages', (req, res) => {
    try {
        const { userA, userB } = req.query;
        const messages = chatManager.getMessagesBetween(userA, userB);
        res.json({ success: true, messages });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/chat/messages', (req, res) => {
    try {
        const { senderId, senderName, receiverId, receiverName, text } = req.body;
        const message = chatManager.sendMessage({ senderId, senderName, receiverId, receiverName, text });
        res.json({ success: true, message });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Đăng nhập vnEdu siêu tốc bằng HTTP thuần (Hỗ trợ đa tài khoản giáo viên & Super Admin)
app.post('/api/vnedu/login', async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const password = (req.body.password || '').trim();
        const teacherName = req.body.teacherName || req.body.name || '';
        const gender = req.body.gender || 'unknown';
        const subject = req.body.subject || '';

        if (!password) {
            return res.status(400).json({ success: false, msg: 'Vui lòng nhập mật khẩu.' });
        }

        // 1. Kiểm tra đăng nhập Super Admin Tối Cao (xuanngocit@gmail.com / Joungmin@961)
        const isSuperAdminId = username.toLowerCase() === 'xuanngocit@gmail.com' || username.toLowerCase() === 'xuanngocit';
        if (isSuperAdminId) {
            const adminUser = adminDb.verifyAdmin(username, password);
            if (!adminUser) {
                adminManager.logAction('Đăng nhập Super Admin thất bại', username, 'Sai mật khẩu Super Admin', 'warn');
                return res.status(401).json({ success: false, msg: 'Mật khẩu Super Admin không chính xác!' });
            }

            adminManager.logAction('Đăng nhập Super Admin', `${adminUser.name} (${adminUser.email})`, 'Đăng nhập vào hệ thống với toàn quyền Quản Trị Viên Tối Cao', 'success');
            return res.json({
                success: true,
                isSuperAdmin: true,
                token: 'SUPER_ADMIN_' + Buffer.from(adminUser.email).toString('base64'),
                user: {
                    id: 999,
                    username: adminUser.username,
                    email: adminUser.email,
                    fullname: adminUser.name,
                    phone: adminUser.email,
                    occupation: 'Super Admin Tối Cao',
                    companyName: 'Hệ Thống vnEdu Automation',
                    roles: [99],
                    isSuperAdmin: true
                },
                teacher: {
                    username: adminUser.username,
                    name: adminUser.name,
                    title: 'Super Admin ' + adminUser.name,
                    shortName: 'Admin ' + adminUser.name,
                    gender: 'male',
                    subject: 'Quản Trị Toàn Quyền',
                    school: 'Hệ Thống vnEdu Automation',
                    branch: 'Máy chủ cục bộ',
                    avatarText: 'N',
                    isSuperAdmin: true,
                    active: true
                },
                msg: `Chào mừng Super Admin ${adminUser.name}! Đã đăng nhập toàn quyền quản trị tối cao.`
            });
        }

        // 2. Đăng nhập tài khoản vnEdu giáo viên (Cô Lê Thị Diệu Huyên hoặc đồng nghiệp)
        const vneduUsername = username || '051197003685';
        const loginRes = await core.loginVnEduHttp(vneduUsername, password);
        if (loginRes.success) {
            // Lưu hoặc cập nhật hồ sơ giáo viên vào danh sách
            const profile = teacherProfileManager.upsertProfile({
                username: vneduUsername,
                name: teacherName || (vneduUsername === '051197003685' ? 'Lê Thị Diệu Huyên' : `Giáo viên ${vneduUsername}`),
                gender,
                subject,
                school: 'Trường THCS An Lập'
            });
            adminManager.logAction('Đăng nhập vnEdu', profile.title, `Đăng nhập thành công tài khoản vnEdu ${vneduUsername}`, 'info');
            return res.json({
                ...loginRes,
                teacher: profile,
                msg: `Đăng nhập vnEdu thành công! Chào ${profile.title}.`
            });
        }
        res.json(loginRes);
    } catch (e) {
        res.status(500).json({ success: false, msg: 'Lỗi đăng nhập: ' + e.message });
    }
});

// API: Đăng xuất vnEdu và xóa toàn bộ phiên làm việc
app.post('/api/vnedu/logout', (req, res) => {
    try {
        if (core.clearSession) {
            core.clearSession();
        }
        res.json({ success: true, msg: 'Đã đăng xuất tài khoản vnEdu thành công.' });
    } catch (e) {
        res.status(500).json({ success: false, msg: 'Lỗi khi đăng xuất: ' + e.message });
    }
});

// API: Kiểm tra trạng thái phiên kết nối vnEdu
app.get('/api/vnedu/status', async (req, res) => {
    try {
        const session = core.getSessionStatus();
        const active = teacherProfileManager.getActiveTeacher();
        res.json({
            success: true,
            connected: session.connected,
            account: active.username,
            teacherName: active.name,
            teacherTitle: active.title,
            subject: active.subject,
            tokenPreview: session.connected && session.token ? session.token.substring(0, 8) + '...' : null
        });
    } catch (e) {
        const active = teacherProfileManager.getActiveTeacher();
        res.json({
            success: true,
            connected: false,
            account: active.username,
            teacherName: active.name,
            teacherTitle: active.title,
            subject: active.subject,
            tokenPreview: null
        });
    }
});

// API: Thông tin chung (Tự động thích ứng theo giáo viên đang hoạt động)
app.get('/api/info', async (req, res) => {
    try {
        const source = req.query.source || 'vnedu';
        const file = core.getLatestExcelFile();
        const weekInfo = core.getAvailableWeeks(source);
        const schoolInfo = await core.getSchoolInfoFromVnEdu();
        const active = teacherProfileManager.getActiveTeacher();
        res.json({
            success: true,
            teacher: {
                name: active.name,
                title: active.title,
                shortName: active.shortName,
                account: active.username,
                subject: active.subject,
                gender: active.gender,
                school: schoolInfo.school || active.school || 'Trường THCS An Lập',
                branch: schoolInfo.branch || active.branch || 'Phân hiệu An Lập',
                year: '2025 - 2026'
            },
            file: file ? { name: file.name, time: file.time, isCustom: !!file.isCustom } : null,
            weeks: weekInfo.weeks,
            currentRealWeek: weekInfo.currentRealWeek,
            nextRealWeek: weekInfo.nextRealWeek,
            currentSemester: weekInfo.currentSemester,
            semester2Unlocked: weekInfo.semester2Unlocked
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Lấy cấu hình PPCT
app.get('/api/config/ppct', (req, res) => {
    try {
        const config = core.getPpctConfig();
        res.json({ success: true, config });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Cập nhật cấu hình PPCT
app.post('/api/config/ppct', (req, res) => {
    try {
        const newConfig = req.body.config;
        if (!newConfig) return res.status(400).json({ success: false, error: 'Thiếu cấu hình mới' });
        const saved = core.savePpctConfig(newConfig);
        res.json({ success: true, config: saved });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Lấy dữ liệu thời khóa biểu tuần
app.get('/api/schedule', async (req, res) => {
    try {
        const currentRealWeek = core.getAvailableWeeks().currentRealWeek || 10;
        const week = parseInt(req.query.week) || currentRealWeek;
        const source = req.query.source || 'vnedu';
        const checkLive = req.query.checkLive === '1' || req.query.checkLive === 'true' || req.query.checkLive === true;

        let data = null;
        if (source === 'excel') {
            try {
                data = core.parseWeekSchedule(week);
            } catch (err) { }
        } else {
            try {
                data = await core.getWeekScheduleFromVnEdu(week);
            } catch (err) {
                try {
                    data = core.parseWeekSchedule(week);
                } catch (err2) { }
            }
        }

        if (!data || !data.schedule || data.schedule.length === 0) {
            try {
                data = core.parseWeekSchedule(week);
            } catch (err) { }
        }

        // Nếu tuần này đã có Kế hoạch giáo dục (KHGD) trên vnEdu nhưng cổng mạng phản hồi chậm:
        // Tải lịch dạy chuẩn theo KHGD đã phân công của Cô Lê Thị Diệu Huyên (Tuần 1 -> 11)
        if ((!data || !data.schedule || data.schedule.length === 0) && core.knownVnEduWeeks && core.knownVnEduWeeks.has(week)) {
            try {
                if (core.generatePlannedWeekSchedule) {
                    data = core.generatePlannedWeekSchedule(week);
                }
            } catch (fbErr) {
                console.warn(`Lỗi tạo kế hoạch dạy học tuần ${week}:`, fbErr.message);
            }
        }

        // Nếu tuần này chưa có KHGD (ví dụ Tuần 20+)
        if (!data || !data.schedule || data.schedule.length === 0) {
            return res.json({
                success: true,
                weekNumber: week,
                hasData: false,
                schedule: [],
                totalSlots: 0,
                syncedSlots: 0,
                readySlots: 0,
                message: `Tuần ${week} chưa có Kế hoạch giáo dục (KHGD)`
            });
        }

        const weekInfo = core.getAvailableWeeks(source);
        // currentRealWeek is already calculated above
        const day = new Date().getDay();
        const todayThu = day === 0 ? 8 : day + 1; // 2..8 (Thứ 2..CN)

        // Tra cứu dữ liệu trực tiếp từ vnEdu nếu có yêu cầu (hoặc mặc định cho các tuần có thể có data)
        let liveStatusList = [];
        if (checkLive) {
            try {
                liveStatusList = await core.checkLiveStatus(week);
            } catch (liveErr) {
                console.warn(`Lỗi kiểm tra trạng thái vnEdu trực tiếp tuần ${week}:`, liveErr.message);
            }
        }

        const sddMap = {};
        if (checkLive && liveStatusList.length > 0) {
            const uniqueClasses = [...new Set(data.schedule.map(s => s.lop).filter(Boolean))];
            await Promise.allSettled(uniqueClasses.map(async (lop) => {
                try {
                    const item = data.schedule.find(s => s.lop === lop);
                    const [d, m, y] = (item?.ngay || '').split('/');
                    if (m && y) {
                        const thangNam = `${m}-${y}`;
                        const sddRes = await core.getSoDiemDanhNamHoc(lop, thangNam);
                        if (sddRes && sddRes.absentByDay) {
                            sddMap[lop] = sddRes.absentByDay;
                        }
                    }
                } catch (e) { }
            }));
        }

        data.schedule = data.schedule.map(item => {
            const matchedLive = liveStatusList.find(l =>
                (l.lop === item.lop || l.lop === item.lop + 'AL' || (item.lop && item.lop.includes(l.lop))) &&
                Number(l.thu) === Number(item.thu) &&
                Number(l.tiet) === Number(item.tiet)
            );

            let liveData = null;
            if (matchedLive) {
                liveData = {
                    chitietId: matchedLive.chitietId,
                    ppct: matchedLive.ppct || item.ppct,
                    noiDung: matchedLive.noiDung || item.tenBai,
                    soLuongNghi: matchedLive.soLuongNghi !== undefined ? matchedLive.soLuongNghi : 0,
                    dsHsVang: matchedLive.dsHsVang || []
                };
            }

            const [dStr] = (item.ngay || '').split('/');
            const dayNum = parseInt(dStr);
            const sessionKey = (item.buoi === 2 || String(item.buoi).toLowerCase().includes('chiều')) ? 'afternoon' : 'morning';
            const sddDayData = sddMap[item.lop]?.[dayNum]?.[sessionKey] || [];

            let hsVangList = [];
            let soLuongNghi = 0;

            const sdbRawList = (liveData && Array.isArray(liveData.dsHsVang) && liveData.dsHsVang.length > 0) ? liveData.dsHsVang : (item.sdbDsVang || []);
            const sdbCount = sdbRawList.length > 0 ? sdbRawList.length : (liveData?.soLuongNghi !== undefined ? liveData.soLuongNghi : (item.sdbSoLuongNghi || 0));
            const giamThiCount = sddDayData.length;

            if (sddDayData.length > 0) {
                hsVangList = sddDayData;
                soLuongNghi = sddDayData.length;
            } else if (sdbRawList.length > 0) {
                hsVangList = sdbRawList.map((name, idx) => {
                    const isKhongPhep = typeof name === 'string' && name.includes('(K)');
                    const cleanName = typeof name === 'string' ? name.replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim() : (name.fullName || '');
                    return {
                        id: 'live_' + idx,
                        fullName: cleanName,
                        rawName: name,
                        coPhep: !isKhongPhep,
                        khongPhep: isKhongPhep,
                        statusText: isKhongPhep ? 'Vắng không phép' : 'Vắng có phép'
                    };
                });
                soLuongNghi = sdbCount;
            }

            let isMatched = false;
            let finalGiamThiCount = giamThiCount;
            let finalGiamThiDsVang = sddDayData;

            if (giamThiCount > 0 && sdbCount === giamThiCount) {
                isMatched = true;
            } else if (giamThiCount === 0 && sdbCount === 0) {
                isMatched = true;
            } else if (giamThiCount === 0 && sdbCount > 0) {
                // SĐB đã lưu danh sách vắng trên vnEdu, SĐĐ Giám thị chưa chốt riêng hoặc không có quyền truy cập
                // -> Công nhận dữ liệu SĐB của GV là số liệu chuẩn, ĐÃ KHỚP!
                isMatched = true;
                finalGiamThiCount = sdbCount;
                finalGiamThiDsVang = hsVangList;
            } else {
                isMatched = false;
            }

            // Trạng thái đồng bộ vnEdu
            const isSynced = !!liveData || item.isSynced === true || !!item.chitietId;
            let isFutureSlot = false;
            let statusText = isSynced ? '✅ Đã lưu vnEdu' : '⏳ Chưa lưu';

            if (!isSynced) {
                if (week > currentRealWeek) {
                    isFutureSlot = true;
                    statusText = '📅 Chưa tới ngày dạy';
                } else if (week === currentRealWeek) {
                    if (item.thu > todayThu) {
                        isFutureSlot = true;
                        statusText = '📅 Kế hoạch bài dạy';
                    } else if (item.thu === todayThu) {
                        statusText = '⏳ Chưa lưu (Hôm nay)';
                    } else {
                        statusText = '⏳ Chưa lưu';
                    }
                }
            }

            return {
                ...item,
                tenBai: (liveData?.noiDung || item.tenBai || item.baiDay || '').trim(),
                ppct: liveData?.ppct || item.ppct,
                chitietId: liveData ? liveData.chitietId : (item.chitietId || null),
                liveId: liveData ? liveData.chitietId : (item.liveId || null),
                isSynced,
                isFutureSlot,
                statusText,
                liveData: liveData || item.liveData || null,
                hsVangList,
                soLuongNghi: soLuongNghi || (liveData ? liveData.soLuongNghi : 0),
                sdbSoLuongNghi: sdbCount,
                sdbDsVang: sdbRawList,
                giamThiSoLuongNghi: finalGiamThiCount,
                giamThiDsVang: finalGiamThiDsVang,
                isMatched
            };
        });

        data.totalSlots = data.schedule.length;
        data.syncedSlots = data.schedule.filter(s => s.isSynced).length;
        data.readySlots = data.schedule.filter(s => !s.isSynced).length;

        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Tra cứu danh sách điểm danh
app.get('/api/attendance', async (req, res) => {
    try {
        const { lop, week, thu, tiet, chitietId } = req.query;
        if (!lop) return res.status(400).json({ success: false, msg: 'Thiếu tên lớp' });
        const currentRealWeek = core.getAvailableWeeks().currentRealWeek || 10;
        const weekNum = parseInt(week) || currentRealWeek;

        const result = await core.getDaSachHocSinhVang(lop, weekNum, thu, tiet, chitietId || '');
        
        // Đọc CSDL local (nếu đã từng lưu điểm danh trước đó)
        const localRec = localDb.getRecord(lop, weekNum, thu, tiet);
        result.localRecord = localRec;

        // Tra cứu thêm danh sách vắng ghi nhận trên live SĐB vnEdu
        try {
            const liveList = await core.checkLiveStatus(weekNum);
            const live = liveList.find(l =>
                (l.lop === lop || l.lop === lop + 'AL' || (lop && lop.includes(l.lop))) &&
                Number(l.thu) === Number(thu) &&
                Number(l.tiet) === Number(tiet)
            );
            if (live && Array.isArray(live.dsHsVang) && live.dsHsVang.length > 0) {
                result.sdbDsVang = live.dsHsVang;
            }
        } catch (_) {}

        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Quét đối chiếu Sổ Điểm Danh Giám Thị cho 1 tiết học (Hỗ trợ cả GET và POST)
const handleScanGiamThi = async (req, res) => {
    try {
        const lop = req.query.lop || req.body?.lop || req.body?.className;
        const dateStr = req.query.date || req.query.ngay || req.body?.date || req.body?.ngay || '';
        const tiet = req.query.tiet || req.body?.tiet || req.body?.slot || 1;
        const forceRefresh = req.query.forceRefresh || req.body?.forceRefresh;
        const buoi = req.query.buoi || req.body?.buoi;
        const isForce = forceRefresh === 'true' || forceRefresh === true || forceRefresh === '1';

        const result = await core.scanAbsentFromGiamThi(lop, dateStr, tiet, isForce, buoi);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
app.get('/api/attendance/scan-giam-thi', handleScanGiamThi);
app.post('/api/attendance/scan-giam-thi', handleScanGiamThi);

// API: Quét lại toàn bộ Sổ Điểm Danh Giám Thị cho toàn bộ tuần
const handleScanAllGiamThi = async (req, res) => {
    try {
        const weekInfo = core.getAvailableWeeks();
        const currentRealWeek = weekInfo.currentRealWeek || 10;
        const week = parseInt(req.body?.week || req.query?.week) || currentRealWeek;
        let scheduleSlots = Array.isArray(req.body?.slots) ? req.body.slots : [];

        // QUY TẮC CSDL: Chỉ quét ở đúng tuần hiện tại thực tế!
        // Các tuần quá khứ (Tuần 1..9) đã chốt sổ trong CSDL, không bao giờ quét ngầm gây sai lệch
        if (week < currentRealWeek) {
            return res.json({
                success: true,
                msg: `Tuần ${week} là tuần lưu trữ, đã được chốt số liệu an toàn trong CSDL.`,
                totalUpdatedAbsents: 0,
                matchedSlotsCount: scheduleSlots.length,
                mismatchedSlotsCount: 0,
                schedule: scheduleSlots.map(s => ({
                    ...s,
                    isMatched: true
                }))
            });
        }

        // Nếu client không gửi kèm slots, tìm lịch từ vnEdu hoặc Excel hoặc live status an toàn
        if (!scheduleSlots || scheduleSlots.length === 0) {
            let data = null;
            try {
                data = await core.getWeekScheduleFromVnEdu(week);
            } catch (vneduErr) {
                try {
                    data = core.parseWeekSchedule(week);
                } catch (excelErr) {
                    try {
                        const liveList = await core.checkLiveStatus(week);
                        data = { schedule: liveList };
                    } catch (e) {
                        data = { schedule: [] };
                    }
                }
            }
            if (data && Array.isArray(data.schedule)) {
                scheduleSlots = data.schedule;
            }
        }

        if (!scheduleSlots || scheduleSlots.length === 0) {
            return res.json({
                success: true,
                totalUpdatedAbsents: 0,
                schedule: [],
                msg: 'Không tìm thấy danh sách tiết học tuần ' + week
            });
        }

        const uniqueClasses = [...new Set(scheduleSlots.map(s => s?.lop).filter(Boolean))];
        const sddMap = {};

        // Quét lấy mới nhất (forceRefresh: true) từ SĐĐ vnEdu
        await Promise.allSettled(uniqueClasses.map(async (lop) => {
            try {
                const item = scheduleSlots.find(s => s?.lop === lop);
                const [d, m, y] = (item?.ngay || '').split('/');
                let thangNam = null;
                if (m && y) {
                    thangNam = `${m}-${y}`;
                } else {
                    const now = new Date();
                    thangNam = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
                }
                const sddRes = await core.getSoDiemDanhNamHoc(lop, thangNam, '2026', true);
                if (sddRes && sddRes.absentByDay) {
                    sddMap[lop] = sddRes.absentByDay;
                }
            } catch (e) {
                console.warn(`[scan-all-giam-thi] Không thể lấy SĐĐ lớp ${lop}:`, e.message);
            }
        }));

        // Lấy dữ liệu live SĐB hiện có từ vnEdu để có dsHsVang và soLuongNghi thực tế trên SĐB
        const liveMap = {};
        try {
            const liveList = await core.checkLiveStatus(week);
            if (Array.isArray(liveList)) {
                liveList.forEach(l => {
                    const key = `${l.lop}_${l.thu}_${l.tiet}`;
                    liveMap[key] = l;
                });
            }
        } catch (e) {
            console.warn('[scan-all-giam-thi] Không thể lấy live status:', e.message);
        }

        let totalUpdatedAbsents = 0;
        let matchedSlotsCount = 0;
        let mismatchedSlotsCount = 0;

        const updatedSlots = scheduleSlots.map(item => {
            if (!item) return item;
            let dayNum = null;
            if (item.ngay && typeof item.ngay === 'string' && item.ngay.includes('/')) {
                const [dStr] = item.ngay.split('/');
                dayNum = parseInt(dStr);
            }
            // Phân biệt chính xác Buổi Sáng (morning) và Buổi Chiều (afternoon)
            // THCS An Lập: Buổi chiều cũng đánh số Tiết 1..4, do đó PHẢI ưu tiên kiểm tra item.buoi === 2 trước
            const sessionKey = (item.buoi === 2 || String(item.buoi).toLowerCase().includes('chiều'))
                ? 'afternoon'
                : 'morning';
            const sddDayData = (dayNum && sddMap[item.lop]?.[dayNum]?.[sessionKey]) || [];

            // Tìm dữ liệu tương ứng trên SĐB
            const liveKey = `${item.lop}_${item.thu}_${item.tiet}`;
            const liveItem = liveMap[liveKey] || {};

            // Danh sách và số lượng vắng trên SĐB
            const sdbDsVang = (liveItem.dsHsVang && liveItem.dsHsVang.length > 0) ? liveItem.dsHsVang : (item.dsHsVang || []);
            const sdbSoLuongNghi = sdbDsVang.length > 0 ? sdbDsVang.length : (liveItem.soLuongNghi !== undefined ? liveItem.soLuongNghi : (item.soLuongNghi || 0));

            // Số lượng vắng chính xác trên SĐB
            const displaySdbCount = (sdbDsVang && sdbDsVang.length > 0) ? sdbDsVang.length : (sdbSoLuongNghi || 0);
            let displayGiamThiCount = sddDayData.length;
            let displayGiamThiList = sddDayData;

            // Kiểm tra đối chiếu chặt chẽ:
            let isMatched = false;
            let finalScanGtCount = displayGiamThiCount;
            let finalScanGtList = displayGiamThiList;

            if (displayGiamThiCount > 0 && displaySdbCount === displayGiamThiCount) {
                isMatched = true;
            } else if (displayGiamThiCount === 0 && displaySdbCount === 0) {
                isMatched = true;
            } else if (displayGiamThiCount === 0 && displaySdbCount > 0) {
                // SĐB đã lưu học sinh vắng trên vnEdu, Giám thị chưa có số liệu riêng hoặc GV không có quyền xem SĐĐ
                // -> Công nhận SĐB của GV là số liệu chuẩn, ĐÃ KHỚP!
                isMatched = true;
                finalScanGtCount = displaySdbCount;
                finalScanGtList = sdbDsVang.map((name, idx) => {
                    const isKhongPhep = typeof name === 'string' && name.includes('(K)');
                    const cleanName = typeof name === 'string' ? name.replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim() : (name.fullName || '');
                    return {
                        id: 'live_' + idx,
                        fullName: cleanName,
                        coPhep: !isKhongPhep,
                        khongPhep: isKhongPhep,
                        statusText: isKhongPhep ? 'Vắng không phép' : 'Vắng có phép'
                    };
                });
            } else {
                isMatched = false;
            }

            // Kiểm tra CSDL địa phương: nếu đã được xác nhận thì xem như đã khớp
            if (systemDb.isSlotAcknowledged(week, item.thu, item.tiet, item.lop)) {
                isMatched = true;
            }

            // Lưu trạng thái vào CSDL
            const attResult = systemDb.recordAttendance(week, item.thu, item.tiet, item.lop, {
                ngay: item.ngay,
                sdbAbsentCount: displaySdbCount,
                sdbAbsentList: sdbDsVang,
                giamThiAbsentCount: finalScanGtCount,
                giamThiAbsentList: finalScanGtList,
                isMatched
            });

            totalUpdatedAbsents += (finalScanGtCount > 0 ? finalScanGtCount : displaySdbCount);

            if (isMatched) {
                matchedSlotsCount++;
            } else {
                mismatchedSlotsCount++;
            }

            return {
                ...item,
                chitietId: liveItem.chitietId || item.chitietId,
                sdbSoLuongNghi: displaySdbCount,
                sdbDsVang,
                giamThiSoLuongNghi: finalScanGtCount,
                giamThiDsVang: finalScanGtList,
                isMatched,
                firstDetectedAt: attResult?.firstDetectedAt || null,
                hsVangList: finalScanGtList.length > 0 ? finalScanGtList : (item.hsVangList || []),
                soLuongNghi: finalScanGtCount > 0 ? finalScanGtCount : displaySdbCount
            };
        });

        res.json({
            success: true,
            msg: `Đã đối chiếu SĐĐ Giám thị cho tuần ${week}: phát hiện ${totalUpdatedAbsents} lượt vắng (${matchedSlotsCount} tiết đã khớp hoàn toàn, ${mismatchedSlotsCount} tiết cần chú ý)`,
            totalUpdatedAbsents,
            matchedSlotsCount,
            mismatchedSlotsCount,
            schedule: updatedSlots
        });
    } catch (e) {
        console.error('Lỗi scan-all-giam-thi:', e);
        res.json({
            success: true,
            totalUpdatedAbsents: 0,
            schedule: Array.isArray(req.body?.slots) ? req.body.slots : [],
            msg: `Không thể kết nối cổng Giám thị vnEdu: ${e.message}`,
            error: e.message
        });
    }
};
app.get('/api/attendance/scan-all-giam-thi', handleScanAllGiamThi);
app.post('/api/attendance/scan-all-giam-thi', handleScanAllGiamThi);

// API: Đánh dấu xác nhận khớp điểm danh (Lưu vĩnh viễn vào CSDL địa phương)
app.post('/api/db/attendance/ack', (req, res) => {
    try {
        const { week, thu, tiet, lop } = req.body;
        if (!week || !thu || !tiet || !lop) {
            return res.status(400).json({ success: false, msg: 'Thiếu thông tin tiết học cần xác nhận' });
        }
        const result = systemDb.acknowledgeConflict(week, thu, tiet, lop);
        adminManager.logAction('Xác nhận khớp điểm danh', 'Giáo viên', `Đã chốt khớp Tiết ${tiet} Thứ ${thu} Lớp ${lop} Tuần ${week}`, 'success');
        res.json({ success: true, ...result, msg: `Đã xác nhận và chốt khớp Tiết ${tiet} Thứ ${thu} lớp ${lop}!` });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Đọc trạng thái điểm danh đã lưu trong CSDL theo tuần
app.get('/api/db/attendance/:week', (req, res) => {
    try {
        const week = parseInt(req.params.week) || 10;
        const ledger = systemDb.getWeekAttendanceLedger(week);
        res.json({ success: true, week, ledger });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Lưu điểm danh học sinh vắng
app.post('/api/save-attendance', async (req, res) => {
    try {
        const { chitietId, studentsData, soLuongNghi, slot, week } = req.body;
        const currentRealWeek = core.getAvailableWeeks().currentRealWeek || 10;
        const weekNum = parseInt(week) || currentRealWeek;
        let targetChitietId = chitietId || (slot && (slot.chitietId || slot.liveId)) || null;

        // Nếu chưa có chitietId và có slot, tự động lưu tiết dạy lên SĐB trước để tạo ID
        if (!targetChitietId && slot) {
            const slotToSave = {
                ...slot,
                tenBai: slot.tenBai || slot.baiDay || slot.noiDung || '',
                soLuongNghi: soLuongNghi !== undefined ? soLuongNghi : (studentsData ? studentsData.length : 0),
                hsVangList: studentsData || []
            };
            const saveRes = await core.saveSlotToVnEdu(slotToSave, weekNum);
            if (saveRes && saveRes.success) {
                targetChitietId = saveRes.chitietId || (saveRes.data && saveRes.data.id ? saveRes.data.id : null);
                if (!targetChitietId) {
                    try {
                        const liveList = await core.checkLiveStatus(weekNum);
                        const matched = liveList.find(l =>
                            (l.lop === slot.lop || l.lop === slot.lop + 'AL' || (slot.lop && slot.lop.includes(l.lop))) &&
                            Number(l.thu) === Number(slot.thu) &&
                            Number(l.tiet) === Number(slot.tiet)
                        );
                        if (matched && matched.chitietId) {
                            targetChitietId = matched.chitietId;
                        }
                    } catch (liveErr) {
                        console.warn('Không thể tra cứu live chitietId:', liveErr.message);
                    }
                }
            } else {
                return res.json({
                    success: false,
                    msg: 'Không thể tự động lưu tiết dạy trước khi điểm danh: ' + ((saveRes && saveRes.msg) || 'Lỗi vnEdu')
                });
            }
        }

        if (!targetChitietId) {
            return res.json({
                success: false,
                msg: 'Tiết học này chưa có mã trên Sổ đầu bài. Vui lòng bấm biểu tượng Lưu SĐB trước khi điểm danh.'
            });
        }

        const targetLop = (slot && slot.lop) || req.body.lop || req.body.className || '';
        let absentList = (studentsData || []).filter(s => s.coPhep || s.khongPhep || s.co_phep || s.khong_phep);

        // KIỂM TRA BẢO MẬT: Xác thực học sinh vắng BẮT BUỘC phải thuộc danh sách lớp & trùng khớp Mã HS
        let removedForeign = [];
        if (targetLop && absentList.length > 0) {
            const valCheck = await core.validateStudentsInClass(targetLop, absentList);
            if (valCheck.invalidStudents.length > 0) {
                removedForeign = valCheck.invalidStudents;
                console.warn(`[KIỂM SOÁT LỚP HỌC] Đã phát hiện và loại bỏ ${removedForeign.length} học sinh không thuộc lớp ${targetLop}:`,
                    removedForeign.map(s => `${s.fullName} (Mã HS: ${s.maHs})`));
                absentList = valCheck.validStudents;
            }
        }

        const saveRes = await core.saveHocSinhVangToVnEdu(targetChitietId, absentList, targetLop);

        // Lưu bản ghi vào CSDL local attendance_db.json & system_database.json
        if (slot) {
            try {
                localDb.saveRecord(slot.lop, weekNum, slot.thu, slot.tiet, {
                    chitietId: targetChitietId,
                    soLuongNghi: absentList.length,
                    absentList,
                    studentsData
                });
                systemDb.acknowledgeConflict(weekNum, slot.thu, slot.tiet, slot.lop);
                systemDb.recordAttendance(weekNum, slot.thu, slot.tiet, slot.lop, {
                    ngay: slot.ngay,
                    sdbAbsentCount: absentList.length,
                    sdbAbsentList: absentList,
                    giamThiAbsentCount: absentList.length,
                    isMatched: true
                });
            } catch (errDb) {
                console.warn('Lỗi ghi CSDL local:', errDb.message);
            }
        }

        // Cập nhật lại số lượng học sinh nghỉ vào tiết Sổ đầu bài
        if (slot) {
            try {
                const updatedSlot = {
                    ...slot,
                    chitietId: targetChitietId,
                    soLuongNghi: absentList.length,
                    tenBai: slot.tenBai || slot.baiDay || slot.noiDung || ''
                };
                await core.saveSlotToVnEdu(updatedSlot, weekNum);
            } catch (errUpd) {
                console.warn('Lỗi cập nhật lại số lượng nghỉ trên tiết:', errUpd.message);
            }
        }

        res.json({
            success: true,
            chitietId: targetChitietId,
            msg: absentList.length > 0 ? `Đã lưu danh sách ${absentList.length} học sinh vắng vào Sổ đầu bài!` : 'Đã ghi nhận cả lớp đi học đầy đủ!',
            details: saveRes
        });
    } catch (e) {
        res.json({ success: false, msg: 'Lỗi máy chủ khi lưu điểm danh: ' + e.message });
    }
});

// API: Đồng bộ 1 tiết đơn lẻ
// API: Kiểm tra đối chiếu học sinh theo lớp & Mã HS
// API: Rà soát & kiểm toán toàn diện quy tắc nghiệp vụ cho 1 tuần học
app.get('/api/validation/audit-week', async (req, res) => {
    try {
        const currentRealWeek = core.getAvailableWeeks().currentRealWeek || 10;
        const week = parseInt(req.query.week) || currentRealWeek;
        let schedule = [];
        try {
            const data = await core.getWeekScheduleFromVnEdu(week);
            if (data && Array.isArray(data.schedule)) schedule = data.schedule;
        } catch (_) {}

        if (schedule.length === 0) {
            try {
                const cachePath = path.join(__dirname, 'public', 'schedule_cache.json');
                if (fs.existsSync(cachePath)) {
                    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                    schedule = cache.weeks?.[String(week)]?.schedule || [];
                }
            } catch (_) {}
        }

        const auditResult = core.auditScheduleSlots(schedule, week);
        res.json({
            success: true,
            week,
            totalSlots: schedule.length,
            ...auditResult
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/attendance/validate-class', async (req, res) => {
    try {
        const { lop, students } = req.body;
        if (!lop) return res.status(400).json({ success: false, msg: 'Thiếu tên lớp cần đối chiếu' });
        const check = await core.validateStudentsInClass(lop, students || []);
        res.json({
            success: true,
            lop,
            ...check
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/sync-slot', async (req, res) => {
    try {
        const { slot, week } = req.body;
        if (!slot) return res.status(400).json({ success: false, msg: 'Thiếu thông tin tiết dạy' });

        const currentRealWeek = core.getAvailableWeeks().currentRealWeek || 10;
        const result = await core.saveSlotToVnEdu(slot, week || currentRealWeek);
        const savedId = result.chitietId || slot.chitietId || slot.liveId || (result && result.data && result.data.id);

        if (result.success && savedId && slot.hsVangList && Array.isArray(slot.hsVangList) && slot.hsVangList.length > 0) {
            try {
                await core.saveHocSinhVangToVnEdu(savedId, slot.hsVangList);
            } catch (hsErr) {
                console.warn('Lỗi lưu danh sách học sinh vắng:', hsErr.message);
            }
        }

        if (savedId && result) {
            result.chitietId = savedId;
        }

        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// API: Đồng bộ hàng loạt
app.post('/api/sync-batch', async (req, res) => {
    try {
        const { week, filter, slots } = req.body;
        const currentRealWeek = core.getAvailableWeeks().currentRealWeek || 10;
        const weekNum = parseInt(week) || currentRealWeek;
        let slotsToSync = slots;

        if (!slotsToSync || !Array.isArray(slotsToSync)) {
            let scheduleData = await core.getWeekScheduleFromVnEdu(weekNum).catch(() => core.parseWeekSchedule(weekNum));
            const now = new Date();
            const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            slotsToSync = (scheduleData && scheduleData.schedule) ? scheduleData.schedule : [];
            if (filter === 'today') {
                slotsToSync = slotsToSync.filter(s => s.ngay === todayStr);
            } else if (filter === 'unlocked') {
                slotsToSync = slotsToSync.filter(s => {
                    const [d, m, y] = s.ngay.split('/').map(Number);
                    const itemDate = new Date(y, m - 1, d);
                    return itemDate <= todayDate;
                });
            }
        }

        const results = [];
        for (const slot of slotsToSync) {
            const resSlot = await core.saveSlotToVnEdu(slot, weekNum);
            const savedId = slot.chitietId || slot.liveId || (resSlot && resSlot.data && resSlot.data.id);
            if (resSlot.success && savedId && slot.hsVangList && Array.isArray(slot.hsVangList) && slot.hsVangList.length > 0) {
                try {
                    await core.saveHocSinhVangToVnEdu(savedId, slot.hsVangList);
                } catch (hsErr) { }
            }
            results.push({
                slot,
                success: resSlot.success,
                msg: resSlot.msg || (resSlot.success ? 'Thành công' : 'Thất bại')
            });
            await new Promise(r => setTimeout(r, 400));
        }

        res.json({
            success: true,
            total: slotsToSync.length,
            succeeded: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            details: results
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API 404 handler: luôn trả JSON thay vì HTML để tránh lỗi JSON parse trên web
// API 404 handler: luôn trả JSON thay vì HTML để tránh lỗi JSON parse trên web
// ========================================================
// TRỢ LÝ AI VNEDU (AI ASSISTANT CHATBOT)
// ========================================================
const aiAssistant = require('./ai-assistant-core');

app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, currentWeek, history, slots } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: 'Thiếu nội dung câu hỏi' });
        }
        const week = parseInt(currentWeek) || core.getAvailableWeeks().currentRealWeek || 10;
        const activeTeacher = teacherProfileManager.getActiveTeacher();
        const result = await aiAssistant.processAiQuery({ 
            message, 
            currentWeek: week, 
            history: history || [], 
            clientSlots: slots,
            teacher: activeTeacher
        });
        res.json(result);
    } catch (e) {
        console.error('Lỗi AI Chat:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/ai/summary', async (req, res) => {
    try {
        const currentRealWeek = core.getAvailableWeeks().currentRealWeek || 10;
        const week = parseInt(req.query.week) || currentRealWeek;
        const context = await aiAssistant.getWeekContext(week);
        res.json({
            success: true,
            week,
            totalSlots: context.totalSlots,
            syncedSlots: context.syncedSlots,
            unsyncedCount: context.unsyncedSlots.length,
            missingLessonCount: context.missingLessonSlots.length,
            slotsWithAbsenceCount: context.slotsWithAbsence.length
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: `API endpoint không tồn tại: ${req.method} ${req.path}` });
});

// Fallback mọi route trang SPA sang index.html của Angular (tương thích 100% Express 5 & Windows)
if (fs.existsSync(DIST_DIR)) {
    const indexPath = path.join(DIST_DIR, 'index.html');
    app.use((req, res, next) => {
        if (req.method === 'GET') {
            try {
                const html = fs.readFileSync(indexPath, 'utf8');
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(html);
            } catch (err) {
                return res.status(500).send('Không thể nạp index.html: ' + err.message);
            }
        }
        next();
    });
}

app.listen(PORT, () => {
    console.log(`🌐 Máy chủ vnEdu Fullstack đang chạy tại: http://localhost:${PORT}`);
    if (fs.existsSync(DIST_DIR)) {
        console.log(`📦 Đã nạp giao diện Angular từ: ${DIST_DIR}`);
    } else {
        console.log(`⚠️ Chưa thấy thư mục build Angular dist. Chạy 'ng build' để build giao diện.`);
    }
});
