const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, 'user_data');
const JSON_DB_FILE = path.join(DB_DIR, 'system_database.json');
const SQLITE_DB_FILE = path.join(__dirname, 'data.db');

// Kiểm tra an toàn xem runtime Node.js hiện tại có hỗ trợ node:sqlite không
// Lưu ý: Trên Node 22.11.0 (như máy chủ Mắt Bão), node:sqlite là experimental và sẽ ném lỗi ERR_UNKNOWN_BUILTIN_MODULE
// nếu không bật cờ --experimental-sqlite. Do đó try-catch là BẮT BUỘC để server không bao giờ bị crash-loop.
let DatabaseSync = null;
let sqliteDb = null;
let useSqlite = false;

try {
    const sqliteModule = require('node:sqlite');
    if (sqliteModule && sqliteModule.DatabaseSync) {
        DatabaseSync = sqliteModule.DatabaseSync;
        sqliteDb = new DatabaseSync(SQLITE_DB_FILE);
        initSqliteSchema(sqliteDb);
        useSqlite = true;
        console.log('✅ [SystemDB] Khởi chạy thành công với SQLite Engine (data.db)');
    }
} catch (err) {
    useSqlite = false;
    console.log('ℹ️ [SystemDB] Môi trường máy chủ (Node v' + process.versions.node + ') chạy chế độ Native JSON Engine an toàn (tương thích 100% Mắt Bão/Linux, không phụ thuộc C++ addon).');
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        try {
            fs.mkdirSync(dirPath, { recursive: true });
        } catch (_) {}
    }
}

function hashPassword(password, salt) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

// -------------------------------------------------------------
// 1. SQLITE ENGINE IMPLEMENTATION (Dành cho Node hỗ trợ node:sqlite)
// -------------------------------------------------------------
function initSqliteSchema(db) {
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
    }
}

// -------------------------------------------------------------
// 2. NATIVE FALLBACK ENGINE (Dành cho Node 22.11 / Mắt Bão / Docker)
// -------------------------------------------------------------
const DEFAULT_SUPER_ADMIN = {
    id: 'admin_root_01',
    username: 'xuanngocit@gmail.com',
    email: 'xuanngocit@gmail.com',
    fullname: 'Xuân Ngọc',
    role: 'SUPER_ADMIN',
    title: 'Super Admin Tối Cao',
    isRoot: true,
    permissions: ['*']
};

