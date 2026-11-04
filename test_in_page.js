const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA = path.join(__dirname, 'user_data');

(async () => {
    let context;
    try {
        context = await chromium.launchPersistentContext(USER_DATA, { headless: true });
    } catch(e) {
        console.log('Cannot launch persistent context:', e.message);
        return;
    }

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('Navigating to vnEdu page to ensure session is active...');
    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Extract current token from page
    const pageUrl = page.url();
    console.log('Current page URL:', pageUrl);

    // Evaluate fetch inside page context (where all session cookies and extjs state exist!)
    const result = await page.evaluate(async () => {
        // Find token from cookies or scripts
        const m = document.cookie.match(/my_token=([a-f0-9]{20,40})/i) || location.href.match(/my_token=([a-f0-9]{20,40})/i);
        const token = m ? m[1] : (window.phpviet_token || '');
        const res = await fetch('/v5/?call=edu.lich_bao_giang.getTuanHoc&capHoc=2&app_nam_hoc=2026&my_token=' + token);
        return await res.json();
    });

    console.log('Result from page.evaluate:', result);
    await context.close();
})();

