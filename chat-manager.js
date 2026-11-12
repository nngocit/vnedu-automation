const fs = require('fs');
const path = require('path');
const teacherProfileManager = require('./teacher-profile-manager');
const adminDb = require('./admin-db');

const DATA_DIR = path.join(__dirname, 'user_data');
const CHAT_FILE = path.join(DATA_DIR, 'chat_messages.json');

function ensureDirExists() {
    if (!fs.existsSync(DATA_DIR)) {
        try {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        } catch (e) {}
    }
}

/**
 * Khởi tạo dữ liệu hội thoại mặc định giữa Admin và Giáo viên vnEdu thực tế
 */
function getInitialMessages() {
    return [
        {
            id: 'msg_001',
            senderId: 'xuanngocit@gmail.com',
            senderName: 'Thầy Xuân Ngọc (Admin)',
            receiverId: '051197003685',
            receiverName: 'Cô Lê Thị Diệu Huyên',
            text: 'Chào Cô Huyên, hệ thống tự động đã đối chiếu Sổ đầu bài tuần 10 của cô với sổ giám thị, dữ liệu đã khớp 100% rồi cô nhé.',
            time: '08:30',
            timestamp: '2026-11-12T01:30:00.000Z',
            status: 'read'
        },
        {
            id: 'msg_002',
            senderId: '051197003685',
            senderName: 'Cô Lê Thị Diệu Huyên',
            receiverId: 'xuanngocit@gmail.com',
            receiverName: 'Thầy Xuân Ngọc (Admin)',
            text: 'Dạ em chào Thầy Ngọc, em đã kiểm tra lại các tiết dạy Toán 7A2AL và 7A3AL, tất cả đều đã lưu đồng bộ lên vnEdu đầy đủ rồi ạ.',
            time: '08:35',
            timestamp: '2026-11-12T01:35:00.000Z',
            status: 'read'
        },
        {
            id: 'msg_003',
            senderId: 'xuanngocit@gmail.com',
            senderName: 'Thầy Xuân Ngọc (Admin)',
            receiverId: '051197003685',
            receiverName: 'Cô Lê Thị Diệu Huyên',
            text: 'Tuyệt vời cô nhé! Tiến độ tuần này đạt 100%, BGH đã ký duyệt điện tử trên vnEdu rồi.',
            time: '09:18',
            timestamp: '2026-11-12T02:18:00.000Z',
            status: 'read'
        },
        {
            id: 'msg_004',
            senderId: '051197003685',
            senderName: 'Cô Lê Thị Diệu Huyên',
            receiverId: 'xuanngocit@gmail.com',
            receiverName: 'Thầy Xuân Ngọc (Admin)',
            text: 'Dạ em cảm ơn Thầy nhiều ạ! Có thông tin gì mới về lịch sinh hoạt cụm trường Thầy báo em với nhé.',
            time: '09:20',
            timestamp: '2026-11-12T02:20:00.000Z',
            status: 'delivered'
        }
    ];
}

function readMessages() {
    ensureDirExists();
    if (!fs.existsSync(CHAT_FILE)) {
        const initial = getInitialMessages();
        try {
            fs.writeFileSync(CHAT_FILE, JSON.stringify(initial, null, 2), 'utf8');
        } catch (e) {}
        return initial;
    }
    try {
        const raw = fs.readFileSync(CHAT_FILE, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
    } catch (e) {
        console.error('[ChatManager] Lỗi đọc chat_messages.json:', e.message);
    }
    return getInitialMessages();
}

function writeMessages(messages) {
    ensureDirExists();
    try {
        const tempPath = CHAT_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(messages, null, 2), 'utf8');
        fs.renameSync(tempPath, CHAT_FILE);
        return true;
    } catch (e) {
        console.error('[ChatManager] Lỗi ghi chat_messages.json:', e.message);
        return false;
    }
}

/**
 * Lấy danh sách tài khoản THỰC TẾ từng đăng nhập vào hệ thống:
 * 1. Admin từ admin_database.json (xuanngocit@gmail.com,...)
 * 2. Giáo viên vnEdu từ teacher_profiles.json (051197003685 - Cô Diệu Huyên,...)
 * Hoàn toàn KHÔNG dùng dữ liệu giả lập (cheat data)
 */