function getInitialJsonDb() {
    const { hash, salt } = hashPassword('Joungmin@961');
    return {
        meta: {
            name: 'vnEdu Automation Database',
            version: '2.5.0',
            engine: 'native-json',
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
        attendance_ledger: {},
        acknowledged_conflicts: {},
        locked_weeks: {},
        audit_logs: []
    };
}

function readJsonDb() {
    ensureDir(DB_DIR);
    if (!fs.existsSync(JSON_DB_FILE)) {
        const init = getInitialJsonDb();
        writeJsonDb(init);
        return init;
    }
    try {
        const raw = fs.readFileSync(JSON_DB_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (!data.admins) {
            const init = getInitialJsonDb();
            writeJsonDb(init);
            return init;
        }
        return data;
    } catch (e) {
        const init = getInitialJsonDb();
        writeJsonDb(init);
        return init;
    }
}

function writeJsonDb(data) {
    ensureDir(DB_DIR);
    try {
        data.meta = data.meta || {};
        data.meta.updatedAt = new Date().toISOString();
        const tmp = JSON_DB_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tmp, JSON_DB_FILE);
        return true;
    } catch (e) {
        return false;
    }
}

// Khởi tạo sẵn Native JSON nếu chưa có
if (!useSqlite) {
    readJsonDb();
}

// -------------------------------------------------------------
// 3. EXPORT UNIFIED API (100% Hoạt động mượt trên mọi môi trường)
// -------------------------------------------------------------
module.exports = {
    isSqliteEnabled: useSqlite,

    verifyAdmin(username, password) {
        if (useSqlite && sqliteDb) {
            try {
                const admin = sqliteDb.prepare('SELECT * FROM admins WHERE username = ? OR email = ?').get(username, username);
                if (!admin) return null;
                const { hash } = hashPassword(password, admin.salt);
                if (hash === admin.password_hash) {
                    const now = new Date().toISOString();
                    sqliteDb.prepare('UPDATE admins SET last_login = ? WHERE id = ?').run(now, admin.id);
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
                console.error('[SystemDB SQLite] verifyAdmin error:', e.message);
            }
        }

        // Native Engine Fallback
        const db = readJsonDb();
        const admin = db.admins.find(a =>
            a.username?.toLowerCase() === username.toLowerCase() ||
            a.email?.toLowerCase() === username.toLowerCase()
        );
        if (!admin) return null;

        const { hash } = hashPassword(password, admin.salt);
        if (hash === admin.passwordHash) {
            admin.lastLogin = new Date().toISOString();
            writeJsonDb(db);
            return {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                fullname: admin.fullname,
                role: admin.role,
                isSuperAdmin: admin.role === 'SUPER_ADMIN',
                permissions: admin.permissions || ['*']
            };
        }
        return null;
    },

    getSuperAdmin() {
        if (useSqlite && sqliteDb) {
            try {
                const admin = sqliteDb.prepare('SELECT id, username, email, fullname, role, created_at, last_login FROM admins WHERE role = ?').get('SUPER_ADMIN');
                if (admin) return admin;
            } catch (_) {}
        }
        const db = readJsonDb();
        const found = db.admins.find(a => a.role === 'SUPER_ADMIN');
        if (found) {
            const { passwordHash, salt, ...safe } = found;
            return safe;
        }
        return DEFAULT_SUPER_ADMIN;
    },

    recordAttendance(week, thu, tiet, lop, data) {
        const key = `w${week}_t${thu}_s${tiet}_${lop}`;
        const now = new Date().toISOString();

        if (useSqlite && sqliteDb) {
            try {
                const sdbList = JSON.stringify(data.sdbAbsentList || []);
                const gtList = JSON.stringify(data.giamThiAbsentList || []);
                const isMatched = data.isMatched ? 1 : 0;
                const stmt = sqliteDb.prepare(`
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
            } catch (e) {
                console.error('[SystemDB SQLite] recordAttendance error:', e.message);
            }
        }

        // Đồng bộ luôn vào Native Engine
        const db = readJsonDb();
        db.attendance_ledger[key] = {
            week: Number(week),
            thu: Number(thu),
            tiet: Number(tiet),
            lop,
            ngay: data.ngay || '',
            sdbAbsentCount: Number(data.sdbAbsentCount || 0),
            sdbAbsentList: data.sdbAbsentList || [],
            giamThiAbsentCount: Number(data.giamThiAbsentCount || 0),
            giamThiAbsentList: data.giamThiAbsentList || [],
            isMatched: !!data.isMatched,
            updatedAt: now
        };
        writeJsonDb(db);
        return true;
    },

    acknowledgeConflict(week, thu, tiet, lop, actor = 'Super Admin') {
        const key = `w${week}_t${thu}_s${tiet}_${lop}`;
        const now = new Date().toISOString();

        if (useSqlite && sqliteDb) {
            try {
                const stmt = sqliteDb.prepare(`
                    INSERT INTO acknowledged_conflicts (slot_key, week, thu, tiet, lop, acknowledged_at, acknowledged_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(slot_key) DO UPDATE SET
                        acknowledged_at = excluded.acknowledged_at,
                        acknowledged_by = excluded.acknowledged_by
                `);
                stmt.run(key, Number(week), Number(thu), Number(tiet), lop, now, actor);
                sqliteDb.prepare('UPDATE attendance_ledger SET is_matched = 1, updated_at = ? WHERE slot_key = ?').run(now, key);
            } catch (e) {
                console.error('[SystemDB SQLite] acknowledgeConflict error:', e.message);
            }
        }

        // Đồng bộ Native Engine
        const db = readJsonDb();
        db.acknowledged_conflicts[key] = {
            week: Number(week),
            thu: Number(thu),
            tiet: Number(tiet),
            lop,
            acknowledgedAt: now,
            acknowledgedBy: actor
        };
        if (db.attendance_ledger[key]) {
            db.attendance_ledger[key].isMatched = true;
            db.attendance_ledger[key].updatedAt = now;
        }
        writeJsonDb(db);
        return { success: true, key, acknowledged_at: now };
    },

    isSlotAcknowledged(week, thu, tiet, lop) {
        const key = `w${week}_t${thu}_s${tiet}_${lop}`;
        if (useSqlite && sqliteDb) {
            try {
                const row = sqliteDb.prepare('SELECT slot_key FROM acknowledged_conflicts WHERE slot_key = ?').get(key);
                if (row) return true;
            } catch (_) {}
        }
        const db = readJsonDb();
        return !!db.acknowledged_conflicts[key];
    },

    getWeekAttendanceLedger(week) {
        if (useSqlite && sqliteDb) {
            try {
                const rows = sqliteDb.prepare('SELECT * FROM attendance_ledger WHERE week = ?').all(Number(week));
                if (rows && rows.length > 0) {
                    const result = {};
                    for (const r of rows) {
                        result[r.slot_key] = {
                            ...r,
                            isMatched: !!r.is_matched,
                            sdbAbsentList: JSON.parse(r.sdb_absent_list || '[]'),
                            giamThiAbsentList: JSON.parse(r.giamthi_absent_list || '[]')
                        };
                    }
                    return result;
                }
            } catch (_) {}
        }

        const db = readJsonDb();
        const result = {};
        for (const [k, v] of Object.entries(db.attendance_ledger || {})) {
            if (v && v.week === Number(week)) {
                result[k] = v;
            }
        }
        return result;
    },

    finalizePastWeek(week) {
        const now = new Date().toISOString();
        if (useSqlite && sqliteDb) {
            try {
                const stmt = sqliteDb.prepare(`
                    INSERT INTO locked_weeks (week, locked, locked_at, notes)
                    VALUES (?, 1, ?, 'Đã chốt sổ tuần quá khứ an toàn')
                    ON CONFLICT(week) DO UPDATE SET locked_at = excluded.locked_at
                `);
                stmt.run(Number(week), now);
            } catch (_) {}
        }
        const db = readJsonDb();
        db.locked_weeks[`week_${week}`] = {
            locked: true,
            lockedAt: now,
            notes: 'Đã chốt sổ tuần quá khứ an toàn'
        };
        writeJsonDb(db);
        return true;
    },

    isWeekLocked(week, currentRealWeek) {
        if (Number(week) < Number(currentRealWeek)) {
            return true;
        }
        if (useSqlite && sqliteDb) {
            try {
                const row = sqliteDb.prepare('SELECT locked FROM locked_weeks WHERE week = ?').get(Number(week));
                if (row && row.locked) return true;
            } catch (_) {}
        }
        const db = readJsonDb();
        return !!db.locked_weeks[`week_${week}`];
    },

    logAudit(action, actor, details, status = 'success') {
        const now = new Date().toISOString();
        if (useSqlite && sqliteDb) {
            try {
                sqliteDb.prepare('INSERT INTO audit_logs (action, actor, details, status, created_at) VALUES (?, ?, ?, ?, ?)')
                        .run(action, actor, String(details), status, now);
            } catch (_) {}
        }
        const db = readJsonDb();
        db.audit_logs = db.audit_logs || [];
        db.audit_logs.unshift({
            id: Date.now(),
            action,
            actor,
            details: String(details),
            status,
            createdAt: now
        });
        if (db.audit_logs.length > 200) {
            db.audit_logs = db.audit_logs.slice(0, 200);
        }
        writeJsonDb(db);
        return true;
    },

    getAuditLogs(limit = 50) {
        if (useSqlite && sqliteDb) {
            try {
                const rows = sqliteDb.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(Number(limit));
                if (rows && rows.length > 0) return rows;
            } catch (_) {}
        }
        const db = readJsonDb();
        return (db.audit_logs || []).slice(0, limit);
    }
};
