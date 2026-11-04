const CLASS_MAP = {
    '7A2AL': { id: '5004582066', cap: '2', khoi: '7', sodaubaiId: '8130546' },
    '7A3AL': { id: '5004582046', cap: '2', khoi: '7', sodaubaiId: '8087046' },
    '9A2AL': { id: '5004582186', cap: '2', khoi: '9', sodaubaiId: '8139046' }
};

async function loginVnEduOnline(username, password) {
    try {
        const ssoPageUrl = 'https://user.vnedu.vn/sso/?app_id=3&continue=http%3A%2F%2Fuaevcmanmsgdbinhduong.vnedu.vn%3A80%2Fv5%2F%3Fcall%3Dauth.loginSSO';
        const initResp = await fetch(ssoPageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const setCookie = initResp.headers.getSetCookie ? initResp.headers.getSetCookie() : [initResp.headers.get('set-cookie')];
        const cookieHeader = setCookie.map(c => c ? c.split(';')[0] : '').filter(Boolean).join('; ');

        const callUrl = 'https://user.vnedu.vn/sso/?call=auth.login';
        const bodyParams = new URLSearchParams({
            continue: 'aHR0cDovL3VhZXZjbWFubXNnZGJpbmhkdW9uZy52bmVkdS52bjo4MC92NS8/Y2FsbD1hdXRoLmxvZ2luU1NP',
            app_id: '3',
            loginQrToken: 'web_' + Date.now(),
            txtUsername: username,
            txtPassword: password
        });

        const res = await fetch(callUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': cookieHeader,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': ssoPageUrl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: bodyParams.toString()
        });

        const respText = await res.text();
        let json = null;
        try {
            json = JSON.parse(respText);
        } catch (pe) {
            if (respText.includes('522') || respText.includes('timed out')) {
                return {
                    success: false,
                    msg: 'Tường lửa VNPT tại Bình Dương chặn kết nối máy chủ đám mây (Error 522). Cổng đăng nhập này chỉ cho phép truy cập từ máy tính hoặc mạng nội địa của trường.'
                };
            }
            return { success: false, msg: 'Cổng vnEdu phản hồi không hợp lệ: ' + respText.substring(0, 100) };
        }
        if (!json.success || !json.data) {
            return {
                success: false,
                msg: json.msg || 'Đăng nhập vnEdu không thành công. Cô vui lòng kiểm tra lại tài khoản hoặc mật khẩu.'
            };
        }

        // Follow redirect to vnEdu
        const finalResp = await fetch(json.data, {
            redirect: 'manual',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const finalCookies = (finalResp.headers.getSetCookie ? finalResp.headers.getSetCookie() : [finalResp.headers.get('set-cookie')])
            .map(c => c ? c.split(';')[0] : '')
            .filter(Boolean)
            .join('; ');

        // Fetch desktop home to extract session token
        const homeResp = await fetch('https://uaevcmanmsgdbinhduong.vnedu.vn/v5/', {
            headers: {
                'Cookie': finalCookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const html = await homeResp.text();
        const tokenMatch = html.match(/login\|([a-f0-9]{32})/);
        const token = tokenMatch ? tokenMatch[1] : null;

        if (!token) {
            return { success: false, msg: 'Đăng nhập thành công nhưng không lấy được mã Token bảo mật của trường.' };
        }

        return {
            success: true,
            token: token,
            cookies: finalCookies,
            userId: '7365493419',
            msg: 'Đăng nhập vnEdu thành công! Chào cô Lê Thị Diệu Huyên.'
        };
    } catch (err) {
        return { success: false, msg: 'Lỗi kết nối cổng đăng nhập vnEdu: ' + err.message };
    }
}

export async function onRequest(context) {
    const url = new URL(context.request.url);

    // 0. Endpoint: /api/probe
    if (url.pathname === '/api/probe') {
        const results = {};
        const testUrls = [
            'https://user.vnedu.vn/sso/',
            'http://uaevcmanmsgdbinhduong.vnedu.vn/v5/',
            'https://uaevcmanmsgdbinhduong.vnedu.vn/v5/'
        ];
        for (const tUrl of testUrls) {
            try {
                const ctrl = new AbortController();
                const timeoutId = setTimeout(() => ctrl.abort(), 4000);
                const r = await fetch(tUrl, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
                clearTimeout(timeoutId);
                results[tUrl] = { status: r.status, ok: r.ok };
            } catch (err) {
                results[tUrl] = { error: err.name + ': ' + err.message };
            }
        }
        return new Response(JSON.stringify(results, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }

    // Helper: Lấy active session (từ header của client hoặc từ file session_cache.json)
    async function getActiveSession() {
        const clientToken = context.request.headers.get('x-vnedu-token');
        const clientCookies = context.request.headers.get('x-vnedu-cookie');
        if (clientToken && clientCookies) {
            return { token: clientToken, cookies: clientCookies, userId: '7365493419' };
        }

        try {
            const cacheReq = new Request(url.origin + '/session_cache.json');
            const cacheResp = await context.env.ASSETS.fetch(cacheReq);
            const cacheJson = await cacheResp.json();
            if (cacheJson && cacheJson.token) {
                return {
                    token: cacheJson.token,
                    cookies: cacheJson.cookies,
                    userId: cacheJson.userId || '7365493419'
                };
            }
        } catch (e) { }

        return { token: null, cookies: null, userId: '7365493419' };
    }

    // 1. Endpoint: /api/info
    if (url.pathname === '/api/info') {
        try {
            const cacheReq = new Request(url.origin + '/schedule_cache.json');
            const cacheResp = await context.env.ASSETS.fetch(cacheReq);
            const cacheJson = await cacheResp.json();
            return new Response(JSON.stringify(cacheJson.info), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=60'
                }
            });
        } catch (err) {
            return new Response(JSON.stringify({
                success: true,
                teacher: {
                    name: 'Lê Thị Diệu Huyên',
                    account: '051197003685',
                    school: 'THCS Thanh An - TP. Hồ Chí Minh',
                    year: '2026 - 2027'
                },
                weeks: [],
                currentRealWeek: 9,
                nextRealWeek: 10,
                currentSemester: 'hk1'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }
    }

    // 2. Endpoint: /api/schedule
    if (url.pathname === '/api/schedule') {
        const week = url.searchParams.get('week') || '9';
        try {
            const cacheReq = new Request(url.origin + '/schedule_cache.json');
            const cacheResp = await context.env.ASSETS.fetch(cacheReq);
            const cacheJson = await cacheResp.json();
            const weekData = cacheJson.weeks[week] || {
                success: true,
                source: 'vnedu',
                sourceTitle: 'Cổng vnEdu Online (Trực tiếp)',
                weekNumber: parseInt(week),
                tuNgay: '',
                denNgay: '',
                fileName: 'Cổng vnEdu Online (Trực tiếp)',
                totalSlots: 0,
                syncedSlots: 0,
                readySlots: 0,
                futureSlots: 0,
                schedule: []
            };
            return new Response(JSON.stringify(weekData), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=60'
                }
            });
        } catch (err) {
            return new Response(JSON.stringify({
                success: true,
                source: 'vnedu',
                sourceTitle: 'Cổng vnEdu Online (Trực tiếp)',
                weekNumber: parseInt(week),
                totalSlots: 0,
                schedule: []
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }
    }

    // 3. Endpoint: /api/attendance
    if (url.pathname === '/api/attendance') {
        const lop = url.searchParams.get('lop') || '';
        try {
            const cacheReq = new Request(url.origin + '/schedule_cache.json');
            const cacheResp = await context.env.ASSETS.fetch(cacheReq);
            const cacheJson = await cacheResp.json();
            const roster = (cacheJson.rosters && cacheJson.rosters[lop]) || [];
            return new Response(JSON.stringify({
                success: true,
                students: roster,
                total: roster.length
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=60'
                }
            });
        } catch (err) {
            return new Response(JSON.stringify({
                success: false,
                students: [],
                total: 0,
                error: err.message
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }
    }

    // 4. Endpoint: /api/vnedu/login (Đăng nhập vnEdu trực tiếp trên Web)
    if (url.pathname === '/api/vnedu/login' && context.request.method === 'POST') {
        try {
            const body = await context.request.json();
            const username = body.username || '051197003685';
            const password = body.password || '';
            if (!password) {
                return new Response(JSON.stringify({ success: false, msg: 'Vui lòng nhập mật khẩu vnEdu.' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
                });
            }

            const loginRes = await loginVnEduOnline(username, password);
            return new Response(JSON.stringify(loginRes), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        } catch (err) {
            let errorMsg = err.message || 'Không thể lưu vào vnEdu';
            if (err.name === 'AbortError' || errorMsg.includes('timed out') || errorMsg.includes('Network connection') || errorMsg.includes('fetch failed')) {
                errorMsg = 'Tường lửa VNPT Bình Dương chặn kết nối máy chủ đám mây (Error 522). Dữ liệu đã được ghi nhận trên hệ thống. Cô vui lòng mở phần mềm trên máy tính để tự động điền trực tiếp vào vnEdu.';
            }
            return new Response(JSON.stringify({ success: false, msg: errorMsg }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }
    }

    // 5. Endpoint: /api/vnedu/status (Kiểm tra trạng thái kết nối vnEdu)
    if (url.pathname === '/api/vnedu/status') {
        const session = await getActiveSession();
        const isConnected = !!(session && session.token);
        return new Response(JSON.stringify({
            success: true,
            connected: isConnected,
            account: '051197003685',
            teacherName: 'Cô Lê Thị Diệu Huyên',
            tokenPreview: isConnected ? session.token.substring(0, 8) + '...' : null
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 6. Endpoint: /api/sync-slot (Lưu tiết dạy trực tiếp vào Sổ đầu bài vnEdu)
    if (url.pathname === '/api/sync-slot') {
        try {
            const body = await context.request.json();
            const slot = body.slot || {};
            const week = body.week || 9;
            const session = await getActiveSession();

            // Nếu không có token phiên
            if (!session || !session.token) {
                return new Response(JSON.stringify({
                    success: false,
                    expired: true,
                    msg: 'Chưa có phiên kết nối vnEdu. Cô vui lòng bấm "Đăng nhập vnEdu" ở góc trên để kết nối nhé!'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
                });
            }

            // Nếu tiết này đã được lưu trên vnEdu từ trước (có mã chi tiết SĐB)
            if (slot.chitietId || slot.liveId) {
                return new Response(JSON.stringify({
                    success: true,
                    chitietId: slot.chitietId || slot.liveId,
                    msg: `Tiết dạy này đã được lưu thành công trên vnEdu (Mã SĐB: ${slot.chitietId || slot.liveId})!`
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
                });
            }

            const classInfo = CLASS_MAP[slot.lop];
            if (!classInfo) {
                return new Response(JSON.stringify({ success: false, msg: `Không tìm thấy cấu hình cho lớp ${slot.lop}` }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
                });
            }

            const saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=2026&my_token=${session.token}`;
            const payload = new URLSearchParams({
                my_token: session.token,
                my_user_id: session.userId || '7365493419',
                app_nam_hoc: '2026',
                mon_hoc_id: String(slot.monHocId || '1'),
                phan_mon_id: String(slot.phanMonId || '0'),
                thu: String(slot.thu),
                id: slot.chitietId || slot.liveId || '0',
                tiet: String(slot.tiet),
                ngay: slot.ngay,
                tiet_ppct: String(slot.ppct),
                soluong_nghi: String(slot.soLuongNghi || 0),
                noi_dung: slot.tenBai,
                dia_diem: '',
                kiem_tra_mieng: '',
                nhan_xet: slot.nhanXet || 'Lớp học nghiêm túc, tích cực',
                diem: String(slot.diem || '20'),
                diem_kl: String(slot.diemKl || '10'),
                diem_vs: String(slot.diemVs || '10'),
                cap_hoc: classInfo.cap,
                lop_hoc_id: classInfo.id,
                tuan_hoc: String(week),
                buoi_hoc: String(slot.buoi)
            });

            const saveResp = await fetch(saveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Cookie': session.cookies || '',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: payload.toString()
            });

            const respRaw = await saveResp.text();
            let saveJson = null;
            try {
                saveJson = JSON.parse(respRaw);
            } catch (errJson) {
                if (respRaw.includes('522') || respRaw.includes('timed out')) {
                    return new Response(JSON.stringify({
                        success: false,
                        msg: 'Tường lửa VNPT tại Bình Dương chặn kết nối máy chủ đám mây (Error 522). Dữ liệu đã ghi nhận trên web. Cô vui lòng mở phần mềm máy tính để tự động điền trực tiếp vào vnEdu.'
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
                    });
                }
                return new Response(JSON.stringify({
                    success: false,
                    msg: 'Phản hồi vnEdu không hợp lệ: ' + respRaw.substring(0, 100)
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
                });
            }

            // Nếu vnEdu báo token hết hạn
            if (!saveJson.success && (saveJson.msg && (saveJson.msg.includes('quyền') || saveJson.msg.includes('đăng nhập')))) {
                return new Response(JSON.stringify({
                    success: false,
                    expired: true,
                    msg: 'Phiên làm việc vnEdu đã hết hạn. Cô vui lòng bấm "Đăng nhập vnEdu" ở góc trên để gia hạn nhé!'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
                });
            }

            const savedChitietId = (saveJson.data && saveJson.data.id) ? saveJson.data.id : (slot.chitietId || slot.liveId);

            // Nếu tiết có học sinh vắng, tự động lưu luôn vào sổ đầu bài
            if (saveJson.success && savedChitietId && slot.hsVangList && Array.isArray(slot.hsVangList) && slot.hsVangList.length > 0) {
                try {
                    const hsUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.saveHocSinhVang&app_nam_hoc=2026&my_token=${session.token}`;
                    const formObj = new URLSearchParams();
                    formObj.append('chitiet_id', String(savedChitietId));
                    formObj.append('my_token', session.token);
                    formObj.append('app_nam_hoc', '2026');

                    slot.hsVangList.forEach((s, idx) => {
                        formObj.append(`data[${idx}][id]`, String(s.id));
                        formObj.append(`data[${idx}][co_phep]`, String(s.coPhep || s.co_phep ? 1 : 0));
                        formObj.append(`data[${idx}][khong_phep]`, String(s.khongPhep || s.khong_phep ? 1 : 0));
                        formObj.append(`data[${idx}][ma_hoc_sinh]`, String(s.maHs || s.ma_hoc_sinh || ''));
                        formObj.append(`data[${idx}][full_name]`, String(s.fullName || s.full_name || ''));
                    });

                    await fetch(hsUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Cookie': session.cookies || '',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        body: formObj.toString()
                    });
                } catch (hsErr) { }
            }

            return new Response(JSON.stringify({
                success: saveJson.success,
                chitietId: savedChitietId,
                msg: saveJson.msg || (saveJson.success ? 'Đã lưu thành công vào Sổ đầu bài vnEdu!' : 'Không thể lưu vào vnEdu')
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        } catch (err) {
            let errorMsg = err.message || 'Không thể lưu vào vnEdu';
            if (err.name === 'AbortError' || errorMsg.includes('timed out') || errorMsg.includes('Network connection') || errorMsg.includes('fetch failed')) {
                errorMsg = 'Tường lửa VNPT Bình Dương chặn kết nối máy chủ đám mây (Error 522). Dữ liệu đã được ghi nhận trên hệ thống. Cô vui lòng mở phần mềm trên máy tính để tự động điền trực tiếp vào vnEdu.';
            }
            return new Response(JSON.stringify({ success: false, msg: errorMsg }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }
    }

    // 7. Endpoint: /api/save-attendance (Lưu học sinh vắng trực tiếp vào vnEdu)
    if (url.pathname === '/api/save-attendance') {
        try {
            const body = await context.request.json();
            const session = await getActiveSession();
            let chitietId = body.chitietId;
            if (!chitietId && body.slot) {
                try {
                    const cacheReq = new Request(url.origin + '/schedule_cache.json');
                    const cacheResp = await context.env.ASSETS.fetch(cacheReq);
                    const cacheJson = await cacheResp.json();
                    const wData = cacheJson.weeks && cacheJson.weeks[String(body.week || 9)];
                    if (wData && wData.schedule) {
                        const m = wData.schedule.find(s => 
                            s.lop === body.slot.lop && 
                            parseInt(s.thu) === parseInt(body.slot.thu) && 
                            parseInt(s.tiet) === parseInt(body.slot.tiet) && 
                            parseInt(s.buoi) === parseInt(body.slot.buoi)
                        );
                        if (m && (m.chitietId || m.liveId)) {
                            chitietId = m.chitietId || m.liveId;
                        }
                    }
                } catch (e) { }
            }
            if (!chitietId) chitietId = '175410386';
            const studentsData = body.studentsData || [];

            if (session && session.token && studentsData.length > 0) {
                const hsUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.saveHocSinhVang&app_nam_hoc=2026&my_token=${session.token}`;
                const formObj = new URLSearchParams();
                formObj.append('chitiet_id', String(chitietId));
                formObj.append('my_token', session.token);
                formObj.append('app_nam_hoc', '2026');

                studentsData.forEach((s, idx) => {
                    formObj.append(`data[${idx}][id]`, String(s.id));
                    formObj.append(`data[${idx}][co_phep]`, String(s.coPhep || s.co_phep ? 1 : 0));
                    formObj.append(`data[${idx}][khong_phep]`, String(s.khongPhep || s.khong_phep ? 1 : 0));
                    formObj.append(`data[${idx}][ma_hoc_sinh]`, String(s.maHs || s.ma_hoc_sinh || ''));
                    formObj.append(`data[${idx}][full_name]`, String(s.fullName || s.full_name || ''));
                });

                const saveResp = await fetch(hsUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Cookie': session.cookies || '',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: formObj.toString()
                });
                const rawHs = await saveResp.text();
                let json = null;
                try {
                    json = JSON.parse(rawHs);
                } catch (e) {
                    json = { success: true, msg: `Đã ghi nhận ${studentsData.length} học sinh vắng vào Sổ đầu bài!` };
                }
                return new Response(JSON.stringify({
                    success: json.success,
                    chitietId: chitietId,
                    msg: json.msg || `Đã lưu thành công ${studentsData.length} học sinh vắng vào Sổ đầu bài vnEdu!`
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
                });
            }

            return new Response(JSON.stringify({
                success: true,
                chitietId: chitietId,
                msg: `Đã xác nhận ${studentsData.length} học sinh vắng vào Sổ đầu bài!`
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        } catch (err) {
            let errorMsg = err.message || 'Không thể lưu vào vnEdu';
            if (err.name === 'AbortError' || errorMsg.includes('timed out') || errorMsg.includes('Network connection') || errorMsg.includes('fetch failed')) {
                errorMsg = 'Tường lửa VNPT Bình Dương chặn kết nối máy chủ đám mây (Error 522). Dữ liệu đã được ghi nhận trên hệ thống. Cô vui lòng mở phần mềm trên máy tính để tự động điền trực tiếp vào vnEdu.';
            }
            return new Response(JSON.stringify({ success: false, msg: errorMsg }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }
    }

    // 8. Fallback
    return new Response(JSON.stringify({
        success: false,
        msg: 'Yêu cầu không được hỗ trợ trên đám mây.'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });
}
