const core = require('./sync-core');

async function testPlaywrightGetByTiet() {
    const { token, context } = await core.ensureVnEduToken();
    console.log('Got valid token:', token);

    const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=edu.phan_phoi_chuong_trinh.getByTiet&app_nam_hoc=2026&my_token=${token}`;
    
    // Test for Toán 9, tiết 37
    const payload = {
        my_token: token,
        my_user_id: '7365493419',
        app_nam_hoc: '2026',
        khoi_hoc: '9',
        lop_hoc_id: '5004582186',
        mon_hoc_id: '1',
        phan_mon_id: '0',
        nam_hoc: '2026',
        tiet: '37'
    };

    const resp = await context.request.post(url, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        },
        form: payload
    });

    const json = await resp.json();
    console.log('Result for Toán 9 (Tiết 37):', json);
}

testPlaywrightGetByTiet().catch(console.error);

