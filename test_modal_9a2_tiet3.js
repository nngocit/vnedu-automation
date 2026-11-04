const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    // Find the pill with "Vắng: 9"
    const pill9 = await page.$('.attendance-pill:has-text("9")');
    if (!pill9) {
        console.error('❌ Could not find pill with Vắng: 9');
        await browser.close();
        process.exit(1);
    }

    console.log('✅ Found pill with text:', await pill9.innerText());
    await pill9.click();

    await page.waitForSelector('#attendanceModal.active');
    await page.waitForTimeout(2000);

    const summaryText = await page.innerText('#summaryAbsentCountText');
    console.log('✅ Modal summary text:', summaryText);

    const checkedBoxes = await page.$$eval('.student-attendance-row.is-absent', rows => rows.map(r => r.innerText.replace(/\n/g, ' - ')));
    console.log('✅ Absent students listed in modal (' + checkedBoxes.length + '):');
    checkedBoxes.forEach(b => console.log('   ' + b));

    const artifactDir = 'C:\\Users\\DIEU HUYEN\\.gemini\\antigravity\\brain\\c159eca8-0c78-416c-bdfe-a8e4e3a45d78';
    await page.screenshot({ path: path.join(artifactDir, 'test_modal_9a2_tiet3_verified.png') });
    console.log('📸 Saved screenshot: test_modal_9a2_tiet3_verified.png');

    await browser.close();
})();
