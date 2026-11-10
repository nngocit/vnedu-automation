const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, 'user_data');
const DB_FILE = path.join(DB_DIR, 'admin_database.json');

// Mặc định Super Admin Tối Cao
const ROOT_ADMIN = {
    id: 'sa_root_001',
    username: 'xuanngocit@gmail.com',
    email: 'xuanngocit@gmail.com',
    name: 'Xuân Ngọc',
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

function readDb() {
    ensureDir();
    if (!fs.existsSync(DB_FILE)) {
        return initDb();
    }
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (!data.admins || !Array.isArray(data.admins)) {
            return initDb();
        }
        return data;
    } catch (e) {
        console.error('[AdminDB] Lỗi đọc cơ sở dữ liệu admin, khởi tạo lại:', e.message);
        return initDb();
    }
}

function writeDb(data) {
    ensureDir();
    try {
        const tempPath = DB_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempPath, DB_FILE);
        return true;
    } catch (e) {
        console.error('[AdminDB] Lỗi ghi DB:', e.message);
        return false;
    }
}

function initDb() {
    ensureDir();
    const { hash, salt } = hashPassword('Joungmin@961');
    const initialData = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        admins: [
            {
                ...ROOT_ADMIN,
                passwordHash: hash,
                salt: salt,
                createdAt: new Date().toISOString(),
                lastLogin: null
            }
        ],
        audit: [
            {
                timestamp: new Date().toISOString(),
                action: 'Khởi tạo DB Admin',
                admin: 'xuanngocit@gmail.com',
                detail: 'Đã thiết lập tài khoản Super Admin tối cao'
            }
        ]
    };
    writeDb(initialData);
    return initialData;
}

/**
 * Kiểm tra đăng nhập Super Admin
 * @param {string} identifier - Email hoặc username (xuanngocit@gmail.com)
 * @param {string} password - Mật khẩu (VD: Joungmin@961)
 */
function verifyAdmin(identifier, password) {
    if (!identifier || !password) return null;
    const cleanId = identifier.trim().toLowerCase();
    const db = readDb();

    // 1. Kiểm tra tài khoản root trực tiếp (dự phòng khẩn cấp)
    if ((cleanId === 'xuanngocit@gmail.com' || cleanId === 'xuanngocit') && password === 'Joungmin@961') {
        const rootAdmin = db.admins.find(a => a.username.toLowerCase() === 'xuanngocit@gmail.com');
        if (rootAdmin) {
            rootAdmin.lastLogin = new Date().toISOString();
            writeDb(db);
            const { passwordHash, salt, ...safeInfo } = rootAdmin;
            return safeInfo;
        }
        return { ...ROOT_ADMIN, lastLogin: new Date().toISOString() };
    }

    // 2. Kiểm tra trong danh sách admins bằng PBKDF2 hash
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
            const { passwordHash, salt, ...safeInfo } = admin;
            return safeInfo;
        }
    }

    return null;
}

/**
 * Lấy thông tin Super Admin gốc
 */
function getRootAdmin() {
    const db = readDb();
    const root = db.admins.find(a => a.isRoot || a.username.toLowerCase() === 'xuanngocit@gmail.com');
    if (!root) return ROOT_ADMIN;
    const { passwordHash, salt, ...safeInfo } = root;
    return safeInfo;
}

/**
 * Cập nhật mật khẩu cho Admin
 */
function updateAdminPassword(identifier, newPassword) {
    if (!identifier || !newPassword) return false;
    const cleanId = identifier.trim().toLowerCase();
    const db = readDb();
    const admin = db.admins.find(a =>
        a.username.toLowerCase() === cleanId ||
        (a.email && a.email.toLowerCase() === cleanId)
    );
    if (!admin) return false;

    const { hash, salt } = hashPassword(newPassword);
    admin.passwordHash = hash;
    admin.salt = salt;
    admin.updatedAt = new Date().toISOString();
    return writeDb(db);
}

// Khởi tạo ngay khi module được import
initDb();

module.exports = {
    verifyAdmin,
    getRootAdmin,
    updateAdminPassword,
    readDb
};
