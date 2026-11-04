const core = require('./sync-core');
const fs = require('fs');
const path = require('path');

const WEEK10_SLOTS = [
    // THỨ 2 (09/11/2026)
    { thu: 2, buoi: 1, tiet: 2, lop: '5004582186', mon: '102', phanMon: '1022', ppct: '28', tenBai: 'Sinh hoạt lớp theo chủ đề tuần 10' },
    { thu: 2, buoi: 2, tiet: 1, lop: '5004582046', mon: '1', phanMon: '0', ppct: '37', tenBai: 'Bài 5: Làm quen với số thập phân vô hạn tuần hoàn (tiết 2)' },
    { thu: 2, buoi: 2, tiet: 2, lop: '5004582066', mon: '1', phanMon: '0', ppct: '37', tenBai: 'Bài 5: Làm quen với số thập phân vô hạn tuần hoàn (tiết 2)' },
    { thu: 2, buoi: 2, tiet: 3, lop: '5004582186', mon: '102', phanMon: '1023', ppct: '27', tenBai: 'Hoạt động giáo dục theo chủ đề tuần 10' },

    // THỨ 3 (10/11/2026)
    { thu: 3, buoi: 1, tiet: 1, lop: '5004582186', mon: '1', phanMon: '0', ppct: '37', tenBai: 'Bài tập cuối chương II (tiết 2)' },
    { thu: 3, buoi: 1, tiet: 2, lop: '5004582186', mon: '1', phanMon: '0', ppct: '38', tenBai: 'Bài 7. Căn bậc hai và căn thức bậc hai (tiết 1)' },
    { thu: 3, buoi: 1, tiet: 4, lop: '5004582066', mon: '1', phanMon: '0', ppct: '38', tenBai: 'Bài 6: Số vô tỉ. Căn bậc hai số học (tiết 1)' },
    { thu: 3, buoi: 2, tiet: 1, lop: '5004582186', mon: '1', phanMon: '0', ppct: '39', tenBai: 'Bài 13. Mở đầu về đường tròn (tiết 2)' },

    // THỨ 4 (11/11/2026)
    { thu: 4, buoi: 1, tiet: 2, lop: '5004582046', mon: '1', phanMon: '0', ppct: '38', tenBai: 'Bài 6: Số vô tỉ. Căn bậc hai số học (tiết 1)' },
    { thu: 4, buoi: 1, tiet: 3, lop: '5004582066', mon: '1', phanMon: '0', ppct: '39', tenBai: 'Bài 14: Trường hợp bằng nhau thứ hai và thứ ba của tam giác (tiết 1)' },
    { thu: 4, buoi: 1, tiet: 4, lop: '5004582066', mon: '1', phanMon: '0', ppct: '40', tenBai: 'Bài 14: Trường hợp bằng nhau thứ hai và thứ ba của tam giác (tiết 2)' },

    // THỨ 6 (13/11/2026)
    { thu: 6, buoi: 1, tiet: 1, lop: '5004582046', mon: '1', phanMon: '0', ppct: '39', tenBai: 'Bài 14: Trường hợp bằng nhau thứ hai và thứ ba của tam giác (tiết 1)' },
    { thu: 6, buoi: 1, tiet: 2, lop: '5004582046', mon: '1', phanMon: '0', ppct: '40', tenBai: 'Bài 14: Trường hợp bằng nhau thứ hai và thứ ba của tam giác (tiết 2)' },
    { thu: 6, buoi: 1, tiet: 4, lop: '5004582186', mon: '1', phanMon: '0', ppct: '40', tenBai: 'Bài 14. Cung và dây của một đường tròn (tiết 1)' }
];

async function saveWeek10() {
    const { token, context } = await core.ensureVnEduToken();
    console.log('Got token:', token);

    // Read base template from week 9
    const templatePath = path.join(__dirname, '..', 'lbg_week9_payload.json');
    const basePayload = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    // Clone payload
    const payload = { ...basePayload };

    // Update metadata for week 10
    payload.iTuanHoc = '10';
    payload.tuNgay = '09/11/2026';
    payload.denNgay = '15/11/2026';
    payload.my_token = token;
    payload.my_user_id = '7365493419';
    payload.app_nam_hoc = '2026';

    // Clear all grid slots in template
    for (let thu = 2; thu <= 8; thu++) {
        for (let buoi = 1; buoi <= 2; buoi++) {
            for (let tiet = 1; tiet <= 5; tiet++) {
                const key = `_${thu}_${buoi}_${tiet}`;
                payload[`txtTietTKB${key}`] = String(tiet);
                payload[`cboLopHoc${key}`] = '0';
                payload[`txtLopKhac${key}`] = '';
                payload[`cboMonHoc${key}`] = '0';
                payload[`txtTietPPCT${key}`] = '';
                payload[`cboPhanMon${key}`] = '0';
                payload[`txtTenBai${key}`] = '';
                payload[`txtGhiChu${key}`] = '';
                payload[`cboTrangThai${key}`] = '-1';
            }
        }
    }

    // Fill the 14 slots for week 10
    for (const slot of WEEK10_SLOTS) {
        const key = `_${slot.thu}_${slot.buoi}_${slot.tiet}`;
        payload[`txtTietTKB${key}`] = String(slot.tiet);
        payload[`cboLopHoc${key}`] = slot.lop;
        payload[`txtLopKhac${key}`] = '';
        payload[`cboMonHoc${key}`] = slot.mon;
        payload[`txtTietPPCT${key}`] = slot.ppct;
        payload[`cboPhanMon${key}`] = slot.phanMon;
        payload[`txtTenBai${key}`] = slot.tenBai;
        payload[`txtGhiChu${key}`] = 'Tuần PPCT 10';
        payload[`cboTrangThai${key}`] = '0'; // 0 = Bình thường
    }

    console.log(`Đang gửi dữ liệu 14 tiết Kế hoạch dạy học Tuần 10 lên cổng vnEdu...`);
    const saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=edu.lich_bao_giang.save&app_nam_hoc=2026&my_token=${token}`;

    const resp = await context.request.post(saveUrl, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        },
        form: payload
    });

    const json = await resp.json();
    console.log('vnEdu Response:', json);
    return json;
}

saveWeek10().then(res => {
    if (res.success) {
        console.log('🎉 THÀNH CÔNG RỰC RỠ: Kế hoạch dạy học Tuần 10 đã được lưu trực tiếp lên vnEdu!');
    } else {
        console.error('❌ Lỗi:', res.msg || res);
    }
    process.exit(0);
}).catch(err => {
    console.error('Lỗi ngoại lệ:', err);
    process.exit(1);
});

