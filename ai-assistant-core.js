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

async function getWeekContext(weekNumber = 9, clientSlots = null) {
    let slots = [];
    if (Array.isArray(clientSlots) && clientSlots.length > 0) {
        slots = clientSlots;
    } else {
        let data = null;
        try {
            data = await core.getWeekScheduleFromVnEdu(weekNumber);
        } catch (e) {
            data = core.parseWeekSchedule(weekNumber);
        }
        if (!data || !data.schedule || data.schedule.length === 0) {
            try {
                data = core.parseWeekSchedule(weekNumber);
            } catch (e) { }
        }
        if (!data || !data.schedule || data.schedule.length === 0) {
            try {
                data = core.parseWeekSchedule(7);
            } catch (e) { }
        }
        slots = (data && data.schedule) ? data.schedule : [];
    }

    let liveStatusList = [];
    if (!clientSlots || clientSlots.length === 0) {
        try {
            liveStatusList = await core.checkLiveStatus(weekNumber);
        } catch (e) { }
    }

    const liveMap = {};
    if (Array.isArray(liveStatusList)) {
        liveStatusList.forEach(l => {
            liveMap[`${l.lop}_${l.thu}_${l.tiet}`] = l;
        });
    }

    const enrichedSlots = slots.map(slot => {
        const live = liveMap[`${slot.lop}_${slot.thu}_${slot.tiet}`];
        const isSynced = slot.isSynced !== undefined ? slot.isSynced : (!!live || !!slot.chitietId);
        const tenBai = (live?.noiDung || slot.tenBai || slot.baiDay || '').trim();
        const ppct = live?.ppct || slot.ppct;
        const sdbDsVang = (slot.sdbDsVang && slot.sdbDsVang.length > 0)
            ? slot.sdbDsVang
            : ((live?.dsHsVang && live.dsHsVang.length > 0) ? live.dsHsVang : (slot.dsHsVang || []));
        const soLuongNghi = slot.sdbSoLuongNghi !== undefined
            ? slot.sdbSoLuongNghi
            : (sdbDsVang.length > 0 ? sdbDsVang.length : (live?.soLuongNghi !== undefined ? live.soLuongNghi : (slot.soLuongNghi || 0)));

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

const GEMINI_CANDIDATE_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash'
];

function getGeminiApiKey() {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) return process.env.GEMINI_API_KEY.trim();
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim()) return process.env.GOOGLE_API_KEY.trim();
    try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split('\n');
            for (const line of lines) {
                const match = line.match(/^\s*(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*(.*?)\s*$/);
                if (match && match[1]) {
                    return match[1].trim().replace(/^["']|["']$/g, '');
                }
            }
        }
    } catch (e) {}
    return null;
}

async function callGeminiLLM({ message, currentWeek = 9, history = [], context = null }) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        return null;
    }

    const systemPrompt = `Bạn là Trợ lý AI vnEdu thông minh, am hiểu chuyên môn sư phạm và tận tâm của Cô Lê Thị Diệu Huyên (giáo viên dạy môn Toán tại trường THCS An Lập).
Nguyên tắc ứng xử và xưng hô bắt buộc:
1. Xưng hô: Luôn xưng "Em" và gọi giáo viên là "Cô" hoặc "Cô Lê Thị Diệu Huyên" (tuyệt đối KHÔNG viết thành "Huyền", không xưng "tôi", không gọi "bạn").
2. Giọng điệu: Thân thiện, lễ phép, ấm áp, chuẩn mực sư phạm, súc tích và có tính xây dựng cao.
3. Bối cảnh giảng dạy thực tế của Cô Diệu Huyên:
   - Giáo viên môn Toán các lớp 7A2AL (sĩ số 34), 7A3AL (sĩ số 33), và 9A2AL (sĩ số 41) tại trường THCS An Lập.
   - Hiện tại đang trong Tuần ${currentWeek} năm học 2026-2027.
   - Sổ đầu bài điện tử vnEdu và Sổ điểm danh giám thị được đồng bộ tự động.
4. Trả lời:
   - Nếu hỏi về mô hình AI: Xác nhận em là Trợ lý AI chính thức sử dụng mô hình Google Gemini AI thế hệ mới kết hợp cùng hệ thống đối soát dữ liệu vnEdu thời gian thực của trường THCS An Lập.
   - Với các câu hỏi chuyên môn Toán THCS (đại số, hình học, định lý, bài tập, lời giải mẫu), sư phạm, soạn giáo án, nhận xét học sinh, quản lý nề nếp lớp học, hoặc các câu hỏi kiến thức chung: Trả lời sâu sắc, chu đáo, ĐẦY ĐỦ TOÀN BỘ Ý, TUYỆT ĐỐI KHÔNG BỊ CẮT NGANG HAY DỪNG GIỮA CHỪNG. Trình bày bằng Markdown đẹp mắt với gạch đầu dòng và in đậm rõ ràng.
5. Luôn hoàn thiện câu trả lời trọn vẹn, không viết dở dang câu chữ.`;

    const userPromptWithSystem = `${systemPrompt}\n\n[Câu hỏi từ Cô Lê Thị Diệu Huyên]: ${message}`;

    for (const model of GEMINI_CANDIDATE_MODELS) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: userPromptWithSystem }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                        thinkingConfig: { thinkingBudget: 0 }
                    }
                })
            });

            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                console.warn(`[Gemini ${model}] HTTP ${res.status}:`, errBody.substring(0, 200));
                continue;
            }
            const data = await res.json();
            const candidate = data.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            
            // Gộp toàn bộ các phần text trong mảng parts để đảm bảo câu trả lời nguyên vẹn 100%, không bị ngắt quãng
            let fullText = parts
                .filter(p => !p.thought && p.text)
                .map(p => p.text)
                .join('');

            if (!fullText || fullText.trim().length === 0) {
                fullText = parts.map(p => p.text || '').join('');
            }

            if (fullText && fullText.trim().length > 0) {
                return {
                    model,
                    text: fullText.trim(),
                    finishReason: candidate?.finishReason
                };
            }
        } catch (err) {
            console.warn(`[Gemini ${model}] Lỗi gọi API:`, err.message);
            continue;
        }
    }
    return null;
}

