const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'data.db');

let dbInstance = null;

function getDb() {
    if (!dbInstance) {
        dbInstance = new DatabaseSync(DB_FILE);
        initSchema(dbInstance);
    }
    return dbInstance;
}

function hashPassword(password, salt) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

function initSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            fullname TEXT,
            password_hash TEXT,
            salt TEXT,
            role TEXT DEFAULT 'ADMIN',
            permissions TEXT DEFAULT '["*"]',
            created_at TEXT,
            last_login TEXT
        );

        CREATE TABLE IF NOT EXISTS attendance_ledger (
            slot_key TEXT PRIMARY KEY,
            week INTEGER,
            thu INTEGER,
            tiet INTEGER,
            lop TEXT,
            ngay TEXT,
            sdb_absents INTEGER,
            sdb_absent_list TEXT,
            giamthi_absents INTEGER,
            giamthi_absent_list TEXT,
            is_matched INTEGER,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS acknowledged_conflicts (
            slot_key TEXT PRIMARY KEY,
            week INTEGER,
            thu INTEGER,
            tiet INTEGER,
            lop TEXT,
            acknowledged_at TEXT,
            acknowledged_by TEXT
        );

        CREATE TABLE IF NOT EXISTS locked_weeks (
            week INTEGER PRIMARY KEY,
            locked INTEGER DEFAULT 1,
            locked_at TEXT,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT,
            actor TEXT,
            details TEXT,
            status TEXT,
            created_at TEXT
        );
    `);

    // Khởi tạo Super Admin mặc định: xuanngocit@gmail.com / Joungmin@961
    const checkAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get('xuanngocit@gmail.com');
    if (!checkAdmin) {
        const { hash, salt } = hashPassword('Joungmin@961');
        const insertAdmin = db.prepare(`
            INSERT INTO admins (id, username, email, fullname, password_hash, salt, role, permissions, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertAdmin.run(
            'admin_root_01',
            'xuanngocit@gmail.com',
            'xuanngocit@gmail.com',
            'Xuân Ngọc',
            hash,
            salt,
            'SUPER_ADMIN',
            JSON.stringify(['*']),
            new Date().toISOString()
        );
        console.log('[SystemDB SQLite] Đã khởi tạo Super Admin xuanngocit@gmail.com vào file data.db thành công!');
    }

    // Khởi tạo tài khoản quản trị cho Cô Lê Thị Diệu Huyên (051197003685)
    const checkHuyen = db.prepare('SELECT id FROM admins WHERE username = ?').get('051197003685');
    if (!checkHuyen) {
        const { hash, salt } = hashPassword('Huyen0907@');
        const insertAdmin = db.prepare(`
            INSERT INTO admins (id, username, email, fullname, password_hash, salt, role, permissions, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertAdmin.run(
            'admin_teacher_huyen',
            '051197003685',
            '051197003685@vnedu.vn',
            'Cô Lê Thị Diệu Huyên',
            hash,
            salt,
            'TEACHER_ADMIN',
            JSON.stringify(['*']),
            new Date().toISOString()
        );
    }
}

// Khởi tạo ngay lập tức khi file được nạp
getDb();

module.exports = {
    DB_FILE,

    verifyAdmin(username, password) {
        try {
            const db = getDb();
            const admin = db.prepare('SELECT * FROM admins WHERE username = ? OR email = ?').get(username, username);
            if (!admin) return null;

            const { hash } = hashPassword(password, admin.salt);
            if (hash === admin.password_hash) {
                // Cập nhật last_login
                const now = new Date().toISOString();
                db.prepare('UPDATE admins SET last_login = ? WHERE id = ?').run(now, admin.id);
                return {
                    id: admin.id,
                    username: admin.username,
                    email: admin.email,
                    fullname: admin.fullname,
                    role: admin.role,
                    isSuperAdmin: admin.role === 'SUPER_ADMIN',
                    permissions: JSON.parse(admin.permissions || '["*"]')
                };
            }
            return null;
        } catch (e) {
            console.error('[SystemDB] verifyAdmin error:', e.message);
            return null;
        }
    },

    getSuperAdmin() {
        try {
            const db = getDb();
            const admin = db.prepare('SELECT id, username, email, fullname, role, created_at, last_login FROM admins WHERE role = ?').get('SUPER_ADMIN');
            return admin || null;
        } catch (e) {
            return null;
        }
    },

    recordAttendance(week, thu, tiet, lop, data) {
        try {
            const db = getDb();
            const key = `w${week}_t${thu}_s${tiet}_${lop}`;
            const sdbList = JSON.stringify(data.sdbAbsentList || []);
            const gtList = JSON.stringify(data.giamThiAbsentList || []);
            const isMatched = data.isMatched ? 1 : 0;
            const now = new Date().toISOString();

            const stmt = db.prepare(`
                INSERT INTO attendance_ledger (slot_key, week, thu, tiet, lop, ngay, sdb_absents, sdb_absent_list, giamthi_absents, giamthi_absent_list, is_matched, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(slot_key) DO UPDATE SET
                    ngay = excluded.ngay,
                    sdb_absents = excluded.sdb_absents,
                    sdb_absent_list = excluded.sdb_absent_list,
                    giamthi_absents = excluded.giamthi_absents,
                    giamthi_absent_list = excluded.giamthi_absent_list,
                    is_matched = excluded.is_matched,
                    updated_at = excluded.updated_at
            `);
            stmt.run(key, Number(week), Number(thu), Number(tiet), lop, data.ngay || '', Number(data.sdbAbsentCount || 0), sdbList, Number(data.giamThiAbsentCount || 0), gtList, isMatched, now);
            return true;
        } catch (e) {
            console.error('[SystemDB] recordAttendance error:', e.message);
            return false;
        }
    },

    acknowledgeConflict(week, thu, tiet, lop, actor = 'Super Admin') {
        try {
            const db = getDb();
            const key = `w${week}_t${thu}_s${tiet}_${lop}`;
            const now = new Date().toISOString();

            const stmt = db.prepare(`
                INSERT INTO acknowledged_conflicts (slot_key, week, thu, tiet, lop, acknowledged_at, acknowledged_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(slot_key) DO UPDATE SET
                    acknowledged_at = excluded.acknowledged_at,
                    acknowledged_by = excluded.acknowledged_by
            `);
            stmt.run(key, Number(week), Number(thu), Number(tiet), lop, now, actor);

            // Cập nhật luôn ledger thành is_matched = 1
            db.prepare('UPDATE attendance_ledger SET is_matched = 1, updated_at = ? WHERE slot_key = ?').run(now, key);

            return { success: true, key, acknowledged_at: now };
        } catch (e) {
            console.error('[SystemDB] acknowledgeConflict error:', e.message);
            return { success: false, error: e.message };
        }
    },

    isSlotAcknowledged(week, thu, tiet, lop) {
        try {
            const db = getDb();
            const key = `w${week}_t${thu}_s${tiet}_${lop}`;
            const row = db.prepare('SELECT slot_key FROM acknowledged_conflicts WHERE slot_key = ?').get(key);
            return !!row;
        } catch (e) {
            return false;
        }
    },

    getWeekAttendanceLedger(week) {
        try {
            const db = getDb();
            const rows = db.prepare('SELECT * FROM attendance_ledger WHERE week = ?').all(Number(week));
            const result = {};
            for (const r of rows) {
                result[r.slot_key] = {
                    ...r,
                    is_matched: !!r.is_matched,
                    sdbAbsentList: JSON.parse(r.sdb_absent_list || '[]'),
                    giamThiAbsentList: JSON.parse(r.giamthi_absent_list || '[]')
                };
            }
            return result;
        } catch (e) {
            return {};
        }
    },

    finalizePastWeek(week) {
        try {
            const db = getDb();
            const now = new Date().toISOString();
            const stmt = db.prepare(`
                INSERT INTO locked_weeks (week, locked, locked_at, notes)
                VALUES (?, 1, ?, 'Đã chốt sổ tuần quá khứ an toàn')
                ON CONFLICT(week) DO UPDATE SET locked_at = excluded.locked_at
            `);
            stmt.run(Number(week), now);
            return true;
        } catch (e) {
            return false;
        }
    },

    isWeekLocked(week, currentRealWeek) {
        if (Number(week) < Number(currentRealWeek)) {
            return true;
        }
        try {
            const db = getDb();
            const row = db.prepare('SELECT locked FROM locked_weeks WHERE week = ?').get(Number(week));
            return !!(row && row.locked);
        } catch (e) {
            return Number(week) < Number(currentRealWeek);
        }
    },

    logAudit(action, actor, details, status = 'success') {
        try {
            const db = getDb();
            const now = new Date().toISOString();
            db.prepare('INSERT INTO audit_logs (action, actor, details, status, created_at) VALUES (?, ?, ?, ?, ?)')
              .run(action, actor, String(details), status, now);
            return true;
        } catch (e) {
            return false;
        }
    },

    getAuditLogs(limit = 50) {
        try {
            const db = getDb();
            return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(Number(limit));
        } catch (e) {
            return [];
        }
    }
};
