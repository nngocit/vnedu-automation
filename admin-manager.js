const fs = require('fs');
const path = require('path');
const os = require('os');
const teacherProfileManager = require('./teacher-profile-manager');

const USER_DATA_DIR = path.join(__dirname, 'user_data');
const SETTINGS_FILE = path.join(USER_DATA_DIR, 'system_settings.json');
const AUDIT_LOGS_FILE = path.join(USER_DATA_DIR, 'audit_logs.json');

const DEFAULT_SETTINGS = {
    autoFillPpct: true,
    autoMatchAttendance: true,
    strictAfternoon: true,
    aiMathCleanFilter: true,
    aiTone: 'pedagogical', // pedagogical, concise, friendly
    adminPin: '0907',
    adminPhone: '051197003685',
    adminName: 'Lê Thị Diệu Huyên',
    schoolName: 'Trường THCS An Lập',
    schoolBranch: 'Phân hiệu An Lập',
    academicYear: '2025-2026',
    semester: 1,
    maxBackupCopies: 10,
    enableDetailedLogs: true
};

function ensureDirExists() {
    if (!fs.existsSync(USER_DATA_DIR)) {
        try {
            fs.mkdirSync(USER_DATA_DIR, { recursive: true });
        } catch (e) {}
    }
}

function getSettings() {
    ensureDirExists();
    if (!fs.existsSync(SETTINGS_FILE)) {
        try {
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
        } catch (e) {}
        return { ...DEFAULT_SETTINGS };
    }
    try {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettings(newSettings) {
    ensureDirExists();
    try {
        const current = getSettings();
        const merged = { ...current, ...newSettings };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
        logAction('Cập nhật cấu hình', 'Cô Lê Thị Diệu Huyên', 'Thay đổi tham số vận hành hệ thống', 'success');
        return { success: true, settings: merged };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getAuditLogs(limit = 50) {
    ensureDirExists();
    if (!fs.existsSync(AUDIT_LOGS_FILE)) {
        const initial = [{
            timestamp: new Date().toISOString(),
            action: 'Khởi tạo hệ thống',
            user: 'Cô Lê Thị Diệu Huyên (Admin)',
            details: 'Hệ thống SĐB Smart Sync THCS An Lập sẵn sàng hoạt động',
            type: 'success'
        }];
        try {
            fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(initial, null, 2), 'utf8');
        } catch (e) {}
        return initial;
    }
    try {
        const raw = fs.readFileSync(AUDIT_LOGS_FILE, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
            return list.slice(0, limit);
        }
    } catch (e) {}
    return [];
}

function logAction(action, user = 'Hệ thống', details = '', type = 'info') {
    ensureDirExists();
    try {
        let logs = [];
        if (fs.existsSync(AUDIT_LOGS_FILE)) {
            try {
                logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8')) || [];
            } catch (e) {
                logs = [];
            }
        }
        logs.unshift({
            timestamp: new Date().toISOString(),
            action,
            user,
            details,
            type
        });
        // Giữ tối đa 500 dòng log gần nhất
        if (logs.length > 500) {
            logs = logs.slice(0, 500);
        }
        fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
    } catch (e) {}
}

function getSystemStats(coreRef) {
    const memory = process.memoryUsage();
    const uptimeSec = process.uptime();
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);

    const profiles = teacherProfileManager.getProfiles();
    const activeTeacher = teacherProfileManager.getActiveTeacher();
    const settings = getSettings();

    let cacheFileSize = 0;
    const cachePath = path.join(__dirname, 'session_cache.json');
    if (fs.existsSync(cachePath)) {
        try {
            cacheFileSize = fs.statSync(cachePath).size;
        } catch (e) {}
    }

    let ppctCount = 0;
    const ppctPath = path.join(USER_DATA_DIR, 'ppct_config.json');
    if (fs.existsSync(ppctPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(ppctPath, 'utf8'));
            ppctCount = Object.keys(raw).length;
        } catch (e) {}
    }

    const vneduStatus = coreRef && coreRef.getAuthToken ? {
        connected: !!coreRef.getAuthToken(),
        tokenPreview: coreRef.getAuthToken() ? coreRef.getAuthToken().substring(0, 10) + '...' : 'Chưa kết nối',
        cookiesAvailable: !!(coreRef.session && coreRef.session.cookies)
    } : { connected: false, tokenPreview: 'N/A' };

    return {
        server: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: `${hours} giờ ${minutes} phút`,
            uptimeSeconds: Math.floor(uptimeSec),
            memory: {
                rssMB: Math.round(memory.rss / 1024 / 1024),
                heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
                osFreeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
                osTotalMemoryMB: Math.round(os.totalmem() / 1024 / 1024)
            },
            port: 3000
        },
        vnedu: vneduStatus,
        teachers: {
            total: profiles.length,
            active: activeTeacher,
            list: profiles
        },
        storage: {
            profilesCount: profiles.length,
            ppctCount,
            cacheBytes: cacheFileSize,
            cacheKB: Math.round(cacheFileSize / 1024)
        },
        settings
    };
}

