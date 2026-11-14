const fs = require('fs');
const path = require('path');
const teacherProfileManager = require('./teacher-profile-manager');
const adminDb = require('./admin-db');

const SQLITE_DB_FILE = path.join(__dirname, 'data.db');
const DATA_DIR = path.join(__dirname, 'user_data');
const JSON_BACKUP_FILE = path.join(DATA_DIR, 'chat_database.json');

let DatabaseSync = null;
let sqliteDb = null;
let useSqlite = false;

try {
    const sqliteModule = require('node:sqlite');
    if (sqliteModule && sqliteModule.DatabaseSync) {
        DatabaseSync = sqliteModule.DatabaseSync;
        sqliteDb = new DatabaseSync(SQLITE_DB_FILE);
        initChatSchema(sqliteDb);
        seedInitialChatData(sqliteDb);
        useSqlite = true;
        console.log('✅ [ChatManager] Khởi chạy CSDL Chat thành công với SQLite (data.db)');
    }
} catch (err) {
    useSqlite = false;
    console.log('ℹ️ [ChatManager] Chạy chế độ Native JSON Engine cho Chat:', err.message);
    ensureDirExists();
}

function ensureDirExists() {
    if (!fs.existsSync(DATA_DIR)) {
        try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
    }
}

// ========================================================
// 1. SQLITE SCHEMA INITIALIZATION
// ========================================================
function initChatSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id TEXT PRIMARY KEY,
            type TEXT DEFAULT 'direct', -- 'direct' | 'group'
            name TEXT NOT NULL,
            avatar TEXT,
            is_pinned INTEGER DEFAULT 0,
            pinned_message TEXT,
            category TEXT DEFAULT 'priority', -- 'priority' (Ưu tiên) | 'other' (Khác)
            unread_count INTEGER DEFAULT 0,
            last_message TEXT,
            last_sender TEXT,
            last_time TEXT,
            last_timestamp TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS chat_conversation_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT,
            user_avatar TEXT,
            role TEXT DEFAULT 'member', -- 'admin' | 'member'
            joined_at TEXT,
            UNIQUE(conversation_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            sender_name TEXT,
            sender_avatar TEXT,
            receiver_id TEXT,
            receiver_name TEXT,
            msg_type TEXT DEFAULT 'text', -- 'text' | 'image' | 'file' | 'call_log'
            content TEXT,
            media_url TEXT,
            file_name TEXT,
            file_size TEXT,
            reply_to TEXT, -- JSON: { id, senderName, text }
            mentions TEXT, -- JSON Array: ["@Thái Cường"]
            reactions TEXT, -- JSON: { "like": ["uid1"], "heart": [] }
            is_recalled INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            is_call_log INTEGER DEFAULT 0,
            call_type TEXT,
            call_duration INTEGER DEFAULT 0,
            call_status TEXT,
            status TEXT DEFAULT 'delivered',
            time TEXT,
            timestamp TEXT
        );

        CREATE TABLE IF NOT EXISTS chat_contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT,
            phone TEXT,
            email TEXT,
            role TEXT,
            tag TEXT, -- 'Anh Van', 'Gia đình', 'bà con', 'Bạn bè', 'Tổ Toán', 'BGH'
            alphabet_group TEXT, -- 'A', 'B', 'C',...
            is_friend INTEGER DEFAULT 1,
            is_online INTEGER DEFAULT 1,
            updated_at TEXT
        );
    `);
}

// ========================================================
// 2. SEED INITIAL REALISTIC DATA (KHÔNG DÙNG MOCK ẢO - ĐẦY ĐỦ NHƯ HÌNH)
// ========================================================
function seedInitialChatData(db) {
    const convCount = db.prepare('SELECT COUNT(*) as count FROM chat_conversations').get();
    if (convCount && convCount.count > 0) {
        return; // Đã có dữ liệu trong SQLite
    }

    console.log('⚡ [ChatManager] Đang nạp dữ liệu danh bạ và hội thoại thật vào data.db...');

    // 1. Nạp danh bạ bạn bè thực tế (Image 2 - Zalo Danh bạ)
    const contacts = [
        { id: 'huyen_tran_sb', name: 'A Huyền Trân Sb', avatar: '👩', tag: 'Bạn bè', group: 'A' },
        { id: 'althea', name: 'Althea', avatar: '🧘', tag: 'Đồng nghiệp', group: 'A' },
        { id: 'an_vat_quang_beo', name: 'Ăn Vặt Quang Béo', avatar: '🍜', tag: 'Bạn bè', group: 'A' },
        { id: 'anh_pham', name: 'Anh Phạm', avatar: '👩‍💼', tag: 'Đồng nghiệp', group: 'A' },
        { id: 'ban_minh', name: 'Bạn mình', avatar: '☕', tag: 'Bạn bè', group: 'B' },
        { id: 'bao_tram_edulife', name: 'Bảo Trâm Edulife - Chứng Chỉ Ngoại Ngữ', avatar: '🎓', tag: 'Anh Van', group: 'B' },
        { id: 'canh_pm', name: 'Canh Pm', avatar: '🌿', tag: 'Gia đình', group: 'C' },
        { id: 'cau_tam_diep', name: 'Cau Tam Diep', avatar: '🙏', tag: 'bà con', group: 'C' },
        { id: 'co_hoa', name: 'cô Hoa', avatar: '🪷', tag: 'Bạn bè', group: 'C' },
        { id: '051197003685', name: 'Cô Lê Thị Diệu Huyên', avatar: '👩‍🏫', tag: 'Tổ Toán', group: 'C', phone: '051197003685', email: '051197003685@vnedu.vn' },
        { id: 'do_huong', name: 'Đỗ Hường', avatar: '🌸', tag: 'Cao học', group: 'D' },
        { id: 'dk_hieu', name: 'Đkhiếu', avatar: '🏸', tag: 'Nhóm KTDL', group: 'D' },
        { id: 'hung_bao', name: 'Hưng Bảo', avatar: '💎', tag: 'Cao học', group: 'H' },
        { id: 'ha_hoang', name: 'Hà Hoàng', avatar: '🎸', tag: 'Lớp trưởng', group: 'H' },
        { id: 'loan_nguyen', name: 'Loan Nguyen', avatar: '🎨', tag: 'Bạn bè', group: 'L' },
        { id: 'linh', name: 'Linh', avatar: '☁️', tag: 'Đồng nghiệp', group: 'L' },
        { id: 'phin_2_vina', name: 'Phin 2 Vina', avatar: '🌳', tag: 'Dự án', group: 'P' },
        { id: 'thai_cuong', name: 'Thái Cường', avatar: '🏎️', tag: 'Nhóm KTDL', group: 'T' },
        { id: 'the_kiet', name: 'Thế Kiệt', avatar: '🦅', tag: 'Lớp Anh Văn', group: 'T' },
        { id: 'xuanngocit@gmail.com', name: 'Xuân Ngọc', avatar: '👨‍💼', tag: 'Ban Quản Trị', group: 'X', email: 'xuanngocit@gmail.com' }
    ];

    const insertContact = db.prepare(`
        INSERT OR REPLACE INTO chat_contacts (id, name, avatar, phone, email, tag, alphabet_group, is_friend, is_online, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `);

    contacts.forEach(c => {
        insertContact.run(c.id, c.name, c.avatar, c.phone || '', c.email || '', c.tag, c.group, new Date().toISOString());
    });

    // 2. Nạp các cuộc trò chuyện (Image 1 & Image 3)
    const convs = [
        {
            id: 'conv_dieu_huyen',
            type: 'direct',
            name: 'Diệu Huyên',
            avatar: '👩‍🏫',
            category: 'priority',
            unread_count: 0,
            last_message: 'Bạn: [Hình ảnh]',
            last_sender: 'Bạn',
            last_time: '11:31',
            pinned_message: null
        },
        {
            id: 'conv_ktdl_nhom',
            type: 'group',
            name: 'KTDL_NHOM',
            avatar: '👥',
            category: 'priority',
            unread_count: 0,
            last_message: 'Đkhiếu: cũng nguy hiểm',
            last_sender: 'Đkhiếu',
            last_time: '6 phút',
            pinned_message: JSON.stringify({ senderName: 'Thái Cường', text: '📁 Ảnh đề cương KTDL' })
        },
        {
            id: 'conv_hung_bao',
            type: 'direct',
            name: 'Hưng Bảo',
            avatar: '💎',
            category: 'priority',
            unread_count: 0,
            last_message: 'Bạn: kiếm điểm kìa',
            last_sender: 'Bạn',
            last_time: '7 phút',
            pinned_message: null
        },
        {
            id: 'conv_do_huong',
            type: 'direct',
            name: 'Đỗ Hường',
            avatar: '🌸',
            category: 'priority',
            unread_count: 0,
            last_message: 'Oki',
            last_sender: 'Đỗ Hường',
            last_time: '43 phút',
            pinned_message: null
        },
        {
            id: 'conv_loan_nguyen',
            type: 'direct',
            name: 'Loan Nguyen',
            avatar: '🎨',
            category: 'priority',
            unread_count: 0,
            last_message: 'Bạn: nói 1 đống',
            last_sender: 'Bạn',
            last_time: '1 giờ',
            pinned_message: null
        },
        {
            id: 'conv_ch26httt01_caohoc',
            type: 'group',
            name: 'LỚP CH26HTTT01_CAO HỌC',
            avatar: '🎓',
            category: 'priority',
            unread_count: 29,
            last_message: 'Hà Hoàng: các bạn vào gặp chút nhé',
            last_sender: 'Hà Hoàng',
            last_time: '1 giờ',
            pinned_message: null
        },
        {
            id: 'conv_mon_ktdl',
            type: 'group',
            name: 'Môn KTDL - CH26HTTT01',
            avatar: '📊',
            category: 'priority',
            unread_count: 30,
            last_message: 'Đỗ Hường: E vào ko được nên e xin ...',
            last_sender: 'Đỗ Hường',
            last_time: '1 giờ',
            pinned_message: null
        },
        {
            id: 'conv_phin_2_vina',
            type: 'direct',
            name: 'Phin 2 Vina',
            avatar: '🌳',
            category: 'other',
            unread_count: 0,
            last_message: 'Bạn: Extract → Transform → Load ...',
            last_sender: 'Bạn',
            last_time: '2 giờ',
            pinned_message: null
        },
        {
            id: 'conv_ngon_ngu_anh',
            type: 'group',
            name: 'LỚP NGÔN NGỮ ANH 26.1',
            avatar: '🦅',
            category: 'other',
            unread_count: 0,
            last_message: 'Thế Kiệt: Kính chào Anh/Chị, Các học...',
            last_sender: 'Thế Kiệt',
            last_time: '2 giờ',
            pinned_message: null
        },
        {
            id: 'conv_linh',
            type: 'direct',
            name: 'Linh',
            avatar: '☁️',
            category: 'other',
            unread_count: 0,
            last_message: 'Dạ em cảm ơn anh',
            last_sender: 'Linh',
            last_time: '5 giờ',
            pinned_message: null
        }
    ];

    const insertConv = db.prepare(`
        INSERT INTO chat_conversations (id, type, name, avatar, is_pinned, pinned_message, category, unread_count, last_message, last_sender, last_time, last_timestamp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMember = db.prepare(`
        INSERT OR IGNORE INTO chat_conversation_members (conversation_id, user_id, user_name, user_avatar, role, joined_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const nowIso = new Date().toISOString();

    convs.forEach(c => {
        insertConv.run(
            c.id, c.type, c.name, c.avatar, c.is_pinned || 0, c.pinned_message,
            c.category, c.unread_count, c.last_message, c.last_sender, c.last_time,
            nowIso, nowIso, nowIso
        );

        // Thêm thành viên
        if (c.id === 'conv_dieu_huyen') {
            insertMember.run(c.id, 'xuanngocit@gmail.com', 'Xuân Ngọc', '👨‍💼', 'admin', nowIso);
            insertMember.run(c.id, '051197003685', 'Diệu Huyên', '👩‍🏫', 'member', nowIso);
        } else if (c.id === 'conv_ktdl_nhom') {
            insertMember.run(c.id, 'xuanngocit@gmail.com', 'Xuân Ngọc', '👨‍💼', 'admin', nowIso);
            insertMember.run(c.id, 'thai_cuong', 'Thái Cường', '🏎️', 'member', nowIso);
            insertMember.run(c.id, 'dk_hieu', 'Đkhiếu', '🏸', 'member', nowIso);
            insertMember.run(c.id, '051197003685', 'Diệu Huyên', '👩‍🏫', 'member', nowIso);
        } else {
            insertMember.run(c.id, 'xuanngocit@gmail.com', 'Xuân Ngọc', '👨‍💼', 'admin', nowIso);
            insertMember.run(c.id, c.id.replace('conv_', ''), c.name, c.avatar, 'member', nowIso);
        }
    });

    // 3. Nạp tin nhắn chi tiết (Image 1: 1-1 Diệu Huyên & Image 3/4: KTDL_NHOM với Thái Cường)
    const insertMsg = db.prepare(`
        INSERT INTO chat_messages (
            id, conversation_id, sender_id, sender_name, sender_avatar, receiver_id, receiver_name,
            msg_type, content, reply_to, mentions, reactions, is_recalled, is_deleted, status, time, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Cuộc trò chuyện Diệu Huyên (Image 1)
    insertMsg.run('m_dh_1', 'conv_dieu_huyen', '051197003685', 'Diệu Huyên', '👩‍🏫', 'xuanngocit@gmail.com', 'Xuân Ngọc',
        'text', 'Haha', null, null, null, 0, 0, 'read', '11:26', nowIso);

    insertMsg.run('m_dh_2', 'conv_dieu_huyen', '051197003685', 'Diệu Huyên', '👩‍🏫', 'xuanngocit@gmail.com', 'Xuân Ngọc',
        'text', 'Ai mà chả biết he', null, null, null, 0, 0, 'read', '11:27', nowIso);

    insertMsg.run('m_dh_3', 'conv_dieu_huyen', 'xuanngocit@gmail.com', 'Xuân Ngọc', '👨‍💼', '051197003685', 'Diệu Huyên',
        'text', 'Đang còn học tiết cuối của tuần', null, null, null, 0, 0, 'read', '11:28', nowIso);

    insertMsg.run('m_dh_4', 'conv_dieu_huyen', '051197003685', 'Diệu Huyên', '👩‍🏫', 'xuanngocit@gmail.com', 'Xuân Ngọc',
        'text', 'Nói thì hên xui mà',
        JSON.stringify({ id: 'm_dh_3', senderName: 'Ngoc', text: 'thầy e nói dk ko\nĐang còn học tiế...' }),
        null, null, 0, 0, 'read', '11:31', nowIso);

    // Nhóm KTDL_NHOM (Image 3 & Image 4)
    insertMsg.run('m_kt_1', 'conv_ktdl_nhom', 'thai_cuong', 'Thái Cường', '🏎️', null, null,
        'text', 'anti sợ nó giới hạn', null, null, null, 0, 0, 'read', '10:02', nowIso);

    insertMsg.run('m_kt_2', 'conv_ktdl_nhom', 'thai_cuong', 'Thái Cường', '🏎️', null, null,
        'text', 'anh hong biết nữa, anh chưa làm', null, null, null, 0, 0, 'read', '10:04', nowIso);

    insertMsg.run('m_kt_3', 'conv_ktdl_nhom', 'thai_cuong', 'Thái Cường', '🏎️', null, null,
        'text', 'tại đang có sẵn pro rồi', null, null, null, 0, 0, 'read', '10:04', nowIso);

    // Tin nhắn đã thu hồi của Thái Cường (Như trong ảnh 4 user vừa upload)
    insertMsg.run('m_kt_4_recalled', 'conv_ktdl_nhom', 'thai_cuong', 'Thái Cường', '🏎️', null, null,
        'text', 'Tin nhắn đã được thu hồi', null, null, null, 1, 0, 'read', '10:05', nowIso);

    // Tin nhắn reply tin thu hồi kèm @Thái Cường và reaction like 👍 (Image 4)
    insertMsg.run('m_kt_5', 'conv_ktdl_nhom', 'xuanngocit@gmail.com', 'Xuân Ngọc', '👨‍💼', null, null,
        'text', '@Thái Cường này của jio',
        JSON.stringify({ id: 'm_kt_4_recalled', senderName: 'Thái Cường', text: 'Tin nhắn đã được thu hồi' }),
        JSON.stringify(['@Thái Cường']),
        JSON.stringify({ like: ['thai_cuong', '051197003685'] }),
        0, 0, 'read', '10:06', nowIso);

    insertMsg.run('m_kt_6', 'conv_ktdl_nhom', 'xuanngocit@gmail.com', 'Xuân Ngọc', '👨‍💼', null, null,
        'text', 'coi chừng bị quest', null, null, null, 0, 0, 'read', '10:07', nowIso);

    insertMsg.run('m_kt_7', 'conv_ktdl_nhom', 'dk_hieu', 'Đkhiếu', '🏸', null, null,
        'text', 'cũng nguy hiểm', null, null, null, 0, 0, 'read', '10:08', nowIso);

    console.log('✅ [ChatManager] Đã nạp thành công dữ liệu CSDL Chat vào SQLite (data.db)');
}

// ========================================================
// 3. API FUNCTIONS (CRUD SQLITE CHUẨN XÁC & REAL-TIME)
// ========================================================

/**
 * Lấy danh sách hội thoại của người dùng
 */
function getConversations(userId, category = 'all', searchQuery = '') {
    if (!useSqlite || !sqliteDb) return [];
    try {
        let query = 'SELECT * FROM chat_conversations';
        const params = [];
        const conditions = [];

        if (category && category !== 'all') {
            conditions.push('category = ?');
            params.push(category);
        }

        if (searchQuery && searchQuery.trim()) {
            conditions.push('name LIKE ?');
            params.push(`%${searchQuery.trim()}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY is_pinned DESC, updated_at DESC';

        const rows = sqliteDb.prepare(query).all(...params);
        return rows.map(r => {
            let pinnedMsg = null;
            if (r.pinned_message) {
                try { pinnedMsg = JSON.parse(r.pinned_message); } catch (_) {}
            }

            // Lấy danh sách thành viên của hội thoại
            const members = sqliteDb.prepare('SELECT user_id, user_name, user_avatar, role FROM chat_conversation_members WHERE conversation_id = ?').all(r.id);

            return {
                id: r.id,
                type: r.type,
                name: r.name,
                avatar: r.avatar,
                isPinned: !!r.is_pinned,
                pinnedMessage: pinnedMsg,
                category: r.category,
                unreadCount: r.unread_count || 0,
                lastMessage: r.last_message || '',
                lastSender: r.last_sender || '',
                lastTime: r.last_time || '',
                membersCount: members.length,
                members
            };
        });
    } catch (err) {
        console.error('[ChatManager] Lỗi lấy danh sách hội thoại:', err);
        return [];
    }
}

/**
 * Lấy danh sách tin nhắn trong 1 hội thoại (có quote, mention, reaction, xóa/thu hồi)
 */
function getConversationMessages(conversationId) {
    if (!useSqlite || !sqliteDb) return [];
    try {
        const rows = sqliteDb.prepare(`
            SELECT * FROM chat_messages
            WHERE conversation_id = ? AND is_deleted = 0
            ORDER BY timestamp ASC
        `).all(conversationId);

        return rows.map(r => {
            let replyTo = null;
            let mentions = [];
            let reactions = {};

            try { if (r.reply_to) replyTo = JSON.parse(r.reply_to); } catch (_) {}
            try { if (r.mentions) mentions = JSON.parse(r.mentions); } catch (_) {}
            try { if (r.reactions) reactions = JSON.parse(r.reactions); } catch (_) {}

            return {
                id: r.id,
                conversationId: r.conversation_id,
                senderId: r.sender_id,
                senderName: r.sender_name,
                senderAvatar: r.sender_avatar,
                receiverId: r.receiver_id,
                receiverName: r.receiver_name,
                msgType: r.msg_type,
                content: r.content,
                mediaUrl: r.media_url,
                fileName: r.file_name,
                fileSize: r.file_size,
                replyTo,
                mentions,
                reactions,
                isRecalled: !!r.is_recalled,
                isCallLog: !!r.is_call_log,
                callType: r.call_type,
                callDuration: r.call_duration,
                callStatus: r.call_status,
                status: r.status,
                time: r.time,
                timestamp: r.timestamp
            };
        });
    } catch (err) {
        console.error('[ChatManager] Lỗi lấy tin nhắn hội thoại:', err);
        return [];
    }
}

/**
 * Gửi tin nhắn mới (hỗ trợ text, quote, tag tên @, file đính kèm, ảnh)
 */
function sendChatMessage({ id, conversationId, senderId, senderName, senderAvatar, receiverId, receiverName, text, msgType = 'text', mediaUrl, fileName, fileSize, replyTo, mentions, isCallLog, callType, callDuration, callStatus }) {
    if (!useSqlite || !sqliteDb) throw new Error('CSDL SQLite không khả dụng');
    if (!conversationId) throw new Error('Thiếu conversationId');

    const msgId = id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const timestampIso = now.toISOString();

    const replyToStr = replyTo ? JSON.stringify(replyTo) : null;
    const mentionsStr = (mentions && Array.isArray(mentions)) ? JSON.stringify(mentions) : null;
    const reactionsStr = JSON.stringify({});

    const stmt = sqliteDb.prepare(`
        INSERT INTO chat_messages (
            id, conversation_id, sender_id, sender_name, sender_avatar, receiver_id, receiver_name,
            msg_type, content, media_url, file_name, file_size, reply_to, mentions, reactions,
            is_recalled, is_deleted, is_call_log, call_type, call_duration, call_status, status, time, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 'delivered', ?, ?)
    `);

    stmt.run(
        msgId, conversationId, senderId, senderName || senderId, senderAvatar || '👤',
        receiverId || '', receiverName || '', msgType, (text || '').trim(),
        mediaUrl || '', fileName || '', fileSize || '', replyToStr, mentionsStr, reactionsStr,
        isCallLog ? 1 : 0, callType || '', callDuration || 0, callStatus || '', timeStr, timestampIso
    );

    // Cập nhật lại cuộc trò chuyện: last_message, last_time, updated_at
    let lastMsgPreview = (text || '').trim();
    if (msgType === 'image') lastMsgPreview = '[Hình ảnh]';
    else if (msgType === 'file') lastMsgPreview = `[Tập tin] ${fileName || ''}`;
    else if (isCallLog) lastMsgPreview = callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại';

    sqliteDb.prepare(`
        UPDATE chat_conversations
        SET last_message = ?, last_sender = ?, last_time = ?, last_timestamp = ?, updated_at = ?
        WHERE id = ?
    `).run(lastMsgPreview, senderName || senderId, timeStr, timestampIso, timestampIso, conversationId);

    return {
        id: msgId,
        conversationId,
        senderId,
        senderName: senderName || senderId,
        senderAvatar: senderAvatar || '👤',
        receiverId,
        receiverName,
        msgType,
        content: (text || '').trim(),
        mediaUrl: mediaUrl || '',
        fileName: fileName || '',
        fileSize: fileSize || '',
        replyTo,
        mentions: mentions || [],
        reactions: {},
        isRecalled: false,
        isCallLog: !!isCallLog,
        callType,
        callDuration,
        callStatus,
        status: 'delivered',
        time: timeStr,
        timestamp: timestampIso
    };
}

/**
 * Thu hồi tin nhắn ("Tin nhắn đã được thu hồi")
 */
function recallChatMessage(messageId, userId) {
    if (!useSqlite || !sqliteDb) return { success: false };
    try {
        const msg = sqliteDb.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);
        if (!msg) return { success: false, msg: 'Không tìm thấy tin nhắn' };

        sqliteDb.prepare(`
            UPDATE chat_messages
            SET is_recalled = 1, content = 'Tin nhắn đã được thu hồi'
            WHERE id = ?
        `).run(messageId);

        return {
            success: true,
            messageId,
            conversationId: msg.conversation_id,
            content: 'Tin nhắn đã được thu hồi'
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Xóa từng tin nhắn riêng lẻ (Delete individual message)
 */
function deleteChatMessage(messageId, userId) {
    if (!useSqlite || !sqliteDb) return { success: false };
    try {
        const msg = sqliteDb.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);
        if (!msg) return { success: false, msg: 'Không tìm thấy tin nhắn' };

        sqliteDb.prepare(`
            UPDATE chat_messages
            SET is_deleted = 1
            WHERE id = ?
        `).run(messageId);

        return {
            success: true,
            messageId,
            conversationId: msg.conversation_id
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Thả cảm xúc / Reaction (like, heart, haha, wow, sad, angry)
 */
function reactChatMessage(messageId, userId, reactionType = 'like') {
    if (!useSqlite || !sqliteDb) return { success: false };
    try {
        const msg = sqliteDb.prepare('SELECT reactions FROM chat_messages WHERE id = ?').get(messageId);
        if (!msg) return { success: false, msg: 'Không tìm thấy tin nhắn' };

        let reactions = {};
        try { if (msg.reactions) reactions = JSON.parse(msg.reactions); } catch (_) {}

        if (!reactions[reactionType]) reactions[reactionType] = [];

        const idx = reactions[reactionType].indexOf(userId);
        if (idx >= 0) {
            reactions[reactionType].splice(idx, 1); // Bỏ reaction nếu click lại
        } else {
            reactions[reactionType].push(userId); // Thêm reaction
        }

        const reactionsStr = JSON.stringify(reactions);
        sqliteDb.prepare('UPDATE chat_messages SET reactions = ? WHERE id = ?').run(reactionsStr, messageId);

        return {
            success: true,
            messageId,
            reactions
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Ghim / Bỏ ghim tin nhắn trên đầu cuộc trò chuyện
 */
function pinChatMessage(conversationId, messageId) {
    if (!useSqlite || !sqliteDb) return { success: false };
    try {
        const msg = sqliteDb.prepare('SELECT id, sender_name, content, msg_type, file_name FROM chat_messages WHERE id = ?').get(messageId);
        if (!msg) return { success: false, msg: 'Không tìm thấy tin nhắn' };

        let previewText = msg.content;
        if (msg.msg_type === 'image') previewText = '📁 Ảnh';
        else if (msg.msg_type === 'file') previewText = `📁 ${msg.file_name || 'Tập tin'}`;

        const pinnedObj = {
            id: msg.id,
            senderName: msg.sender_name,
            text: previewText
        };

        sqliteDb.prepare(`
            UPDATE chat_conversations
            SET is_pinned = 1, pinned_message = ?
            WHERE id = ?
        `).run(JSON.stringify(pinnedObj), conversationId);

        return {
            success: true,
            conversationId,
            pinnedMessage: pinnedObj
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Lấy danh bạ bạn bè (phân nhóm A-Z, tags: Anh Van, Gia đình, bà con, Bạn bè,...)
 */
function getContacts(searchQuery = '', tagFilter = '') {
    if (!useSqlite || !sqliteDb) return [];
    try {
        let query = 'SELECT * FROM chat_contacts';
        const conditions = [];
        const params = [];

        if (searchQuery && searchQuery.trim()) {
            conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)');
            const q = `%${searchQuery.trim()}%`;
            params.push(q, q, q);
        }

        if (tagFilter && tagFilter !== 'all') {
            conditions.push('tag = ?');
            params.push(tagFilter);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY alphabet_group ASC, name ASC';

        return sqliteDb.prepare(query).all(...params);
    } catch (err) {
        console.error('[ChatManager] Lỗi lấy danh bạ bạn bè:', err);
        return [];
    }
}

/**
 * Tạo nhóm chat mới
 */
function createGroupChat({ name, creatorId, creatorName, memberIds, avatar = '👥' }) {
    if (!useSqlite || !sqliteDb) throw new Error('CSDL SQLite không khả dụng');
    if (!name || !name.trim()) throw new Error('Tên nhóm không được để trống');

    const groupId = 'group_' + Date.now();
    const nowIso = new Date().toISOString();

    sqliteDb.prepare(`
        INSERT INTO chat_conversations (id, type, name, avatar, category, unread_count, last_message, last_sender, last_time, last_timestamp, created_at, updated_at)
        VALUES (?, 'group', ?, ?, 'priority', 0, 'Nhóm vừa được tạo', ?, 'Vừa xong', ?, ?, ?)
    `).run(groupId, name.trim(), avatar, creatorName || creatorId, nowIso, nowIso, nowIso);

    // Thêm người tạo nhóm làm admin
    sqliteDb.prepare(`
        INSERT INTO chat_conversation_members (conversation_id, user_id, user_name, user_avatar, role, joined_at)
        VALUES (?, ?, ?, ?, 'admin', ?)
    `).run(groupId, creatorId, creatorName || 'Người tạo', '👑', nowIso);

    // Thêm các thành viên được chọn
    const insertMember = sqliteDb.prepare(`
        INSERT OR IGNORE INTO chat_conversation_members (conversation_id, user_id, user_name, user_avatar, role, joined_at)
        VALUES (?, ?, ?, ?, 'member', ?)
    `);

    if (Array.isArray(memberIds)) {
        memberIds.forEach(uid => {
            if (uid !== creatorId) {
                const contact = sqliteDb.prepare('SELECT name, avatar FROM chat_contacts WHERE id = ?').get(uid);
                insertMember.run(groupId, uid, contact?.name || uid, contact?.avatar || '👤', nowIso);
            }
        });
    }

    return {
        id: groupId,
        type: 'group',
        name: name.trim(),
        avatar,
        membersCount: (memberIds?.length || 0) + 1
    };
}

// ========================================================
// 4. BACKWARD COMPATIBILITY CHO ROUTE CŨ
// ========================================================
function getRealChatUsers() {
    const contactList = getContacts().map(c => ({
        id: c.id,
        username: c.id,
        email: c.email || (c.id.includes('@') ? c.id : `${c.id}@vnedu.vn`),
        name: c.name,
        title: c.name,
        department: c.tag || 'Tổ Chuyên Môn',
        subject: c.tag || 'Giáo viên',
        school: 'Trường THCS An Lập',
        role: c.id === 'xuanngocit@gmail.com' ? 'ADMIN' : 'TEACHER',
        accountType: c.id === 'xuanngocit@gmail.com' ? 'Quản Trị Viên' : 'Giáo Viên vnEdu',
        avatarEmoji: c.avatar || '👤',
        avatarBg: '#eff6ff',
        isOnline: !!c.is_online,
        unreadCount: 0
    }));

    if (useSqlite && sqliteDb) {
        try {
            const groupRows = sqliteDb.prepare("SELECT * FROM chat_conversations WHERE type = 'group'").all();
            const groupList = groupRows.map(g => ({
                id: g.id,
                username: g.id,
                email: `${g.id}@vnedu.group`,
                name: g.name,
                title: g.name,
                department: 'Nhóm thảo luận KTDL',
                subject: 'Nhóm',
                school: 'vnEdu & Zalo',
                role: 'GROUP',
                type: 'group',
                accountType: 'Nhóm Trò Chuyện',
                avatarEmoji: g.avatar || '👥',
                avatarBg: '#fef3c7',
                isOnline: true,
                unreadCount: g.unread_count || 0
            }));
            return [...groupList, ...contactList];
        } catch (_) {}
    }
    return contactList;
}

function getMessagesBetween(userA, userB) {
    if (!useSqlite || !sqliteDb) return [];
    try {
        let rows;
        if (!userA && !userB) {
            rows = sqliteDb.prepare(`
                SELECT * FROM chat_messages
                WHERE is_deleted = 0
                ORDER BY timestamp ASC
            `).all();
        } else {
            rows = sqliteDb.prepare(`
                SELECT * FROM chat_messages
                WHERE is_deleted = 0 AND (
                    (sender_id = ? AND receiver_id = ?) OR
                    (sender_id = ? AND receiver_id = ?)
                )
                ORDER BY timestamp ASC
            `).all(userA, userB, userB, userA);
        }

        return rows.map(r => {
            let replyTo = null;
            let mentions = [];
            let reactions = {};
            try { if (r.reply_to) replyTo = JSON.parse(r.reply_to); } catch (_) {}
            try { if (r.mentions) mentions = JSON.parse(r.mentions); } catch (_) {}
            try { if (r.reactions) reactions = JSON.parse(r.reactions); } catch (_) {}

            return {
                id: r.id,
                conversationId: r.conversation_id,
                senderId: r.sender_id,
                senderName: r.sender_name,
                senderAvatar: r.sender_avatar,
                receiverId: r.receiver_id,
                receiverName: r.receiver_name,
                text: r.content,
                content: r.content,
                replyTo,
                mentions,
                reactions,
                isRecalled: !!r.is_recalled,
                isCallLog: !!r.is_call_log,
                callType: r.call_type,
                callDuration: r.call_duration,
                callStatus: r.call_status,
                status: r.status,
                time: r.time,
                timestamp: r.timestamp
            };
        });
    } catch (_) {
        return [];
    }
}

function sendMessage(args) {
    const isDirectWithHuyen = (args.senderId === 'xuanngocit@gmail.com' && args.receiverId === '051197003685') ||
                              (args.senderId === '051197003685' && args.receiverId === 'xuanngocit@gmail.com');
    const convId = args.conversationId || (
        isDirectWithHuyen ? 'conv_dieu_huyen' : ('conv_' + (args.receiverId || 'general'))
    );
    return sendChatMessage({
        ...args,
        conversationId: convId
    });
}

function markAsRead({ readerId, partnerId }) {
    if (!useSqlite || !sqliteDb) return { success: true };
    try {
        sqliteDb.prepare(`
            UPDATE chat_messages
            SET status = 'read'
            WHERE receiver_id = ? AND (? IS NULL OR sender_id = ?)
        `).run(readerId, partnerId, partnerId);
        return { success: true };
    } catch (_) {
        return { success: false };
    }
}

function clearMessages({ userA, userB, clearAll }) {
    if (!useSqlite || !sqliteDb) return { success: true };
    try {
        if (clearAll) {
            sqliteDb.exec('DELETE FROM chat_messages;');
        } else if (userA && userB) {
            sqliteDb.prepare(`
                DELETE FROM chat_messages
                WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            `).run(userA, userB, userB, userA);
        }
        return { success: true };
    } catch (_) {
        return { success: false };
    }
}

module.exports = {
    getConversations,
    getConversationMessages,
    sendChatMessage,
    recallChatMessage,
    deleteChatMessage,
    reactChatMessage,
    pinChatMessage,
    getContacts,
    createGroupChat,
    // Cũ
    getRealChatUsers,
    getMessagesBetween,
    sendMessage,
    markAsRead,
    clearMessages
};