async function processAiQuery({ message, currentWeek = 9, history = [], clientSlots = null }) {
    const raw = normalizeText(message);
    const context = await getWeekContext(currentWeek, clientSlots);
    const todayThu = getTodayThu();

    let reply = '';
    const suggestions = [];
    const quickActions = [];

    // ========================================================
    // ƯU TIÊN 0: XỬ LÝ PHẢN HỒI NGẮN / XÁC NHẬN ("có", "mở đi", "mở tiết", "ok", "xem")
    // ========================================================
    const affirmativeWords = [
        'có', 'co', 'có ạ', 'dạ có', 'da co', 'có nha', 'có nhé', 'có chứ',
        'ừ', 'u', 'uh', 'uhm', 'um', 'ừm', 'vâng', 'vang', 'dạ', 'da',
        'ok', 'oke', 'okay', 'được', 'duoc', 'được ạ', 'mở', 'mo', 'mở đi', 'mo di',
        'mở giúp cô', 'mở cho cô', 'mở tiết', 'xem tiết', 'xem đi', 'xử lý',
        'làm đi', 'tiết nào', 'tiếp', 'tiếp tục'
    ];
    const isAffirmative = affirmativeWords.includes(raw) ||
                          raw.startsWith('mở ') || raw.startsWith('mo ') ||
                          raw.startsWith('xem ') ||
                          raw.includes('mở tiết') || raw.includes('xem tiết');

    if (isAffirmative) {
        const thuName = todayThu === 8 ? 'Chủ Nhật' : `Thứ ${todayThu}`;
        if (context.unsyncedSlots.length > 0) {
            reply = `Dạ vâng Cô! Em đã mở sẵn danh sách **${context.unsyncedSlots.length} tiết chưa lưu** để Cô bấm vào xử lý ngay trên bảng nhé ạ: 🌸\n\n`;
            context.unsyncedSlots.slice(0, 6).forEach((s, idx) => {
                const buoi = s.buoi === 1 ? 'Sáng' : 'Chiều';
                reply += `${idx + 1}. **Thứ ${s.thu} • Tiết ${s.tiet} (${buoi})** • Lớp **${s.lop}** • *${s.mon}* (⏳ Chưa lưu)\n`;
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Đến Tiết ${s.tiet} Thứ ${s.thu} (${s.lop})`
                });
            });
            reply += `\n💡 *Cô chỉ cần nhấp vào nút dưới đây, màn hình sẽ tự động cuộn đến đúng dòng tiết học và chớp sáng để Cô thao tác.*`;
        } else {
            // Tuần đã 100% hoàn tất
            const todaySlots = context.slots.filter(s => s.thu === todayThu);
            reply = `Dạ vâng Cô! Sổ Đầu Bài **Tuần ${currentWeek}** của Cô đã lưu hoàn tất **100% đầy đủ** rồi ạ! 🎉\n\n` +
                    `Dưới đây là các tiết học của ngày hôm nay (**${thuName}**) để Cô xem lại hoặc đối soát trực tiếp trên bảng nhé: 🌸\n\n`;
            todaySlots.forEach((s, idx) => {
                const buoi = s.buoi === 1 ? 'Sáng' : 'Chiều';
                reply += `${idx + 1}. **Tiết ${s.tiet} (${buoi})** • Lớp **${s.lop}** • *${s.mon}* (✅ Đã lưu vnEdu)\n`;
                quickActions.push({
                    type: 'NAVIGATE_SLOT',
                    slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                    label: `Xem Tiết ${s.tiet} ${s.lop}`
                });
            });
            reply += `\n💡 *Cô chỉ cần nhấp vào nút dưới từng tiết để kiểm tra lại bài dạy và sĩ số điểm danh ạ.*`;
        }
        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Lịch dạy hôm nay', 'Cập nhật từ Giám thị');
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
                reply = `📋 **Tình hình Điểm danh Hôm nay (${thuName}, Tuần ${currentWeek}):**\n\n` +
                    `Hôm nay Cô có **${todaySlots.length} tiết dạy**, và **tất cả các lớp đều đi học đầy đủ 100% (không có ai vắng)**: ✨\n\n`;
                todaySlots.forEach((s, idx) => {
                    const buoi = s.buoi === 1 ? 'Sáng' : 'Chiều';
                    const cap = CLASS_CAPACITY[s.lop] || 35;
                    reply += `${idx + 1}. **Tiết ${s.tiet} (${buoi}) • Lớp ${s.lop}** (*${s.mon}*):\n` +
                        `   - Sĩ số: **${cap}/${cap}** • Trạng thái: ✅ **Đi học đủ (0 vắng)**\n\n`;
                    quickActions.push({
                        type: 'NAVIGATE_SLOT',
                        slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                        label: `Xem Tiết ${s.tiet} (${s.lop})`
                    });
                });
                reply += `🎉 *Cô hoàn toàn yên tâm lên lớp nhé, hôm nay không có bạn nào nghỉ học ạ!* 🌸`;
                suggestions.push('Ai vắng trong tuần này?', 'Lịch dạy hôm nay', 'Tiết nào chưa lưu vnEdu?');
            } else {
                let totalAbs = 0;
                todaySlotsWithAbsence.forEach(s => totalAbs += s.soLuongNghi);

                reply = `📋 **Tình hình Điểm danh Hôm nay (${thuName}, Tuần ${currentWeek}):**\n\n` +
                    `Hôm nay Cô có **${todaySlotsWithAbsence.length}/${todaySlots.length} tiết** có học sinh vắng (tổng cộng **${totalAbs} lượt vắng**):\n\n`;

                todaySlots.forEach((s, idx) => {
                    const buoi = s.buoi === 1 ? 'Sáng' : 'Chiều';
                    const cap = CLASS_CAPACITY[s.lop] || 35;
                    if (s.soLuongNghi > 0) {
                        const dsVangStr = (s.sdbDsVang && s.sdbDsVang.length > 0)
                            ? s.sdbDsVang.join(', ')
                            : `${s.soLuongNghi} học sinh`;
                        reply += `${idx + 1}. **Tiết ${s.tiet} (${buoi}) • Lớp ${s.lop}** (*${s.mon}*):\n` +
                            `   - Vắng: **${s.soLuongNghi} em** ➔ ${dsVangStr}\n\n`;
                    } else {
                        reply += `${idx + 1}. **Tiết ${s.tiet} (${buoi}) • Lớp ${s.lop}** (*${s.mon}*):\n` +
                            `   - Sĩ số: **${cap}/${cap}** • ✅ **Đi học đủ (0 vắng)**\n\n`;
                    }
                    quickActions.push({
                        type: 'NAVIGATE_SLOT',
                        slotRef: { thu: s.thu, tiet: s.tiet, lop: s.lop },
                        label: `Xem Tiết ${s.tiet} ${s.lop}`
                    });
                });

                reply += `💡 *Cô có thể bấm vào nút dưới từng tiết để kiểm tra chi tiết hoặc quét đối chiếu SĐĐ Giám thị nhé!*`;
                suggestions.push('Cập nhật từ Giám thị', 'Ai vắng trong tuần này?', 'Lịch dạy hôm nay');
            }
            return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
            suggestions.push('Điểm danh hôm nay có ai vắng?', 'Cập nhật từ Giám thị', 'Sĩ số các lớp');
            return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
        suggestions.push('Điểm danh hôm nay có ai vắng?', 'Cập nhật từ Giám thị', 'Tiết nào chưa lưu vnEdu?');
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 2: TIẾT CHƯA LƯU / CHƯA KÝ SỔ VNEDU
    // ========================================================
    if (raw.includes('chưa lưu') || raw.includes('chua luu') ||
        raw.includes('chưa ký') || raw.includes('chua ky') ||
        raw.includes('tiết nào chưa') || raw.includes('tiến độ')) {
        if (context.unsyncedSlots.length === 0) {
            reply = `🎉 **Tuyệt vời Cô ơi!** Toàn bộ **${context.totalSlots}/${context.totalSlots} tiết dạy** của Tuần ${currentWeek} đều **đã được lưu hoàn tất** trên vnEdu rồi ạ!`;
            suggestions.push('Điểm danh hôm nay có ai vắng?', 'Cập nhật từ Giám thị', 'Sĩ số các lớp');
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
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
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
            (context.unsyncedSlots.length > 0
                ? `Cô bấm vào các nút bên dưới để mở ngay tiết cần lưu nhé ạ:`
                : `Tuần ${currentWeek} đã hoàn tất 100%, Cô có thể bấm vào các nút bên dưới để mở xem lại chi tiết bất kỳ lúc nào ạ: 🌸`);

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
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
    }

    // ========================================================
    // ƯU TIÊN 9: MẪU NHẬN XÉT TIẾT HỌC NHANH (Static Quick Template)
    // ========================================================
    const isQuickTemplateQuery = (raw === 'nhận xét' || raw === 'mẫu nhận xét' || raw === 'gợi ý nhận xét' || raw === 'lời phê') ||
                                 (raw.includes('nhận xét') && !raw.includes('toán') && !raw.includes('bài') && !raw.includes('học sinh') && !raw.includes('khen') && raw.length < 25);
    if (isQuickTemplateQuery) {
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
        return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
    }

    // ========================================================
    // MÔ HÌNH GOOGLE GEMINI AI LLM (Creative, Pedagogical & General Reasoning)
    // ========================================================
    const geminiResult = await callGeminiLLM({ message, currentWeek, history, context });
    if (geminiResult && geminiResult.text) {
        return {
            success: true,
            reply: geminiResult.text,
            model: geminiResult.model,
            isGemini: true,
            suggestions: [
                'Điểm danh hôm nay có ai vắng?',
                'Hôm nay cô dạy tiết nào?',
                'Tiết nào chưa lưu vnEdu?',
                'Gợi ý nhận xét tiết học'
            ],
            quickActions
        };
    }

    // Fallback: Mặc định thân thiện nếu mất mạng hoặc chưa cấu hình API
    if (raw.length <= 4) {
        reply = `Dạ thưa **Cô Lê Thị Diệu Huyên**, Cô cần em hỗ trợ mở tiết nào hay tra cứu thông tin gì cho Cô ạ? 🌸\n\n` +
            `Cô có thể bấm vào một trong các gợi ý nhanh bên dưới nhé:`;
    } else {
        reply = `Dạ thưa **Cô Lê Thị Diệu Huyên**, em đã ghi nhận yêu cầu: *" ${message} "*.\n\n` +
            `Em có thể hỗ trợ Cô tức thì các thông tin sau:\n` +
            `• 👥 **Điểm danh & Sĩ số:** Điểm danh hôm nay có ai vắng, học sinh vắng trong tuần.\n` +
            `• 📅 **Tra cứu lịch dạy:** Hôm nay dạy tiết nào, Thứ 2 đến Thứ 7 dạy lớp nào.\n` +
            `• ⏳ **Tiến độ vnEdu:** Tiết nào chưa lưu, tiết nào thiếu tên bài.\n` +
            `• 🛡️ **Giám thị:** Đối chiếu Sổ đầu bài và Sổ điểm danh điện tử.\n\n` +
            `Cô chọn một trong các gợi ý nhanh dưới đây nhé:`;
    }

    suggestions.push('Điểm danh hôm nay có ai vắng?', 'Hôm nay cô dạy tiết nào?', 'Tiết nào chưa lưu vnEdu?', 'Cập nhật từ Giám thị');
    return { success: true, reply, model: 'vnEdu Engine', isGemini: false, suggestions, quickActions };
}

module.exports = {
    processAiQuery,
    getWeekContext
};