function clearCache() {
    let freedBytes = 0;
    const cachePath = path.join(__dirname, 'session_cache.json');
    if (fs.existsSync(cachePath)) {
        try {
            freedBytes = fs.statSync(cachePath).size;
            fs.unlinkSync(cachePath);
        } catch (e) {}
    }
    logAction('Dọn dẹp bộ nhớ đệm', 'Cô Lê Thị Diệu Huyên', `Đã dọn dẹp ${Math.round(freedBytes / 1024)} KB cache`, 'success');
    return { success: true, freedBytes, freedKB: Math.round(freedBytes / 1024) };
}

function generateBackup() {
    const backup = {
        meta: {
            version: '2.5.0',
            exportedAt: new Date().toISOString(),
            owner: 'Cô Lê Thị Diệu Huyên',
            school: 'Trường THCS An Lập'
        },
        settings: getSettings(),
        profiles: teacherProfileManager.getProfiles(),
        auditLogs: getAuditLogs(200)
    };

    const ppctPath = path.join(USER_DATA_DIR, 'ppct_config.json');
    if (fs.existsSync(ppctPath)) {
        try {
            backup.ppct = JSON.parse(fs.readFileSync(ppctPath, 'utf8'));
        } catch (e) {}
    }

    const attendancePath = path.join(USER_DATA_DIR, 'local_attendance_db.json');
    if (fs.existsSync(attendancePath)) {
        try {
            backup.attendance = JSON.parse(fs.readFileSync(attendancePath, 'utf8'));
        } catch (e) {}
    }

    logAction('Xuất bản sao lưu', 'Cô Lê Thị Diệu Huyên', 'Tạo gói sao lưu toàn bộ hệ thống .json', 'info');
    return backup;
}

function restoreBackup(backupData) {
    if (!backupData || typeof backupData !== 'object') {
        return { success: false, error: 'Dữ liệu file sao lưu không hợp lệ.' };
    }

    try {
        if (backupData.settings) {
            saveSettings(backupData.settings);
        }
        if (Array.isArray(backupData.profiles) && backupData.profiles.length > 0) {
            fs.writeFileSync(path.join(USER_DATA_DIR, 'teacher_profiles.json'), JSON.stringify(backupData.profiles, null, 2), 'utf8');
        }
        if (backupData.ppct) {
            fs.writeFileSync(path.join(USER_DATA_DIR, 'ppct_config.json'), JSON.stringify(backupData.ppct, null, 2), 'utf8');
        }
        if (backupData.attendance) {
            fs.writeFileSync(path.join(USER_DATA_DIR, 'local_attendance_db.json'), JSON.stringify(backupData.attendance, null, 2), 'utf8');
        }

        logAction('Khôi phục hệ thống', 'Cô Lê Thị Diệu Huyên', 'Đã nạp lại bản sao lưu thành công', 'success');
        return { success: true, msg: 'Đã khôi phục toàn bộ cấu hình hệ thống thành công!' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    getSettings,
    saveSettings,
    getAuditLogs,
    logAction,
    getSystemStats,
    clearCache,
    generateBackup,
    restoreBackup,
    DEFAULT_SETTINGS
};