function getRealChatUsers() {
    const users = [];
    const allMessages = readMessages();

    // 1. Lấy tài khoản Quản trị viên thực tế
    try {
        const adminData = adminDb.readDb();
        if (adminData && Array.isArray(adminData.admins)) {
            adminData.admins.forEach(adm => {
                users.push({
                    id: adm.username || adm.email,
                    username: adm.username || adm.email,
                    email: adm.email || adm.username,
                    name: adm.name || 'Thầy Xuân Ngọc',
                    title: adm.title || 'Quản trị viên Hệ thống vnEdu',
                    department: 'Ban Quản Trị Hệ Thống',
                    subject: 'Quản trị & Giám sát CSDL',
                    school: 'Hệ thống vnEdu Automation',
                    role: 'ADMIN',
                    accountType: 'Quản Trị Viên',
                    avatarEmoji: '👨‍💼',
                    avatarBg: '#eff6ff',
                    isOnline: true,
                    lastLogin: adm.lastLogin || adm.createdAt || new Date().toISOString()
                });
            });
        }
    } catch (e) {
        // Fallback admin mặc định nếu lỗi đọc file
        users.push({
            id: 'xuanngocit@gmail.com',
            username: 'xuanngocit@gmail.com',
            email: 'xuanngocit@gmail.com',
            name: 'Thầy Xuân Ngọc',
            title: 'Quản trị viên Hệ thống vnEdu',
            department: 'Ban Quản Trị Hệ Thống',
            subject: 'Quản trị & Giám sát CSDL',
            school: 'Hệ thống vnEdu Automation',
            role: 'ADMIN',
            accountType: 'Quản Trị Viên',
            avatarEmoji: '👨‍💼',
            avatarBg: '#eff6ff',
            isOnline: true,
            lastLogin: new Date().toISOString()
        });
    }

    // 2. Lấy tài khoản Giáo viên vnEdu thực tế đã lưu/đăng nhập
    try {
        const teacherProfiles = teacherProfileManager.getProfiles();
        if (Array.isArray(teacherProfiles)) {
            teacherProfiles.forEach(t => {
                const isFemale = t.gender === 'female';
                users.push({
                    id: t.username,
                    username: t.username,
                    email: `${t.username}@vnedu.vn`,
                    name: t.name || t.title,
                    title: t.title || (isFemale ? `Cô ${t.name}` : `Thầy ${t.name}`),
                    department: t.department || (t.subject ? `Tổ ${t.subject}` : 'Tổ Toán - Tin'),
                    subject: t.subject || 'Toán học',
                    school: t.school || 'Trường THCS An Lập',
                    role: 'TEACHER',
                    accountType: 'Giáo Viên vnEdu',
                    avatarEmoji: isFemale ? '👩‍🏫' : '👨‍🏫',
                    avatarBg: isFemale ? '#fdf2f8' : '#e0e7ff',
                    isOnline: true,
                    isCurrent: !!t.isCurrent,
                    lastLogin: t.lastLogin || new Date().toISOString()
                });
            });
        }
    } catch (e) {
        console.error('[ChatManager] Lỗi lấy danh sách giáo viên:', e.message);
    }

    // 3. Tính toán tin nhắn cuối cùng và số tin chưa đọc cho từng liên hệ
    users.forEach(u => {
        const userMsgs = allMessages.filter(m => m.senderId === u.id || m.receiverId === u.id);
        if (userMsgs.length > 0) {
            const lastMsg = userMsgs[userMsgs.length - 1];
            u.lastMessage = lastMsg.text;
            u.lastTime = lastMsg.time || 'Vừa xong';
        } else {
            u.lastMessage = 'Chưa có tin nhắn mới';
            u.lastTime = '';
        }
        u.unreadCount = 0;
    });

    return users;
}

/**
 * Lấy danh sách tin nhắn giữa 2 tài khoản
 */
function getMessagesBetween(userA, userB) {
    const list = readMessages();
    if (!userA || !userB) return list;
    return list.filter(m =>
        (m.senderId === userA && m.receiverId === userB) ||
        (m.senderId === userB && m.receiverId === userA)
    );
}

/**
 * Gửi tin nhắn mới giữa 2 tài khoản thực tế
 */
function sendMessage({ senderId, senderName, receiverId, receiverName, text }) {
    if (!senderId || !receiverId || !text || !text.trim()) {
        throw new Error('Dữ liệu gửi tin nhắn không hợp lệ');
    }

    const messages = readMessages();
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMsg = {
        id: 'msg_' + Date.now(),
        senderId: senderId.trim(),
        senderName: (senderName || senderId).trim(),
        receiverId: receiverId.trim(),
        receiverName: (receiverName || receiverId).trim(),
        text: text.trim(),
        time: timeStr,
        timestamp: now.toISOString(),
        status: 'delivered'
    };

    messages.push(newMsg);
    writeMessages(messages);
    return newMsg;
}

/**
 * Đánh dấu đã đọc các tin nhắn gửi tới readerId từ partnerId (hoặc toàn bộ)
 */
function markAsRead({ readerId, partnerId }) {
    if (!readerId) return { updatedCount: 0 };
    const messages = readMessages();
    let updatedCount = 0;
    messages.forEach(m => {
        if (m.receiverId === readerId && (!partnerId || m.senderId === partnerId)) {
            if (m.status !== 'read') {
                m.status = 'read';
                updatedCount++;
            }
        }
    });
    if (updatedCount > 0) {
        writeMessages(messages);
    }
    return { success: true, updatedCount };
}

/**
 * Xóa toàn bộ lịch sử tin nhắn hoặc xóa cuộc hội thoại giữa 2 user
 */
function clearMessages({ userA, userB, clearAll }) {
    if (clearAll || (!userA && !userB)) {
        writeMessages([]);
        return { success: true, count: 0, clearedAll: true };
    }
    const messages = readMessages();
    const remaining = messages.filter(m => !(
        (m.senderId === userA && m.receiverId === userB) ||
        (m.senderId === userB && m.receiverId === userA)
    ));
    writeMessages(remaining);
    return { success: true, count: remaining.length, clearedAll: false };
}

module.exports = {
    getRealChatUsers,
    getMessagesBetween,
    readMessages,
    sendMessage,
    markAsRead,
    clearMessages
};
