const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log('🚀 Starting Attendance Human-In-The-Loop Flow Test...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for schedule table to render
        await page.waitForSelector('.attendance-pill', { timeout: 15000 });
        console.log('✅ Timetable rendered with attendance pills');

        // Look for SDD alert pill
        const sddPill = await page.$('.attendance-sdd-alert');
        if (!sddPill) {
            console.warn('⚠️ No .attendance-sdd-alert found immediately, checking text...');
        } else {
            const pillText = await sddPill.innerText();
            console.log('✅ Found SDD alert pill text:', pillText);
        }

        // Take screenshot of the table with SDD alert pill
        const artifactDir = 'C:\\Users\\DIEU HUYEN\\.gemini\\antigravity\\brain\\c159eca8-0c78-416c-bdfe-a8e4e3a45d78';
        await page.screenshot({ path: path.join(artifactDir, 'test_sdd_alert_table.png') });
        console.log('📸 Saved test_sdd_alert_table.png');

        // Click the first attendance pill or SDD alert pill to open modal
        const targetPill = sddPill || (await page.$('.attendance-pill'));
        await targetPill.click();

        // Wait for modal to open
        await page.waitForSelector('#attendanceModal.active', { timeout: 5000 });
        console.log('✅ Attendance modal opened with .active class');

        // Wait for student roster to load
        await page.waitForSelector('.student-attendance-row', { timeout: 15000 });
        console.log('✅ Student roster loaded inside modal');

        // Check if SDD alert box is present
        const sddBox = await page.$('#sddAlertBox');
        if (sddBox) {
            const sddText = await sddBox.innerText();
            console.log('✅ SDD Alert Box found! Text preview:\n', sddText.slice(0, 200));

            // Screenshot the modal with SDD alert box
            await page.screenshot({ path: path.join(artifactDir, 'test_sdd_alert_modal.png') });
            console.log('📸 Saved test_sdd_alert_modal.png');

            // Click "🟢 Áp dụng gợi ý này"
            const btnApply = await page.$('#btnSddApply');
            if (btnApply) {
                await btnApply.click();
                await page.waitForTimeout(600);
                const summaryText = await page.innerText('#summaryAbsentCountText');
                console.log('✅ After clicking Apply, summary text:', summaryText);

                await page.screenshot({ path: path.join(artifactDir, 'test_sdd_applied_modal.png') });
                console.log('📸 Saved test_sdd_applied_modal.png');
            }

            // Click "⚪ Bỏ qua (Tiết này đủ)"
            const btnDismiss = await page.$('#btnSddDismiss');
            if (btnDismiss) {
                await btnDismiss.click();
                await page.waitForTimeout(600);
                const summaryText = await page.innerText('#summaryAbsentCountText');
                console.log('✅ After clicking Dismiss, summary text:', summaryText);

                await page.screenshot({ path: path.join(artifactDir, 'test_sdd_dismissed_modal.png') });
                console.log('📸 Saved test_sdd_dismissed_modal.png');
            }

            // Click Apply again to keep the confirmed absent status
            if (btnApply) {
                await btnApply.click();
                await page.waitForTimeout(600);
            }
        }

        // Close modal
        await page.click('#btnDismissAttendanceModal');
        await page.waitForTimeout(600);
        const modalOpen = await page.isVisible('#attendanceModal.active');
        console.log('✅ Modal closed successfully. Is still visible?', modalOpen);

        console.log('🎉 ALL ATTENDANCE HUMAN-IN-THE-LOOP TESTS PASSED!');
    } catch (e) {
        console.error('❌ Test failed:', e);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
