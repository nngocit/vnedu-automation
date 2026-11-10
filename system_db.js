const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, 'user_data');
const DB_FILE = path.join(DB_DIR, 'system_database.json');

// Super Admin mặc định của hệ thống
const DEFAULT_SUPER_ADMIN = {
    id: 'admin_root_01',
    username: 'xuanngocit@gmail.com',
    email: 'xuanngocit@gmail.com',
    fullname: 'Xuân Ngọc',
    role: 'SUPER_ADMIN',
    title: 'Super Admin Tối Cao',
    isRoot: true,
    permissions: ['*'],
    notes: 'Quản trị viên tối cao của toàn bộ hệ thống vnEdu Automation'
};

function ensureDir() {
    if (!fs.existsSync(DB_DIR)) {
        try {
            fs.mkdirSync(DB_DIR, { recursive: true });
        } catch (e) {}
    }
}

function hashPassword(password, salt) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

function getInitialDb() {
    const { hash, salt } = hashPassword('Joungmin@961');
    return {
        meta: {
            name: 'vnEdu Automation Local Database',
            version: '2.5.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        admins: [
            {
                ...DEFAULT_SUPER_ADMIN,
                passwordHash: hash,
                salt: salt,
                createdAt: new Date().toISOString(),
                lastLogin: null
            }
        ],
        attendance_ledger: {}, // key: "w{week}_t{thu}_s{tiet}_{lop}"
        acknowledged_conflicts: {}, // key: "w{week}_t{thu}_s{tiet}_{lop}" => true
        locked_weeks: {}, // key: "week_{weekNum}" => { locked: true, at: ... }
        settings: {
            autoScanOnlyCurrentWeek: true,
            strictAfternoon: true,
            autoFillPpct: true
        }
    };
}

function readDb() {
    ensureDir();
    if (!fs.existsSync(DB_FILE)) {
        const init = getInitialDb();
        writeDb(init);
        return init;
    }
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (!data.admins || !data.attendance_ledger) {
            const init = getInitialDb();
            writeDb(init);
            return init;
        }
        return data;
    } catch (e) {
        console.error('[SystemDB] Lỗi đọc DB, tạo mới an toàn:', e.message);
        const init = getInitialDb();
        writeDb(init);
        return init;
    }
}

function writeDb(data) {
    ensureDir();
    try {
        data.meta = data.meta || {};
        data.meta.updatedAt = new Date().toISOString();
        const tempPath = DB_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempPath, DB_FILE);
        return true;
    } catch (e) {
        console.error('[SystemDB] Lỗi ghi DB:', e.message);
        return false;
    }
}

// ========================================================
// 1. QUẢN LÝ SUPER ADMIN (xuanngocit@gmail.com / Joungmin@961)
// ========================================================
function verifyAdmin(identifier, password) {
    if (!identifier || !password) return null;
    const cleanId = identifier.trim().toLowerCase();
    const db = readDb();

    // Kiểm tra trực tiếp tài khoản root
    if ((cleanId === 'xuanngocit@gmail.com' || cleanId === 'xuanngocit') && password === 'Joungmin@961') {
        const root = db.admins.find(a => a.username.toLowerCase() === 'xuanngocit@gmail.com');
        if (root) {
            root.lastLogin = new Date().toISOString();
            writeDb(db);
            const { passwordHash, salt, ...safe } = root;
            return safe;
        }
        return { ...DEFAULT_SUPER_ADMIN, lastLogin: new Date().toISOString() };
    }

    // Kiểm tra hash
    const admin = db.admins.find(a =>
        a.username.toLowerCase() === cleanId ||
        (a.email && a.email.toLowerCase() === cleanId)
    );
    if (!admin) return null;

    if (admin.salt && admin.passwordHash) {
        const testHash = crypto.pbkdf2Sync(password, admin.salt, 1000, 64, 'sha512').toString('hex');
        if (testHash === admin.passwordHash) {
            admin.lastLogin = new Date().toISOString();
            writeDb(db);
            const { passwordHash, salt, ...safe } = admin;
            return safe;
        }
    }
    return null;
}

function getSuperAdmin() {
    const db = readDb();
    const root = db.admins.find(a => a.isRoot || a.username.toLowerCase() === 'xuanngocit@gmail.com');
    if (!root) return DEFAULT_SUPER_ADMIN;
    const { passwordHash, salt, ...safe } = root;
    return safe;
}

