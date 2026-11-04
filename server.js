const express = require('express');
const path = require('path');
const fs = require('fs');
const core = require('./sync-core');

const app = express();
const PORT = 3000;

// Tìm thư mục chứa bản build tĩnh của Angular thông minh
function resolveDistDir() {
    const candidates = [
        path.join(__dirname, '..', 'dist', 'demo1', 'browser'),
        path.join(__dirname, 'dist', 'demo1', 'browser'),
        path.join(__dirname, 'app-web', 'dist', 'demo1', 'browser'),
        path.join(__dirname, '..', 'app-web', 'dist', 'demo1', 'browser'),
        path.join(__dirname, 'public'),
        path.join(__dirname, '..', 'public')
    ];
    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, 'index.html'))) {
            return dir;
        }
    }
    return candidates[0];
}
const DIST_DIR = resolveDistDir();

app.use(express.json({ limit: '20mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'vnEdu Smart Sync Fullstack',
        school: 'Trường THCS An Lập',
        teacher: 'Cô Lê Thị Diệu Huyên',
        uptime: Math.round(process.uptime()) + 's',
        distLoaded: fs.existsSync(DIST_DIR)
    });
});

// CORS & Session Header Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-vnedu-token, x-vnedu-cookie');
    if (req.method === 'OPTIONS') return res.sendStatus(200);

    const clientToken = req.headers['x-vnedu-token'];
    const clientCookie = req.headers['x-vnedu-cookie'];
    if (clientToken) {
        core.setSessionToken(clientToken, clientCookie || '');
    }
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

// API: Đăng nhập vnEdu siêu tốc bằng HTTP thuần
app.post('/api/vnedu/login', async (req, res) => {
    try {
        const username = req.body.username || '051197003685';
        const password = req.body.password || '';
        if (!password) {
            return res.status(400).json({ success: false, msg: 'Vui lòng nhập mật khẩu vnEdu.' });
        }

        const loginRes = await core.loginVnEduHttp(username, password);
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
        res.json({
            success: true,
            connected: session.connected,
            account: '051197003685',
            teacherName: 'Lê Thị Diệu Huyên',
            tokenPreview: session.connected && session.token ? session.token.substring(0, 8) + '...' : null
        });
    } catch (e) {
        res.json({
            success: true,
            connected: false,
            account: '051197003685',
            teacherName: 'Lê Thị Diệu Huyên',
            tokenPreview: null
        });
    }
});

