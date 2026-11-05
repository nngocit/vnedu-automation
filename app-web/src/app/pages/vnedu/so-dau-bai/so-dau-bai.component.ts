import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
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

  // Trạng thái modal Quét Radar SĐĐ Giám thị (Cyber Antivirus Scanner)
  showScanModal = false;
  scanModalStatus: 'scanning' | 'completed' | 'error' = 'scanning';
  scanProgress = 0;
  scanCurrentStep = '';
  scanLogs: Array<{ text: string; type: 'info' | 'warning' | 'success' }> = [];
  scanResultSchedule: any[] = [];
  scanAbsentSlots: any[] = [];
  scanTotalAbsents = 0;
  scanMatchedCount = 0;
  scanMismatchCount = 0;
  scanFilterTab: 'mismatched' | 'matched' | 'all' = 'mismatched';
  isSyncingAllMismatches = false;
  private scanAnimationTimer: any = null;

  get displayScanSlots(): any[] {
    if (this.scanFilterTab === 'mismatched') {
      return this.scanAbsentSlots.filter((s: any) => !s.isMatched);
    }
    if (this.scanFilterTab === 'matched') {
      return this.scanAbsentSlots.filter((s: any) => s.isMatched);
    }
    return this.scanAbsentSlots;
  }

  setScanFilterTab(tab: 'mismatched' | 'matched' | 'all'): void {
    this.scanFilterTab = tab;
  }

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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const now = new Date();
    this.todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Hỗ trợ tham số ?date=DD/MM/YYYY để xem trước ngày bất kỳ trong tuần
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const queryDate = urlParams.get('date');
        if (queryDate && queryDate.includes('/')) {
          this.todayStr = queryDate;
        }
      }
    } catch (_) {}

    this.loadInitialData();
  }

  redirectToLogin(): void {
    this.showToast('Phiên làm việc vnEdu đã kết thúc. Đang chuyển về trang Đăng nhập...', 'info');
    setTimeout(() => {
      localStorage.removeItem('v8.1.8-authf649fc9a5f55');
      localStorage.removeItem('vnedu_token');
      localStorage.removeItem('vnedu_cookies');
      this.router.navigate(['/auth/login']);
    }, 1200);
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
          this.redirectToLogin();
          return;
        }
        this.checkSessionAndLoadInfo();
      },
      error: () => {
        this.redirectToLogin();
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

  // Quét đối chiếu toàn bộ SĐĐ Giám thị cho cả tuần phong cách Cyber Antivirus Scanner
  scanAllSupervisorAttendance(): void {
    if (this.isScanningAllGiamThi) return;
    this.isScanningAllGiamThi = true;
    this.showScanModal = true;
    this.scanModalStatus = 'scanning';
    this.scanProgress = 8;
    this.scanCurrentStep = 'Khởi tạo kết nối cổng Giám thị vnEdu...';
    this.scanLogs = [
      { text: `📡 Bắt đầu quét SĐĐ Giám thị cho Tuần ${this.currentWeek}...`, type: 'info' }
    ];
    this.scanAbsentSlots = [];
    this.scanTotalAbsents = 0;

    this.vneduService.scanAllGiamThi(this.currentWeek, this.slots).subscribe({
      next: (res) => {
        this.isScanningAllGiamThi = false;
        if (res.success && res.schedule) {
          this.scanResultSchedule = res.schedule;
          // Lọc các tiết có học sinh vắng (hoặc từ Giám thị hoặc từ SĐB)
          this.scanAbsentSlots = res.schedule.filter((s: any) =>
            (s.giamThiSoLuongNghi && s.giamThiSoLuongNghi > 0) ||
            (s.sdbSoLuongNghi && s.sdbSoLuongNghi > 0) ||
            (s.soLuongNghi && s.soLuongNghi > 0) ||
            (s.hsVangList && s.hsVangList.length > 0)
          );

          this.scanMatchedCount = this.scanAbsentSlots.filter((s: any) => s.isMatched).length;
          this.scanMismatchCount = this.scanAbsentSlots.filter((s: any) => !s.isMatched).length;
          if (this.scanMismatchCount === 0) {
            this.scanFilterTab = 'matched';
          }
          this.scanTotalAbsents = this.scanAbsentSlots.reduce((sum: number, s: any) =>
            sum + (s.giamThiSoLuongNghi || s.soLuongNghi || s.hsVangList?.length || 0), 0
          );

          // Cập nhật dữ liệu vào slots chính
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
              localSlot.isMatched = updatedSlot.isMatched;
              localSlot.sdbSoLuongNghi = updatedSlot.sdbSoLuongNghi;
              localSlot.sdbDsVang = updatedSlot.sdbDsVang;
              localSlot.giamThiSoLuongNghi = updatedSlot.giamThiSoLuongNghi;
              localSlot.giamThiDsVang = updatedSlot.giamThiDsVang;
            }
          });
          this.updateDayGroups();

          // Chạy animation quét từng tiết sinh động như antivirus scanner
          this.animateScanProgress(res.schedule);
        } else {
          this.scanModalStatus = 'error';
          this.scanLogs.push({ text: '❌ Lỗi: ' + (res.msg || 'Không thể lấy dữ liệu'), type: 'warning' });
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isScanningAllGiamThi = false;
        this.scanModalStatus = 'error';
        this.scanLogs.push({ text: '❌ Lỗi kết nối: ' + (err.error?.msg || err.message), type: 'warning' });
        this.cdr.detectChanges();
      }
    });
  }

  animateScanProgress(schedule: any[]): void {
    if (this.scanAnimationTimer) clearInterval(this.scanAnimationTimer);
    let index = 0;
    const total = schedule.length;
    this.scanAnimationTimer = setInterval(() => {
      if (index < total) {
        const item = schedule[index];
        const vangs = item.soLuongNghi || 0;
        this.scanProgress = Math.min(95, Math.round(((index + 1) / total) * 90) + 5);
        this.scanCurrentStep = `Đang quét: Thứ ${item.thu} - Tiết ${item.tiet} (Lớp ${item.lop})...`;

        if (vangs > 0) {
          const names = (item.hsVangList || []).map((h: any) => h.fullName).join(', ');
          this.scanLogs.unshift({
            text: `[${index + 1}/${total}] Thứ ${item.thu} • Tiết ${item.tiet} • Lớp ${item.lop}: ⚠️ ${vangs} em vắng (${names})`,
            type: 'warning'
          });
        } else {
          this.scanLogs.unshift({
            text: `[${index + 1}/${total}] Thứ ${item.thu} • Tiết ${item.tiet} • Lớp ${item.lop}: ✓ Đủ 100% sĩ số`,
            type: 'info'
          });
        }
        index++;
        this.cdr.detectChanges();
      } else {
        clearInterval(this.scanAnimationTimer);
        this.scanAnimationTimer = null;
        this.scanProgress = 100;
        this.scanCurrentStep = `✓ Hoàn tất quét toàn bộ ${total} tiết học!`;
        this.scanLogs.unshift({
          text: `🎉 Quét hoàn tất: Phát hiện ${this.scanTotalAbsents} lượt vắng trên ${this.scanAbsentSlots.length} tiết học!`,
          type: 'success'
        });
        setTimeout(() => {
          this.scanModalStatus = 'completed';
          this.scanFilterTab = this.scanMismatchCount > 0 ? 'mismatched' : 'matched';
          this.cdr.detectChanges();
        }, 500);
      }
    }, 100);
  }

  openAttendanceFromScanResult(slot: any): void {
    const targetSlot = this.slots.find(s =>
      s.lop === slot.lop &&
      s.thu === slot.thu &&
      s.tiet === slot.tiet &&
      s.buoi === slot.buoi
    ) || slot;

    this.showScanModal = false;
    this.openAttendanceModal(targetSlot);
  }

  closeScanModal(): void {
    this.showScanModal = false;
    if (this.scanAnimationTimer) {
      clearInterval(this.scanAnimationTimer);
      this.scanAnimationTimer = null;
    }
  }

  // Đồng bộ nhanh 1 tiết từ Giám thị vào SĐB 1 cú nhấp
  syncSingleSlotFromGiamThi(slot: any): void {
    const absentList = (slot.giamThiDsVang || slot.hsVangList || []).map((h: any) => ({
      id: h.id,
      maHs: h.maHs,
      fullName: h.fullName,
      coPhep: !!h.coPhep,
      khongPhep: !!h.khongPhep
    }));

    this.vneduService.saveAttendance(
      slot.chitietId || slot.liveId || '',
      absentList,
      absentList.length,
      slot,
      this.currentWeek
    ).subscribe({
      next: (res) => {
        if (res.success) {
          slot.isMatched = true;
          slot.sdbSoLuongNghi = absentList.length;
          slot.sdbDsVang = absentList.map((a: any) => a.fullName + (a.coPhep ? ' (P)' : ' (K)'));
          this.scanMatchedCount = this.scanAbsentSlots.filter((s: any) => s.isMatched).length;
          this.scanMismatchCount = this.scanAbsentSlots.filter((s: any) => !s.isMatched).length;
          if (this.scanMismatchCount === 0) {
            this.scanFilterTab = 'matched';
          }
          this.showToast(`Đã đồng bộ khớp ${absentList.length} em vắng vào SĐB lớp ${slot.lop} (Tiết ${slot.tiet})!`, 'success');
          this.cdr.detectChanges();
        } else {
          this.showToast('Không thể lưu điểm danh: ' + res.msg, 'danger');
        }
      },
      error: (err) => {
        this.showToast('Lỗi đồng bộ: ' + (err.error?.msg || err.message), 'danger');
      }
    });
  }

  // Đồng bộ tất cả các tiết bị lệch với Giám thị
  syncAllMismatchedSlots(): void {
    const mismatched = this.scanAbsentSlots.filter((s: any) => !s.isMatched);
    if (mismatched.length === 0) {
      this.showToast('Tất cả các tiết đã khớp hoàn toàn 100%!', 'info');
      return;
    }

    this.isSyncingAllMismatches = true;
    let completed = 0;
    mismatched.forEach(slot => {
      const absentList = (slot.giamThiDsVang || slot.hsVangList || []).map((h: any) => ({
        id: h.id,
        maHs: h.maHs,
        fullName: h.fullName,
        coPhep: !!h.coPhep,
        khongPhep: !!h.khongPhep
      }));

      this.vneduService.saveAttendance(
        slot.chitietId || slot.liveId || '',
        absentList,
        absentList.length,
        slot,
        this.currentWeek
      ).subscribe({
        next: () => {
          slot.isMatched = true;
          slot.sdbSoLuongNghi = absentList.length;
          slot.sdbDsVang = absentList.map((a: any) => a.fullName + (a.coPhep ? ' (P)' : ' (K)'));
          completed++;
          if (completed === mismatched.length) {
            this.isSyncingAllMismatches = false;
            this.scanMatchedCount = this.scanAbsentSlots.filter((s: any) => s.isMatched).length;
            this.scanMismatchCount = 0;
            this.scanFilterTab = 'matched';
            this.showToast(`Đã đồng bộ khớp thành công toàn bộ ${mismatched.length} tiết vào Sổ Đầu Bài!`, 'success');
            this.cdr.detectChanges();
          }
        },
        error: () => {
          completed++;
          if (completed === mismatched.length) {
            this.isSyncingAllMismatches = false;
            this.cdr.detectChanges();
          }
        }
      });
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

  // Danh sách các lớp để lọc (lưu property để tránh re-render getter)
  availableClasses: string[] = [];

  updateAvailableClasses(): void {
    const set = new Set<string>();
    this.slots.forEach(s => { if (s.lop) set.add(s.lop); });
    this.availableClasses = Array.from(set).sort();
  }

  // Lieflat Charts & Analytics State
  showAnalyticsChart: boolean = true;

  toggleAnalyticsChart(): void {
    this.showAnalyticsChart = !this.showAnalyticsChart;
  }

  chartClassStats: Array<{
    lop: string;
    total: number;
    synced: number;
    pending: number;
    percent: number;
    absentCount: number;
  }> = [];

  chartDayStats: Array<{
    thu: number;
    thuText: string;
    ngay: string;
    total: number;
    synced: number;
    pending: number;
    isToday: boolean;
    heightPercent: number;
  }> = [];

  updateChartMetrics(): void {
    // 1. Phân bổ theo từng lớp
    const classMap: { [lop: string]: { total: number; synced: number; pending: number; absentCount: number } } = {};
    this.slots.forEach(s => {
      const lop = s.lop || 'Khác';
      if (!classMap[lop]) {
        classMap[lop] = { total: 0, synced: 0, pending: 0, absentCount: 0 };
      }
      classMap[lop].total++;
      if (s.isSynced) {
        classMap[lop].synced++;
      } else {
        classMap[lop].pending++;
      }
      const absent = s.soLuongNghi || (s.hsVangList ? s.hsVangList.length : 0);
      if (absent) {
        classMap[lop].absentCount += Number(absent) || 0;
      }
    });

    this.chartClassStats = Object.keys(classMap).sort().map(lop => {
      const item = classMap[lop];
      return {
        lop,
        total: item.total,
        synced: item.synced,
        pending: item.pending,
        percent: item.total > 0 ? Math.round((item.synced / item.total) * 100) : 0,
        absentCount: item.absentCount
      };
    });

    // 2. Mật độ tiết theo ngày trong tuần
    const dayMap: { [thu: number]: { thu: number; thuText: string; ngay: string; total: number; synced: number; pending: number; isToday: boolean } } = {};
    const thuLabels: { [k: number]: string } = { 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7', 8: 'CN' };

    this.slots.forEach(s => {
      if (!dayMap[s.thu]) {
        dayMap[s.thu] = {
          thu: s.thu,
          thuText: thuLabels[s.thu] || `T${s.thu}`,
          ngay: s.ngay,
          total: 0,
          synced: 0,
          pending: 0,
          isToday: s.ngay === this.todayStr
        };
      }
      dayMap[s.thu].total++;
      if (s.isSynced) dayMap[s.thu].synced++;
      else dayMap[s.thu].pending++;
    });

    const dayList = Object.values(dayMap).sort((a, b) => a.thu - b.thu);
    const maxDaySlots = Math.max(...dayList.map(d => d.total), 1);
    this.chartDayStats = dayList.map(d => ({
      ...d,
      heightPercent: Math.max(18, Math.round((d.total / maxDaySlots) * 100))
    }));
  }

  // Tổng số tiết dạy hôm nay
  get todayTotalSlotsCount(): number {
    return this.slots.filter(s => s.ngay === this.todayStr).length;
  }

  // Hôm nay có tiết dạy hay không
  get todayHasSlots(): boolean {
    return this.todayTotalSlotsCount > 0;
  }

  // Tên thứ của ngày hôm nay (VD: Thứ Năm)
  get todayDayOfWeekText(): string {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[new Date().getDay()];
  }

  // Cuộn mượt đến thẻ ngày hôm nay
  scrollToToday(): void {
    const el = document.getElementById('day-card-today');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      this.showToast(`Hôm nay (${this.todayDayOfWeekText}, ${this.todayStr}) cô không có tiết dạy trên thời khóa biểu`, 'info');
    }
  }

  // Số tiết cần nhập hôm nay
  get todayPendingSlotsCount(): number {
    return this.slots.filter(s => s.ngay === this.todayStr && !s.isSynced).length;
  }

  // Danh sách các nhóm ngày đã xử lý (tránh chạy getter trong ngFor gây Change Detection loop làm treo trang)
  dayGroups: {
    thu: number;
    thuText: string;
    ngay: string;
    isToday: boolean;
    pendingCount: number;
    syncedCount: number;
    slots: VnEduSlot[];
  }[] = [];

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

    const groups: { [key: string]: { thu: number; thuText: string; ngay: string; isToday: boolean; pendingCount: number; syncedCount: number; slots: VnEduSlot[] } } = {};
    filtered.forEach(slot => {
      const key = `${slot.thu}_${slot.ngay}`;
      if (!groups[key]) {
        groups[key] = {
          thu: slot.thu,
          thuText: thuMap[slot.thu] || `Thứ ${slot.thu}`,
          ngay: slot.ngay,
          isToday: slot.ngay === this.todayStr,
          pendingCount: 0,
          syncedCount: 0,
          slots: []
        };
      }
      groups[key].slots.push(slot);
      if (slot.isSynced) {
        groups[key].syncedCount++;
      } else {
        groups[key].pendingCount++;
      }
    });

    this.dayGroups = Object.values(groups).sort((a, b) => a.thu - b.thu);
    this.updateAvailableClasses();
    this.updateChartMetrics();
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

  trackByStudent(index: number, stu: AbsentStudent): string | number {
    return stu.id || stu.maHs || index;
  }

  trackByScanSlot(index: number, slot: any): string | number {
    return slot.chitietId || slot.liveId || (slot.thu + '_' + slot.tiet + '_' + slot.lop) || index;
  }

  trackByClass(index: number, cls: string): string {
    return cls;
  }

  trackByWeek(index: number, opt: any): number {
    return opt.weekNumber;
  }

  trackByLog(index: number, log: any): number {
    return index;
  }

  trackByHs(index: number, hs: any): string | number {
    return hs.id || hs.fullName || hs || index;
  }

  trackByDayStat(index: number, item: any): number {
    return item.thu;
  }

  trackByClassStat(index: number, item: any): string {
    return item.lop;
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
