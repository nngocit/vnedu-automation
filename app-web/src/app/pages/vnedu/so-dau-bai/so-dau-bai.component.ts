import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { VnEduService } from '../services/vnedu.service';
import {
  VnEduInfo,
  VnEduWeekSchedule,
  VnEduSlot,
  AbsentStudent,
  VnEduStatus,
  WeekOption
} from '../models/vnedu.model';

@Component({
  selector: 'app-so-dau-bai',
  templateUrl: './so-dau-bai.component.html',
  styleUrls: ['./so-dau-bai.component.scss'],
  standalone: false
})
export class SoDauBaiComponent implements OnInit {
  isLoading = false;
  isSavingBatch = false;
  isLoggingIn = false;

  info: VnEduInfo | null = null;
  status: VnEduStatus | null = null;
  scheduleData: VnEduWeekSchedule | null = null;
  slots: VnEduSlot[] = [];

  currentWeek = 9;
  dataSource: 'vnedu' | 'excel' = 'vnedu';
  todayStr = '';
  selectedClassFilter: string = 'all';
  searchQuery: string = '';

  // Điểm danh Modal
  selectedSlotForAttendance: VnEduSlot | null = null;
  attendanceStudents: AbsentStudent[] = [];
  attendanceSearchText = '';
  isLoadingAttendance = false;
  isSavingAttendance = false;
  isScanningGiamThi = false;
  isScanningAllGiamThi = false;
  showAttendanceModal = false;

  // Đăng nhập Modal
  showLoginModal = false;
  loginUsername = '051197003685';
  loginPassword = '';
  showPassword = false;
  loginErrorMessage = '';
  loginSuccessMessage = '';

  // Toast / Thông báo
  toastMessage: { text: string; type: 'success' | 'danger' | 'info' } | null = null;

  // Danh sách tuần từ 1 đến 35 luôn sẵn sàng
  weeksList: Array<{ weekNumber: number; title: string; isCurrentRealWeek: boolean }> = Array.from({ length: 35 }, (_, i) => ({
    weekNumber: i + 1,
    title: `Tuần ${i + 1}`,
    isCurrentRealWeek: i + 1 === 9
  }));

  constructor(
    private vneduService: VnEduService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const now = new Date();
    this.todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    this.loadInitialData();
  }

  showToast(text: string, type: 'success' | 'danger' | 'info' = 'success'): void {
    this.toastMessage = { text, type };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toastMessage = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.vneduService.getStatus().subscribe({
      next: (status) => {
        this.status = status;
        if (!status || !status.connected) {
          this.openLoginModal();
        }
        this.checkSessionAndLoadInfo();
      },
      error: () => {
        this.openLoginModal();
        this.checkSessionAndLoadInfo();
      }
    });
  }

