const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'attendance_db.json');

function loadDb() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('Lỗi đọc attendance_db.json:', e.message);
    }
    return {};
}

function saveDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Lỗi ghi attendance_db.json:', e.message);
        return false;
    }
}

function getKey(lop, week, thu, tiet) {
    const cleanLop = (lop || '').replace(/[^a-zA-Z0-9]/g, '');
    return `${cleanLop}_w${week}_t${thu}_s${tiet}`;
}

function getRecord(lop, week, thu, tiet) {
    const db = loadDb();
    const key = getKey(lop, week, thu, tiet);
    return db[key] || null;
}

function saveRecord(lop, week, thu, tiet, record) {
    const db = loadDb();
    const key = getKey(lop, week, thu, tiet);
    db[key] = {
        ...record,
        lop,
        week,
        thu,
        tiet,
        updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db[key];
}

module.exports = {
    loadDb,
    saveDb,
    getRecord,
    saveRecord,
    getKey
};
