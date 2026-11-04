const fs = require('fs');

function parseTable(fileName, className) {
    const html = fs.readFileSync(fileName, 'utf-8');
    console.log('\n======================================================');
    console.log('=== ' + className + ' (' + fileName + ') ===');
    console.log('======================================================');
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    rows.forEach((r, idx) => {
        if (r.includes('Huyên') || r.includes('Diệu Huyền') || r.includes('sodaubai_edit') || r.includes('Toán')) {
            const clean = r.replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ').trim();
            console.log(`[Dòng ${idx}] ${clean.substring(0, 160)}`);
            const editMatch = r.match(/edit\(([^)]+)\)/i) || r.match(/sodaubai_edit\(([^)]+)\)/i) || r.match(/openEdit\(([^)]+)\)/i);
            if (editMatch) console.log('   Call edit:', editMatch[0]);
        }
    });
}

parseTable('table_7A2.html', 'LỚP 7A2AL');
parseTable('table_9A2.html', 'LỚP 9A2AL');
