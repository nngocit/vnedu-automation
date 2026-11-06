/**
 * AI Assistant Core Engine for Cô Lê Thị Diệu Huyên - vnEdu THCS An Lập
 * UI/UX Pro Max & Domain-Aware Knowledge Engine
 */
const core = require('./sync-core');

const CLASS_CAPACITY = {
    '7A2AL': 34,
    '7A3AL': 33,
    '9A2AL': 41
};

async function getWeekContext(weekNumber = 9) {
    let data = null;
    try {
        data = await core.getWeekScheduleFromVnEdu(weekNumber);
    } catch (e) {
        data = core.parseWeekSchedule(weekNumber);
    }
    if (!data || !data.schedule) {
        data = core.parseWeekSchedule(weekNumber);
    }

    const slots = data.schedule || [];
    let liveStatusList = [];
    try {
        liveStatusList = await core.checkLiveStatus(weekNumber);
    } catch (e) { }

    const liveMap = {};
    if (Array.isArray(liveStatusList)) {
        liveStatusList.forEach(l => {
            liveMap[`${l.lop}_${l.thu}_${l.tiet}`] = l;
        });
    }

    const enrichedSlots = slots.map(slot => {
        const live = liveMap[`${slot.lop}_${slot.thu}_${slot.tiet}`];
        const isSynced = !!live;
        const tenBai = (live?.noiDung || slot.tenBai || slot.baiDay || '').trim();
        const ppct = live?.ppct || slot.ppct;
        const sdbDsVang = (live?.dsHsVang && live.dsHsVang.length > 0) ? live.dsHsVang : (slot.dsHsVang || []);
        const soLuongNghi = sdbDsVang.length > 0 ? sdbDsVang.length : (live?.soLuongNghi !== undefined ? live.soLuongNghi : (slot.soLuongNghi || 0));

        return {
            ...slot,
            isSynced,
            tenBai,
            ppct,
            soLuongNghi,
            sdbDsVang
        };
    });

    const totalSlots = enrichedSlots.length;
    const syncedSlots = enrichedSlots.filter(s => s.isSynced).length;
    const unsyncedSlots = enrichedSlots.filter(s => !s.isSynced);
    const missingLessonSlots = enrichedSlots.filter(s => !s.tenBai);
    const slotsWithAbsence = enrichedSlots.filter(s => s.soLuongNghi > 0);

    return {
        week: weekNumber,
        totalSlots,
        syncedSlots,
        unsyncedSlots,
        missingLessonSlots,
        slotsWithAbsence,
        slots: enrichedSlots
    };
}

// Map thứ trong tuần theo ngày thực tế (Hôm nay)
function getTodayThu() {
    const day = new Date().getDay(); // 0: CN, 1: T2, 2: T3, ..., 6: T7
    if (day === 0) return 8; // Chủ nhật
    return day + 1; // Thứ 2..7
}

function normalizeText(text) {
    return (text || '').toLowerCase().trim();
}

