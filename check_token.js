const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const context = await chromium.launchPersistentContext(path.join(__dirname, 'user_data'), { headless: true });
    const page = await context.newPage();
    await page.goto('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Current URL:', page.url());
    console.log('Page Title:', await page.title());
    const cookies = await context.cookies();
    console.log('Cookies count:', cookies.length);
    cookies.forEach(c => console.log('Cookie:', c.name, '=', c.value.substring(0, 15) + '...'));
    const content = await page.content();
    fs.writeFileSync('page_dump.html', content, 'utf-8');
    console.log('Saved page_dump.html');
    await context.close();
})();
