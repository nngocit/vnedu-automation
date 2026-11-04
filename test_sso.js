const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const context = await chromium.launchPersistentContext(path.join(__dirname, 'user_data'), { headless: true });
    const page = await context.newPage();
    console.log('Navigating to loginSSO...');
    await page.goto('http://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=auth.loginSSO', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Final URL:', page.url());
    console.log('Title:', await page.title());
    const content = await page.content();
    fs.writeFileSync('page_after_sso.html', content, 'utf-8');
    await context.close();
})();
