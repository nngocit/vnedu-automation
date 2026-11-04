const fs = require('fs');
const html = fs.readFileSync('table_9A2.html', 'utf-8');
const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
[6, 12].forEach(idx => {
    console.log(`\n=== ROW ${idx} RAW ===`);
    console.log(rows[idx]);
});