  checkSessionAndLoadInfo(): void {
    this.vneduService.getInfo(this.dataSource).subscribe({
      next: (info) => {
        this.info = info;
        this.currentWeek = info.currentRealWeek || 9;
        if (info.weeks && info.weeks.length > 0) {
          this.weeksList = info.weeks.map((w, idx) => ({
            weekNumber: w.weekNumber || (idx + 1),
            title: `Tuần ${w.weekNumber || (idx + 1)}`,
            isCurrentRealWeek: !!w.isCurrentRealWeek
          }));
        }
        this.loadSchedule(this.currentWeek);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Không thể tải thông tin hệ thống: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  loadSchedule(week: number): void {
    this.isLoading = true;
    this.currentWeek = week;
    this.vneduService.getSchedule(week, this.dataSource, true).subscribe({
      next: (data) => {
        this.scheduleData = data;
        this.slots = (data.schedule || []).map((s, idx) => {
          const bai = s.tenBai || s.baiDay || s.noiDung || '';
          return {
            ...s,
            baiDay: bai,
            tenBai: bai,
            index: s.index || idx + 1,
            nhanXet: s.nhanXet || s.nhanXetDefault || 'Lớp học nghiêm túc, tích cực',
            diem: s.diem || s.diemDefault || 20,
            diemKl: s.diemKl || 10,
            diemVs: s.diemVs || 10
          };
        });
        this.updateDayGroups();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Lỗi khi tải lịch học: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  onWeekChange(event: any): void {
    const w = parseInt(event.target.value);
    if (w) this.loadSchedule(w);
  }

  prevWeek(): void {
    if (this.currentWeek > 1) this.loadSchedule(this.currentWeek - 1);
  }

  nextWeek(): void {
    if (this.currentWeek < 35) this.loadSchedule(this.currentWeek + 1);
  }

  toggleSource(source: 'vnedu' | 'excel'): void {
    if (this.dataSource === source) return;
    this.dataSource = source;
    this.loadSchedule(this.currentWeek);
  }

  // Lưu 1 tiết đơn lẻ
  syncSingle(slot: VnEduSlot): void {
    slot.isSaving = true;
    this.cdr.detectChanges();

    this.vneduService.syncSlot(slot, this.currentWeek).subscribe({
      next: (res) => {
        slot.isSaving = false;
        if (res.success) {
          slot.isSynced = true;
          slot.chitietId = res.chitietId || (res.data && res.data.id) || slot.chitietId;
          slot.liveId = slot.chitietId;
          this.showToast(`Đã lưu thành công tiết ${slot.tiet} lớp ${slot.lop} vào vnEdu!`, 'success');
        } else {
          if (res.expired || (res.msg && (res.msg.includes('hết hạn') || res.msg.includes('đăng nhập') || res.msg.includes('quyền')))) {
            this.openLoginModal();
            this.loginErrorMessage = res.msg || 'Phiên làm việc hết hạn hoặc không có quyền truy cập API. Vui lòng đăng nhập lại.';
          }
          this.showToast(res.msg || 'Không thể lưu tiết dạy', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        slot.isSaving = false;
        const msg = err.error && err.error.msg ? err.error.msg : err.message;
        this.showToast('Lỗi kết nối máy chủ: ' + msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Đồng bộ hàng loạt
  syncBatch(filter: 'today' | 'unlocked' | 'all'): void {
    let slotsToSync = [...this.slots];
    if (filter === 'today') {
      slotsToSync = slotsToSync.filter(s => s.ngay === this.todayStr);
    }

    if (slotsToSync.length === 0) {
      this.showToast('Không có tiết học nào phù hợp để đồng bộ!', 'info');
      return;
    }

    this.isSavingBatch = true;
    this.showToast(`Đang đồng bộ ${slotsToSync.length} tiết dạy vào Sổ đầu bài...`, 'info');

    this.vneduService.syncBatch(this.currentWeek, filter, slotsToSync).subscribe({
      next: (res) => {
        this.isSavingBatch = false;
        if (res.success) {
          this.showToast(`Đồng bộ thành công ${res.succeeded}/${res.total} tiết vào vnEdu!`, 'success');
          this.loadSchedule(this.currentWeek);
        } else {
          this.showToast(res.msg || 'Đồng bộ thất bại', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingBatch = false;
        this.showToast('Lỗi khi đồng bộ hàng loạt: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Lập kế hoạch dạy học tuần mới
  autoPlanNewWeek(): void {
    this.isLoading = true;
    this.showToast(`Đang tự động lập kế hoạch tuần ${this.currentWeek} lên vnEdu...`, 'info');

    this.vneduService.syncBatch(this.currentWeek, 'all', []).subscribe({
      next: () => {
        this.loadSchedule(this.currentWeek);
        this.showToast(`Đã cập nhật kế hoạch dạy học tuần ${this.currentWeek} thành công!`, 'success');
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Lỗi lập kế hoạch: ' + err.message, 'danger');
      }
    });
  }

  // Điểm danh
  openAttendanceModal(slot: VnEduSlot): void {
    this.selectedSlotForAttendance = slot;
    this.showAttendanceModal = true;
    this.isLoadingAttendance = true;
    this.attendanceStudents = [];

    this.vneduService.getAttendance(
      slot.lop,
      this.currentWeek,
      slot.thu,
      slot.tiet,
      slot.chitietId || slot.liveId || ''
    ).subscribe({
      next: (res) => {
        this.isLoadingAttendance = false;
        if (res.success && res.students) {
          this.attendanceStudents = res.students;
          // Đồng bộ trạng thái đã chọn trước đó nếu có
          if (slot.hsVangList && slot.hsVangList.length > 0) {
            slot.hsVangList.forEach(v => {
              const found = this.attendanceStudents.find(s => s.id === v.id || s.fullName === v.fullName);
              if (found) {
                found.coPhep = v.coPhep;
                found.khongPhep = v.khongPhep;
              }
            });
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingAttendance = false;
        this.showToast('Lỗi tải danh sách lớp: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  closeAttendanceModal(): void {
    this.showAttendanceModal = false;
    this.selectedSlotForAttendance = null;
  }

  toggleCoPhep(stu: AbsentStudent): void {
    stu.coPhep = !stu.coPhep;
    if (stu.coPhep) stu.khongPhep = false;
  }

  toggleKhongPhep(stu: AbsentStudent): void {
    stu.khongPhep = !stu.khongPhep;
    if (stu.khongPhep) stu.coPhep = false;
  }

  setAllPresent(): void {
    this.attendanceStudents.forEach(s => {
      s.coPhep = false;
      s.khongPhep = false;
    });
  }

  // Quét đối chiếu danh sách vắng từ SĐĐ Giám thị cho tiết học hiện tại
  scanSupervisorAttendance(): void {
    if (!this.selectedSlotForAttendance) return;
    const slot = this.selectedSlotForAttendance;
    this.isScanningGiamThi = true;

    this.vneduService.scanGiamThi(
      slot.lop,
      slot.ngay || this.todayStr,
      slot.tiet,
      true
    ).subscribe({
      next: (res) => {
        this.isScanningGiamThi = false;
        if (res.success && res.absentList) {
          const giamThiList = res.absentList;
          let matchedCount = 0;

          // Cập nhật trạng thái từng học sinh theo dữ liệu Giám thị
          this.attendanceStudents.forEach(stu => {
            const found = giamThiList.find((g: any) =>
              (g.id && stu.id && String(g.id) === String(stu.id)) ||
              (g.maHs && stu.maHs && g.maHs.trim() === stu.maHs.trim()) ||
              (g.fullName && stu.fullName && g.fullName.trim().toLowerCase() === stu.fullName.trim().toLowerCase())
            );

            if (found) {
              stu.coPhep = !!found.coPhep;
              stu.khongPhep = !!found.khongPhep;
              matchedCount++;
            } else {
              stu.coPhep = false;
              stu.khongPhep = false;
            }
          });

          if (matchedCount > 0) {
            this.showToast(`✓ Đã khớp SĐĐ Giám thị: Cập nhật ${matchedCount} học sinh vắng lớp ${slot.lop}!`, 'success');
          } else {
            this.showToast(`✓ SĐĐ Giám thị ghi nhận: Lớp ${slot.lop} đi học đầy đủ (0 em vắng)!`, 'info');
          }
        } else {
          this.showToast(res.msg || 'Không thể lấy dữ liệu SĐĐ Giám thị', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isScanningGiamThi = false;
        this.showToast('Lỗi quét SĐĐ Giám thị: ' + (err.error?.msg || err.message), 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Quét đối chiếu toàn bộ SĐĐ Giám thị cho cả tuần
  scanAllSupervisorAttendance(): void {
    this.isScanningAllGiamThi = true;
    this.vneduService.scanAllGiamThi(this.currentWeek, this.slots).subscribe({
      next: (res) => {
        this.isScanningAllGiamThi = false;
        if (res.success && res.schedule) {
          res.schedule.forEach((updatedSlot: any) => {
            const localSlot = this.slots.find(s =>
              s.lop === updatedSlot.lop &&
              s.thu === updatedSlot.thu &&
              s.tiet === updatedSlot.tiet &&
              s.buoi === updatedSlot.buoi
            );
            if (localSlot) {
              localSlot.hsVangList = updatedSlot.hsVangList || [];
              localSlot.soLuongNghi = updatedSlot.soLuongNghi || 0;
            }
          });
          this.showToast(res.msg || `Đã cập nhật lại SĐĐ Giám thị cho toàn bộ tuần ${this.currentWeek}!`, 'success');
        } else {
          this.showToast(res.msg || 'Không thể quét SĐĐ Giám thị tuần', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isScanningAllGiamThi = false;
        this.showToast('Lỗi quét SĐĐ Giám thị tuần: ' + (err.error?.msg || err.message), 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  saveAttendanceData(): void {
    if (!this.selectedSlotForAttendance) return;
    const slot = this.selectedSlotForAttendance;
    const absentList = this.attendanceStudents.filter(s => s.coPhep || s.khongPhep);

    this.isSavingAttendance = true;
    this.vneduService.saveAttendance(
      slot.chitietId || slot.liveId || '',
      absentList,
      absentList.length,
      slot,
      this.currentWeek
    ).subscribe({
      next: (res) => {
        this.isSavingAttendance = false;
        if (res.success) {
          slot.hsVangList = absentList;
          slot.soLuongNghi = absentList.length;
          if (res.chitietId) {
            slot.chitietId = res.chitietId;
            slot.liveId = res.chitietId;
            slot.isSynced = true;
          }
          this.showToast(res.msg || `Đã lưu điểm danh lớp ${slot.lop} (${absentList.length} em vắng)`, 'success');
          this.closeAttendanceModal();
        } else {
          this.showToast(res.msg || 'Không thể lưu điểm danh', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingAttendance = false;
        const msg = err.error && err.error.msg ? err.error.msg : err.message;
        this.showToast('Lỗi lưu điểm danh: ' + msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Đăng nhập Modal
  openLoginModal(): void {
    this.loginErrorMessage = '';
    this.loginSuccessMessage = '';
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
  }

  submitLogin(): void {
    if (!this.loginPassword) {
      this.loginErrorMessage = 'Vui lòng nhập mật khẩu vnEdu.';
      return;
    }

    this.isLoggingIn = true;
    this.loginErrorMessage = '';
    this.loginSuccessMessage = '';

    this.vneduService.login(this.loginUsername, this.loginPassword).subscribe({
      next: (res) => {
        this.isLoggingIn = false;
        if (res.success && res.token) {
          localStorage.setItem('vnedu_token', res.token);
          if (res.cookies) localStorage.setItem('vnedu_cookies', res.cookies);

          this.loginSuccessMessage = res.msg || 'Đăng nhập vnEdu thành công!';
          this.showToast('Đăng nhập thành công! Phiên kết nối đã sẵn sàng.', 'success');
          this.status = {
            success: true,
            connected: true,
            account: this.loginUsername,
            teacherName: 'Lê Thị Diệu Huyên',
            tokenPreview: res.token.substring(0, 8) + '...'
          };

          setTimeout(() => {
            this.closeLoginModal();
            this.loadSchedule(this.currentWeek);
          }, 1200);
        } else {
          this.loginErrorMessage = res.msg || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoggingIn = false;
        this.loginErrorMessage = 'Lỗi kết nối máy chủ: ' + err.message;
        this.cdr.detectChanges();
      }
    });
  }

  // Getters tính toán
  get totalSlotsCount(): number {
    return this.slots.length;
  }

  get syncedSlotsCount(): number {
    return this.slots.filter(s => s.isSynced).length;
  }

  get readySlotsCount(): number {
    return this.slots.filter(s => !s.isSynced).length;
  }

  get completionRate(): number {
    if (this.totalSlotsCount === 0) return 0;
    return Math.round((this.syncedSlotsCount / this.totalSlotsCount) * 100);
  }

  // Điểm danh UI helpers
  get filteredStudents(): AbsentStudent[] {
    if (!this.attendanceSearchText) return this.attendanceStudents;
    const q = this.attendanceSearchText.toLowerCase().trim();
    return this.attendanceStudents.filter(s =>
      (s.fullName && s.fullName.toLowerCase().includes(q)) ||
      (s.maHs && s.maHs.toLowerCase().includes(q))
    );
  }

  get countVangPhep(): number {
    return this.attendanceStudents.filter(s => s.coPhep).length;
  }

  get countVangKhongPhep(): number {
    return this.attendanceStudents.filter(s => s.khongPhep).length;
  }

  get countTotalVang(): number {
    return this.countVangPhep + this.countVangKhongPhep;
  }

  setStudentStatus(stu: AbsentStudent, status: 'P' | 'K' | 'present'): void {
    if (status === 'P') {
      stu.coPhep = !stu.coPhep;
      stu.khongPhep = false;
    } else if (status === 'K') {
      stu.khongPhep = !stu.khongPhep;
      stu.coPhep = false;
    } else {
      stu.coPhep = false;
      stu.khongPhep = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  applyQuickComment(slot: VnEduSlot, comment: string): void {
    slot.nhanXet = comment;
  }

  // Lấy danh sách các lớp để lọc
  get availableClasses(): string[] {
    const set = new Set<string>();
    this.slots.forEach(s => { if (s.lop) set.add(s.lop); });
    return Array.from(set).sort();
  }

  // Số tiết cần nhập hôm nay
  get todayPendingSlotsCount(): number {
    return this.slots.filter(s => s.ngay === this.todayStr && !s.isSynced).length;
  }

  // Danh sách các nhóm ngày đã xử lý (tránh chạy getter trong ngFor gây Change Detection loop làm treo trang)
  dayGroups: { thu: number; thuText: string; ngay: string; slots: VnEduSlot[] }[] = [];

  // Nhóm các tiết theo từng ngày (Thứ Hai, Thứ Ba...)
  updateDayGroups(): void {
    let filtered = [...this.slots];
    if (this.selectedClassFilter !== 'all') {
      filtered = filtered.filter(s => s.lop === this.selectedClassFilter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s =>
        (s.baiDay && s.baiDay.toLowerCase().includes(q)) ||
        (s.lop && s.lop.toLowerCase().includes(q)) ||
        (s.mon && s.mon.toLowerCase().includes(q)) ||
        String(s.ppct).includes(q)
      );
    }

    const thuMap: { [key: number]: string } = {
      2: 'Thứ Hai',
      3: 'Thứ Ba',
      4: 'Thứ Tư',
      5: 'Thứ Năm',
      6: 'Thứ Sáu',
      7: 'Thứ Bảy',
      8: 'Chủ Nhật'
    };

    const groups: { [key: string]: { thu: number; thuText: string; ngay: string; slots: VnEduSlot[] } } = {};
    filtered.forEach(slot => {
      const key = `${slot.thu}_${slot.ngay}`;
      if (!groups[key]) {
        groups[key] = {
          thu: slot.thu,
          thuText: thuMap[slot.thu] || `Thứ ${slot.thu}`,
          ngay: slot.ngay,
          slots: []
        };
      }
      groups[key].slots.push(slot);
    });

    this.dayGroups = Object.values(groups).sort((a, b) => a.thu - b.thu);
  }

  setClassFilter(cls: string): void {
    this.selectedClassFilter = cls;
    this.updateDayGroups();
  }

  onSearchChange(): void {
    this.updateDayGroups();
  }

  trackByThu(index: number, group: any): string {
    return `${group.thu}_${group.ngay}`;
  }

  trackBySlot(index: number, slot: VnEduSlot): string {
    return `${slot.thu}_${slot.buoi}_${slot.tiet}_${slot.lop}_${slot.chitietId || slot.liveId || index}`;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Xử lý phím Escape để đóng Modal bất kỳ lúc nào
    if (event.key === 'Escape') {
      if (this.showAttendanceModal) {
        this.closeAttendanceModal();
        return;
      }
      if (this.showLoginModal) {
        this.closeLoginModal();
        return;
      }
    }

    // Không nhận các phím tắt khác khi đang gõ trong input / textarea / select
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || this.showAttendanceModal || this.showLoginModal) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 't') {
      event.preventDefault();
      this.syncBatch('today');
    } else if (key === 'w') {
      event.preventDefault();
      this.syncBatch('all');
    } else if (key === 'r') {
      event.preventDefault();
      this.loadSchedule(this.currentWeek);
    } else if (key === 'd') {
      event.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-bs-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', newTheme);
      document.body.setAttribute('data-bs-theme', newTheme);
      localStorage.setItem('kt_theme_mode_value', newTheme);
      this.showToast(`Đã chuyển sang giao diện ${newTheme === 'dark' ? 'Tối' : 'Sáng'}`, 'info');
    } else if (key === 'b') {
      event.preventDefault();
      const toggleBtn = document.getElementById('kt_app_sidebar_toggle');
      if (toggleBtn) {
        toggleBtn.click();
      }
    }
  }

  // Cuộn mượt lên đầu trang
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
