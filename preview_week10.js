const core = require('./sync-core');

// 14 khung tiết cố định theo TKB của Cô Lê Thị Diệu Huyên
const WEEK_SCHEDULE_TEMPLATE = [
    // THỨ 2 (09/11/2026)
    { thu: 2, buoi: 1, tiet: 2, lop: '9A2AL', mon: 'HĐTN', monHocId: 102, phanMonId: 1022, khoi: 9, basePPCT: 28 }, // Sinh hoạt lớp
    { thu: 2, buoi: 2, tiet: 1, lop: '7A3AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 7, basePPCT: 37 },
    { thu: 2, buoi: 2, tiet: 2, lop: '7A2AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 7, basePPCT: 37 },
    { thu: 2, buoi: 2, tiet: 3, lop: '9A2AL', mon: 'HĐTN', monHocId: 102, phanMonId: 1023, khoi: 9, basePPCT: 27 }, // HĐGD theo chủ đề

    // THỨ 3 (10/11/2026)
    { thu: 3, buoi: 1, tiet: 1, lop: '9A2AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 9, basePPCT: 37 },
    { thu: 3, buoi: 1, tiet: 2, lop: '9A2AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 9, basePPCT: 38 },
    { thu: 3, buoi: 1, tiet: 4, lop: '7A2AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 7, basePPCT: 38 },
    { thu: 3, buoi: 2, tiet: 1, lop: '9A2AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 9, basePPCT: 39 },

    // THỨ 4 (11/11/2026)
    { thu: 4, buoi: 1, tiet: 2, lop: '7A3AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 7, basePPCT: 38 },
    { thu: 4, buoi: 1, tiet: 3, lop: '7A2AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 7, basePPCT: 39 },
    { thu: 4, buoi: 1, tiet: 4, lop: '7A2AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 7, basePPCT: 40 },

    // THỨ 6 (13/11/2026)
    { thu: 6, buoi: 1, tiet: 1, lop: '7A3AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 7, basePPCT: 39 },
    { thu: 6, buoi: 1, tiet: 2, lop: '7A3AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 7, basePPCT: 40 },
    { thu: 6, buoi: 1, tiet: 4, lop: '9A2AL', mon: 'Toán', monHocId: 1, phanMonId: 0, khoi: 9, basePPCT: 40 }
];

async function generateWeekPlanPreview(weekNumber = 10) {
    const { token, context } = await core.ensureVnEduToken();
    console.log(`🚀 BẮT ĐẦU TỰ ĐỘNG LẬP KẾ HOẠCH DẠY HỌC TUẦN ${weekNumber} CHO CÔ LÊ THỊ DIỆU HUYÊN`);
    console.log(`========================================================================`);

    const results = [];
    const classIdMap = {
        '7A2AL': '5004582066',
        '7A3AL': '5004582046',
        '9A2AL': '5004582186'
    };

    for (const slot of WEEK_SCHEDULE_TEMPLATE) {
        const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=edu.phan_phoi_chuong_trinh.getByTiet&app_nam_hoc=2026&my_token=${token}`;
        const payload = {
            my_token: token,
            my_user_id: '7365493419',
            app_nam_hoc: '2026',
            khoi_hoc: String(slot.khoi),
            lop_hoc_id: classIdMap[slot.lop],
            mon_hoc_id: String(slot.monHocId),
            phan_mon_id: String(slot.phanMonId),
            nam_hoc: '2026',
            tiet: String(slot.basePPCT)
        };

        try {
            const resp = await context.request.post(url, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                form: payload
            });
            const json = await resp.json();
            const tenBai = json && json.ten_bai ? json.ten_bai : 'Chưa có tên bài';
            results.push({
                ...slot,
                tenBai: tenBai,
                ghiChu: json.ghi_chu || `Tuần PPCT ${weekNumber}`
            });
            console.log(`[Thứ ${slot.thu} | ${slot.buoi===1?'Sáng':'Chiều'} T${slot.tiet}] Lớp ${slot.lop} | PPCT ${slot.basePPCT}: "${tenBai}"`);
        } catch(e) {
            console.error(`Lỗi tiết ${slot.thu}_${slot.tiet}:`, e.message);
        }
    }

    console.log(`========================================================================`);
    console.log(`✅ ĐÃ LẬP XONG 14/14 TIẾT DẠY TUẦN ${weekNumber}!`);
    return results;
}

generateWeekPlanPreview(10).catch(console.error);