async function processAiQuery({ message, currentWeek = 9, history = [] }) {
    const raw = normalizeText(message);
    const context = await getWeekContext(currentWeek);
    const todayThu = getTodayThu();

    let reply = '';
    const suggestions = [];
    const quickActions = [];

    // ========================================================
    // ƯU TIÊN 0: XỬ LÝ PHẢN HỒI NGẮN / XÁC NHẬN ("có", "mở đi", "mở tiết", "ok", "xem")
    // ========================================================
    const isAffirmative = raw === 'có' || raw === 'co' || raw === 'có ạ' ||
                          raw.startsWith('mở') || raw.startsWith('mo') ||
                          raw.includes('mở tiết') || raw.includes('xem tiết') ||
                          raw === 'ok' || raw === 'được' || raw === 'duoc' ||
                          raw === 'xử lý' || raw === 'tiết nào';

    if (isAffirmative) {
        // Tìm các tiết cần ưu tiên: tiết chưa lưu -> tiết hôm nay -> tiết có vắng
        const prioritySlots = context.unsyncedSlots.length > 0 
            ? context.unsyncedSlots 
            : (context.slots.filter(s => s.thu === todayThu).length > 0 
                ? context.slots.filter(s => s.thu === todayThu) 
                : context.slotsWithAbsence);

        reply = `Dạ vâng Cô! Em đã mở sẵn danh sách các tiết học để Cô bấm vào xử lý ngay trên bảng nhé ạ: 🌸\n\n`;

        prioritySlots.slice(0, 6).forEach((s, idx) => {
            const buoi = s.buoi === 1 ? 'Sáng' : 'Chiều';
            const status = s.isSynced ? '✅ Đã lưu' : '⏳ Chưa lưu';
            reply += `${idx + 1}. **Thứ ${s.thu} • Tiết ${s.tiet} (${buoi})** • Lớp **${s.lop}** • *${s.mon}* (${status})\n`;
            quickActions.push({
                type: 'NAVIGATE_SLOT',
                slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                label: `Đến Tiết ${s.tiet} Thứ ${s.thu} (${s.lop})`
            });
        });

        reply += `\n💡 *Cô chỉ cần nhấp vào nút dưới đây, màn hình sẽ tự động cuộn đến đúng dòng tiết học và chớp sáng để Cô thao tác.*`;
        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Lịch dạy hôm nay', 'Kiểm tra lệch Giám thị');
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 1: ĐIỂM DANH / HỌC SINH VẮNG / SĨ SỐ (Kiểm tra trước "hôm nay")
    // ========================================================
    const isAttendanceQuery = raw.includes('vắng') || raw.includes('vang') ||
                              raw.includes('nghỉ') || raw.includes('nghi') ||
                              raw.includes('điểm danh') || raw.includes('diem danh') ||
                              raw.includes('sĩ số') || raw.includes('si so');

    if (isAttendanceQuery) {
        // Trường hợp 1.1: Hỏi riêng điểm danh / vắng HÔM NAY ("hôm nay có ai vắng", "điểm danh hôm nay", "ai vắng hôm nay")
        if (raw.includes('hôm nay') || raw.includes('hom nay')) {
            const todaySlots = context.slots.filter(s => s.thu === todayThu);
            const thuName = todayThu === 8 ? 'Chủ Nhật' : `Thứ ${todayThu}`;
            const todaySlotsWithAbsence = todaySlots.filter(s => s.soLuongNghi > 0);

            if (todaySlots.length === 0) {
                reply = `Hôm nay là **${thuName}**, Cô Diệu Huyên **không có tiết dạy** trên thời khóa biểu nên không có dữ liệu điểm danh hôm nay ạ! 🎉`;
                suggestions.push('Ai vắng trong tuần này?', 'Tiết nào chưa lưu vnEdu?', 'Sĩ số các lớp');
            } else if (todaySlotsWithAbsence.length === 0) {
                reply = `🎉 **Tin vui cho Cô ạ!** Hôm nay (**${thuName}**), toàn bộ học sinh trong **${todaySlots.length} tiết dạy** của Cô đều **đi học đầy đủ 100%**, không có em nào vắng! ✨`;
                todaySlots.forEach(s => {
                    quickActions.push({
                        type: 'NAVIGATE_SLOT',
                        slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                        label: `Xem Tiết ${s.tiet} (${s.lop})`
                    });
                });
                suggestions.push('Ai vắng trong tuần này?', 'Lịch dạy hôm nay', 'Tiết nào chưa lưu vnEdu?');
            } else {
                let totalAbs = 0;
                todaySlotsWithAbsence.forEach(s => totalAbs += s.soLuongNghi);

                reply = `📋 **Tình hình học sinh vắng HÔM NAY (${thuName}, Tuần ${currentWeek}):**\n\n` +
                    `Hôm nay Cô có **${todaySlotsWithAbsence.length}/${todaySlots.length} tiết** có học sinh vắng (tổng cộng **${totalAbs} lượt vắng**):\n\n`;

                todaySlotsWithAbsence.forEach((s, idx) => {
                    const dsVangStr = (s.sdbDsVang && s.sdbDsVang.length > 0)
                        ? s.sdbDsVang.join(', ')
                        : `${s.soLuongNghi} học sinh`;

                    reply += `${idx + 1}. **Tiết ${s.tiet} • Lớp ${s.lop}** (*${s.mon}*):\n` +
                        `   - Vắng: **${s.soLuongNghi} em** ➔ ${dsVangStr}\n\n`;

                    quickActions.push({
                        type: 'NAVIGATE_SLOT',
                        slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                        label: `Xem Tiết ${s.tiet} ${s.lop}`
                    });
                });

                reply += `💡 *Cô có thể bấm vào nút dưới từng tiết để kiểm tra chi tiết hoặc quét đối chiếu SĐĐ Giám thị nhé!*`;
                suggestions.push('Kiểm tra lệch Giám thị', 'Ai vắng trong tuần này?', 'Lịch dạy hôm nay');
            }
            return { success: true, reply, suggestions, quickActions };
        }

        // Trường hợp 1.2: Hỏi điểm danh theo Thứ cụ thể (Ví dụ: "Thứ 2 có ai vắng", "Thứ 3 vắng những ai")
        const thuTargetMatch = raw.match(/thứ\s*([2-7])/i);
        if (thuTargetMatch) {
            const tThu = parseInt(thuTargetMatch[1]);
            const daySlots = context.slots.filter(s => s.thu === tThu);
            const daySlotsWithAbs = daySlots.filter(s => s.soLuongNghi > 0);

            if (daySlots.length === 0) {
                reply = `Vào **Thứ ${tThu}**, Cô Diệu Huyên **không có tiết dạy** nào trong Tuần ${currentWeek} ạ.`;
            } else if (daySlotsWithAbs.length === 0) {
                reply = `Vào **Thứ ${tThu}**, tất cả các lớp trong **${daySlots.length} tiết dạy** của Cô đều **đi học đầy đủ 100%** (0 vắng)! 🎉`;
            } else {
                reply = `📋 **Danh sách học sinh vắng vào Thứ ${tThu} (Tuần ${currentWeek}):**\n\n`;
                daySlotsWithAbs.forEach((s, idx) => {
                    const dsVangStr = (s.sdbDsVang && s.sdbDsVang.length > 0) ? s.sdbDsVang.join(', ') : `${s.soLuongNghi} em`;
                    reply += `${idx + 1}. **Tiết ${s.tiet} • Lớp ${s.lop}:** Vắng **${s.soLuongNghi} em** (${dsVangStr})\n`;
                    quickActions.push({
                        type: 'NAVIGATE_SLOT',
                        slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                        label: `Xem Tiết ${s.tiet} Thứ ${tThu} (${s.lop})`
                    });
                });
            }
            suggestions.push('Điểm danh hôm nay có ai vắng?', 'Kiểm tra lệch Giám thị', 'Sĩ số các lớp');
            return { success: true, reply, suggestions, quickActions };
        }

        // Trường hợp 1.3: Tổng hợp toàn tuần hoặc hỏi sĩ số
        let absSummary = `📊 **Tình hình Sĩ số & Điểm danh Tuần ${currentWeek}:**\n\n` +
            `• **Lớp 7A2AL:** Sĩ số **34 học sinh**\n` +
            `• **Lớp 7A3AL:** Sĩ số **33 học sinh**\n` +
            `• **Lớp 9A2AL:** Sĩ số **41 học sinh**\n\n`;

        if (context.slotsWithAbsence.length === 0) {
            absSummary += `✨ Không có tiết nào ghi nhận học sinh vắng trong tuần này (100% đi học đầy đủ)!`;
        } else {
            absSummary += `**Danh sách các tiết có học sinh vắng trong tuần:**\n\n`;
            context.slotsWithAbsence.forEach((s, idx) => {
                const dsVangStr = (s.sdbDsVang && s.sdbDsVang.length > 0)
                    ? s.sdbDsVang.join(', ')
                    : `${s.soLuongNghi} học sinh`;
                absSummary += `${idx + 1}. **Thứ ${s.thu} • Tiết ${s.tiet} • Lớp ${s.lop}:** Vắng **${s.soLuongNghi} em** (${dsVangStr})\n`;
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Xem vắng Lớp ${s.lop} (T${s.thu})`
                });
            });
        }
        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Kiểm tra lệch Giám thị', 'Tiết nào chưa lưu vnEdu?');
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 2: TIẾT CHƯA LƯU / CHƯA KÝ SỔ VNEDU
    // ========================================================
    if (raw.includes('chưa lưu') || raw.includes('chua luu') ||
        raw.includes('chưa ký') || raw.includes('chua ky') ||
        raw.includes('tiết nào chưa') || raw.includes('tiến độ')) {
        if (context.unsyncedSlots.length === 0) {
            reply = `🎉 **Tuyệt vời Cô ơi!** Toàn bộ **${context.totalSlots}/${context.totalSlots} tiết dạy** của Tuần ${currentWeek} đều **đã được lưu hoàn tất** trên vnEdu rồi ạ!`;
            suggestions.push('Điểm danh hôm nay có ai vắng?', 'Kiểm tra lệch Giám thị', 'Sĩ số các lớp');
        } else {
            reply = `Dạ thưa Cô, trong **Tuần ${currentWeek}** hiện còn **${context.unsyncedSlots.length} tiết chưa lưu vnEdu**:\n\n`;
            context.unsyncedSlots.forEach((s, idx) => {
                reply += `${idx + 1}. **Thứ ${s.thu} • Tiết ${s.tiet}** • Lớp **${s.lop}** (${s.mon})\n` +
                    `   - Bài dạy: ${s.tenBai || '*(Chưa nhập)*'}\n` +
                    `   - Vắng: ${s.soLuongNghi || 0} em\n\n`;
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Đến Tiết ${s.tiet} Thứ ${s.thu} (${s.lop})`
                });
            });
            reply += `💡 *Cô có thể bấm vào liên kết dưới mỗi tiết hoặc nút "Sửa / Lưu lại" trên bảng để đưa lên vnEdu nhé!*`;
            suggestions.push('Tiết nào chưa có tên bài?', 'Kiểm tra lệch Giám thị', 'Lịch dạy hôm nay');
        }
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 3: TIẾT THIẾU TÊN BÀI DẠY
    // ========================================================
    if (raw.includes('bài dạy') || raw.includes('bai day') ||
        raw.includes('tên bài') || raw.includes('ten bai') ||
        raw.includes('thiếu bài') || raw.includes('chưa nhập bài')) {
        if (context.missingLessonSlots.length === 0) {
            reply = `✅ Toàn bộ **${context.totalSlots} tiết học** trong Tuần ${currentWeek} đã có đầy đủ **Tên bài dạy** theo kế hoạch chuyên môn rồi ạ!`;
        } else {
            reply = `Dạ có **${context.missingLessonSlots.length} tiết học** đang để trống **Tên bài dạy** cần Cô bổ sung:\n\n`;
            context.missingLessonSlots.forEach((s, idx) => {
                reply += `${idx + 1}. **Thứ ${s.thu} • Tiết ${s.tiet}** • Lớp **${s.lop}** • Môn: *${s.mon}* (PPCT: ${s.ppct || 'N/A'})\n`;
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Điền bài Tiết ${s.tiet} Thứ ${s.thu}`
                });
            });
        }
        suggestions.push('Tiết nào chưa lưu vnEdu?', 'Gợi ý nhận xét tiết học', 'Kiểm tra lệch Giám thị');
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 4: ĐỐI CHIẾU GIÁM THỊ (SĐĐ)
    // ========================================================
    if (raw.includes('giám thị') || raw.includes('giam thi') ||
        raw.includes('sđđ') || raw.includes('sdd') ||
        raw.includes('lệch') || raw.includes('lech') ||
        raw.includes('đối chiếu') || raw.includes('doi chieu')) {
        reply = `🛡️ **Trạng thái Đối chiếu SĐĐ Giám thị (Tuần ${currentWeek}):**\n\n` +
            `• Hệ thống quét tự động đối soát giữa **Sổ Điểm Danh Điện Tử** của Giám thị và **Sổ Đầu Bài** của Cô.\n` +
            `• Để đối chiếu trực tiếp dữ liệu mới nhất, Cô có thể bấm nút **"🛡️ Quét SĐĐ Giám Thị"** trên thanh công cụ.\n` +
            `• Mọi tiết có số vắng khác nhau sẽ được thông báo ngay tại **Chiếc Chuông trên thanh Header** để Cô đối chiếu bằng 1 chạm!`;
        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Xem các tiết chưa lưu', 'Lịch dạy hôm nay');
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 5: LỊCH DẠY HÔM NAY (Khi hỏi về thời khóa biểu ngày hôm nay)
    // ========================================================
    if (raw.includes('hôm nay') || raw.includes('hom nay') || raw.includes('lịch dạy hôm nay')) {
        const todaySlots = context.slots.filter(s => s.thu === todayThu);
        const thuName = todayThu === 8 ? 'Chủ Nhật' : `Thứ ${todayThu}`;

        if (todaySlots.length === 0) {
            reply = `Hôm nay là **${thuName}**, Cô Diệu Huyên **không có tiết dạy** theo thời khóa biểu Tuần ${currentWeek} trên vnEdu ạ! 🎉\n\n` +
                `Cô có thể tranh thủ kiểm tra lại **${context.unsyncedSlots.length} tiết chưa lưu** của các ngày khác trong tuần nhé cô.`;
            suggestions.push('Điểm danh hôm nay có ai vắng?', 'Xem các tiết chưa lưu', 'Tổng quan tuần 9');
        } else {
            reply = `Hôm nay là **${thuName}**, Cô có **${todaySlots.length} tiết dạy**:\n\n`;
            todaySlots.forEach((s, idx) => {
                const buoi = s.buoi === 1 ? 'Sáng' : 'Chiều';
                const status = s.isSynced ? '✅ Đã lưu vnEdu' : '⏳ Chưa lưu';
                const lesson = s.tenBai ? `"${s.tenBai}"` : '*(Chưa nhập tên bài)*';
                reply += `${idx + 1}. **Tiết ${s.tiet} (${buoi})** • Lớp **${s.lop}** • Môn: *${s.mon}* (PPCT: ${s.ppct || 'N/A'})\n` +
                    `   - Bài dạy: ${lesson}\n` +
                    `   - Trạng thái: **${status}**\n\n`;
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Xem Tiết ${s.tiet} ${s.lop}`
                });
            });
            suggestions.push('Điểm danh hôm nay có ai vắng?', 'Tiết nào chưa lưu vnEdu?', 'Kiểm tra lệch Giám thị');
        }
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 6: LỊCH DẠY THEO THỨ CỤ THỂ (Thứ 2..7)
    // ========================================================
    const thuMatch = raw.match(/thứ\s*([2-7])/i);
    if (thuMatch) {
        const targetThu = parseInt(thuMatch[1]);
        const daySlots = context.slots.filter(s => s.thu === targetThu);
        if (daySlots.length === 0) {
            reply = `Vào **Thứ ${targetThu}**, Cô Diệu Huyên **không có tiết dạy** nào trong Tuần ${currentWeek} ạ.`;
        } else {
            reply = `Lịch dạy của Cô vào **Thứ ${targetThu}** (Tuần ${currentWeek}):\n\n`;
            daySlots.forEach((s, idx) => {
                const buoi = s.buoi === 1 ? 'Sáng' : 'Chiều';
                const status = s.isSynced ? '✅ Đã lưu vnEdu' : '⏳ Chưa lưu';
                const vang = s.soLuongNghi > 0 ? `• Vắng: ${s.soLuongNghi} em` : '• Đủ';
                reply += `${idx + 1}. **Tiết ${s.tiet} (${buoi})** • Lớp **${s.lop}** • *${s.mon}* (PPCT ${s.ppct})\n` +
                    `   - Bài: ${s.tenBai || '*(Trống)*'} ${vang}\n` +
                    `   - Trạng thái: **${status}**\n\n`;
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Xem Tiết ${s.tiet} Thứ ${targetThu}`
                });
            });
        }
        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Tiết nào chưa lưu vnEdu?', 'Có ai vắng Thứ ' + targetThu + '?');
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 7: CHÀO HỎI / GIỚI THIỆU
    // ========================================================
    if (raw.includes('chào') || raw.includes('chao') || raw.includes('bạn là ai') || raw.includes('ai đó') || raw === 'hello' || raw === 'hi') {
        reply = `Dạ em chào **Cô Lê Thị Diệu Huyên**! Em là **Trợ lý AI vnEdu** của Cô tại trường **THCS An Lập**. 🌸\n\n` +
            `Em nắm toàn bộ lịch dạy, tiến độ Sổ Đầu Bài và điểm danh của Cô trong **Tuần ${currentWeek}**:\n` +
            `• 📅 **Tổng số tiết:** ${context.totalSlots} tiết\n` +
            `• ✅ **Đã lưu vnEdu:** ${context.syncedSlots}/${context.totalSlots} tiết\n` +
            `• ⏳ **Chưa lưu vnEdu:** ${context.unsyncedSlots.length} tiết\n` +
            `• 👥 **Tiết có học sinh vắng:** ${context.slotsWithAbsence.length} tiết\n\n` +
            `Cô cần em kiểm tra hoặc nhắc việc gì hôm nay ạ?`;
        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Hôm nay cô dạy tiết nào?', 'Tiết nào chưa lưu vnEdu?', 'Sĩ số các lớp');
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 8: NHẮC VIỆC TỔNG HỢP / CẦN LÀM GÌ
    // ========================================================
    if (raw.includes('nhắc việc') || raw.includes('nhac viec') || raw.includes('cần làm') || raw.includes('lưu ý') || raw.includes('tóm tắt')) {
        reply = `📋 **Bảng Nhắc Việc Cho Cô Diệu Huyên (Tuần ${currentWeek}):**\n\n`;
        let step = 1;

        if (context.unsyncedSlots.length > 0) {
            reply += `${step++}. ⏳ **Lưu SĐB lên vnEdu:** Còn **${context.unsyncedSlots.length} tiết** chưa lưu.\n`;
            context.unsyncedSlots.slice(0, 3).forEach(s => {
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Lưu Tiết ${s.tiet} Thứ ${s.thu} (${s.lop})`
                });
            });
        } else {
            reply += `✅ Sổ đầu bài tuần ${currentWeek} đã lưu 100% đầy đủ!\n`;
        }

        if (context.missingLessonSlots.length > 0) {
            reply += `${step++}. 📝 **Tên bài dạy:** Còn **${context.missingLessonSlots.length} tiết** chưa có tên bài dạy.\n`;
        }

        reply += `${step++}. 🛡️ **Đối chiếu Giám thị:** Đã kích hoạt quét tự động, Cô bấm vào Chiếc Chuông góc trên để xem chi tiết nếu có cảnh báo.\n\n` +
            `Dạ Cô bấm vào các nút bên dưới để mở ngay tiết cần xử lý nhé ạ:`;

        if (quickActions.length === 0) {
            // Mở các tiết hôm nay
            const todaySlots = context.slots.filter(s => s.thu === todayThu);
            todaySlots.forEach(s => {
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Xem Tiết ${s.tiet} (${s.lop})`
                });
            });
        }

        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Tiết nào chưa lưu vnEdu?', 'Sĩ số các lớp');
        return { success: true, reply, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 9: GỢI Ý NHẬN XÉT TIẾT HỌC
    // ========================================================
    if (raw.includes('nhận xét') || raw.includes('gợi ý') || raw.includes('lời phê')) {
        reply = `💡 **Mẫu nhận xét tiết học chuẩn mực cho Cô tham khảo:**\n\n` +
            `1. **Lớp tích cực (Điểm 19-20):**\n` +
            `   - *"Lớp học nghiêm túc, tích cực phát biểu xây dựng bài, trật tự tốt."*\n` +
            `   - *"Học sinh chuẩn bị bài chu đáo, hăng hái thảo luận nhóm."*\n\n` +
            `2. **Lớp học khá (Điểm 17-18):**\n` +
            `   - *"Đa số học sinh chú ý nghe giảng, một vài em còn thụ động."*\n` +
            `   - *"Nề nếp lớp học ổn định, hoàn thành tốt nhiệm vụ học tập."*\n\n` +
            `3. **Lớp cần rèn thêm nề nếp (Điểm 15-16):**\n` +
            `   - *"Còn một số em mất trật tự, nhắc nhở nề nếp đầu giờ."*\n\n` +
            `*Cô có thể chọn nhanh các mẫu này trực tiếp trên menu dropdown Nhận xét của bảng SĐB ạ!*`;
        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Tiết nào chưa lưu vnEdu?', 'Lịch dạy hôm nay');
        return { success: true, reply, suggestions, quickActions };
    }

    // Fallback: Mặc định thông minh
    reply = `Dạ thưa **Cô Lê Thị Diệu Huyên**, em đã ghi nhận: *" ${message} "*.\n\n` +
        `Em có thể hỗ trợ Cô tức thì các thông tin sau:\n` +
        `• 👥 **Điểm danh & Sĩ số:** Điểm danh hôm nay có ai vắng, học sinh vắng trong tuần.\n` +
        `• 📅 **Tra cứu lịch dạy:** Hôm nay dạy tiết nào, Thứ 2 đến Thứ 7 dạy lớp nào.\n` +
        `• ⏳ **Tiến độ vnEdu:** Tiết nào chưa lưu, tiết nào thiếu tên bài.\n` +
        `• 🛡️ **Giám thị:** Đối chiếu Sổ đầu bài và Sổ điểm danh điện tử.\n\n` +
        `Cô chọn một trong các gợi ý nhanh dưới đây nhé:`;

    suggestions.push('Điểm danh hôm nay có ai vắng?', 'Hôm nay cô dạy tiết nào?', 'Tiết nào chưa lưu vnEdu?', 'Kiểm tra lệch Giám thị');
    return { success: true, reply, suggestions, quickActions };
}

module.exports = {
    processAiQuery,
    getWeekContext
};