// API: Thông tin chung
app.get('/api/info', async (req, res) => {
    try {
        const source = req.query.source || 'vnedu';
        const file = core.getLatestExcelFile();
        const weekInfo = core.getAvailableWeeks(source);
        const schoolInfo = await core.getSchoolInfoFromVnEdu();
        res.json({
            success: true,
            teacher: {
                name: 'Lê Thị Diệu Huyên',
                account: '051197003685',
                school: schoolInfo.school || 'Trường THCS An Lập',
                branch: schoolInfo.branch || 'Phân hiệu An Lập',
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
        const week = parseInt(req.query.week) || 9;
        const source = req.query.source || 'vnedu';
        const checkLive = req.query.checkLive === '1';

        let data = null;
        if (source === 'excel') {
            data = core.parseWeekSchedule(week);
        } else {
            try {
                data = await core.getWeekScheduleFromVnEdu(week);
            } catch (err) {
                data = core.parseWeekSchedule(week);
            }
        }

        if (!data || !data.schedule || data.schedule.length === 0) {
            data = core.parseWeekSchedule(week);
        }

        if (checkLive) {
            try {
                const liveStatusList = await core.checkLiveStatus(week);
                const sddMap = {};
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

                data.schedule = data.schedule.map(item => {
                    const matchedLive = liveStatusList.find(l =>
                        l.lop === item.lop &&
                        l.thu === item.thu &&
                        l.buoi === item.buoi &&
                        l.tiet === item.tiet
                    );

                    let liveData = null;
                    if (matchedLive) {
                        liveData = {
                            chitietId: matchedLive.chitietId,
                            ppct: matchedLive.ppct,
                            noiDung: matchedLive.noiDung,
                            soLuongNghi: matchedLive.soLuongNghi,
                            dsHsVang: matchedLive.dsHsVang
                        };
                    }

                    const [dStr] = (item.ngay || '').split('/');
                    const dayNum = parseInt(dStr);
                    const sessionKey = item.buoi === 1 ? 'morning' : 'afternoon';
                    const sddDayData = sddMap[item.lop]?.[dayNum]?.[sessionKey] || [];

                    let hsVangList = [];
                    let soLuongNghi = 0;

                    if (sddDayData.length > 0) {
                        hsVangList = sddDayData;
                        soLuongNghi = sddDayData.length;
                    } else if (liveData && liveData.dsHsVang && liveData.dsHsVang.length > 0) {
                        hsVangList = liveData.dsHsVang.map((name, idx) => ({
                            id: 'live_' + idx,
                            fullName: name,
                            coPhep: true,
                            khongPhep: false,
                            statusText: 'Vắng'
                        }));
                        soLuongNghi = liveData.soLuongNghi || liveData.dsHsVang.length;
                    }

                    return {
                        ...item,
                        chitietId: liveData ? liveData.chitietId : null,
                        liveId: liveData ? liveData.chitietId : null,
                        isSynced: !!liveData,
                        liveData: liveData,
                        hsVangList,
                        soLuongNghi: soLuongNghi || (liveData ? liveData.soLuongNghi : 0)
                    };
                });
            } catch (liveErr) {
                console.warn('Lỗi kiểm tra trạng thái vnEdu trực tiếp:', liveErr.message);
            }
        }

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
        const weekNum = parseInt(week) || 9;

        const result = await core.getDaSachHocSinhVang(lop, weekNum, thu, tiet, chitietId || '');
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Quét đối chiếu Sổ Điểm Danh Giám Thị cho 1 tiết học
app.get('/api/attendance/scan-giam-thi', async (req, res) => {
    try {
        const { lop, date, ngay, tiet, forceRefresh } = req.query;
        const dateStr = date || ngay || '';
        const isForce = forceRefresh === 'true' || forceRefresh === true || forceRefresh === '1';

        const result = await core.scanAbsentFromGiamThi(lop, dateStr, tiet || 1, isForce);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Quét lại toàn bộ Sổ Điểm Danh Giám Thị cho toàn bộ tuần
app.post('/api/attendance/scan-all-giam-thi', async (req, res) => {
    try {
        const week = parseInt(req.body.week) || 9;
        const data = await core.parseWeekSchedule(week);
        if (!data || !data.schedule || data.schedule.length === 0) {
            return res.json({ success: false, msg: 'Không tìm thấy lịch tuần ' + week });
        }

        const uniqueClasses = [...new Set(data.schedule.map(s => s.lop).filter(Boolean))];
        const sddMap = {};

        // Quét lấy mới nhất (forceRefresh: true) từ SĐĐ vnEdu
        await Promise.allSettled(uniqueClasses.map(async (lop) => {
            try {
                const item = data.schedule.find(s => s.lop === lop);
                const [d, m, y] = (item?.ngay || '').split('/');
                if (m && y) {
                    const thangNam = `${m}-${y}`;
                    const sddRes = await core.getSoDiemDanhNamHoc(lop, thangNam, '2026', true);
                    if (sddRes && sddRes.absentByDay) {
                        sddMap[lop] = sddRes.absentByDay;
                    }
                }
            } catch (e) { }
        }));

        let totalUpdatedAbsents = 0;
        const updatedSlots = data.schedule.map(item => {
            const [dStr] = (item.ngay || '').split('/');
            const dayNum = parseInt(dStr);
            const sessionKey = item.buoi === 1 ? 'morning' : 'afternoon';
            const sddDayData = sddMap[item.lop]?.[dayNum]?.[sessionKey] || [];

            if (sddDayData.length > 0) {
                totalUpdatedAbsents += sddDayData.length;
                return {
                    ...item,
                    hsVangList: sddDayData,
                    soLuongNghi: sddDayData.length
                };
            }
            return item;
        });

        res.json({
            success: true,
            msg: `Đã quét và đồng bộ SĐĐ Giám thị cho tuần ${week}: phát hiện ${totalUpdatedAbsents} lượt vắng`,
            totalUpdatedAbsents,
            schedule: updatedSlots
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Lưu điểm danh học sinh vắng
app.post('/api/save-attendance', async (req, res) => {
    try {
        const { chitietId, studentsData, soLuongNghi, slot, week } = req.body;
        const weekNum = parseInt(week) || 9;
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

        const absentList = (studentsData || []).filter(s => s.coPhep || s.khongPhep || s.co_phep || s.khong_phep);
        const saveRes = await core.saveHocSinhVangToVnEdu(targetChitietId, absentList);

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
app.post('/api/sync-slot', async (req, res) => {
    try {
        const { slot, week } = req.body;
        if (!slot) return res.status(400).json({ success: false, msg: 'Thiếu thông tin tiết dạy' });

        const result = await core.saveSlotToVnEdu(slot, week || 9);
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
        const weekNum = parseInt(week) || 9;
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

// Fallback mọi route trang sang index.html của Angular
if (fs.existsSync(DIST_DIR)) {
    app.use((req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
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
