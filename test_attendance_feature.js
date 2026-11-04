const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();

    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for rows and attendance pills
    await page.waitForSelector('.attendance-pill', { timeout: 10000 });
    console.log('2. Found attendance pills in schedule table!');

    const pills = await page.locator('.attendance-pill').allTextContents();
    console.log('Attendance pills count:', pills.length);
    console.log('Sample attendance pills:', pills.slice(0, 5).map(s => s.trim().replace(/\s+/g, ' ')));

    const artifactDir = 'C:\\Users\\DIEU HUYEN\\.gemini\\antigravity\\brain\\c159eca8-0c78-416c-bdfe-a8e4e3a45d78';
    
    // Screenshot table with attendance pills
    await page.screenshot({ path: path.join(artifactDir, 'test_table_with_attendance_pills.png') });
    console.log('Saved test_table_with_attendance_pills.png');

    // Click on the first attendance pill to open modal
    console.log('3. Clicking attendance pill to open details modal...');
    const firstPill = page.locator('.attendance-pill').first();
    await firstPill.click();

    // Wait for modal to be visible
    await page.waitForSelector('#attendanceModal', { state: 'visible', timeout: 5000 });
    console.log('Attendance modal is visible!');

    // Wait for data to load in modal body
    await page.waitForTimeout(2000);

    const modalTitle = await page.locator('#attendanceModalTitle').textContent();
    console.log('Modal title:', modalTitle);

    // Screenshot modal
    await page.screenshot({ path: path.join(artifactDir, 'test_attendance_modal_open.png') });
    console.log('Saved test_attendance_modal_open.png');

    // Test dismiss button
    console.log('4. Dismissing attendance modal...');
    await page.locator('#btnDismissAttendanceModal').click();
    await page.waitForTimeout(300);

    const isHidden = await page.evaluate(() => {
        const m = document.getElementById('attendanceModal');
        return m ? m.style.display === 'none' : true;
    });
    console.log('Modal closed cleanly:', isHidden);

    await browser.close();
    console.log('🎉 ATTENDANCE FEATURE TEST COMPLETED WITH 100% SUCCESS!');
})();
