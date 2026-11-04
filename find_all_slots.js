const fs = require('fs');

function findAllSlots(file, name) {
    const html = fs.readFileSync(file, 'utf-8');
    const tdMatches = [...html.matchAll(/<td[^>]*\btiet=["']?(\d+)["']?[^>]*\bthu=["']?(\d+)["']?[^>]*>/gi)];
    console.log(`\n=== TẤT CẢ TIẾT TRONG ${name} ===`);
    tdMatches.forEach(m => {
        const full = m[0];
        const thu = full.match(/thu=["']?(\d+)["']?/i)?.[1];
        const buoi = full.match(/buoi(?:_hoc)?=["']?(\d+)["']?/i)?.[1];
        const tiet = full.match(/tiet=["']?(\d+)["']?/i)?.[1];
        const mon = full.match(/mon_hoc_id=["']?(\d+)["']?/i)?.[1];
        const phanMon = full.match(/phan_mon_id=["']?(\d+)["']?/i)?.[1];
        const id = full.match(/chitiet_id=["']?(\d+)["']?/i)?.[1];
        const nd = full.match(/noi_dung=["']([^"']*)["']?/i)?.[1];
        if (id && id !== '0') {
            console.log(`Thứ ${thu} | Buổi ${buoi === '1' ? 'Sáng' : 'Chiều'} | Tiết ${tiet} | Mon: ${mon} | PPCT: ${full.match(/tiet_ppct=["']?(\d+)["']?/i)?.[1]} | ID: ${id} | Nội dung: ${nd ? nd.substring(0, 40) : '[Trống]'}`);
        }
    });
}

findAllSlots('table_7A2.html', 'LỚP 7A2AL');
findAllSlots('table_9A2.html', 'LỚP 9A2AL');
