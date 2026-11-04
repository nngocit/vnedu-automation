const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');

(async () => {
    const token = '335e12a0eca72dd53a34c0cde16f538b';
    const userId = '7365493419';

    let context;
    try {
        context = await chromium.launchPersistentContext(USER_DATA, { headless: true });
    } catch(e) {
        console.log('Cannot launch persistent context:', e.message);
        return;
    }

    console.log('Querying getTuanHoc with Playwright session cookies...');
    const url = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=edu.lich_bao_giang.getTuanHoc&capHoc=2&my_token=${token}&app_nam_hoc=2026&my_user_id=${userId}&page=1&start=0&limit=50`;
    const res = await context.request.get(url);
    const text = await res.text();
    console.log('getTuanHoc response:', text.substring(0, 1000));
    fs.writeFileSync(path.join(__dirname, '..', 'tuan_hoc_list.json'), text, 'utf8');

    await context.close();
})();

