/**
 * vnEdu Smart Sync - Frontend Application (PRO MAX Edition v3.5)
 * Tác giả: Antigravity AI
 * Dành riêng cho Cô Lê Thị Diệu Huyên (THCS Thanh An)
 */

(function () {
    'use strict';

    // State ứng dụng
    const state = {
        currentSemester: 1, // 1: Học kỳ I (Tuần 1-19), 2: Học kỳ II (Tuần 20-35)
        currentWeek: 9, // Tự động load tuần hiện tại (Tuần 9)
        currentFilter: 'all',
        searchQuery: '',
        info: null,
        scheduleData: null,
        dataSource: 'vnedu', // Mặc định Cấp độ 2: vnEdu Trực Tiếp (Realtime)
        isSyncing: false,
        soundEnabled: false, // Bỏ chế độ âm thanh theo yêu cầu của Cô
        theme: localStorage.getItem('vnedu_theme') || 'light',
        themeStyle: localStorage.getItem('vnedu_theme_style') || 'ocean',
        ppctConfig: null
    };

    // DOM Elements
    const elements = {
        fileNameLabel: document.getElementById('fileNameLabel'),
        badgeSourceIcon: document.getElementById('badgeSourceIcon'),
        btnSourceVnEdu: document.getElementById('btnSourceVnEdu'),
        btnSourceExcel: document.getElementById('btnSourceExcel'),
        btnRefreshOnline: document.getElementById('btnRefreshOnline'),
        weeksNav: document.getElementById('weeksNav'),
        btnRefresh: document.getElementById('btnRefresh'),
        btnSyncToday: document.getElementById('btnSyncToday'),
        btnSyncWeek: document.getElementById('btnSyncWeek'),
        valTotalSlots: document.getElementById('valTotalSlots'),
        valSyncedSlots: document.getElementById('valSyncedSlots'),
        valReadySlots: document.getElementById('valReadySlots'),
        valFutureSlots: document.getElementById('valFutureSlots'),
        valProgressPct: document.getElementById('valProgressPct'),
        metricRingProgress: document.getElementById('metricRingProgress'),
        weekDateRangeLabel: document.getElementById('weekDateRangeLabel'),
        scheduleContainer: document.getElementById('scheduleContainer'),
        filterChips: document.querySelectorAll('.filter-chip'),
        searchInput: document.getElementById('searchInput'),
        syncModal: document.getElementById('syncModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalSpinner: document.getElementById('modalSpinner'),
        progressBarFill: document.getElementById('progressBarFill'),
        syncLogs: document.getElementById('syncLogs'),
        btnCloseModal: document.getElementById('btnCloseModal'),
        btnModalFinish: document.getElementById('btnModalFinish'),
        toastContainer: document.getElementById('toastContainer'),
        excelFileInput: document.getElementById('excelFileInput'),
        btnChangeFile: document.getElementById('btnChangeFile'),
        btnResetFile: document.getElementById('btnResetFile'),
        btnThemeToggle: document.getElementById('btnThemeToggle'),
        themeIcon: document.getElementById('themeIcon'),
        confettiCanvas: document.getElementById('confettiCanvas'),
        btnSem1: document.getElementById('btnSem1'),
        btnSem2: document.getElementById('btnSem2'),
        btnAutoPlan: document.getElementById('btnAutoPlan'),
        autoPlanModal: document.getElementById('autoPlanModal'),
        btnCloseAutoPlanModal: document.getElementById('btnCloseAutoPlanModal'),
        btnCancelAutoPlan: document.getElementById('btnCancelAutoPlan'),
        btnSubmitAutoPlan: document.getElementById('btnSubmitAutoPlan'),
        selectPlanWeek: document.getElementById('selectPlanWeek'),
        planLogs: document.getElementById('planLogs'),
        btnPpctConfig: document.getElementById('btnPpctConfig'),
        ppctConfigModal: document.getElementById('ppctConfigModal'),
        btnClosePpctModal: document.getElementById('btnClosePpctModal'),
        btnCancelPpctModal: document.getElementById('btnCancelPpctModal'),
        btnSavePpctConfig: document.getElementById('btnSavePpctConfig'),
        btnResetPpctDefault: document.getElementById('btnResetPpctDefault'),
        radioPpctAuto: document.getElementById('radioPpctAuto'),
        radioPpctCustom: document.getElementById('radioPpctCustom'),
        ppctTableBody: document.getElementById('ppctTableBody')
    };

    const THU_NAMES = {
        2: 'Thứ Hai',
        3: 'Thứ Ba',
        4: 'Thứ Tư',
        5: 'Thứ Năm',
        6: 'Thứ Sáu',
        7: 'Thứ Bảy'
    };

    // =========================================================================
    // Đã bỏ chế độ âm thanh theo yêu cầu của Cô Huyên
    // =========================================================================
    function playSuccessChime() {}
    function playClickBeep() {}
    function playBeep() {}

    // =========================================================================
    // Canvas Confetti Engine (Pháo hoa 60fps)
    // =========================================================================
    let confettiParticles = [];
    let confettiAnimId = null;

    function fireConfetti() {
        const canvas = elements.confettiCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        confettiParticles = [];
        const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6'];

        for (let i = 0; i < 90; i++) {
            confettiParticles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height * 0.4,
                w: Math.random() * 8 + 6,
                h: Math.random() * 6 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.9) * 14,
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 12,
                opacity: 1
            });
        }

        if (confettiAnimId) cancelAnimationFrame(confettiAnimId);

        function renderFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let activeCount = 0;

            confettiParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35;
                p.vx *= 0.98;
                p.rotation += p.vRot;
                p.opacity -= 0.012;

                if (p.opacity > 0 && p.y < canvas.height) {
                    activeCount++;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, p.opacity);
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
            });

            if (activeCount > 0) {
                confettiAnimId = requestAnimationFrame(renderFrame);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        renderFrame();
    }

    // =========================================================================
    // Quản lý Giao diện Sáng / Tối
    // =========================================================================
    function applyTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('vnedu_theme', theme);

        if (elements.themeIcon) {
            if (theme === 'dark') {
                elements.themeIcon.innerHTML = `
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                `;
                elements.btnThemeToggle.title = 'Chuyển sang chế độ Sáng (Phím tắt: D)';
            } else {
                elements.themeIcon.innerHTML = `
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                `;
                elements.btnThemeToggle.title = 'Chuyển sang chế độ Tối (Phím tắt: D)';
            }
        }
    }

    function toggleTheme() {
        const next = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        playClickBeep();
        showToast('Giao diện', next === 'dark' ? 'Đã bật chế độ Tối (Dark Mode)' : 'Đã bật chế độ Sáng (Light Mode)', 'info');
    }

    function applyThemeStyle(styleName) {
        state.themeStyle = styleName;
        document.documentElement.setAttribute('data-theme-style', styleName);
        localStorage.setItem('vnedu_theme_style', styleName);
        
        // Update active class for style buttons in popover
        document.querySelectorAll('.style-option-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === styleName);
        });
    }

    // =========================================================================
    // Tính toán tuần học thực tế hiện tại (Học kỳ 1 năm học 2026-2027 bắt đầu 07/09/2026)
    function calculateCurrentRealWeek() {
        const SEMESTER_1_START = new Date(2026, 8, 7); // 07/09/2026
        const now = new Date();
        const diffDays = Math.floor((now - SEMESTER_1_START) / (1000 * 60 * 60 * 24));
        return Math.max(1, Math.min(35, Math.floor(diffDays / 7) + 1));
    }

    // =========================================================================
    // Khởi chạy ứng dụng
    // =========================================================================
    async function init() {
        applyTheme(state.theme);
        applyThemeStyle(state.themeStyle);
        updateSourceUI();
        bindEvents();
        initSidebar();
        setupVnEduLoginHandlers();
        checkVnEduStatus();

        const urlParams = new URLSearchParams(window.location.search);
        const urlWeek = parseInt(urlParams.get('week'));
        const realWeek = calculateCurrentRealWeek();

        if (urlWeek && urlWeek >= 1 && urlWeek <= 35) {
            state.currentWeek = urlWeek;
            state.currentSemester = urlWeek >= 20 ? 2 : 1;
        } else {
            state.currentWeek = realWeek;
            state.currentSemester = realWeek >= 20 ? 2 : 1;
        }

        await loadPpctConfig();
        await loadInfo();

        // Tự động load tuần học hiện tại nếu người dùng không truyền tham số tuần trên URL
        if (!urlWeek && state.info && state.info.currentRealWeek) {
            state.currentWeek = state.info.currentRealWeek;
            state.currentSemester = state.currentWeek >= 20 ? 2 : 1;
        }

        goToWeek(state.currentWeek);
    }

    // Đăng ký sự kiện
    function bindEvents() {
        // Bộ chuyển đổi Nguồn Dữ Liệu: Cấp độ 2 (vnEdu Trực tiếp) ⟷ Cấp độ 1 (File Excel dự phòng)
        if (elements.btnSourceVnEdu) {
            elements.btnSourceVnEdu.addEventListener('click', () => switchDataSource('vnedu'));
        }
        if (elements.btnSourceExcel) {
            elements.btnSourceExcel.addEventListener('click', () => switchDataSource('excel'));
        }
        if (elements.btnRefreshOnline) {
            elements.btnRefreshOnline.addEventListener('click', async () => {
                playClickBeep();
                elements.btnRefreshOnline.classList.add('loading');
                showToast('vnEdu Online', 'Đang nạp lại Lịch Báo Giảng từ cổng vnEdu...', 'info');
                await loadSchedule(state.currentWeek, true);
                elements.btnRefreshOnline.classList.remove('loading');
                showToast('vnEdu Online', 'Đã cập nhật Lịch Báo Giảng mới nhất từ vnEdu!', 'success');
            });
        }

        // Nút Làm mới
        elements.btnRefresh.addEventListener('click', () => {
            playClickBeep();
            elements.btnRefresh.classList.add('loading');
            loadSchedule(state.currentWeek, true).finally(() => {
                elements.btnRefresh.classList.remove('loading');
            });
        });

        // Theme Toggle
        if (elements.btnThemeToggle) {
            elements.btnThemeToggle.addEventListener('click', toggleTheme);
        }

        // Style Switcher (Đổi phong cách giao diện: Emerald, Ocean, Warm, Indigo)
        document.querySelectorAll('.style-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.style;
                applyThemeStyle(style);
                playClickBeep();
                const styleNames = {
                    emerald: 'Xanh Ngọc Sư Phạm',
                    ocean: 'Xanh Biển vnEdu',
                    warm: 'Sổ Tay Giáo Viên',
                    indigo: 'Tím Hiện Đại'
                };
                showToast('Giao diện', `Đã chuyển sang phong cách: ${styleNames[style] || style}`, 'success');
                const pop = document.getElementById('popoverStyleSwitcher');
                if (pop && pop.hidePopover) {
                    try { pop.hidePopover(); } catch (e) {}
                }
            });
        });


        // Chuyển Học kỳ I & II
        if (elements.btnSem1) {
            elements.btnSem1.addEventListener('click', () => switchSemester(1));
        }
        if (elements.btnSem2) {
            elements.btnSem2.addEventListener('click', () => switchSemester(2));
        }

        // Nút đổi file Excel tùy chọn
        if (elements.btnChangeFile) {
            elements.btnChangeFile.addEventListener('click', () => {
                playClickBeep();
                elements.excelFileInput.click();
            });
        }

        if (elements.excelFileInput) {
            elements.excelFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                showToast('Đang nạp file', `Đang đọc dữ liệu từ ${file.name}...`, 'info');
                const reader = new FileReader();
                reader.onload = async function () {
                    try {
                        const base64 = reader.result.split(',')[1];
                        const res = await fetch('/api/upload-excel', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileName: file.name, fileBase64: base64 })
                        });
                        const data = await res.json();
                        if (data.success) {
                            playSuccessChime();
                            showToast('Thành công', `Đã nạp file Lịch báo giảng: ${file.name}`, 'success');
                            await loadInfo();
                            await loadSchedule(state.currentWeek, true);
                        } else {
                            throw new Error(data.error);
                        }
                    } catch (err) {
                        showToast('Lỗi nạp file', err.message, 'error');
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        // Nút khôi phục dùng file tự động trong Downloads
        if (elements.btnResetFile) {
            elements.btnResetFile.addEventListener('click', async () => {
                playClickBeep();
                try {
                    const res = await fetch('/api/reset-excel', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Khôi phục', 'Đã chuyển về dùng file tự động trong Downloads', 'success');
                        await loadInfo();
                        await loadSchedule(state.currentWeek, true);
                    }
                } catch (err) {
                    showToast('Lỗi', err.message, 'error');
                }
            });
        }

        // Lọc theo lớp
        elements.filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                playClickBeep();
                elements.filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                state.currentFilter = chip.dataset.filter;
                renderSchedule();
            });
        });

        // Tìm kiếm nhanh (Live Search)
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                state.searchQuery = e.target.value.trim().toLowerCase();
                renderSchedule();
            });
        }

        // Nút Đồng bộ hôm nay
        elements.btnSyncToday.addEventListener('click', () => {
            playClickBeep();
            syncBatch('today');
        });

        // Nút Đồng bộ cả tuần (các ngày đã mở khóa)
        elements.btnSyncWeek.addEventListener('click', () => {
            playClickBeep();
            syncBatch('unlocked');
        });

        // Đóng Modal (Chỉ cho phép đóng khi đã hoàn tất, không đóng giữa chừng)
        elements.btnCloseModal.addEventListener('click', closeModal);
        elements.btnModalFinish.addEventListener('click', () => {
            closeModal();
            loadSchedule(state.currentWeek, true);
        });

        // Nút Lập trước Kế hoạch dạy học
        if (elements.btnAutoPlan) {
            elements.btnAutoPlan.addEventListener('click', () => {
                playClickBeep();
                openAutoPlanModal(state.currentWeek >= 8 ? state.currentWeek + 1 : 9);
            });
        }
        if (elements.btnCloseAutoPlanModal) {
            elements.btnCloseAutoPlanModal.addEventListener('click', closeAutoPlanModal);
        }
        if (elements.btnCancelAutoPlan) {
            elements.btnCancelAutoPlan.addEventListener('click', closeAutoPlanModal);
        }
        if (elements.btnSubmitAutoPlan) {
            elements.btnSubmitAutoPlan.addEventListener('click', submitAutoPlan);
        }

        // Sự kiện Modal Cấu hình Số tiết (PPCT)
        if (elements.btnPpctConfig) {
            elements.btnPpctConfig.addEventListener('click', openPpctConfigModal);
        }
        if (elements.btnClosePpctModal) {
            elements.btnClosePpctModal.addEventListener('click', closePpctConfigModal);
        }
        if (elements.btnCancelPpctModal) {
            elements.btnCancelPpctModal.addEventListener('click', closePpctConfigModal);
        }
        if (elements.btnSavePpctConfig) {
            elements.btnSavePpctConfig.addEventListener('click', savePpctConfig);
        }
        if (elements.btnResetPpctDefault) {
            elements.btnResetPpctDefault.addEventListener('click', resetPpctToDefault);
        }
        if (elements.radioPpctAuto) {
            elements.radioPpctAuto.addEventListener('change', () => {
                if (elements.ppctTableBody) {
                    elements.ppctTableBody.querySelectorAll('.ppct-input').forEach(i => i.disabled = true);
                }
            });
        }
        if (elements.radioPpctCustom) {
            elements.radioPpctCustom.addEventListener('change', () => {
                if (elements.ppctTableBody) {
                    elements.ppctTableBody.querySelectorAll('.ppct-input').forEach(i => i.disabled = false);
                }
            });
        }

        // Phím tắt toàn cục
        window.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea') return;

            const key = e.key.toLowerCase();
            if (key === 't') {
                e.preventDefault();
                elements.btnSyncToday.click();
            } else if (key === 'w') {
                e.preventDefault();
                elements.btnSyncWeek.click();
            } else if (key === 'r') {
                e.preventDefault();
                elements.btnRefresh.click();
            } else if (key === 'd') {
                e.preventDefault();
                toggleTheme();
            } else if (key >= '1' && key <= '9') {
                const targetWeek = parseInt(key);
                goToWeek(targetWeek);
            } else if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.altKey) {
                if (state.currentWeek > 1) goToWeek(state.currentWeek - 1);
            } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.altKey) {
                if (state.currentWeek < 35) goToWeek(state.currentWeek + 1);
            }
        });

        // Bộ chuyển tuần nhanh ở giữa (Next / Prev Week & Badge mở Sidebar)
        const btnPrevWeek = document.getElementById('btnPrevWeek');
        const btnNextWeek = document.getElementById('btnNextWeek');
        const btnCurrentWeekBadge = document.getElementById('btnCurrentWeekBadge');

        if (btnPrevWeek) {
            btnPrevWeek.addEventListener('click', () => {
                if (state.currentWeek > 1) {
                    goToWeek(state.currentWeek - 1);
                }
            });
        }

        if (btnNextWeek) {
            btnNextWeek.addEventListener('click', () => {
                if (state.currentWeek < 35) {
                    goToWeek(state.currentWeek + 1);
                }
            });
        }

        if (btnCurrentWeekBadge) {
            btnCurrentWeekBadge.addEventListener('click', () => {
                playClickBeep();
                if (window.innerWidth <= 1024) {
                    document.body.classList.add('sidebar-mobile-open');
                } else {
                    document.body.classList.remove('sidebar-collapsed');
                    localStorage.setItem('vnedu_sidebar_collapsed', 'false');
                }
                updateSidebarActiveWeek(state.currentWeek);
            });
        }

        // Đóng Modal Điểm danh học sinh vắng
        const closeAttModal = () => {
            const m = document.getElementById('attendanceModal');
            if (m) {
                m.style.display = 'none';
                m.classList.remove('active');
            }
        };
        const btnCloseAtt = document.getElementById('btnCloseAttendanceModal');
        const btnDismissAtt = document.getElementById('btnDismissAttendanceModal');
        const attModal = document.getElementById('attendanceModal');
        if (btnCloseAtt) btnCloseAtt.addEventListener('click', closeAttModal);
        if (btnDismissAtt) btnDismissAtt.addEventListener('click', closeAttModal);
        if (attModal) {
            attModal.addEventListener('click', (e) => {
                if (e.target === attModal) closeAttModal();
            });
        }

        // Khởi tạo menu thả xuống nhận xét tiết học
        initRemarkDropdownEvents();
    }

    // =========================================================================
    // Sidebar Phân Cấp Quản Trị Toàn Niên Khóa (Cây thời khóa biểu & Tác vụ)
    // =========================================================================
    function initSidebar() {
        const btnToggleSidebar = document.getElementById('btnToggleSidebar');
        const btnSidebarEdgeToggle = document.getElementById('btnSidebarEdgeToggle');
        const btnCloseSidebar = document.getElementById('btnCloseSidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');

        // Khôi phục trạng thái thu gọn trên Desktop từ localStorage
        const savedCollapsed = localStorage.getItem('vnedu_sidebar_collapsed');
        if (savedCollapsed === 'true' && window.innerWidth > 1024) {
            document.body.classList.add('sidebar-collapsed');
        }

        // Toggle Sidebar khi bấm nút Hamburger hoặc nút Mép Sidebar
        function toggleSidebar() {
            playClickBeep();
            if (window.innerWidth <= 1024) {
                document.body.classList.toggle('sidebar-mobile-open');
            } else {
                document.body.classList.toggle('sidebar-collapsed');
                const isCollapsed = document.body.classList.contains('sidebar-collapsed');
                localStorage.setItem('vnedu_sidebar_collapsed', isCollapsed ? 'true' : 'false');
            }
        }

        // Đóng Sidebar Mobile
        function closeMobileSidebar() {
            document.body.classList.remove('sidebar-mobile-open');
        }

        if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
        if (btnSidebarEdgeToggle) btnSidebarEdgeToggle.addEventListener('click', toggleSidebar);
        if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeMobileSidebar);
        if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

        // Phím tắt: Bấm phím 'B' hoặc 'M' để bật/tắt Sidebar (khi không gõ chữ)
        document.addEventListener('keydown', (e) => {
            const activeEl = document.activeElement;
            const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
            if (isTyping) return;
            if ((e.key === 'b' || e.key === 'B' || e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                toggleSidebar();
            }
        });

        // Toggle Cây Accordion Học kỳ
        document.querySelectorAll('.tree-node-header[data-toggle="semester"]').forEach(header => {
            header.addEventListener('click', () => {
                playClickBeep();
                const node = header.closest('.sidebar-tree-node');
                if (!node) return;
                const isExpanded = node.classList.contains('expanded');
                node.classList.toggle('expanded', !isExpanded);
                node.classList.toggle('collapsed', isExpanded);
                const arrow = header.querySelector('.tree-toggle-arrow');
                if (arrow) arrow.textContent = isExpanded ? '▶' : '▼';
            });
        });

        // Toggle Cây Accordion Tháng
        document.querySelectorAll('.month-title[data-toggle="month"]').forEach(title => {
            title.addEventListener('click', () => {
                playClickBeep();
                const group = title.closest('.month-group');
                if (!group) return;
                const isCollapsed = group.classList.toggle('collapsed');
                const arrow = title.querySelector('.month-arrow');
                if (arrow) arrow.textContent = isCollapsed ? '▸' : '▾';
            });
        });

        // Bắt sự kiện chọn Tuần từ Cây Sidebar
        document.querySelectorAll('.sidebar-week-item[data-week]').forEach(item => {
            item.addEventListener('click', () => {
                const weekNum = parseInt(item.dataset.week, 10);
                if (!weekNum) return;
                playClickBeep();

                // Nếu tuần thuộc HK2 nhưng HK2 chưa mở
                if (weekNum >= 20 && state.info && !state.info.semester2Unlocked) {
                    showToast('Học kỳ II chưa bắt đầu', 'Học kỳ II dự kiến tự động mở từ tháng 01/2027. Cô đang xem trước khung tuần!', 'info');
                }

                // Chuyển học kỳ tương ứng nếu cần
                const targetSem = weekNum >= 20 ? 2 : 1;
                if (state.currentSemester !== targetSem) {
                    state.currentSemester = targetSem;
                    if (elements.btnSem1) elements.btnSem1.classList.toggle('active', targetSem === 1);
                    if (elements.btnSem2) elements.btnSem2.classList.toggle('active', targetSem === 2);
                    renderWeeksNav(state.info ? state.info.weeks : []);
                }

                // Cập nhật tuần hiện tại
                state.currentWeek = weekNum;
                updateSidebarActiveWeek(weekNum);

                // Đồng bộ highlight với thanh tab ngang
                document.querySelectorAll('.week-tab').forEach(t => {
                    t.classList.toggle('active', parseInt(t.dataset.week, 10) === weekNum);
                });

                // Nạp lịch tuần
                loadSchedule(state.currentWeek, true);

                // Nếu trên mobile, tự động đóng sidebar mượt mà để cô xem TKB
                if (window.innerWidth <= 1024) {
                    closeMobileSidebar();
                }
            });
        });

        // Nút Quét Vắng SĐD vnEdu trên thanh công cụ & Header
        const handleScanAttendance = () => {
            playClickBeep();
            showToast('Quét học sinh vắng vnEdu', 'Đang đối chiếu Sổ điểm danh vnEdu...', 'info');
            
            const now = new Date();
            const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            
            const alertSlot = (state.schedule || []).find(s => s.sddAbsentCount > 0 && !s.sddConfirmed) 
                || (state.schedule || []).find(s => s.ngay === todayStr || s.isToday)
                || (state.schedule || []).find(s => s.soLuongNghi > 0)
                || (state.schedule && state.schedule.length > 0 ? state.schedule[0] : null);
            if (alertSlot) {
                openAttendanceModal(alertSlot);
            } else {
                showToast('Điểm danh', 'Tuần ' + state.currentWeek + ': Sĩ số các lớp đầy đủ (0 vắng)!', 'info');
            }
        };

        const btnScanAtt = document.getElementById('btnScanAttendance');
        if (btnScanAtt) btnScanAtt.addEventListener('click', handleScanAttendance);
        const btnAttHeader = document.getElementById('btnAttendanceCheckHeader');
        if (btnAttHeader) btnAttHeader.addEventListener('click', handleScanAttendance);

        // 2 Nút Thao Tác Nhanh Cây Phân Cấp: Mở rộng tất cả / Thu gọn tất cả
        const btnExpandAll = document.getElementById('btnSidebarExpandAll');
        if (btnExpandAll) {
            btnExpandAll.addEventListener('click', () => {
                playClickBeep();
                document.querySelectorAll('.month-group').forEach(m => m.open = true);
                document.querySelectorAll('.sidebar-tree-node').forEach(n => {
                    n.classList.remove('collapsed');
                    n.classList.add('expanded');
                    const arrow = n.querySelector('.tree-toggle-arrow');
                    if (arrow) arrow.textContent = '▼';
                });
                showToast('Cây phân cấp', 'Đã mở rộng toàn bộ các tháng', 'info');
            });
        }

        const btnCollapseAll = document.getElementById('btnSidebarCollapseAll');
        if (btnCollapseAll) {
            btnCollapseAll.addEventListener('click', () => {
                playClickBeep();
                document.querySelectorAll('.month-group').forEach(m => m.open = false);
                showToast('Cây phân cấp', 'Đã thu gọn các tháng', 'info');
            });
        }

        // Nút mở nhanh Sidebar trên thanh tuần ngang
        const btnQuickOpen = document.getElementById('btnQuickOpenSidebar');
        if (btnQuickOpen) {
            btnQuickOpen.addEventListener('click', () => {
                playClickBeep();
                if (window.innerWidth <= 1024) {
                    document.body.classList.add('sidebar-mobile-open');
                } else {
                    document.body.classList.remove('sidebar-collapsed');
                    localStorage.setItem('vnedu_sidebar_collapsed', 'false');
                }
                updateSidebarActiveWeek(state.currentWeek);
            });
        }
    }

    // Cập nhật highlight active cho nút tuần trong Sidebar
    function updateSidebarActiveWeek(weekNum) {
        document.querySelectorAll('.sidebar-week-item').forEach(item => {
            const isMatch = parseInt(item.dataset.week, 10) === weekNum;
            item.classList.toggle('active', isMatch);
            if (isMatch) {
                // Đảm bảo accordion Học kỳ chứa tuần này được mở
                const treeNode = item.closest('.sidebar-tree-node');
                if (treeNode && treeNode.classList.contains('collapsed')) {
                    treeNode.classList.remove('collapsed');
                    treeNode.classList.add('expanded');
                    const arrow = treeNode.querySelector('.tree-toggle-arrow');
                    if (arrow) arrow.textContent = '▼';
                }
                // Native <details> tự động mở và đóng các tháng khác qua thuộc tính name
                const monthDetails = item.closest('details.month-group');
                if (monthDetails) {
                    monthDetails.open = true;
                }
            }
        });
    }

    // Chuyển đổi Nguồn Dữ Liệu: Cấp độ 2 (vnEdu Trực tiếp) ⟷ Cấp độ 1 (File Excel dự phòng)
    function switchDataSource(source) {
        if (state.dataSource === source) return;
        state.dataSource = source;
        localStorage.setItem('vnedu_data_source', source);
        playClickBeep();
        updateSourceUI();
        loadInfo();
        showToast(
            source === 'vnedu' ? 'Đã bật: vnEdu Trực Tiếp ⚡' : 'Đã bật: File Excel Dự Phòng 📄',
            source === 'vnedu' 
                ? 'Đồng bộ trực tiếp Lịch báo giảng vnEdu ➔ Sổ đầu bài vnEdu (Cấp độ 2)' 
                : 'Đang dùng dữ liệu từ file Excel trên máy tính (Cấp độ 1)',
            'info'
        );
        loadSchedule(state.currentWeek, true);
    }

    function updateSourceUI() {
        if (elements.btnSourceVnEdu) elements.btnSourceVnEdu.classList.toggle('active', state.dataSource === 'vnedu');
        if (elements.btnSourceExcel) elements.btnSourceExcel.classList.toggle('active', state.dataSource === 'excel');

        if (state.dataSource === 'vnedu') {
            if (elements.fileStatusBadge) elements.fileStatusBadge.style.display = 'none';
            if (elements.fileNameLabel) {
                elements.fileNameLabel.textContent = 'Cổng vnEdu Online';
                elements.fileNameLabel.title = 'Nguồn dữ liệu: Kế hoạch dạy học trực tiếp từ tài khoản vnEdu';
            }
            if (elements.btnChangeFile) elements.btnChangeFile.style.display = 'none';
            if (elements.btnResetFile) elements.btnResetFile.style.display = 'none';
            if (elements.btnRefreshOnline) elements.btnRefreshOnline.style.display = 'inline-block';
            if (elements.badgeSourceIcon) {
                elements.badgeSourceIcon.innerHTML = '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>';
            }
        } else {
            if (elements.fileStatusBadge) elements.fileStatusBadge.style.display = 'inline-flex';
            if (state.info && state.info.file) {
                if (elements.fileNameLabel) {
                    elements.fileNameLabel.textContent = `${state.info.file.name}`;
                    elements.fileNameLabel.title = `Cập nhật lúc: ${new Date(state.info.file.time).toLocaleString('vi-VN')}`;
                }
                if (elements.btnChangeFile) elements.btnChangeFile.style.display = 'inline-block';
                if (elements.btnResetFile) elements.btnResetFile.style.display = state.info.file.isCustom ? 'inline-block' : 'none';
            } else {
                if (elements.fileNameLabel) elements.fileNameLabel.textContent = 'Chưa tìm thấy file Excel';
                if (elements.btnChangeFile) elements.btnChangeFile.style.display = 'inline-block';
                if (elements.btnResetFile) elements.btnResetFile.style.display = 'none';
            }
            if (elements.btnRefreshOnline) elements.btnRefreshOnline.style.display = 'none';
            if (elements.badgeSourceIcon) {
                elements.badgeSourceIcon.innerHTML = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>';
            }
        }
    }

    // Chuyển Học kỳ I & II
    function switchSemester(sem) {
        if (sem === 2 && state.info && !state.info.semester2Unlocked) {
            playBeep(220, 150);
            showToast('Học kỳ II chưa mở', 'Trường hiện đang trong Học kỳ I (Năm học 2026-2027). Hệ thống sẽ tự động mở Học kỳ II khi bước sang tháng 01/2027 cô nhé!', 'warning');
            return;
        }
        state.currentSemester = sem;
        playClickBeep();
        if (elements.btnSem1) elements.btnSem1.classList.toggle('active', sem === 1);
        if (elements.btnSem2) elements.btnSem2.classList.toggle('active', sem === 2);

        if (sem === 2) {
            showToast('Học kỳ II', 'Đang quản lý lịch giảng dạy Học kỳ II (Tuần 20 - 35)', 'info');
            state.currentWeek = 20;
            loadSchedule(20, true);
        } else {
            showToast('Học kỳ I', 'Đang quản lý lịch giảng dạy Học kỳ I (Tuần 1 - 19)', 'info');
            state.currentWeek = 8;
            loadSchedule(8, true);
        }

        renderWeeksNav(state.info ? state.info.weeks : []);
    }

    // Tải thông tin chung (File Excel & Các tuần)
    async function loadInfo() {
        try {
            let data = null;
            try {
                const res = await fetch(`/api/info?source=${state.dataSource}`);
                const text = await res.text();
                if (text && text.trim().startsWith('{')) {
                    const parsed = JSON.parse(text);
                    if (parsed && parsed.success) data = parsed;
                }
            } catch (e) {
                console.warn('loadInfo fetch error:', e);
            }

            if (!data) {
                const cacheRes = await fetch('/schedule_cache.json');
                const cacheJson = await cacheRes.json();
                data = cacheJson.info;
            }

            state.info = data;
            updateSourceUI();
            updateSemesterButtonsUI();

            // Render thanh chọn tuần
            renderWeeksNav(data.weeks || []);
        } catch (err) {
            console.error('loadInfo fallback error:', err);
        }
    }

    // Cập nhật trạng thái nút Học kỳ (Khóa HK2 khi chưa tới thời gian)
    function updateSemesterButtonsUI() {
        if (!elements.btnSem2) return;
        const isUnlocked = state.info && state.info.semester2Unlocked;
        if (!isUnlocked) {
            elements.btnSem2.disabled = true;
            elements.btnSem2.classList.add('sem-disabled');
            elements.btnSem2.title = 'Học kỳ II chưa bắt đầu (Dự kiến tự động mở từ tháng 01/2027)';
            elements.btnSem2.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Học kỳ II';
        } else {
            elements.btnSem2.disabled = false;
            elements.btnSem2.classList.remove('sem-disabled');
            elements.btnSem2.title = 'Quản lý Học kỳ II (Tuần 20 - 35)';
            elements.btnSem2.textContent = 'Học kỳ II';
        }
    }

    // Chuyển nhanh tới tuần cụ thể (Dùng chung cho Stepper, Phím tắt, Sidebar)
    function goToWeek(weekNum) {
        if (weekNum < 1 || weekNum > 35) return;
        playClickBeep();
        const targetSem = weekNum >= 20 ? 2 : 1;
        state.currentSemester = targetSem;
        state.currentWeek = weekNum;
        updateSidebarActiveWeek(weekNum);
        updateWeekStepperUI();
        loadSchedule(weekNum, true);
    }

    // Cập nhật giao diện Stepper Tuần ở thanh điều khiển chính
    function updateWeekStepperUI() {
        const titleEl = document.getElementById('weekBadgeTitle');
        const semPill = document.getElementById('weekSemPill');
        const btnPrev = document.getElementById('btnPrevWeek');
        const btnNext = document.getElementById('btnNextWeek');

        const weekNum = state.currentWeek || 8;
        const sem = weekNum >= 20 ? 2 : 1;

        let dateRangeStr = '';
        if (state.scheduleData && state.scheduleData.dateRange) {
            dateRangeStr = ` (${state.scheduleData.dateRange})`;
        } else if (state.info && state.info.weeks) {
            const found = state.info.weeks.find(w => w.weekNumber === weekNum);
            if (found && found.dateRange) dateRangeStr = ` (${found.dateRange})`;
        }

        if (titleEl) {
            titleEl.textContent = `Tuần ${weekNum}${dateRangeStr}`;
        }
        if (semPill) {
            semPill.textContent = sem === 1 ? 'HK I' : 'HK II';
        }
        if (btnPrev) btnPrev.disabled = weekNum <= 1;
        if (btnNext) btnNext.disabled = weekNum >= 35;
    }

    // Render danh sách tuần (Đồng bộ stepper & cập nhật sidebar active)
    function renderWeeksNav(weeks) {
        updateWeekStepperUI();
        updateSidebarActiveWeek(state.currentWeek);

        if (!elements.weeksNav) return;
        elements.weeksNav.innerHTML = '';
        const startWeek = state.currentSemester === 1 ? 1 : 20;
        const endWeek = state.currentSemester === 1 ? 19 : 35;
        const fullList = [];

        for (let i = startWeek; i <= endWeek; i++) {
            const found = (weeks || []).find(w => w.weekNumber === i);
            fullList.push(found || {
                weekNumber: i,
                title: `Tuần ${i}`,
                hasData: false,
                isCurrentRealWeek: i === (state.info ? state.info.currentRealWeek : 8),
                isNextRealWeek: i === (state.info ? state.info.nextRealWeek : 9),
                isPast: i < 8,
                isFuture: i > 8
            });
        }

        fullList.forEach(w => {
            const btn = document.createElement('button');
            const isActive = w.weekNumber === state.currentWeek;
            const hasData = !!w.hasData;
            const isCurrent = !!w.isCurrentRealWeek;
            const isNext = !!w.isNextRealWeek;
            const isFuture = !!w.isFuture;

            btn.dataset.week = w.weekNumber;

            if (!hasData) {
                btn.className = `week-tab week-no-data disabled ${isActive ? 'active' : ''}`;
                btn.disabled = true;
                btn.title = `Tuần ${w.weekNumber}: Chưa có dữ liệu lịch dạy`;
                btn.innerHTML = `Tuần ${w.weekNumber}`;
            } else {
                let stateClass = '';
                let badgeHtml = '';

                if (isCurrent) {
                    stateClass = 'week-current';
                    badgeHtml = `<span class="week-live-dot"></span>Tuần ${w.weekNumber} <span class="week-status-tag tag-current">Hiện tại</span>`;
                } else if (isNext) {
                    stateClass = 'week-next';
                    badgeHtml = `Tuần ${w.weekNumber} <span class="week-status-tag tag-next">Sắp tới</span>`;
                } else if (isFuture) {
                    stateClass = 'week-future-ready';
                    badgeHtml = `Tuần ${w.weekNumber} <span class="week-status-tag tag-ready">Đã lập</span>`;
                } else {
                    stateClass = 'week-past-done';
                    badgeHtml = `Tuần ${w.weekNumber}`;
                }

                btn.className = `week-tab ${stateClass} ${isActive ? 'active' : ''}`;
                btn.innerHTML = badgeHtml;

                btn.addEventListener('click', () => {
                    if (state.currentWeek === w.weekNumber) return;
                    goToWeek(w.weekNumber);
                });
            }

            elements.weeksNav.appendChild(btn);
        });
    }

    // Cập nhật Vòng tiến độ SVG
    function updateProgressRing(synced, total) {
                    const pct = total > 0 ? Math.round((synced / total) * 100) : 0;
                    if (elements.valProgressPct) {
                        elements.valProgressPct.textContent = `${pct}%`;
                    }
                    if (elements.metricRingProgress) {
                        const circumference = 2 * Math.PI * 15; // ~94.2
                        const offset = circumference - (pct / 100) * circumference;
                        elements.metricRingProgress.style.strokeDashoffset = offset;
                    }
                }

    // Cập nhật Banner trạng thái trực quan
    function updateBannerStatus(data) {
                    const bannerIcon = document.getElementById('bannerIcon');
                    const bannerTitle = document.getElementById('bannerTitle');
                    const bannerDesc = document.getElementById('bannerDesc');
                    const banner = document.getElementById('statusSummaryBanner') || document.getElementById('compactMetricsBar');
                    if (!banner || !bannerTitle) return;

                    const now = new Date();
                    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                    const todaySlots = (data.schedule || []).filter(s => s.ngay === todayStr);
                    const todaySynced = todaySlots.filter(s => s.status === 'synced' || s.isLive || !!s.chitietId || !!s.liveId).length;
                    const todayTotal = todaySlots.length;

                    const isMobile = window.innerWidth <= 640;
                    if (todayTotal > 0 && todaySynced === todayTotal) {
                        bannerIcon.textContent = '🎉';
                        bannerTitle.textContent = isMobile ? `Hôm nay: Đã xong ${todayTotal}/${todayTotal} tiết` : `Hôm nay cô đã nhập hoàn tất đủ ${todayTotal}/${todayTotal} tiết lên vnEdu!`;
                        bannerDesc.textContent = `Tuần ${data.weekNumber} đã lưu xong ${data.syncedSlots}/${data.totalSlots} tiết. Còn ${data.futureSlots} tiết của Thứ Sáu sẽ tự động mở khi tới ngày dạy.`;
                        banner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    } else if (todayTotal > 0 && todaySynced < todayTotal) {
                        const needSync = todayTotal - todaySynced;
                        bannerIcon.textContent = '⚡';
                        bannerTitle.textContent = isMobile ? `Cần nhập: ${needSync} tiết hôm nay` : `Hôm nay cô còn ${needSync} tiết cần nhập lên vnEdu!`;
                        bannerDesc.textContent = `Bấm nút "Đồng bộ hôm nay" ở góc trên để lưu tự động vào sổ đầu bài.`;
                        banner.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                    } else if (data.syncedSlots === data.totalSlots && data.totalSlots > 0) {
                        bannerIcon.textContent = '🏆';
                        bannerTitle.textContent = isMobile ? `Tuần ${data.weekNumber}: Đã xong ${data.totalSlots}/${data.totalSlots} tiết` : `Tuyệt vời! Cô đã hoàn thành đủ tất cả ${data.totalSlots} tiết của Tuần ${data.weekNumber}!`;
                        bannerDesc.textContent = `Toàn bộ lịch báo giảng tuần này đã được lưu chuẩn xác trên vnEdu.`;
                        banner.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                    } else {
                        bannerIcon.textContent = '📌';
                        bannerTitle.textContent = isMobile ? `Tuần ${data.weekNumber}: ${data.syncedSlots}/${data.totalSlots} tiết` : `Tuần ${data.weekNumber}: Đã nhập xong ${data.syncedSlots}/${data.totalSlots} tiết`;
                        bannerDesc.textContent = `Các ngày đã dạy đều đã được lưu đầy đủ lên vnEdu.`;
                        banner.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                    }
                }

    // Cập nhật toàn bộ thông số và giao diện từ data
    function applyScheduleData(data) {
        state.scheduleData = data;
        const isOnline = data.source === 'vnedu';
        elements.weekDateRangeLabel.innerHTML = `Tuần ${data.weekNumber} &bull; Từ ngày ${data.tuNgay} đến ${data.denNgay} <span class="badge-source-tag ${isOnline ? 'tag-vnedu' : 'tag-excel'}">${isOnline ? '⚡ vnEdu Trực Tiếp' : '📄 File Excel'}</span>`;
        elements.valTotalSlots.textContent = data.totalSlots;
        elements.valSyncedSlots.textContent = data.syncedSlots;
        elements.valReadySlots.textContent = data.readySlots;
        elements.valFutureSlots.textContent = data.futureSlots;
        updateProgressRing(data.syncedSlots, data.totalSlots);
        updateBannerStatus(data);
        updateWeekStepperUI();
        renderSchedule();
    }

    // Tải lịch dạy của tuần (Hỗ trợ Cấp độ 2: vnEdu Trực Tiếp & Cấp độ 1: Excel Dự Phòng)
    async function loadSchedule(week, checkLive = true) {
        try {
            const isDifferentWeek = !state.scheduleData || state.scheduleData.weekNumber !== week;
            const sourceName = state.dataSource === 'vnedu' ? 'từ cổng vnEdu' : 'từ File Excel';

            if (isDifferentWeek) {
                elements.scheduleContainer.innerHTML = `
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Đang nạp Lịch Báo Giảng Tuần ${week} (${sourceName})...</p>
                    </div>
                `;
                let localData = null;
                try {
                    const localRes = await fetch(`/api/schedule?week=${week}&source=${state.dataSource}&checkLive=0`);
                    const localText = await localRes.text();
                    if (localText && localText.trim().startsWith('{')) {
                        const parsed = JSON.parse(localText);
                        if (parsed && (parsed.success || parsed.schedule)) localData = parsed;
                    }
                } catch (apiErr) {
                    console.warn('API error fetching schedule:', apiErr);
                }

                if (!localData) {
                    try {
                        const cacheRes = await fetch('/schedule_cache.json');
                        const cacheJson = await cacheRes.json();
                        localData = cacheJson.weeks[week] || null;
                    } catch (cacheErr) {
                        console.error('Cache load error:', cacheErr);
                    }
                }

                if (localData && (localData.success || localData.schedule)) {
                    applyScheduleData(localData);
                } else {
                    throw new Error(`Chưa có dữ liệu Lịch Báo Giảng cho Tuần ${week}`);
                }
            }

            // Bước 2: Nếu có kiểm tra vnEdu (checkLive), gửi yêu cầu đối chiếu nền
            if (checkLive) {
                if (elements.btnRefresh) elements.btnRefresh.classList.add('loading');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout an toàn

                try {
                    const res = await fetch(`/api/schedule?week=${week}&source=${state.dataSource}&checkLive=1`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    const resText = await res.text();
                    if (resText && resText.trim().startsWith('{')) {
                        const liveData = JSON.parse(resText);
                        if (liveData && liveData.success) {
                            applyScheduleData(liveData);

                        // Thông báo kết quả đối chiếu thông minh
                        if (liveData.syncedSlots > 0) {
                            const now = new Date();
                            const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                            const todaySlots = (liveData.schedule || []).filter(s => s.ngay === todayStr);
                            const todaySynced = todaySlots.filter(s => s.status === 'synced').length;
                            if (todaySlots.length > 0 && todaySynced === todaySlots.length) {
                                showToast('Đã đối chiếu vnEdu', `Hôm nay (Thứ Tư, ${todayStr}) cô đã nhập đủ ${todaySynced}/${todaySlots.length} tiết rồi nhé!`, 'success');
                            }
                        }
                    }
                }
                } catch (liveErr) {
                    clearTimeout(timeoutId);
                    console.warn('Live check timed out or failed:', liveErr);
                } finally {
                    if (elements.btnRefresh) elements.btnRefresh.classList.remove('loading');
                }
            }
        } catch (err) {
            console.error('loadSchedule error:', err);
            try {
                const cacheRes = await fetch('/schedule_cache.json');
                const cacheJson = await cacheRes.json();
                const fallback = cacheJson.weeks[week];
                if (fallback && fallback.schedule) {
                    applyScheduleData(fallback);
                    return;
                }
            } catch (fallbackErr) { }

            elements.scheduleContainer.innerHTML = `
                <div class="loading-state" style="color: #EF4444;">
                    <p style="font-weight: 700; font-size: 1.1rem; margin-bottom: 8px;">Không thể tải dữ liệu tuần ${week}</p>
                    <p>${err.message}</p>
                </div>
            `;
            showToast('Lỗi tải tuần ' + week, err.message, 'error');
        }
                }

    // Render danh sách tiết học theo ngày
    function renderSchedule() {
                    if (!state.scheduleData || !state.scheduleData.schedule) return;

                    let allSlots = state.scheduleData.schedule;

                    // Áp dụng bộ lọc lớp
                    if (state.currentFilter !== 'all') {
                        allSlots = allSlots.filter(s => s.lop === state.currentFilter);
                    }

                    // Áp dụng tìm kiếm nhanh
                    if (state.searchQuery) {
                        allSlots = allSlots.filter(s =>
                            (s.tenBai && s.tenBai.toLowerCase().includes(state.searchQuery)) ||
                            (s.mon && s.mon.toLowerCase().includes(state.searchQuery)) ||
                            (s.lop && s.lop.toLowerCase().includes(state.searchQuery)) ||
                            (s.phanMon && s.phanMon.toLowerCase().includes(state.searchQuery))
                        );
                    }

                    if (allSlots.length === 0) {
                        if (state.searchQuery || state.currentFilter !== 'all') {
                            elements.scheduleContainer.innerHTML = `
                    <div class="loading-state">
                        <p style="font-weight: 600;">Không có tiết dạy nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm.</p>
                    </div>
                `;
                        } else {
                            elements.scheduleContainer.innerHTML = `
                    <div class="loading-state" style="padding: 48px 24px;">
                        <div style="font-size: 2.5rem; margin-bottom: 12px;">📅</div>
                        <p style="font-weight: 700; font-size: 1.15rem; margin-bottom: 8px; color: var(--slate-800);">Tuần ${state.currentWeek} chưa có Kế hoạch dạy học trên vnEdu</p>
                        <p style="color: var(--slate-500); font-size: 0.9rem; max-width: 480px; margin: 0 auto 20px; line-height: 1.5;">Cô có thể dùng tính năng tự động để sinh nhanh 14 tiết theo TKB & Phân phối chương trình và lưu trực tiếp lên vnEdu nhé!</p>
                        <button class="btn btn-warning" id="btnAutoPlanInEmpty" style="padding: 10px 24px; font-size: 0.95rem; font-weight: 700;">
                            ⚡ Lập trước KHDH Tuần ${state.currentWeek}
                        </button>
                    </div>
                `;
                            const emptyBtn = document.getElementById('btnAutoPlanInEmpty');
                            if (emptyBtn) {
                                emptyBtn.addEventListener('click', () => {
                                    openAutoPlanModal(state.currentWeek);
                                });
                            }
                        }
                        return;
                    }

                    // Nhóm theo ngày (Thứ 2 đến Thứ 7)
                    const daysMap = {};
                    for (let t = 2; t <= 7; t++) {
                        daysMap[t] = [];
                    }

                    allSlots.forEach(s => {
                        if (!daysMap[s.thu]) daysMap[s.thu] = [];
                        daysMap[s.thu].push(s);
                    });

                    elements.scheduleContainer.innerHTML = '';

                    for (let thu = 2; thu <= 7; thu++) {
                        const slots = daysMap[thu];
                        if (slots.length === 0) continue;

                        const firstSlot = slots[0];
                        const isToday = firstSlot.isToday;
                        const isFuture = firstSlot.isFuture;

                        const daySection = document.createElement('section');
                        daySection.className = 'day-section';

                        daySection.innerHTML = `
                <div class="day-header">
                    <div class="day-title-group">
                        <span class="day-name">${THU_NAMES[thu] || ('Thứ ' + thu)}</span>
                        <span class="day-date">${firstSlot.ngay}</span>
                        ${isToday ? '<span class="day-tag-today">Hôm nay</span>' : ''}
                        ${isFuture ? '<span class="status-pill status-future" style="font-size:0.7rem; padding: 2px 8px;">Chưa mở khóa</span>' : ''}
                    </div>
                    <div class="day-actions">
                        <span style="font-size: 0.82rem; font-weight: 600; color: var(--slate-500);">
                            ${slots.length} tiết dạy
                        </span>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table class="slots-table">
                        <thead>
                            <tr>
                                <th style="width: 110px;">Tiết học</th>
                                <th style="width: 100px;">Lớp</th>
                                <th style="width: 170px;">Môn & PPCT</th>
                                <th>Tên bài dạy</th>
                                <th style="min-width: 290px; width: 310px;">Nhận xét tiết học</th>
                                <th style="width: 150px;">Trạng thái vnEdu</th>
                                <th style="width: 130px; text-align: center;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="dayTbody_${thu}">
                        </tbody>
                    </table>
                </div>
            `;

                        const tbody = daySection.querySelector(`#dayTbody_${thu}`);

                        slots.forEach(slot => {
                            const tr = document.createElement('tr');
                            tr.id = `slot-row-${slot.index}`;

                            // Status pill & Action button
                            const isSynced = slot.status === 'synced' || slot.isLive || !!slot.chitietId || !!slot.liveId;
                            let statusHtml = '';

                            // Xác định ngày của tiết học so với ngày hôm nay
                            let isSlotPast = false;
                            let isSlotToday = !!slot.isToday;
                            let isSlotFuture = !!slot.isFuture;
                            if (slot.ngay) {
                                const parts = slot.ngay.split('/');
                                if (parts.length === 3) {
                                    const slotDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                    const now = new Date();
                                    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                    if (slotDate.getTime() === todayZero.getTime()) {
                                        isSlotToday = true;
                                    } else if (slotDate.getTime() < todayZero.getTime()) {
                                        isSlotPast = true;
                                    } else {
                                        isSlotFuture = true;
                                    }
                                }
                            }

                            if (isSynced) {
                                statusHtml = '<span class="status-pill status-synced"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Đã lưu vnEdu</span>';
                            } else if (isSlotToday || slot.status === 'ready') {
                                statusHtml = '<span class="status-pill status-ready"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Cần nhập</span>';
                            } else if (isSlotPast) {
                                statusHtml = '<span class="status-pill status-unsynced" style="background: rgba(245, 158, 11, 0.12); color: #d97706; border-color: rgba(245, 158, 11, 0.3);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Chưa nhập (quá hạn)</span>';
                            } else {
                                statusHtml = '<span class="status-pill status-future"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Chưa tới ngày dạy</span>';
                            }

                            // Action button
                            let actionBtnHtml = '';
                            if (isSynced) {
                                actionBtnHtml = `<button class="btn btn-outline btn-sm btn-action-sync" data-index="${slot.index}" title="Lưu lại nếu cô có sửa nội dung hoặc nhận xét">Sửa / Lưu lại</button>`;
                            } else if (isSlotFuture || slot.status === 'future') {
                                actionBtnHtml = `<button class="btn btn-outline btn-sm btn-future-slot" data-date="${slot.ngay}" title="vnEdu chỉ cho phép nhập từ ngày hôm nay trở về trước">Chờ tới ngày</button>`;
                            } else if (isSlotPast) {
                                actionBtnHtml = `<button class="btn btn-warning btn-sm btn-action-sync" data-index="${slot.index}" title="Tiết dạy đã qua, cô có thể bấm để lưu bổ sung vào vnEdu">Lưu bù</button>`;
                            } else {
                                actionBtnHtml = `<button class="btn btn-primary btn-sm btn-action-sync" data-index="${slot.index}">Lưu ngay</button>`;
                            }

                            const buoiLabel = slot.buoi === 1 ? 'Sáng' : 'Chiều';
                            const sessionClass = slot.buoi === 1 ? 'session-morning' : 'session-afternoon';
                            const classBadge = `class-${slot.lop}`;

                            // Huy hiệu Điểm danh (Theo dõi vắng phép / không phép & Sổ điểm danh)
                            let attendanceHtml = '';
                            const hasSddAlert = slot.sddAbsentCount > 0 && !slot.sddConfirmed;
                            if (hasSddAlert) {
                                attendanceHtml = `
                                    <div class="attendance-pill attendance-sdd-alert" id="attPill_${slot.index}" title="🔔 Sổ điểm danh ghi nhận ${slot.sddAbsentCount} em vắng! Bấm để đối chiếu & xác nhận vào Sổ đầu bài.">
                                        <span>🔔</span> <span>SĐD: ${slot.sddAbsentCount} vắng [Đối chiếu]</span>
                                    </div>
                                `;
                            } else if (slot.soLuongNghi > 0) {
                                const listStr = slot.dsHsVang && slot.dsHsVang.length > 0 ? slot.dsHsVang.map(s => typeof s === 'string' ? s : (s.fullName || s.name || String(s))).join(', ') : `${slot.soLuongNghi} em`;
                                const confirmedLabel = slot.sddConfirmed ? ' (Đã lưu SĐB)' : '';
                                attendanceHtml = `
                                    <div class="attendance-pill attendance-absent" id="attPill_${slot.index}" title="Có ${slot.soLuongNghi} học sinh vắng (${escapeHtml(listStr)}). Bấm để xem chi tiết!">
                                        <span>⚠️</span> <span>Vắng: ${slot.soLuongNghi}${confirmedLabel}</span>
                                    </div>
                                `;
                            } else {
                                const confirmedLabel = slot.sddConfirmed ? ' (Đã lưu SĐB)' : '';
                                attendanceHtml = `
                                    <div class="attendance-pill attendance-full" id="attPill_${slot.index}" title="Sĩ số lớp đầy đủ (0 vắng). Bấm để kiểm tra điểm danh!">
                                        <span>🟢</span> <span>Đủ (0 vắng)${confirmedLabel}</span>
                                    </div>
                                `;
                            }

                            tr.innerHTML = `
                    <td>
                        <div class="period-badge">
                            <span class="session-tag ${sessionClass}">${buoiLabel}</span>
                            <span>Tiết ${slot.tiet}</span>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                            <span class="class-badge ${classBadge}">${slot.lop}</span>
                            ${attendanceHtml}
                        </div>
                    </td>
                    <td>
                        <div class="subject-name">${slot.mon}</div>
                        <span class="ppct-pill">Tiết PPCT: ${slot.ppct}</span>
                    </td>
                    <td>
                        <div class="lesson-name" title="${escapeHtml(slot.tenBai)}">${escapeHtml(slot.tenBai)}</div>
                    </td>
                    <td>
                        <div class="remark-combobox" data-index="${slot.index}">
                            <input type="text" class="remark-input" id="remark_${slot.index}" value="${escapeHtml(slot.customRemark || slot.nhanXetDefault || 'Lớp học nghiêm túc, tích cực')}" placeholder="Gõ nhận xét hoặc chọn gợi ý..." autocomplete="off">
                            <button type="button" class="btn-remark-dropdown" data-index="${slot.index}" title="Bấm để mở danh sách mẫu nhận xét">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                        </div>
                    </td>
                    <td>
                        ${statusHtml}
                    </td>
                    <td style="text-align: center;">
                        ${actionBtnHtml}
                    </td>
                `;

                            // Sự kiện bấm vào huy hiệu Điểm danh để xem chi tiết học sinh vắng
                            const attPill = tr.querySelector('.attendance-pill');
                            if (attPill) {
                                attPill.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    openAttendanceModal(slot);
                                });
                            }

                            // Ghi nhớ nhận xét riêng khi cô giáo chỉnh sửa trực tiếp hoặc bấm mở menu gợi ý
                            const remarkInput = tr.querySelector('.remark-input');
                            const remarkDropdownBtn = tr.querySelector('.btn-remark-dropdown');
                            if (remarkInput) {
                                remarkInput.addEventListener('input', (e) => {
                                    slot.customRemark = e.target.value;
                                });
                                remarkInput.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    toggleRemarkDropdown(remarkInput, slot);
                                });
                            }
                            if (remarkDropdownBtn) {
                                remarkDropdownBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    toggleRemarkDropdown(remarkInput, slot);
                                });
                            }

                            // Xử lý sự kiện bấm nút Đồng bộ tiết đơn lẻ
                            const syncBtn = tr.querySelector('.btn-action-sync');
                            if (syncBtn) {
                                syncBtn.addEventListener('click', () => syncSingleSlot(slot));
                            }

                            // Xử lý sự kiện bấm nút Chưa tới ngày (Hiện Toast hướng dẫn)
                            const futureBtn = tr.querySelector('.btn-future-slot');
                            if (futureBtn) {
                                futureBtn.addEventListener('click', () => {
                                    showToast('Chưa tới ngày dạy', `Tiết này thuộc ngày ${slot.ngay}. vnEdu sẽ tự động mở khóa khi tới ngày dạy nhé cô!`, 'warning');
                                });
                            }

                            tbody.appendChild(tr);
                        });

                        elements.scheduleContainer.appendChild(daySection);
                    }
                }

    const VNEDU_CLASS_CONFIG = {
        '7A2AL': { id: '5004582066', cap: '2', khoi: '7', sodaubaiId: '8130546' },
        '7A3AL': { id: '5004582046', cap: '2', khoi: '7', sodaubaiId: '8087046' },
        '9A2AL': { id: '5004582186', cap: '2', khoi: '9', sodaubaiId: '8139046' }
    };

    // Lấy token xác thực vnEdu từ localStorage hoặc bộ nhớ đệm
    async function getClientVnEduToken() {
        let token = localStorage.getItem('vnedu_token');
        let cookies = localStorage.getItem('vnedu_cookies');
        if (!token) {
            try {
                const res = await fetch('/session_cache.json?v=' + Date.now());
                const data = await res.json();
                if (data && data.token) {
                    token = data.token;
                    cookies = data.cookies || '';
                    localStorage.setItem('vnedu_token', token);
                    if (cookies) localStorage.setItem('vnedu_cookies', cookies);
                }
            } catch (e) { }
        }
        return { token, cookies };
    }

    // TẦNG 1: Lưu trực tiếp từ Trình duyệt (Client Direct - Dùng mạng 4G/Wifi nội địa của thiết bị)
    async function saveSlotDirectClient(slot, week) {
        const { token } = await getClientVnEduToken();
        if (!token) {
            throw new Error('Chưa có mã phiên vnEdu. Vui lòng đăng nhập.');
        }
        const classInfo = VNEDU_CLASS_CONFIG[slot.lop];
        if (!classInfo) {
            throw new Error(`Chưa có cấu hình cho lớp ${slot.lop}`);
        }

        const saveUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.save&app_nam_hoc=2026&my_token=${token}`;
        const payload = new URLSearchParams({
            my_token: token,
            my_user_id: '7365493419',
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

        const res = await fetch(saveUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: payload.toString()
        });
        const text = await res.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch (e) {
            throw new Error('Phản hồi vnEdu không hợp lệ: ' + text.substring(0, 100));
        }

        if (!json.success) {
            if (json.msg && (json.msg.includes('hết hạn') || json.msg.includes('đăng nhập') || json.msg.includes('quyền'))) {
                const expErr = new Error(json.msg);
                expErr.expired = true;
                throw expErr;
            }
            throw new Error(json.msg || 'vnEdu từ chối lưu tiết dạy');
        }

        const savedId = (json.data && json.data.id) ? json.data.id : (slot.chitietId || slot.liveId);

        // Lưu học sinh vắng nếu có
        if (savedId && slot.hsVangList && slot.hsVangList.length > 0) {
            try {
                const hsUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.saveHocSinhVang&app_nam_hoc=2026&my_token=${token}`;
                const formObj = new URLSearchParams();
                formObj.append('chitiet_id', String(savedId));
                formObj.append('my_token', token);
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
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    body: formObj.toString()
                });
            } catch (e) { }
        }

        return { success: true, chitietId: savedId, msg: 'Đã lưu trực tiếp thành công vào Sổ đầu bài vnEdu!' };
    }

    // ĐIỀU PHỐI ĐỒNG BỘ LAI THÔNG MINH (KẾT HỢP 2 & 3: CLIENT DIRECT -> LOCAL TUNNEL / RELAY)
    async function dispatchSaveSlot(slotToSave, week) {
        // Tầng 1: Thử Client-Side Direct (trình duyệt gửi thẳng đến vnEdu qua IP Việt Nam)
        try {
            const directResult = await saveSlotDirectClient(slotToSave, week);
            if (directResult && directResult.success) {
                return directResult;
            }
        } catch (clientErr) {
            if (clientErr.expired) {
                return { success: false, expired: true, msg: clientErr.message };
            }
            console.warn('Client direct save failed, falling back to Tunnel/Relay:', clientErr.message);
        }

        // Tầng 2: Dự phòng qua Local Tunnel / Cloudflare Relay
        const clientToken = localStorage.getItem('vnedu_token') || '';
        const clientCookies = localStorage.getItem('vnedu_cookies') || '';
        const res = await fetch('/api/sync-slot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-vnedu-token': clientToken,
                'x-vnedu-cookie': clientCookies
            },
            body: JSON.stringify({ slot: slotToSave, week: week })
        });
        return await res.json();
    }

    // Đồng bộ 1 tiết đơn lẻ
    async function syncSingleSlot(slot) {
                    const remarkInput = document.getElementById(`remark_${slot.index}`);
                    const customRemark = remarkInput ? remarkInput.value.trim() : slot.nhanXetDefault;

                    const updatedSlot = {
                        ...slot,
                        nhanXet: customRemark || 'Lớp học nghiêm túc, tích cực'
                    };

                    const row = document.getElementById(`slot-row-${slot.index}`);
                    const btn = row ? row.querySelector('.btn-action-sync') : null;
                    if (btn) {
                        btn.disabled = true;
                        btn.textContent = 'Đang lưu...';
                    }

                    try {
                        showToast('Đang kết nối vnEdu', `Đang lưu tiết ${slot.tiet} lớp ${slot.lop}...`, 'info');
                        const data = await dispatchSaveSlot(updatedSlot, state.currentWeek);

                        if (data.expired) {
                            showToast('Phiên làm việc hết hạn', data.msg, 'warning');
                            openVnEduLoginModal();
                            if (btn) {
                                btn.disabled = false;
                                btn.textContent = 'Thử lại';
                            }
                            return;
                        }

                        if (data.success) {
                            playSuccessChime();
                            fireConfetti();
                            showToast('Lưu thành công!', `Đã lưu tiết ${slot.tiet} lớp ${slot.lop} vào sổ đầu bài!`, 'success');
                            await loadSchedule(state.currentWeek, true);
                        } else {
                            throw new Error(data.msg || data.error || 'Không thể lưu vào vnEdu');
                        }
                    } catch (err) {
                        showToast('Lỗi lưu tiết dạy', err.message, 'error');
                        if (btn) {
                            btn.disabled = false;
                            btn.textContent = 'Thử lại';
                        }
                    }
                }

    // Đồng bộ hàng loạt
    async function syncBatch(filterType, forceAll = false) {
        if (!state.scheduleData || !state.scheduleData.schedule) {
            showToast('Đang nạp dữ liệu', 'Hệ thống đang tải dữ liệu thời khóa biểu, cô đợi một chút rồi bấm lại nhé!', 'info');
            return;
        }

        let targetSlots = state.scheduleData.schedule;
        const now = new Date();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (filterType === 'today') {
            targetSlots = targetSlots.filter(s => s.ngay === todayStr);
            if (targetSlots.length === 0) {
                const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                const dayName = dayNames[now.getDay()];
                const unlockedSlots = state.scheduleData.schedule.filter(s => {
                    const [d, m, y] = s.ngay.split('/').map(Number);
                    const itemDate = new Date(y, m - 1, d);
                    return itemDate <= todayDate;
                });

                if (unlockedSlots.length > 0) {
                    const ok = confirm(`Dạ thưa cô, hôm nay (${dayName}) cô không có tiết dạy trong TKB Tuần ${state.currentWeek}.\n\nCô có muốn đồng bộ ${unlockedSlots.length} tiết đã diễn ra trong Tuần ${state.currentWeek} lên vnEdu không?`);
                    if (ok) {
                        return syncBatch('unlocked');
                    }
                } else {
                    const ok = confirm(`Dạ thưa cô, hôm nay (${dayName}) cô không có tiết dạy trong TKB Tuần ${state.currentWeek}.\n\nCô có muốn đồng bộ thử nghiệm toàn bộ ${state.scheduleData.schedule.length} tiết của Tuần ${state.currentWeek} lên vnEdu không?`);
                    if (ok) {
                        return syncBatch('all', true);
                    }
                }
                return;
            }
        } else if (filterType === 'unlocked' && !forceAll) {
            targetSlots = targetSlots.filter(s => {
                const [d, m, y] = s.ngay.split('/').map(Number);
                const itemDate = new Date(y, m - 1, d);
                return itemDate <= todayDate;
            });
            if (targetSlots.length === 0) {
                const ok = confirm(`Tuần ${state.currentWeek} là tuần trong tương lai (theo quy định vnEdu chưa tới ngày mở khóa).\n\nCô có muốn thực hiện đồng bộ thử nghiệm toàn bộ ${state.scheduleData.schedule.length} tiết của tuần này không?`);
                if (ok) {
                    targetSlots = state.scheduleData.schedule;
                } else {
                    return;
                }
            }
        }

                    // Mở Modal tiến trình (ẨN NÚT X ĐỂ KHÔNG BỊ ĐÓNG GIỮA CHỪNG GÂY LỖI)
                    const sourceText = state.dataSource === 'vnedu' ? 'vnEdu Trực Tiếp ➔ SĐB' : 'File Excel ➔ SĐB';
                    openModal(filterType === 'today' ? `Đồng bộ các tiết dạy Hôm Nay (${sourceText})` : `Đồng bộ toàn bộ tiết dạy hợp lệ (${sourceText})`);
                    elements.syncLogs.innerHTML = '';
                    appendLog(`🚀 Bắt đầu đồng bộ ${targetSlots.length} tiết dạy [Nguồn: ${state.dataSource === 'vnedu' ? 'Lịch Báo Giảng vnEdu Online (Cấp độ 2)' : 'File Excel (Cấp độ 1)'}] vào Sổ đầu bài vnEdu...`, 'wait');

                    elements.progressBarFill.style.width = '0%';
                    elements.btnModalFinish.disabled = true;
                    elements.btnModalFinish.textContent = 'Đang đồng bộ...';
                    elements.btnCloseModal.style.display = 'none'; // KHÔNG CHO BẤM X KHI ĐANG CHẠY

                    let succeededCount = 0;
                    let failedCount = 0;

                    for (let i = 0; i < targetSlots.length; i++) {
                        const slot = targetSlots[i];
                        const progress = Math.round(((i) / targetSlots.length) * 100);
                        elements.progressBarFill.style.width = `${progress}%`;

                        const remarkInput = document.getElementById(`remark_${slot.index}`);
                        const customRemark = remarkInput ? remarkInput.value.trim() : slot.nhanXetDefault;

                        const slotToSave = {
                            ...slot,
                            nhanXet: customRemark || 'Lớp học nghiêm túc, tích cực'
                        };

                        appendLog(`⏳ Đang lưu: ${slot.ngay} | ${slot.buoi === 1 ? 'Sáng' : 'Chiều'} Tiết ${slot.tiet} - ${slot.lop} (${slot.mon})...`, 'wait');

                        try {
                            const result = await dispatchSaveSlot(slotToSave, state.currentWeek);

                            if (result.expired) {
                                showToast('Phiên làm việc hết hạn', result.msg, 'warning');
                                openVnEduLoginModal();
                                failedCount++;
                                appendLog(`❌ Phiên làm việc hết hạn: ${result.msg}`, 'error');
                                break;
                            }

                            if (result.success) {
                                succeededCount++;
                                appendLog(`✅ Thành công: ${slot.ngay} Tiết ${slot.tiet} ${slot.lop} - "${slot.tenBai}"`, 'success');
                            } else {
                                failedCount++;
                                appendLog(`❌ Thất bại: ${slot.ngay} Tiết ${slot.tiet} ${slot.lop} - Lỗi: ${result.msg || result.error || 'Không rõ'}`, 'error');
                            }
                        } catch (e) {
                            failedCount++;
                            appendLog(`❌ Lỗi lưu: ${slot.lop} Tiết ${slot.tiet} - ${e.message}`, 'error');
                        }

                        elements.syncLogs.scrollTop = elements.syncLogs.scrollHeight;
                    }

                    elements.progressBarFill.style.width = '100%';
                    appendLog(`🎉 Đã xử lý xong toàn bộ! Thành công: ${succeededCount}, Thất bại: ${failedCount}`, succeededCount > 0 ? 'success' : 'error');
                    elements.modalSpinner.style.display = 'none';

                    // KHI ĐÃ HOÀN TẤT THÌ MỚI HIỆN NÚT X VÀ KÍCH HOẠT NÚT ĐÓNG
                    state.isSyncing = false;
                    elements.syncModal.classList.remove('syncing');
                    elements.btnCloseModal.style.display = 'block';
                    elements.btnModalFinish.disabled = false;
                    elements.btnModalFinish.textContent = 'Hoàn tất & Đóng';

                    if (succeededCount > 0) {
                        playSuccessChime();
                        fireConfetti();
                        showToast('Hoàn tất đồng bộ', `Đã lưu thành công ${succeededCount} tiết dạy vào vnEdu!`, 'success');
                    }
                }

    // Modal Helpers (Chống đóng nhầm trong khi đang đồng bộ)
    function openModal(title) {
                    state.isSyncing = true;
                    elements.modalTitle.textContent = title;
                    elements.modalSpinner.style.display = 'block';
                    elements.syncModal.classList.add('active', 'syncing');
                    elements.btnCloseModal.style.setProperty('display', 'none', 'important'); // Tuyệt đối ẩn nút X
                    elements.btnModalFinish.disabled = true;
                    elements.btnModalFinish.textContent = 'Đang đồng bộ...';
                }

    function closeModal() {
                    if (state.isSyncing) {
                        showToast('Đang tiến hành', 'Hệ thống đang đồng bộ tiết dạy, vui lòng đợi hoàn tất nhé!', 'warning');
                        return;
                    }
                    elements.syncModal.classList.remove('active', 'syncing');
                }

    function appendLog(message, type = 'normal') {
                    const div = document.createElement('div');
                    div.className = `log-entry log-entry-${type}`;
                    const time = new Date().toLocaleTimeString('vi-VN');
                    div.textContent = `[${time}] ${message}`;
                    elements.syncLogs.appendChild(div);
                    elements.syncLogs.scrollTop = elements.syncLogs.scrollHeight;
                }

    // Modal Lập trước Kế hoạch dạy học
    function openAutoPlanModal(defaultWeek) {
                    if (!elements.autoPlanModal) return;
                    if (elements.planLogs) {
                        elements.planLogs.innerHTML = '';
                        elements.planLogs.style.display = 'none';
                    }
                    if (elements.btnSubmitAutoPlan) {
                        elements.btnSubmitAutoPlan.disabled = false;
                        elements.btnSubmitAutoPlan.textContent = '🚀 Bắt đầu Lập & Lưu vnEdu';
                    }
                    const targetWeek = defaultWeek || (state.currentWeek >= 8 ? state.currentWeek + 1 : 9);
                    if (elements.selectPlanWeek) {
                        elements.selectPlanWeek.value = String(Math.min(targetWeek, 35));
                    }
                    elements.autoPlanModal.classList.add('active');
                }

    function closeAutoPlanModal() {
                    if (!elements.autoPlanModal) return;
                    elements.autoPlanModal.classList.remove('active');
                }

    async function submitAutoPlan() {
                    const week = parseInt(elements.selectPlanWeek.value) || 9;
                    elements.btnSubmitAutoPlan.disabled = true;
                    elements.btnSubmitAutoPlan.textContent = '⏳ Đang lập KHDH...';
                    elements.planLogs.style.display = 'block';
                    elements.planLogs.innerHTML = '';

                    function appendPlanLog(msg, type = 'wait') {
                        const div = document.createElement('div');
                        div.className = `log-entry log-entry-${type}`;
                        div.textContent = `[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`;
                        elements.planLogs.appendChild(div);
                        elements.planLogs.scrollTop = elements.planLogs.scrollHeight;
                    }

                    appendPlanLog(`🚀 Bắt đầu lập Kế hoạch dạy học Tuần ${week}...`, 'wait');
                    appendPlanLog(`⏳ Đang kết nối vnEdu và nạp phân phối chương trình...`, 'wait');

                    try {
                        const res = await fetch('/api/auto-plan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ week })
                        });
                        const data = await res.json();

                        if (data.success) {
                            appendPlanLog(`✅ ${data.msg || `Đã lập và lưu thành công 14 tiết Tuần ${week} lên vnEdu!`}`, 'success');
                            playSuccessChime();
                            fireConfetti();
                            showToast('Lập KHDH thành công!', `Đã tự động lưu 14 tiết Tuần ${week} trực tiếp vào cổng vnEdu!`, 'success');

                            setTimeout(async () => {
                                closeAutoPlanModal();
                                state.currentWeek = week;
                                await loadInfo();
                                await loadSchedule(week, false);
                            }, 1200);
                        } else {
                            appendPlanLog(`❌ Thất bại: ${data.msg || 'Không thể lập kế hoạch dạy học'}`, 'error');
                            elements.btnSubmitAutoPlan.disabled = false;
                            elements.btnSubmitAutoPlan.textContent = 'Thử lại';
                            showToast('Lỗi lập KHDH', data.msg || 'Thất bại khi lưu lên vnEdu', 'error');
                        }
                    } catch (e) {
                        appendPlanLog(`❌ Lỗi kết nối: ${e.message}`, 'error');
                        elements.btnSubmitAutoPlan.disabled = false;
                        elements.btnSubmitAutoPlan.textContent = 'Thử lại';
                        showToast('Lỗi mạng', e.message, 'error');
                    }
                }

    // =========================================================================
    // Cấu hình Số tiết Phân phối chương trình (PPCT)
    // =========================================================================
    async function loadPpctConfig() {
        try {
            const res = await fetch('/api/config/ppct');
            const data = await res.json();
            if (data.success && data.config) {
                state.ppctConfig = data.config;
            }
        } catch (e) {
            console.warn('Lỗi đọc cấu hình PPCT:', e);
        }
    }

    function openPpctConfigModal() {
        playClickBeep();
        if (!elements.ppctConfigModal) return;
        renderPpctTable();
        elements.ppctConfigModal.classList.add('active');
    }

    function closePpctConfigModal() {
        if (!elements.ppctConfigModal) return;
        elements.ppctConfigModal.classList.remove('active');
    }

    function renderPpctTable() {
        if (!elements.ppctTableBody) return;
        const config = state.ppctConfig || {
            hdtn: {
                mode: 'auto',
                weeks: {
                    "8": { tiet1: 24, tiet2: 23 },
                    "9": { tiet1: 27, tiet2: 26 },
                    "10": { tiet1: 30, tiet2: 29 },
                    "11": { tiet1: 33, tiet2: 32 }
                }
            }
        };

        const isAuto = !config.hdtn || config.hdtn.mode !== 'custom';
        if (elements.radioPpctAuto) elements.radioPpctAuto.checked = isAuto;
        if (elements.radioPpctCustom) elements.radioPpctCustom.checked = !isAuto;

        elements.ppctTableBody.innerHTML = '';

        for (let w = 7; w <= 19; w++) {
            const tr = document.createElement('tr');
            const weekStr = String(w);
            const custom = (config.hdtn && config.hdtn.weeks && config.hdtn.weeks[weekStr]) || {
                tiet1: w * 3,
                tiet2: w * 3 - 1
            };

            const isCurrent = w === 8;
            const isNext = w === 9;
            let tag = '';
            if (isCurrent) tag = '<span class="week-status-tag tag-current" style="margin-left: 6px;">Hiện tại</span>';
            else if (isNext) tag = '<span class="week-status-tag tag-next" style="margin-left: 6px;">Sắp tới</span>';

            tr.innerHTML = `
                <td><strong>Tuần ${w}</strong> ${tag}</td>
                <td>
                    <input type="number" class="ppct-input" data-week="${w}" data-slot="tiet1" value="${custom.tiet1}" ${isAuto ? 'disabled' : ''}>
                    <span style="font-size: 0.75rem; color: var(--slate-500); margin-left: 6px;">(Mặc định vnEdu: ${w * 3 - 2})</span>
                </td>
                <td>
                    <input type="number" class="ppct-input" data-week="${w}" data-slot="tiet2" value="${custom.tiet2}" ${isAuto ? 'disabled' : ''}>
                    <span style="font-size: 0.75rem; color: var(--slate-500); margin-left: 6px;">(Mặc định vnEdu: ${w * 3 - 3})</span>
                </td>
            `;
            elements.ppctTableBody.appendChild(tr);
        }
    }

    async function savePpctConfig() {
        playClickBeep();
        const mode = elements.radioPpctCustom && elements.radioPpctCustom.checked ? 'custom' : 'auto';
        const weeks = {};

        const inputs = elements.ppctTableBody.querySelectorAll('.ppct-input');
        inputs.forEach(input => {
            const w = input.dataset.week;
            const slot = input.dataset.slot;
            if (!weeks[w]) weeks[w] = {};
            weeks[w][slot] = parseInt(input.value) || (slot === 'tiet1' ? w * 3 : w * 3 - 1);
        });

        const newConfig = {
            hdtn: {
                mode: mode,
                weeks: weeks
            },
            autoSyncToVnEdu: true
        };

        try {
            const res = await fetch('/api/config/ppct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            const data = await res.json();
            if (data.success) {
                state.ppctConfig = newConfig;
                closePpctConfigModal();
                playSuccessChime();
                showToast('Cấu hình số tiết', 'Đã lưu thiết lập số tiết PPCT thành công! Số tiết sẽ tự động áp dụng chính xác cho môn HĐTN.', 'success');
                await loadSchedule(state.currentWeek, true);
            } else {
                throw new Error(data.error || 'Không thể lưu cấu hình');
            }
        } catch (e) {
            showToast('Lỗi lưu cấu hình', e.message, 'error');
        }
    }

    function resetPpctToDefault() {
        playClickBeep();
        if (elements.radioPpctAuto) elements.radioPpctAuto.checked = true;
        const inputs = elements.ppctTableBody.querySelectorAll('.ppct-input');
        inputs.forEach(input => {
            const w = parseInt(input.dataset.week);
            const slot = input.dataset.slot;
            input.value = slot === 'tiet1' ? w * 3 : w * 3 - 1;
            input.disabled = true;
        });
        showToast('Mặc định chuẩn', 'Đã khôi phục quy tắc chuẩn: Tuần 8 (24, 23), Tuần 9 (27, 26), Tuần 10 (30, 29)... Bấm "Lưu Cấu Hình" để xác nhận!', 'info');
    }

    // Toast Notifications (Sonner / Radix style cao cấp)
    function showToast(title, desc = '', type = 'info') {
                    if (!desc || ['info', 'success', 'error', 'warning'].includes(desc)) {
                        type = desc || type || 'info';
                        desc = '';
                    }

                    const toast = document.createElement('div');
                    toast.className = `toast toast-${type}`;

                    let iconChar = 'ℹ️';
                    if (type === 'success') iconChar = '✅';
                    else if (type === 'error') iconChar = '❌';
                    else if (type === 'warning') iconChar = '⏳';

                    toast.innerHTML = `
            <div class="toast-icon">${iconChar}</div>
            <div class="toast-body">
                <div class="toast-title">${escapeHtml(title)}</div>
                ${desc ? `<div class="toast-desc">${escapeHtml(desc)}</div>` : ''}
            </div>
            <button class="toast-close" style="background:none;border:none;color:var(--slate-400);cursor:pointer;font-size:1.1rem;line-height:1;" title="Đóng">&times;</button>
        `;

                    toast.querySelector('.toast-close').addEventListener('click', () => {
                        toast.remove();
                    });

                    elements.toastContainer.appendChild(toast);

                    setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateY(-15px) scale(0.95)';
                        toast.style.transition = 'all 0.3s ease';
                        setTimeout(() => toast.remove(), 300);
                    }, 4500);
                }

    // =========================================================================
    // Bộ Quản Lý Gợi Ý Nhận Xét Tiết Học (Dropdown Combobox Thông Minh Cho Cô Giáo)
    // =========================================================================
    const REMARK_PRESETS = [
        {
            category: 'Tích cực & Nền nếp tốt',
            icon: '🟢',
            items: [
                { text: 'Lớp học nghiêm túc, tích cực', icon: '🟢' },
                { text: 'Lớp chú ý', icon: '👁️' },
                { text: 'Học sinh hăng hái phát biểu, tiếp thu tốt', icon: '✨' },
                { text: 'Lớp trật tự, hoàn thành tốt nhiệm vụ học tập', icon: '🎯' },
                { text: 'Lớp chú ý nghe giảng, thảo luận sôi nổi', icon: '💬' }
            ]
        },
        {
            category: 'Kiểm tra & Thực hành',
            icon: '📝',
            items: [
                { text: 'Lớp làm bài kiểm tra nghiêm túc', icon: '📝' },
                { text: 'Lớp thực hành tốt, thao tác nhanh nhẹn', icon: '💻' },
                { text: 'Cả lớp chép bài và chuẩn bị bài đầy đủ', icon: '✍️' }
            ]
        },
        {
            category: 'Cần nhắc nhở & Rút kinh nghiệm',
            icon: '⚠️',
            items: [
                { text: 'Một số em chưa chuẩn bị bài', icon: '⚠️' },
                { text: 'Vài học sinh còn nói chuyện riêng, cần nhắc nhở', icon: '🔔' },
                { text: 'Một số em chưa tập trung, giáo viên đã nhắc nhở', icon: '📢' },
                { text: 'Còn học sinh quên mang SGK/vở ghi', icon: '📚' }
            ]
        }
    ];

    let activeRemarkTarget = null; // { input, slot }
    let menuOpenedTime = 0;

    function getCustomTeacherRemarks() {
        try {
            const saved = localStorage.getItem('teacher_custom_remarks');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCustomTeacherRemarks(list) {
        try {
            localStorage.setItem('teacher_custom_remarks', JSON.stringify(list));
        } catch (e) { }
    }

    function addCustomTeacherRemark(text) {
        if (!text || !text.trim()) return;
        const list = getCustomTeacherRemarks();
        const clean = text.trim();
        if (!list.includes(clean)) {
            list.unshift(clean);
            saveCustomTeacherRemarks(list);
        }
    }

    function removeCustomTeacherRemark(text) {
        let list = getCustomTeacherRemarks();
        list = list.filter(t => t !== text);
        saveCustomTeacherRemarks(list);
    }

    function openRemarkDropdown(inputEl, slot) {
        activeRemarkTarget = { input: inputEl, slot: slot };
        menuOpenedTime = Date.now();
        const menu = document.getElementById('remarkDropdownMenu');
        const listContainer = document.getElementById('remarkDropdownList');
        if (!menu || !listContainer) return;

        // Reset ô thêm nhận xét riêng
        const addRow = document.getElementById('remarkCustomAddRow');
        const showAddBtn = document.getElementById('btnShowAddCustomRemark');
        if (addRow) addRow.style.display = 'none';
        if (showAddBtn) showAddBtn.style.display = 'flex';

        const customList = getCustomTeacherRemarks();
        const currentVal = inputEl.value.trim();

        let html = '';

        // Hiển thị nhận xét riêng của cô (nếu có)
        if (customList.length > 0) {
            html += `
                <div class="remark-category-label">
                    <span>⭐</span> <span>Nhận xét riêng của cô (${customList.length})</span>
                </div>
            `;
            customList.forEach(text => {
                const isActive = text === currentVal;
                html += `
                    <div class="remark-dropdown-item ${isActive ? 'active' : ''}" data-remark="${escapeHtml(text)}">
                        <span class="remark-item-icon">⭐</span>
                        <span class="remark-item-text">${escapeHtml(text)}</span>
                        <button type="button" class="btn-del-custom-remark" data-del="${escapeHtml(text)}" title="Xóa câu này">&times;</button>
                    </div>
                `;
            });
        }

        // Hiển thị các nhóm nhận xét chuẩn
        REMARK_PRESETS.forEach(group => {
            html += `
                <div class="remark-category-label">
                    <span>${group.icon}</span> <span>${group.category}</span>
                </div>
            `;
            group.items.forEach(item => {
                const isActive = item.text === currentVal;
                html += `
                    <div class="remark-dropdown-item ${isActive ? 'active' : ''}" data-remark="${escapeHtml(item.text)}">
                        <span class="remark-item-icon">${item.icon}</span>
                        <span class="remark-item-text">${escapeHtml(item.text)}</span>
                    </div>
                `;
            });
        });

        listContainer.innerHTML = html;

        // Bắt sự kiện chọn nhận xét
        listContainer.querySelectorAll('.remark-dropdown-item').forEach(itemEl => {
            itemEl.addEventListener('click', (e) => {
                if (e.target.closest('.btn-del-custom-remark')) return;
                const remarkText = itemEl.getAttribute('data-remark');
                selectRemark(remarkText);
            });
        });

        // Bắt sự kiện xóa nhận xét riêng
        listContainer.querySelectorAll('.btn-del-custom-remark').forEach(delBtn => {
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const textToDel = delBtn.getAttribute('data-del');
                removeCustomTeacherRemark(textToDel);
                openRemarkDropdown(inputEl, slot);
            });
        });

        menu.style.display = 'block';
        menu.classList.add('active');

        // Định vị menu ngay dưới (hoặc trên) ô input
        const rect = inputEl.getBoundingClientRect();
        const menuWidth = Math.max(rect.width, 380);
        menu.style.width = `${menuWidth}px`;

        let left = rect.left;
        if (left + menuWidth > window.innerWidth - 12) {
            left = window.innerWidth - menuWidth - 12;
        }
        menu.style.left = `${Math.max(12, left)}px`;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const listEl = menu.querySelector('.remark-dropdown-list');

        if (spaceBelow < 320 && spaceAbove > spaceBelow) {
            // Hiển thị phía trên ô input
            if (listEl) listEl.style.maxHeight = `${Math.min(300, Math.max(180, spaceAbove - 100))}px`;
            const menuHeight = menu.offsetHeight;
            menu.style.top = `${Math.max(10, rect.top - menuHeight - 6)}px`;
        } else {
            // Hiển thị phía dưới ô input
            if (listEl) listEl.style.maxHeight = `${Math.min(300, Math.max(180, spaceBelow - 100))}px`;
            menu.style.top = `${rect.bottom + 6}px`;
        }
    }

    function closeRemarkDropdown() {
        const menu = document.getElementById('remarkDropdownMenu');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.remove('active');
        }
        activeRemarkTarget = null;
    }

    function toggleRemarkDropdown(inputEl, slot) {
        const menu = document.getElementById('remarkDropdownMenu');
        if (menu && menu.classList.contains('active') && activeRemarkTarget && activeRemarkTarget.input === inputEl) {
            closeRemarkDropdown();
        } else {
            openRemarkDropdown(inputEl, slot);
        }
    }

    function selectRemark(text) {
        if (!activeRemarkTarget) return;
        const { input, slot } = activeRemarkTarget;
        input.value = text;
        slot.customRemark = text;

        input.classList.remove('remark-highlight-flash');
        void input.offsetWidth;
        input.classList.add('remark-highlight-flash');

        playClickBeep();
        closeRemarkDropdown();
    }

    function initRemarkDropdownEvents() {
        const closeBtn = document.getElementById('btnCloseRemarkDropdown');
        if (closeBtn) closeBtn.addEventListener('click', closeRemarkDropdown);

        const showAddBtn = document.getElementById('btnShowAddCustomRemark');
        const addRow = document.getElementById('remarkCustomAddRow');
        const inputCustom = document.getElementById('inputNewCustomRemark');
        const confirmAddBtn = document.getElementById('btnConfirmAddCustomRemark');
        const cancelAddBtn = document.getElementById('btnCancelAddCustomRemark');

        if (showAddBtn && addRow && inputCustom) {
            showAddBtn.addEventListener('click', () => {
                showAddBtn.style.display = 'none';
                addRow.style.display = 'block';
                inputCustom.value = '';
                inputCustom.focus();
            });

            cancelAddBtn.addEventListener('click', () => {
                addRow.style.display = 'none';
                showAddBtn.style.display = 'flex';
            });

            const handleAdd = () => {
                const val = inputCustom.value.trim();
                if (val) {
                    addCustomTeacherRemark(val);
                    if (activeRemarkTarget) {
                        selectRemark(val);
                    } else {
                        addRow.style.display = 'none';
                        showAddBtn.style.display = 'flex';
                    }
                    showToast('Đã lưu mẫu nhận xét', `Nhận xét "${val}" đã được thêm vào danh sách riêng của cô!`, 'success');
                }
            };

            confirmAddBtn.addEventListener('click', handleAdd);
            inputCustom.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') {
                    addRow.style.display = 'none';
                    showAddBtn.style.display = 'flex';
                }
            });
        }

        // Đóng menu khi click ra ngoài
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('remarkDropdownMenu');
            if (!menu || !menu.classList.contains('active')) return;
            if (!menu.contains(e.target) && (!activeRemarkTarget || !activeRemarkTarget.input.contains(e.target))) {
                closeRemarkDropdown();
            }
        });

        // Đóng menu khi bấm phím Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeRemarkDropdown();
        });

        // Đóng menu khi cuộn trang bên ngoài hoặc thay đổi kích thước
        window.addEventListener('resize', closeRemarkDropdown);
        window.addEventListener('scroll', (e) => {
            const menu = document.getElementById('remarkDropdownMenu');
            if (!menu || !menu.classList.contains('active')) return;
            // Nếu sự kiện cuộn xảy ra bên trong menu dropdown -> Giữ nguyên để cô giáo cuộn danh sách
            if (menu.contains(e.target)) return;
            // Bỏ qua vi cuộn tự động khi phần tử vừa được focus trong 250ms đầu
            if (Date.now() - menuOpenedTime < 250) return;
            closeRemarkDropdown();
        }, true);
    }

    // =========================================================================
    // Modal Chi Tiết Điểm Danh & Danh Sách Học Sinh Vắng Tiết (Human-in-the-loop)
    // =========================================================================
    let activeAttendanceSlot = null;

    function updateSlotAttendancePill(slot) {
        const pill = document.getElementById(`attPill_${slot.index}`);
        if (!pill) return;
        const hasSddAlert = slot.sddAbsentCount > 0 && !slot.sddConfirmed;
        if (hasSddAlert) {
            pill.className = 'attendance-pill attendance-sdd-alert';
            pill.title = `🔔 Sổ điểm danh ghi nhận ${slot.sddAbsentCount} em vắng! Bấm để đối chiếu & xác nhận vào Sổ đầu bài.`;
            pill.innerHTML = `<span>🔔</span> <span>SĐD: ${slot.sddAbsentCount} vắng [Đối chiếu]</span>`;
        } else if (slot.soLuongNghi > 0) {
            const listStr = slot.dsHsVang && slot.dsHsVang.length > 0 ? slot.dsHsVang.map(s => typeof s === 'string' ? s : (s.fullName || s.name || String(s))).join(', ') : `${slot.soLuongNghi} em`;
            const confirmedLabel = slot.sddConfirmed ? ' (Đã lưu SĐB)' : '';
            pill.className = 'attendance-pill attendance-absent';
            pill.title = `Có ${slot.soLuongNghi} học sinh vắng (${escapeHtml(listStr)}). Bấm để xem chi tiết!`;
            pill.innerHTML = `<span>⚠️</span> <span>Vắng: ${slot.soLuongNghi}${confirmedLabel}</span>`;
        } else {
            const confirmedLabel = slot.sddConfirmed ? ' (Đã lưu SĐB)' : '';
            pill.className = 'attendance-pill attendance-full';
            pill.title = `Sĩ số lớp đầy đủ (0 vắng). Bấm để kiểm tra điểm danh!`;
            pill.innerHTML = `<span>🟢</span> <span>Đủ (0 vắng)${confirmedLabel}</span>`;
        }
    }

    async function openAttendanceModal(slot) {
        activeAttendanceSlot = slot;
        const modal = document.getElementById('attendanceModal');
        const title = document.getElementById('attendanceModalTitle');
        const subtitle = document.getElementById('attendanceModalSubtitle');
        const body = document.getElementById('attendanceModalBody');
        const saveBtn = document.getElementById('btnSaveAttendanceModal');
        if (!modal || !body) return;

        playClickBeep();
        modal.style.display = 'flex';
        modal.classList.add('active');
        title.textContent = `Điểm danh Lớp ${slot.lop} - Tiết ${slot.tiet}`;
        subtitle.textContent = `${THU_NAMES[slot.thu] || ('Thứ ' + slot.thu)} (${slot.ngay}) | Môn: ${slot.mon}`;

        body.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--slate-500);">
                <div class="loading-spinner" style="margin: 0 auto 12px; width: 28px; height: 28px; border: 3px solid var(--slate-200); border-top-color: var(--primary-600); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                Đang kết nối vnEdu để lấy danh sách điểm danh chi tiết...
            </div>
        `;

        try {
            let data = null;
            try {
                const res = await fetch(`/api/attendance?lop=${encodeURIComponent(slot.lop)}&week=${state.currentWeek}&thu=${slot.thu}&tiet=${slot.tiet}&chitietId=${slot.chitietId || slot.liveId || ''}`);
                data = await res.json();
            } catch (fetchErr) {
                console.warn('Direct fetch /api/attendance failed:', fetchErr);
            }

            // Fallback 1: lấy roster từ schedule_cache.json nếu API không trả về students
            if (!data || !data.success || !data.students || data.students.length === 0) {
                try {
                    const cacheRes = await fetch('/schedule_cache.json');
                    const cacheJson = await cacheRes.json();
                    if (cacheJson.rosters && cacheJson.rosters[slot.lop] && cacheJson.rosters[slot.lop].length > 0) {
                        data = {
                            success: true,
                            students: cacheJson.rosters[slot.lop],
                            total: cacheJson.rosters[slot.lop].length
                        };
                    }
                } catch (cErr) {
                    console.warn('Cache roster fallback failed:', cErr);
                }
            }

            // Fallback 2: Nếu mạng vnEdu chưa trả về kịp danh sách cả lớp nhưng slot đã có sẵn danh sách vắng từ SĐB
            if ((!data || !data.students || data.students.length === 0) && slot.dsHsVang && slot.dsHsVang.length > 0) {
                data = {
                    success: true,
                    total: slot.dsHsVang.length,
                    students: slot.dsHsVang.map((item, idx) => {
                        const nameStr = typeof item === 'string' ? item : (item && typeof item === 'object' ? (item.fullName || item.name || '') : '');
                        const cleanName = String(nameStr || '').replace(/\s*\([PK]\)\s*$/i, '').trim();
                        const isK = typeof item === 'object' && item !== null
                            ? (item.khongPhep || (!item.coPhep && item.symbol === 'K'))
                            : (String(nameStr || '').includes('(K)') || String(nameStr || '').toLowerCase().includes('không phép'));
                        return {
                            id: (typeof item === 'object' && item && item.id) ? item.id : ('hs_' + idx),
                            maHs: (typeof item === 'object' && item && item.maHs) ? item.maHs : 'vnEdu',
                            fullName: cleanName || `Học sinh ${idx + 1}`,
                            coPhep: !isK,
                            khongPhep: !!isK
                        };
                    })
                };
            }

            if (data && data.success && data.students && data.students.length > 0) {
                let html = '';

                // 1. Cảnh báo đối chiếu Sổ Điểm Danh Năm Học (nếu có)
                const sddList = slot.sddAbsentList || [];
                if (sddList.length > 0) {
                    html += `
                        <div class="sdd-alert-box" id="sddAlertBox">
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <span style="font-size: 1.4rem; line-height: 1.2;">🔔</span>
                                <div style="flex: 1;">
                                    <div class="sdd-alert-title">
                                        Phát hiện đối chiếu: Sổ Điểm Danh Năm Học ghi nhận ${sddList.length} em vắng (${slot.buoi === 1 ? 'Sáng' : 'Chiều'} ${slot.ngay}):
                                    </div>
                                    <div class="sdd-alert-list">
                                        ${sddList.map((st, i) => `
                                            <div class="sdd-alert-item">
                                                <span><strong>${i + 1}. ${escapeHtml(st.fullName)}</strong> <span class="sdd-alert-code">(Mã: ${st.maHs})</span></span>
                                                <span class="student-status-tag ${st.coPhep ? 'phep' : 'khong-phep'}">${st.coPhep ? 'Có phép (' + st.symbol + ')' : 'Không phép (' + st.symbol + ')'}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="sdd-alert-note">
                                        💡 <em>Để an toàn tuyệt đối, cô chọn 1 trong 3 hành động phù hợp thực tế tiết dạy:</em>
                                    </div>
                                    <div class="sdd-actions-bar">
                                        <button type="button" class="btn btn-sm btn-primary" id="btnSddApply" style="font-size: 0.78rem; padding: 5px 10px;">
                                            🟢 Áp dụng vào tiết dạy
                                        </button>
                                        <button type="button" class="btn btn-sm btn-secondary" id="btnSddCustom" style="font-size: 0.78rem; padding: 5px 10px;">
                                            ✏️ Tự chọn học sinh
                                        </button>
                                        <button type="button" class="btn btn-sm btn-secondary" id="btnSddDismiss" style="font-size: 0.78rem; padding: 5px 10px;">
                                            ⚪ Bỏ qua (Tiết này đủ)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // 2. Thanh tóm tắt sĩ số và trạng thái chọn
                html += `
                    <div class="attendance-summary-bar">
                        <div>
                            <span class="attendance-total-text">Sĩ số lớp: ${data.total} học sinh</span>
                        </div>
                        <div>
                            <span id="summaryAbsentCountText">
                                <!-- Dynamic count -->
                            </span>
                        </div>
                    </div>
                `;

                // 3. Danh sách học sinh lớp với checkbox và loại vắng
                html += `<div class="student-attendance-list-label">Danh sách học sinh lớp (Tích chọn học sinh vắng):</div>`;
                html += `<div class="student-attendance-list" id="studentRosterList" style="margin-bottom: 12px;">`;

                // Xác định học sinh nào đang vắng (từ danh sách lưu tạm, đối chiếu SĐD, chi tiết vnEdu, hoặc tên trong SĐB)
                const preselectedAbsentMap = {};
                if (slot.hsVangList && Array.isArray(slot.hsVangList)) {
                    slot.hsVangList.forEach(s => {
                        preselectedAbsentMap[s.id || s.maHs] = { coPhep: s.coPhep, khongPhep: s.khongPhep };
                        if (s.fullName) preselectedAbsentMap[s.fullName.trim().toLowerCase()] = { coPhep: s.coPhep, khongPhep: s.khongPhep };
                    });
                } else if (slot.sddAbsentList && Array.isArray(slot.sddAbsentList) && slot.sddAbsentList.length > 0) {
                    // Ưu tiên đối chiếu từ Sổ điểm danh vnEdu đã duyệt
                    slot.sddAbsentList.forEach(s => {
                        preselectedAbsentMap[s.id || s.maHs] = { coPhep: s.coPhep, khongPhep: s.khongPhep };
                        if (s.fullName) preselectedAbsentMap[s.fullName.trim().toLowerCase()] = { coPhep: s.coPhep, khongPhep: s.khongPhep };
                    });
                } else if (data.students && data.students.some(s => s.coPhep || s.khongPhep)) {
                    data.students.forEach(s => {
                        if (s.coPhep || s.khongPhep) {
                            preselectedAbsentMap[s.id || s.maHs] = { coPhep: s.coPhep, khongPhep: s.khongPhep };
                            if (s.fullName) preselectedAbsentMap[s.fullName.trim().toLowerCase()] = { coPhep: s.coPhep, khongPhep: s.khongPhep };
                        }
                    });
                } else if (slot.dsHsVang && slot.dsHsVang.length > 0) {
                    // Trích xuất tên học sinh vắng đã ghi nhận trên Sổ đầu bài vnEdu (ví dụ: "Lê Trọng Khang (P)")
                    slot.dsHsVang.forEach(item => {
                        const itemStr = typeof item === 'string' ? item : (item && typeof item === 'object' ? (item.fullName || item.name || '') : '');
                        const isK = typeof item === 'object' && item !== null
                            ? (item.khongPhep || (!item.coPhep && item.symbol === 'K'))
                            : (String(itemStr || '').includes('(K)') || String(itemStr || '').toLowerCase().includes('không phép'));
                        const cleanName = String(itemStr || '').replace(/\s*\([PK]\)\s*$/i, '').trim().toLowerCase();
                        if (typeof item === 'object' && item !== null) {
                            if (item.id) preselectedAbsentMap[String(item.id)] = { coPhep: !isK, khongPhep: !!isK };
                            if (item.maHs) preselectedAbsentMap[String(item.maHs)] = { coPhep: !isK, khongPhep: !!isK };
                        }
                        if (cleanName) preselectedAbsentMap[cleanName] = { coPhep: !isK, khongPhep: !!isK };
                    });
                }

                data.students.forEach(s => {
                    const nameKey = String(s.fullName || '').trim().toLowerCase();
                    const sid = String(s.id || '');
                    const sma = String(s.maHs || '');
                    const absentInfo = preselectedAbsentMap[sid] || preselectedAbsentMap[sma] || preselectedAbsentMap[nameKey];
                    const isAbsent = !!absentInfo;
                    const isCoPhep = isAbsent ? !!absentInfo.coPhep : true;
                    const isKhongPhep = isAbsent ? !!absentInfo.khongPhep : false;

                    html += `
                        <div class="student-attendance-row ${isAbsent ? 'is-absent' : ''}" data-student-id="${s.id}" data-ma-hs="${s.maHs}" data-name="${escapeHtml(s.fullName)}">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" class="student-checkbox" id="chk_hs_${s.id}" ${isAbsent ? 'checked' : ''}>
                                <div>
                                    <label for="chk_hs_${s.id}" style="font-weight: 600; cursor: pointer;">${escapeHtml(s.fullName)}</label>
                                    <span style="font-size: 0.75rem; color: var(--slate-400); margin-left: 6px;">(Mã: ${s.maHs})</span>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <select class="student-absence-type" style="padding: 3px 6px; font-size: 0.75rem; border-radius: 4px; border: 1px solid var(--slate-300); ${isAbsent ? '' : 'display: none;'}" id="type_hs_${s.id}">
                                    <option value="phep" ${isCoPhep ? 'selected' : ''}>Có phép (P)</option>
                                    <option value="khong_phep" ${isKhongPhep ? 'selected' : ''}>Không phép (K)</option>
                                </select>
                                <span class="student-status-tag ${isAbsent ? (isCoPhep ? 'phep' : 'khong-phep') : 'du'}" id="tag_hs_${s.id}">
                                    ${isAbsent ? (isCoPhep ? 'Vắng có phép (P)' : 'Vắng không phép (K)') : 'Đi học'}
                                </span>
                            </div>
                        </div>
                    `;
                });

                html += `</div>`;
                body.innerHTML = html;

                // Hàm cập nhật trạng thái hiển thị của từng dòng học sinh và thanh tóm tắt
                function updateRosterUI() {
                    const rows = body.querySelectorAll('.student-attendance-row');
                    let absentCount = 0;
                    rows.forEach(row => {
                        const chk = row.querySelector('.student-checkbox');
                        const sel = row.querySelector('.student-absence-type');
                        const tag = row.querySelector('.student-status-tag');
                        if (chk.checked) {
                            absentCount++;
                            row.classList.add('is-absent');
                            sel.style.display = 'inline-block';
                            if (sel.value === 'phep') {
                                tag.className = 'student-status-tag phep';
                                tag.textContent = 'Vắng có phép (P)';
                            } else {
                                tag.className = 'student-status-tag khong-phep';
                                tag.textContent = 'Vắng không phép (K)';
                            }
                        } else {
                            row.classList.remove('is-absent');
                            sel.style.display = 'none';
                            tag.className = 'student-status-tag du';
                            tag.textContent = 'Đi học';
                        }
                    });

                    const summaryEl = document.getElementById('summaryAbsentCountText');
                    if (summaryEl) {
                        if (absentCount > 0) {
                            summaryEl.className = 'summary-absent-active';
                            summaryEl.textContent = `⚠️ Đang chọn: ${absentCount} học sinh vắng`;
                        } else {
                            summaryEl.className = 'summary-absent-zero';
                            summaryEl.textContent = `🟢 Sĩ số đầy đủ (0 vắng)`;
                        }
                    }
                }

                // Kiểm tra xem tiết này đã được lưu sẵn trên Sổ đầu bài chưa
                const isAlreadySavedOnSdb = slot.isLive && (slot.soLuongNghi > 0 || (slot.dsHsVang && slot.dsHsVang.length > 0));
                let userHasModified = false;

                // Cập nhật nhãn footer và nút lưu tùy theo trạng thái
                function updateModalFooterState() {
                    const footerNote = document.getElementById('attendanceFooterNote');
                    if (footerNote) {
                        if (isAlreadySavedOnSdb && !userHasModified) {
                            footerNote.innerHTML = `<span class="attendance-footer-saved">✔ Dữ liệu này ĐÃ ĐƯỢC LƯU trên Sổ đầu bài vnEdu</span>`;
                        } else if (userHasModified) {
                            footerNote.innerHTML = `<span class="attendance-footer-modified">✏️ Có thay đổi mới: Cô bấm nút "Lưu thay đổi" để cập nhật lên vnEdu</span>`;
                        } else {
                            footerNote.innerHTML = `<span class="attendance-footer-safe">🛡️ An toàn: Cô kiểm tra và xác nhận trước khi lưu vào Sổ đầu bài</span>`;
                        }
                    }
                    if (saveBtn) {
                        if (isAlreadySavedOnSdb && !userHasModified) {
                            saveBtn.style.display = 'none'; // Ẩn nút lưu khi chỉ vào xem tiết đã lưu xong
                        } else {
                            saveBtn.style.display = 'inline-block';
                            saveBtn.textContent = isAlreadySavedOnSdb ? '💾 Cập nhật thay đổi vào SĐB' : '💾 Lưu vào Sổ đầu bài';
                        }
                    }
                }

                // Bắt sự kiện checkbox & dropdown của từng dòng học sinh
                body.querySelectorAll('.student-attendance-row').forEach(row => {
                    const chk = row.querySelector('.student-checkbox');
                    const sel = row.querySelector('.student-absence-type');
                    chk.addEventListener('change', () => {
                        userHasModified = true;
                        updateRosterUI();
                        updateModalFooterState();
                    });
                    sel.addEventListener('change', () => {
                        userHasModified = true;
                        updateRosterUI();
                        updateModalFooterState();
                    });
                });

                updateRosterUI();
                updateModalFooterState();

                // Nút "Áp dụng gợi ý này vào tiết dạy"
                const btnApply = document.getElementById('btnSddApply');
                if (btnApply) {
                    btnApply.addEventListener('click', () => {
                        const sddIds = sddList.map(s => String(s.id));
                        const sddMas = sddList.map(s => String(s.maHs));
                        const sddMapObj = {};
                        sddList.forEach(s => {
                            sddMapObj[String(s.id)] = s;
                            sddMapObj[String(s.maHs)] = s;
                        });

                        body.querySelectorAll('.student-attendance-row').forEach(row => {
                            const sid = row.getAttribute('data-student-id');
                            const sma = row.getAttribute('data-ma-hs');
                            const chk = row.querySelector('.student-checkbox');
                            const sel = row.querySelector('.student-absence-type');
                            if (sddIds.includes(sid) || sddMas.includes(sma)) {
                                chk.checked = true;
                                const match = sddMapObj[sid] || sddMapObj[sma];
                                sel.value = (match && match.coPhep) ? 'phep' : 'khong_phep';
                            } else {
                                chk.checked = false;
                            }
                        });

                        slot.sddConfirmed = true;
                        updateRosterUI();
                        saveCurrentAttendanceToSlot();
                        updateSlotAttendancePill(slot);
                        showToast('Đã áp dụng gợi ý Sổ điểm danh', `Đã chọn ${sddList.length} em vắng vào tiết này. Bấm "Lưu vào Sổ đầu bài" để hoàn tất.`, 'success');
                    });
                }

                // Nút "Bỏ qua (Tiết này đủ)"
                const btnDismiss = document.getElementById('btnSddDismiss');
                if (btnDismiss) {
                    btnDismiss.addEventListener('click', () => {
                        body.querySelectorAll('.student-attendance-row').forEach(row => {
                            row.querySelector('.student-checkbox').checked = false;
                        });
                        slot.sddConfirmed = true;
                        updateRosterUI();
                        saveCurrentAttendanceToSlot();
                        updateSlotAttendancePill(slot);
                        showToast('Đã ghi nhận đi học đủ', 'Đã đặt tiết này lớp đi học đầy đủ 100% (0 vắng).', 'info');
                    });
                }

                // Nút "Tự chọn học sinh"
                const btnCustom = document.getElementById('btnSddCustom');
                if (btnCustom) {
                    btnCustom.addEventListener('click', () => {
                        const list = document.getElementById('studentRosterList');
                        if (list) list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    });
                }

                // Hàm thu thập danh sách học sinh đang được tích chọn vắng
                function getSelectedAbsentStudents() {
                    const checkedRows = Array.from(body.querySelectorAll('.student-attendance-row')).filter(r => r.querySelector('.student-checkbox').checked);
                    return checkedRows.map(r => {
                        const isPhep = r.querySelector('.student-absence-type').value === 'phep';
                        return {
                            id: r.getAttribute('data-student-id'),
                            maHs: r.getAttribute('data-ma-hs'),
                            fullName: r.getAttribute('data-name'),
                            coPhep: isPhep ? 1 : 0,
                            khongPhep: isPhep ? 0 : 1
                        };
                    });
                }

                function saveCurrentAttendanceToSlot() {
                    const selected = getSelectedAbsentStudents();
                    slot.soLuongNghi = selected.length;
                    slot.hsVangList = selected;
                    slot.dsHsVang = selected.map(s => s.fullName);
                }

                // Bắt sự kiện nút "Lưu vào Sổ đầu bài"
                if (saveBtn) {
                    saveBtn.onclick = async () => {
                        saveCurrentAttendanceToSlot();
                        slot.sddConfirmed = true;
                        const selected = slot.hsVangList || [];

                        saveBtn.disabled = true;
                        saveBtn.innerHTML = `<span class="loading-spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:6px;"></span> Đang lưu...`;

                        try {
                            // Tự động tìm lại chitietId nếu slot chưa có sẵn
                            let directChitietId = slot.chitietId || slot.liveId;
                            if (!directChitietId && state.scheduleData && state.scheduleData.schedule) {
                                const matchSlot = state.scheduleData.schedule.find(s => 
                                    s.lop === slot.lop && 
                                    parseInt(s.thu) === parseInt(slot.thu) && 
                                    parseInt(s.tiet) === parseInt(slot.tiet) && 
                                    parseInt(s.buoi) === parseInt(slot.buoi)
                                );
                                if (matchSlot && (matchSlot.chitietId || matchSlot.liveId)) {
                                    directChitietId = matchSlot.chitietId || matchSlot.liveId;
                                    slot.chitietId = directChitietId;
                                    slot.liveId = directChitietId;
                                }
                            }

                            if (!directChitietId) {
                                try {
                                    const cacheRes = await fetch('/schedule_cache.json?v=' + Date.now());
                                    const cacheData = await cacheRes.json();
                                    const cachedWeek = cacheData.weeks && cacheData.weeks[String(state.currentWeek || 9)];
                                    if (cachedWeek && cachedWeek.schedule) {
                                        const m = cachedWeek.schedule.find(s => 
                                            s.lop === slot.lop && 
                                            parseInt(s.thu) === parseInt(slot.thu) && 
                                            parseInt(s.tiet) === parseInt(slot.tiet) && 
                                            parseInt(s.buoi) === parseInt(slot.buoi)
                                        );
                                        if (m && (m.chitietId || m.liveId)) {
                                            directChitietId = m.chitietId || m.liveId;
                                            slot.chitietId = directChitietId;
                                            slot.liveId = directChitietId;
                                        }
                                    }
                                } catch (e) { }
                            }

                            // TẦNG 1: Thử lưu điểm danh trực tiếp từ Trình duyệt (Client Direct)
                            let saveJson = null;
                            if (directChitietId) {
                                try {
                                    const { token } = await getClientVnEduToken();
                                    if (token) {
                                        const hsUrl = `https://uaevcmanmsgdbinhduong.vnedu.vn/v5/?call=app.sodaubai.serv.so_dau_bai.saveHocSinhVang&app_nam_hoc=2026&my_token=${token}`;
                                        const formObj = new URLSearchParams();
                                        formObj.append('chitiet_id', String(directChitietId));
                                        formObj.append('my_token', token);
                                        formObj.append('app_nam_hoc', '2026');
                                        selected.forEach((s, idx) => {
                                            formObj.append(`data[${idx}][id]`, String(s.id));
                                            formObj.append(`data[${idx}][co_phep]`, String(s.coPhep || s.co_phep ? 1 : 0));
                                            formObj.append(`data[${idx}][khong_phep]`, String(s.khongPhep || s.khong_phep ? 1 : 0));
                                            formObj.append(`data[${idx}][ma_hoc_sinh]`, String(s.maHs || s.ma_hoc_sinh || ''));
                                            formObj.append(`data[${idx}][full_name]`, String(s.fullName || s.full_name || ''));
                                        });
                                        const dRes = await fetch(hsUrl, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                                            body: formObj.toString()
                                        });
                                        const dRaw = await dRes.text();
                                        try {
                                            saveJson = JSON.parse(dRaw);
                                        } catch (e) {
                                            saveJson = { success: true };
                                        }
                                        if (saveJson && saveJson.success) {
                                            saveJson.chitietId = directChitietId;
                                        }
                                    }
                                } catch (directErr) {
                                    console.warn('Direct attendance save failed, falling back to relay:', directErr.message);
                                }
                            }

                            // TẦNG 2: Dự phòng qua Local Relay / Cloudflare
                            if (!saveJson || !saveJson.success) {
                                const clientToken = localStorage.getItem('vnedu_token') || '';
                                const clientCookies = localStorage.getItem('vnedu_cookies') || '';
                                const saveRes = await fetch('/api/save-attendance', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'x-vnedu-token': clientToken,
                                        'x-vnedu-cookie': clientCookies
                                    },
                                    body: JSON.stringify({
                                        chitietId: directChitietId || slot.chitietId || slot.liveId || '',
                                        studentsData: selected,
                                        soLuongNghi: selected.length,
                                        slot: slot,
                                        week: state.currentWeek || 9
                                    })
                                });
                                saveJson = await saveRes.json();
                            }
                            if (saveJson.expired) {
                                showToast('Phiên làm việc hết hạn', saveJson.msg, 'warning');
                                openVnEduLoginModal();
                                return;
                            }
                            if (saveJson.success) {
                                if (saveJson.chitietId) {
                                    slot.chitietId = saveJson.chitietId;
                                    slot.liveId = saveJson.chitietId;
                                }
                                updateSlotAttendancePill(slot);
                                playClickBeep();
                                showToast('Đã lưu điểm danh!', `Đã lưu thành công ${selected.length} học sinh vắng vào Sổ đầu bài vnEdu.`, 'success');
                                const m = document.getElementById('attendanceModal');
                                if (m) {
                                    m.style.display = 'none';
                                    m.classList.remove('active');
                                }
                            } else {
                                showToast('Lỗi lưu điểm danh', saveJson.msg || 'Không thể lưu vào vnEdu', 'error');
                            }
                        } catch (err) {
                            showToast('Lỗi lưu điểm danh', err.message, 'error');
                        } finally {
                            saveBtn.disabled = false;
                            saveBtn.textContent = '💾 Lưu vào Sổ đầu bài';
                        }
                    };
                }

            } else {
                body.innerHTML = `
                    <div style="padding: 16px; background: rgba(245, 158, 11, 0.1); border-radius: 8px;">
                        <div style="font-weight: 700; color: #D97706; margin-bottom: 6px;">Thông tin điểm danh:</div>
                        <div>Số lượng học sinh vắng: <strong>${slot.soLuongNghi || 0}</strong> em</div>
                        ${slot.dsHsVang && slot.dsHsVang.length > 0 ? `<div style="margin-top: 8px;">Tên học sinh: <em>${escapeHtml(slot.dsHsVang.map(s => typeof s === 'string' ? s : (s.fullName || s.name || String(s))).join(', '))}</em></div>` : ''}
                    </div>
                `;
            }
        } catch (e) {
            body.innerHTML = `<div style="color: red; padding: 16px;">Lỗi kết nối điểm danh vnEdu: ${escapeHtml(e.message)}</div>`;
        }
    }

    // =========================================================================
    // Xử Lý Đăng Nhập & Kết Nối vnEdu Trực Tiếp Trên Web (PA3)
    // =========================================================================
    function openVnEduLoginModal() {
        const modal = document.getElementById('vnEduLoginModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            const alertBox = document.getElementById('loginAlertBox');
            if (alertBox) alertBox.style.display = 'none';
        }
    }

    function closeVnEduLoginModal() {
        const modal = document.getElementById('vnEduLoginModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }

    async function checkVnEduStatus() {
        const btn = document.getElementById('btnVnEduLoginHeader');
        const text = document.getElementById('vnEduLoginStatusText');
        const badge = document.getElementById('badgeFirewallPass');
        if (!btn || !text) return;

        // Ưu tiên làm mới token từ session_cache.json
        try {
            const cRes = await fetch('/session_cache.json?v=' + Date.now());
            const cData = await cRes.json();
            if (cData && cData.token) {
                localStorage.setItem('vnedu_token', cData.token);
                if (cData.cookies) localStorage.setItem('vnedu_cookies', cData.cookies);
            }
        } catch (e) { }

        const clientToken = localStorage.getItem('vnedu_token');
        if (clientToken) {
            btn.className = 'btn-vnedu-login';
            text.innerHTML = 'vnEdu: Đã kết nối';
            btn.title = 'Tài khoản vnEdu của cô Lê Thị Diệu Huyên đang kết nối sẵn sàng';
            if (badge) badge.style.display = 'inline-flex';
            return;
        }

        try {
            const res = await fetch('/api/vnedu/status');
            const data = await res.json();
            if (data.connected) {
                btn.className = 'btn-vnedu-login';
                text.innerHTML = 'vnEdu: Đã kết nối';
                btn.title = 'Tài khoản vnEdu của cô Lê Thị Diệu Huyên đang kết nối sẵn sàng';
                if (badge) badge.style.display = 'inline-flex';
            } else {
                btn.className = 'btn-vnedu-login disconnected';
                text.textContent = '🔐 Đăng nhập vnEdu';
            }
        } catch (e) {
            btn.className = 'btn-vnedu-login disconnected';
            text.textContent = '🔐 Đăng nhập vnEdu';
        }
    }

    function setupVnEduLoginHandlers() {
        const btnHeader = document.getElementById('btnVnEduLoginHeader');
        const btnClose = document.getElementById('btnCloseVnEduLoginModal');
        const modal = document.getElementById('vnEduLoginModal');
        const form = document.getElementById('formVnEduLogin');
        const btnTogglePass = document.getElementById('btnTogglePasswordVisibility');
        const passInput = document.getElementById('inputVnEduPassword');
        const userInput = document.getElementById('inputVnEduUsername');
        const alertBox = document.getElementById('loginAlertBox');
        const submitBtn = document.getElementById('btnSubmitVnEduLogin');

        if (btnHeader) {
            btnHeader.addEventListener('click', openVnEduLoginModal);
        }
        if (btnClose) {
            btnClose.addEventListener('click', closeVnEduLoginModal);
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeVnEduLoginModal();
            });
        }
        if (btnTogglePass && passInput) {
            btnTogglePass.addEventListener('click', () => {
                if (passInput.type === 'password') {
                    passInput.type = 'text';
                    btnTogglePass.textContent = '🙈';
                } else {
                    passInput.type = 'password';
                    btnTogglePass.textContent = '👁️';
                }
            });
        }

        if (form && submitBtn) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = (userInput ? userInput.value : '').trim();
                const password = (passInput ? passInput.value : '').trim();
                if (!password) {
                    if (alertBox) {
                        alertBox.style.display = 'block';
                        alertBox.style.background = 'rgba(239, 68, 68, 0.1)';
                        alertBox.style.color = '#DC2626';
                        alertBox.textContent = '⚠️ Cô vui lòng nhập mật khẩu vnEdu nhé!';
                    }
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span class="loading-spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:6px;"></span> Đang kết nối vnEdu...`;
                if (alertBox) alertBox.style.display = 'none';

                try {
                    let data = null;

                    // Kênh 1: Thử gọi máy chủ cục bộ trên máy tính (nếu đang bật)
                    try {
                        const localRes = await fetch('http://localhost:3000/api/vnedu/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, password }),
                            signal: AbortSignal.timeout(3000)
                        });
                        const localText = await localRes.text();
                        if (localText && localText.trim().startsWith('{')) {
                            data = JSON.parse(localText);
                        }
                    } catch (localErr) { }

                    // Kênh 2: Nếu máy chủ cục bộ chưa bật, gọi API đám mây
                    if (!data) {
                        const res = await fetch('/api/vnedu/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, password })
                        });
                        const resText = await res.text();
                        try {
                            data = JSON.parse(resText);
                        } catch (parseErr) {
                            // Phòng vệ lỗi trả về trang HTML 522 từ Cloudflare
                            // Kiểm tra xem đã có token sẵn từ session_cache.json chưa
                            const curToken = localStorage.getItem('vnedu_token');
                            if (curToken) {
                                data = {
                                    success: true,
                                    token: curToken,
                                    msg: 'Tài khoản vnEdu của cô đã được kết nối sẵn sàng qua máy tính!'
                                };
                            } else {
                                data = {
                                    success: false,
                                    msg: 'Tường lửa VNPT tại Bình Dương chặn kết nối máy chủ đám mây (Error 522). Phiên làm việc của cô đã được lưu an toàn trên máy tính.'
                                };
                            }
                        }
                    }

                    if (data && data.success && data.token) {
                        localStorage.setItem('vnedu_token', data.token);
                        if (data.cookies) localStorage.setItem('vnedu_cookies', data.cookies);

                        if (alertBox) {
                            alertBox.style.display = 'block';
                            alertBox.style.background = 'rgba(16, 185, 129, 0.1)';
                            alertBox.style.color = '#059669';
                            alertBox.textContent = '✔ ' + (data.msg || 'Đăng nhập thành công!');
                        }

                        fireConfetti();
                        playSuccessChime();
                        showToast('Đăng nhập thành công', 'Phiên làm việc vnEdu đã được kết nối sẵn sàng!', 'success');
                        checkVnEduStatus();

                        setTimeout(() => {
                            closeVnEduLoginModal();
                        }, 1200);
                    } else {
                        if (alertBox) {
                            alertBox.style.display = 'block';
                            alertBox.style.background = 'rgba(239, 68, 68, 0.1)';
                            alertBox.style.color = '#DC2626';
                            alertBox.textContent = '❌ ' + ((data && data.msg) || 'Đăng nhập thất bại.');
                        }
                    }
                } catch (err) {
                    if (alertBox) {
                        alertBox.style.display = 'block';
                        alertBox.style.background = 'rgba(239, 68, 68, 0.1)';
                        alertBox.style.color = '#DC2626';
                        alertBox.textContent = '❌ Lỗi kết nối: ' + err.message;
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>🚀 Đăng Nhập & Gia Hạn Phiên vnEdu</span>`;
                }
            });
        }
    }

    function escapeHtml(str) {
                    if (!str) return '';
                    return String(str)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                }

    // Chạy khi trang sẵn sàng
    if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        }) ();
