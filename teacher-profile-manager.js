const fs = require('fs');
const path = require('path');

const PROFILES_DIR = path.join(__dirname, 'user_data');
const PROFILES_FILE = path.join(PROFILES_DIR, 'teacher_profiles.json');

const DEFAULT_TEACHER = {
    username: '051197003685',
    name: 'Lê Thị Diệu Huyên',
    title: 'Cô Lê Thị Diệu Huyên',
    shortName: 'Cô Diệu Huyên',
    gender: 'female',
    subject: 'Toán & HĐTN',
    school: 'Trường THCS An Lập',
    branch: 'Phân hiệu An Lập',
    avatarText: 'H',
    isCurrent: true,
    lastLogin: new Date().toISOString()
};

function ensureDirExists() {
    if (!fs.existsSync(PROFILES_DIR)) {
        try {
            fs.mkdirSync(PROFILES_DIR, { recursive: true });
        } catch (e) {}
    }
}

function getProfiles() {
    ensureDirExists();
    if (!fs.existsSync(PROFILES_FILE)) {
        const initial = [DEFAULT_TEACHER];
        try {
            fs.writeFileSync(PROFILES_FILE, JSON.stringify(initial, null, 2), 'utf8');
        } catch (e) {}
        return initial;
    }
    try {
        const raw = fs.readFileSync(PROFILES_FILE, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
            return list;
        }
    } catch (e) {}
    return [DEFAULT_TEACHER];
}

function saveProfiles(profiles) {
    ensureDirExists();
    try {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Lỗi lưu danh sách hồ sơ giáo viên:', e);
        return false;
    }
}

function getActiveTeacher() {
    const list = getProfiles();
    const active = list.find(p => p.isCurrent);
    return active || list[0] || DEFAULT_TEACHER;
}

function setActiveTeacher(username) {
    const list = getProfiles();
    let found = false;
    list.forEach(p => {
        if (p.username === username) {
            p.isCurrent = true;
            p.lastLogin = new Date().toISOString();
            found = true;
        } else {
            p.isCurrent = false;
        }
    });
    if (found) {
        saveProfiles(list);
    }
    return getActiveTeacher();
}

function deriveAvatarText(name) {
    if (!name) return 'G';
    const words = name.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return lastWord.charAt(0).toUpperCase();
}

function deriveTitle(name, gender = 'unknown') {
    if (!name) return 'Thầy/Cô';
    if (name.startsWith('Cô ') || name.startsWith('Thầy ')) return name;
    if (name.includes('Huyên')) return `Cô ${name}`;
    if (gender === 'female') return `Cô ${name}`;
    if (gender === 'male') return `Thầy ${name}`;
    return `Thầy/Cô ${name}`;
}

function upsertProfile(data) {
    if (!data || !data.username) return null;
    const list = getProfiles();
    const idx = list.findIndex(p => p.username === data.username);
    
    const rawName = data.name || (data.username === '051197003685' ? 'Lê Thị Diệu Huyên' : `Giáo viên ${data.username}`);
    let gender = data.gender;
    if (!gender || gender === 'unknown') {
        if (data.username === '051197003685' || rawName.includes('Huyên')) {
            gender = 'female';
        } else {
            gender = 'unknown';
        }
    }
    const title = (data.username === '051197003685' || rawName.includes('Huyên'))
        ? 'Cô Lê Thị Diệu Huyên'
        : (data.title || deriveTitle(rawName, gender));
    const avatarText = data.avatarText || deriveAvatarText(rawName);

    const profileData = {
        username: data.username,
        name: rawName,
        title,
        shortName: (data.username === '051197003685' || rawName.includes('Huyên')) ? 'Cô Diệu Huyên' : (data.shortName || title),
        gender,
        subject: data.subject || (data.username === '051197003685' ? 'Toán & HĐTN' : 'Giảng dạy THCS'),
        school: data.school || 'Trường THCS An Lập',
        branch: data.branch || 'Phân hiệu An Lập',
        avatarText,
        isCurrent: true,
        lastLogin: new Date().toISOString()
    };

    // Khi nạp profile mới, đặt nó làm active
    list.forEach(p => { p.isCurrent = false; });

    if (idx >= 0) {
        list[idx] = { ...list[idx], ...profileData, isCurrent: true };
    } else {
        list.push(profileData);
    }

    saveProfiles(list);
    return profileData;
}

function deleteProfile(username) {
    if (username === '051197003685') {
        return { success: false, msg: 'Không thể xóa tài khoản giáo viên quản trị mặc định.' };
    }
    const list = getProfiles();
    const filtered = list.filter(p => p.username !== username);
    if (filtered.length === 0) {
        filtered.push(DEFAULT_TEACHER);
    }
    // Nếu vừa xóa tài khoản đang active, chọn tài khoản đầu tiên làm active
    if (!filtered.some(p => p.isCurrent)) {
        filtered[0].isCurrent = true;
    }
    saveProfiles(filtered);
    return { success: true, active: getActiveTeacher() };
}

module.exports = {
    getProfiles,
    getActiveTeacher,
    setActiveTeacher,
    upsertProfile,
    deleteProfile,
    DEFAULT_TEACHER
};