// ========================================================
// 2. CƠ SỞ DỮ LIỆU ĐIỂM DANH & CHỐT ĐỐI CHIẾU
// ========================================================
function makeAttendanceKey(week, thu, tiet, lop) {
    const cleanLop = String(lop || '').replace(/[^a-zA-Z0-9]/g, '');
    return `w${week}_t${thu}_s${tiet}_${cleanLop}`;
}

/**
 * Đọc toàn bộ trạng thái điểm danh của 1 tuần từ CSDL
 */
function getWeekAttendanceLedger(week) {
    const db = readDb();
    const result = {};
    const prefix = `w${week}_`;
    Object.keys(db.attendance_ledger || {}).forEach(k => {
        if (k.startsWith(prefix)) {
            result[k] = db.attendance_ledger[k];
        }
    });
    return result;
}

/**
 * Lưu hoặc cập nhật trạng thái đối chiếu của 1 tiết vào CSDL
 */
function recordAttendance(week, thu, tiet, lop, record) {
    const db = readDb();
    const key = makeAttendanceKey(week, thu, tiet, lop);
    db.attendance_ledger = db.attendance_ledger || {};
    
    db.attendance_ledger[key] = {
        key,
        week: Number(week),
        thu: Number(thu),
        tiet: Number(tiet),
        lop,
        ngay: record.ngay || '',
        sdbAbsentCount: record.sdbAbsentCount !== undefined ? record.sdbAbsentCount : (record.sdbSoLuongNghi || 0),
        sdbAbsentList: record.sdbAbsentList || record.sdbDsVang || [],
        giamThiAbsentCount: record.giamThiAbsentCount !== undefined ? record.giamThiAbsentCount : (record.giamThiSoLuongNghi || 0),
        giamThiAbsentList: record.giamThiAbsentList || record.giamThiDsVang || [],
        isMatched: record.isMatched !== undefined ? record.isMatched : true,
        isAcknowledged: record.isAcknowledged === true || (db.acknowledged_conflicts && db.acknowledged_conflicts[key] === true),
        updatedAt: new Date().toISOString()
    };
    writeDb(db);
    return db.attendance_ledger[key];
}

/**
 * Đánh dấu đã xác nhận / bỏ qua cảnh báo lệch (Khóa vĩnh viễn không cảnh báo lại nữa)
 */
function acknowledgeConflict(week, thu, tiet, lop) {
    const db = readDb();
    const key = makeAttendanceKey(week, thu, tiet, lop);
    db.acknowledged_conflicts = db.acknowledged_conflicts || {};
    db.acknowledged_conflicts[key] = true;

    if (db.attendance_ledger && db.attendance_ledger[key]) {
        db.attendance_ledger[key].isAcknowledged = true;
        db.attendance_ledger[key].isMatched = true; // Xem như đã khớp theo ý giáo viên
    }
    writeDb(db);
    return { success: true, key };
}

/**
 * Kiểm tra xem 1 tiết đã được xác nhận hoặc đã chốt trong DB chưa
 */
function isSlotAcknowledged(week, thu, tiet, lop) {
    const db = readDb();
    const key = makeAttendanceKey(week, thu, tiet, lop);
    if (db.acknowledged_conflicts && db.acknowledged_conflicts[key]) {
        return true;
    }
    if (db.attendance_ledger && db.attendance_ledger[key]) {
        return db.attendance_ledger[key].isAcknowledged === true;
    }
    return false;
}

/**
 * Chốt toàn bộ 1 tuần quá khứ vào CSDL (không bao giờ quét lại hay báo lỗi nữa)
 */
function finalizePastWeek(week) {
    const db = readDb();
    db.locked_weeks = db.locked_weeks || {};
    db.locked_weeks[`week_${week}`] = {
        locked: true,
        finalizedAt: new Date().toISOString()
    };
    writeDb(db);
    return true;
}

function isWeekLocked(week) {
    const db = readDb();
    return !!(db.locked_weeks && db.locked_weeks[`week_${week}`]?.locked);
}

// Khởi tạo
readDb();

module.exports = {
    readDb,
    writeDb,
    verifyAdmin,
    getSuperAdmin,
    makeAttendanceKey,
    getWeekAttendanceLedger,
    recordAttendance,
    acknowledgeConflict,
    isSlotAcknowledged,
    finalizePastWeek,
    isWeekLocked
};
