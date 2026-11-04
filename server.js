const express = require('express');
const path = require('path');
const fs = require('fs');
const core = require('./sync-core');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// CORS và Middleware xử lý Session Header
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

app.use(express.static(path.join(__dirname, 'public')));

// API: Đăng nhập vnEdu siêu tốc bằng HTTP thuần (Loại bỏ Playwright)
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

// API: Thông tin chung
app.get('/api/info', async (req, res) => {
    try {
        const source = req.query.source || 'vnedu';
        const file = core.getLatestExcelFile();
        const weekInfo = core.getAvailableWeeks(source);
        res.json({
            success: true,
            teacher: {
                name: 'Lê Thị Diệu Huyên',
                account: '051197003685',
                school: 'THCS Thanh An - TP. Hồ Chí Minh',
                year: '2026 - 2027'
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

// API: Lấy cấu hình số tiết PPCT
app.get('/api/config/ppct', (req, res) => {
    try {
        const config = core.getPpctConfig();
        res.json({ success: true, config });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Lưu cấu hình số tiết PPCT
app.post('/api/config/ppct', (req, res) => {
    try {
        const newConfig = req.body;
        if (!newConfig) return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
        core.savePpctConfig(newConfig);
        res.json({ success: true, config: newConfig });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Lấy thời khóa biểu tuần (Hỗ trợ Cấp độ 2: vnEdu trực tiếp & Cấp độ 1: Excel dự phòng)
app.get('/api/schedule', async (req, res) => {
    try {
        const week = parseInt(req.query.week) || 8;
        const checkLive = req.query.checkLive === '1';
        const reqSource = req.query.source || 'vnedu'; // Mặc định Cấp độ 2: 'vnedu' trực tiếp, hoặc 'excel' dự phòng

        let scheduleData = null;
        let actualSource = reqSource;

        if (reqSource === 'vnedu') {
            try {
                scheduleData = await core.getWeekScheduleFromVnEdu(week);
                actualSource = 'vnedu';
            } catch (onlineErr) {
                console.warn(`Không lấy được tuần ${week} từ vnEdu online, chuyển sang Excel dự phòng:`, onlineErr.message);
                scheduleData = core.parseWeekSchedule(week);
                actualSource = 'excel';
            }
            // Nếu vnEdu online chưa có lịch (ví dụ tuần tương lai chưa lập) và Excel có
            if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
                const excelData = core.parseWeekSchedule(week);
                if (excelData && excelData.schedule && excelData.schedule.length > 0) {
                    scheduleData = excelData;
                    actualSource = 'excel';
                }
            }
        } else {
            // Yêu cầu lấy từ File Excel dự phòng
            scheduleData = core.parseWeekSchedule(week);
            actualSource = 'excel';
            // Nếu File Excel không có tuần này (ví dụ tuần 9, 10...), tự động nạp từ vnEdu online
            if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
                try {
                    scheduleData = await core.getWeekScheduleFromVnEdu(week);
                    actualSource = 'vnedu';
                } catch(e) {}
            }
        }

        if (!scheduleData || !scheduleData.schedule) {
            scheduleData = {
                source: actualSource,
                fileName: actualSource === 'vnedu' ? 'Cổng vnEdu Online (Trực tiếp)' : 'File Excel',
                weekNumber: week,
                schedule: []
            };
        }

        // Lấy danh sách live entries từ vnEdu nếu checkLive, hoặc từ cache có sẵn
        let liveEntries = [];
        let liveCheckError = null;

        if (checkLive) {
            try {
                liveEntries = await Promise.race([
                    core.checkLiveStatus(week),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Hết thời gian chờ phản hồi vnEdu (15s)')), 15000))
                ]);
            } catch (e) {
                liveCheckError = e.message;
                console.error('Không kiểm tra được live status SĐB:', e.message);
            }
        }

        // Nếu không checkLive hoặc checkLive trả về rỗng, đọc từ schedule_cache.json nếu có
        if (liveEntries.length === 0) {
            try {
                const cachePath = path.join(__dirname, 'public', 'schedule_cache.json');
                if (fs.existsSync(cachePath)) {
                    const cacheJson = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                    const wData = cacheJson.weeks && cacheJson.weeks[String(week)];
                    if (wData && wData.schedule) {
                        wData.schedule.forEach(s => {
                            if (s.chitietId || s.liveId || s.status === 'synced') {
                                liveEntries.push({
                                    lop: s.lop,
                                    thu: s.thu,
                                    buoi: s.buoi,
                                    tiet: s.tiet,
                                    chitietId: s.chitietId || s.liveId,
                                    ppct: s.ppct,
                                    noiDung: s.tenBai,
                                    soLuongNghi: s.soLuongNghi || 0,
                                    dsHsVang: s.dsHsVang || []
                                });
                            }
                        });
                    }
                }
            } catch (cErr) {
                console.error('[DEBUG cErr]', cErr);
            }
        }

        // Ngày hôm nay (YYYY-MM-DD hoặc DD/MM/YYYY)
        const now = new Date();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        // Tra cứu Sổ Điểm Danh Năm Học để đối chiếu (an toàn, chỉ để gợi ý cho cô giáo)
        const sddMap = {};
        try {
            if (scheduleData.schedule && scheduleData.schedule.length > 0) {
                // Xác định tháng của tuần
                const firstDate = scheduleData.schedule[0].ngay; // DD/MM/YYYY
                const [d0, m0, y0] = firstDate.split('/').map(Number);
                const thangNam = `${m0}-${y0}`;
                const uniqueClasses = [...new Set(scheduleData.schedule.map(s => s.lop))];

                for (const cls of uniqueClasses) {
                    const sddData = await core.getSoDiemDanhNamHoc(cls, thangNam, String(y0));
                    if (sddData && sddData.success) {
                        sddMap[cls] = sddData.absentByDay || {};
                    }
                }
            }
        } catch (sddErr) {
            console.warn('Không tải được Sổ điểm danh năm học:', sddErr.message);
        }

        // Đánh dấu trạng thái từng tiết
        const enrichedSchedule = scheduleData.schedule.map(item => {
            const matchLive = liveEntries.find(l =>
                l.lop === item.lop &&
                parseInt(l.thu) === parseInt(item.thu) &&
                parseInt(l.tiet) === parseInt(item.tiet) &&
                parseInt(l.buoi) === parseInt(item.buoi)
            );

            // Kiểm tra xem có phải ngày tương lai không
            const [d, m, y] = item.ngay.split('/').map(Number);
            const itemDate = new Date(y, m - 1, d);
            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const isToday = item.ngay === todayStr;
            const isPast = itemDate < todayDate;
            const isFuture = itemDate > todayDate;

            // Đối chiếu với Sổ Điểm Danh Năm Học cho buổi dạy này
            const dayNum = parseInt(d);
            const sessionKey = item.buoi === 1 ? 'morning' : 'afternoon';
            const sddDayData = sddMap[item.lop]?.[dayNum]?.[sessionKey] || [];

            const liveAbsentCount = matchLive
                ? ((matchLive.dsHsVang && matchLive.dsHsVang.length > 0) ? matchLive.dsHsVang.length : (matchLive.soLuongNghi || 0))
                : (item.soLuongNghi || 0);

            return {
                ...item,
                isToday,
                isPast,
                isFuture,
                isLive: !!matchLive,
                liveId: matchLive ? matchLive.chitietId : (item.chitietId || item.liveId || null),
                chitietId: matchLive ? matchLive.chitietId : (item.chitietId || item.liveId || null),
                liveNoiDung: matchLive ? matchLive.noiDung : null,
                soLuongNghi: liveAbsentCount,
                dsHsVang: matchLive ? (matchLive.dsHsVang || []) : (item.dsHsVang || []),
                sddAbsentList: sddDayData,
                sddAbsentCount: sddDayData.length,
                status: matchLive ? 'synced' : (isFuture ? 'future' : 'ready')
            };
        });

        res.json({
            success: true,
            source: actualSource,
            sourceTitle: actualSource === 'vnedu' ? 'Cổng vnEdu Online (Trực tiếp)' : 'File Excel dự phòng',
            weekNumber: week,
            tuNgay: scheduleData.tuNgay,
            denNgay: scheduleData.denNgay,
            fileName: scheduleData.fileName,
            totalSlots: enrichedSchedule.length,
            syncedSlots: enrichedSchedule.filter(s => s.status === 'synced').length,
            readySlots: enrichedSchedule.filter(s => s.status === 'ready').length,
            futureSlots: enrichedSchedule.filter(s => s.status === 'future').length,
            schedule: enrichedSchedule
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Tra cứu danh sách học sinh vắng phép / không phép theo tiết
app.get('/api/attendance', async (req, res) => {
    try {
        const { lop, week, thu, tiet, chitietId } = req.query;
        if (!lop || !week || !thu || !tiet) {
            return res.status(400).json({ success: false, msg: 'Thiếu tham số tra cứu điểm danh' });
        }
        const data = await core.getDaSachHocSinhVang(lop, parseInt(week), parseInt(thu), parseInt(tiet), chitietId || '');
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// API: Lưu danh sách học sinh vắng vào Sổ đầu bài vnEdu
app.post('/api/save-attendance', async (req, res) => {
    try {
        const { chitietId, studentsData, soLuongNghi, slot, week } = req.body;
        let finalChitietId = chitietId || (slot && (slot.chitietId || slot.liveId));
        const weekNum = parseInt(week) || 9;

        // Nếu chưa có ID, tra cứu trong cache trước
        if (!finalChitietId && slot) {
            try {
                const cachePath = path.join(__dirname, 'public', 'schedule_cache.json');
                if (fs.existsSync(cachePath)) {
                    const cacheJson = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                    const wData = cacheJson.weeks && cacheJson.weeks[String(weekNum)];
                    if (wData && wData.schedule) {
                        const m = wData.schedule.find(s => 
                            s.lop === slot.lop && 
                            parseInt(s.thu) === parseInt(slot.thu) && 
                            parseInt(s.tiet) === parseInt(slot.tiet) && 
                            parseInt(s.buoi) === parseInt(slot.buoi)
                        );
                        if (m && (m.chitietId || m.liveId)) {
                            finalChitietId = m.chitietId || m.liveId;
                        }
                    }
                }
            } catch (cErr) {}
        }

        // Nếu vẫn chưa có ID, kiểm tra trực tiếp trên vnEdu SĐB
        if (!finalChitietId && slot) {
            try {
                const live = await core.checkLiveStatus(weekNum);
                const found = live.find(l => 
                    l.lop === slot.lop && 
                    parseInt(l.thu) === parseInt(slot.thu) && 
                    parseInt(l.tiet) === parseInt(slot.tiet) && 
                    parseInt(l.buoi) === parseInt(slot.buoi)
                );
                if (found && found.chitietId) {
                    finalChitietId = found.chitietId;
                }
            } catch (errCheck) {
                console.warn('Lỗi kiểm tra live status khi lưu điểm danh:', errCheck.message);
            }
        }

        // Nếu tiết chưa từng được lưu vào vnEdu SĐB, tiến hành tạo tiết học trước
        if (!finalChitietId && slot) {
            const saveSlotRes = await core.saveSlotToVnEdu({
                ...slot,
                soLuongNghi: typeof soLuongNghi === 'number' ? soLuongNghi : (studentsData ? studentsData.length : 0)
            }, weekNum);
            
            if (saveSlotRes && saveSlotRes.success) {
                try {
                    const refreshedLive = await core.checkLiveStatus(weekNum);
                    const newlySaved = refreshedLive.find(l => 
                        l.lop === slot.lop && 
                        parseInt(l.thu) === parseInt(slot.thu) && 
                        parseInt(l.tiet) === parseInt(slot.tiet) && 
                        parseInt(l.buoi) === parseInt(slot.buoi)
                    );
                    if (newlySaved && newlySaved.chitietId) {
                        finalChitietId = newlySaved.chitietId;
                    }
                } catch (reErr) {}
            } else if (!saveSlotRes.success) {
                return res.status(400).json({ success: false, msg: 'Không thể khởi tạo tiết học trên vnEdu: ' + (saveSlotRes.msg || 'Lỗi không xác định') });
            }
        }

        if (!finalChitietId) {
            return res.status(400).json({ success: false, msg: 'Chưa có ID chi tiết tiết học trên vnEdu Sổ đầu bài' });
        }

        // 1. Lưu danh sách học sinh vắng
        const saveRes = await core.saveHocSinhVangToVnEdu(finalChitietId, studentsData || []);

        // 2. Cập nhật lại số lượng nghỉ trong tiết học
        if (slot) {
            await core.saveSlotToVnEdu({
                ...slot,
                chitietId: finalChitietId,
                liveId: finalChitietId,
                soLuongNghi: typeof soLuongNghi === 'number' ? soLuongNghi : (studentsData ? studentsData.length : 0)
            }, weekNum);
        }

        // 3. Cập nhật vào schedule_cache.json
        try {
            const cachePath = path.join(__dirname, 'public', 'schedule_cache.json');
            if (fs.existsSync(cachePath)) {
                const cacheJson = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                const wData = cacheJson.weeks && cacheJson.weeks[String(weekNum)];
                if (wData && wData.schedule) {
                    const target = wData.schedule.find(s => 
                        s.lop === slot.lop && 
                        parseInt(s.thu) === parseInt(slot.thu) && 
                        parseInt(s.tiet) === parseInt(slot.tiet) && 
                        parseInt(s.buoi) === parseInt(slot.buoi)
                    );
                    if (target) {
                        target.chitietId = finalChitietId;
                        target.liveId = finalChitietId;
                        target.status = 'synced';
                        target.soLuongNghi = typeof soLuongNghi === 'number' ? soLuongNghi : (studentsData ? studentsData.length : 0);
                        target.dsHsVang = (studentsData || []).map(s => `${s.fullName} (${s.coPhep || s.co_phep ? 'P' : 'KP'})`);
                        fs.writeFileSync(cachePath, JSON.stringify(cacheJson, null, 2), 'utf8');
                    }
                }
            }
        } catch (cWriteErr) {}

        res.json({
            success: true,
            chitietId: finalChitietId,
            msg: 'Đã lưu điểm danh học sinh vắng vào Sổ đầu bài vnEdu thành công!',
            details: saveRes
        });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// API: Đồng bộ 1 tiết đơn lẻ
app.post('/api/sync-slot', async (req, res) => {
    try {
        const { slot, week } = req.body;
        if (!slot) return res.status(400).json({ success: false, msg: 'Thiếu thông tin tiết dạy' });

        const result = await core.saveSlotToVnEdu(slot, week || 8);
        
        // Nếu có danh sách học sinh vắng đi kèm, tự động bảo toàn và lưu vào vnEdu
        const savedId = slot.chitietId || slot.liveId || (result && result.data && result.data.id);
        if (result.success && savedId && slot.hsVangList && Array.isArray(slot.hsVangList) && slot.hsVangList.length > 0) {
            try {
                await core.saveHocSinhVangToVnEdu(savedId, slot.hsVangList);
            } catch (hsErr) {
                console.warn('Lỗi lưu danh sách học sinh vắng:', hsErr.message);
            }
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// API: Đồng bộ hàng loạt (hôm nay hoặc toàn bộ hợp lệ)
app.post('/api/sync-batch', async (req, res) => {
    try {
        const { week, filter, slots } = req.body;
        const weekNum = parseInt(week) || 8;
        let slotsToSync = slots;

        if (!slotsToSync || !Array.isArray(slotsToSync)) {
            let scheduleData = null;
            if (req.body.source === 'excel') {
                scheduleData = core.parseWeekSchedule(weekNum);
            } else {
                scheduleData = await core.getWeekScheduleFromVnEdu(weekNum);
                if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
                    scheduleData = core.parseWeekSchedule(weekNum);
                }
            }
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
                    return itemDate <= todayDate; // Không gửi các ngày tương lai
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
                } catch (hsErr) {
                    console.warn('Lỗi lưu học sinh vắng batch:', hsErr.message);
                }
            }
            results.push({
                slot,
                success: resSlot.success,
                msg: resSlot.msg || (resSlot.success ? 'Thành công' : 'Thất bại')
            });
            // Delay 500ms
            await new Promise(r => setTimeout(r, 500));
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

// API: Tự động lập Kế hoạch dạy học tuần mới lên vnEdu
app.post('/api/auto-plan', async (req, res) => {
    try {
        const week = parseInt(req.body.week);
        if (!week || week < 1 || week > 35) {
            return res.status(400).json({ success: false, msg: 'Tuần học không hợp lệ (1 - 35)' });
        }

        const result = await core.autoGenerateAndSaveWeekPlan(week);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Máy chủ Web SPA vnEdu đang chạy tại: http://localhost:${PORT}`);
});
