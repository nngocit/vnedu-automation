import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { VnEduService } from '../services/vnedu.service';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  activeTab: 'overview' | 'teachers' | 'automation' | 'session' | 'backup' | 'logs' = 'overview';
  appVersion: string = 'v2.8.15';
  isLoading: boolean = false;
  isSaving: boolean = false;
  isPinging: boolean = false;
  pingResult: any = null;

  // Overview stats
  stats: any = {
    server: { nodeVersion: 'v25.4.0', port: 3000, uptime: '0 giờ 0 phút', memory: { rssMB: 0, heapUsedMB: 0, osFreeMemoryMB: 0, osTotalMemoryMB: 0 } },
    vnedu: { connected: false, tokenPreview: '', cookiesAvailable: false },
    teachers: { total: 1, active: null, list: [] },
    storage: { profilesCount: 1, ppctCount: 0, cacheKB: 0 },
    settings: {}
  };

  // Editable settings
  settings: any = {
    autoFillPpct: true,
    autoMatchAttendance: true,
    strictAfternoon: true,
    aiMathCleanFilter: true,
    aiTone: 'pedagogical',
    adminPin: '0907',
    schoolName: 'Trường THCS An Lập',
    schoolBranch: 'Phân hiệu An Lập',
    academicYear: '2025-2026',
    semester: 1,
    enableDetailedLogs: true
  };

  // Teachers management
  teachersList: any[] = [];
  activeTeacher: any = null;

  // Teacher modal edit/add
  showTeacherModal: boolean = false;
  isEditingTeacher: boolean = false;
  teacherForm: any = {
    username: '',
    name: '',
    title: '',
    gender: 'female',
    subject: '',
    school: 'Trường THCS An Lập',
    branch: 'Phân hiệu An Lập'
  };

  // Logs
  auditLogs: any[] = [];
  logFilter: 'all' | 'success' | 'warn' | 'info' = 'all';

  // Toast
  toast: { text: string; type: 'success' | 'danger' | 'warning' | 'info' } | null = null;
  private toastTimer: any = null;

  private unsubscribe: Subscription[] = [];

  constructor(
    private vneduService: VnEduService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAdminData();
  }

  setTab(tab: 'overview' | 'teachers' | 'automation' | 'session' | 'backup' | 'logs'): void {
    this.activeTab = tab;
    if (tab === 'logs') {
      this.loadLogs();
    }
    this.cdr.detectChanges();
  }

  loadAdminData(): void {
    this.isLoading = true;
    this.vneduService.getAdminOverview().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.success) {
          this.stats = res;
          if (res.settings) {
            this.settings = { ...this.settings, ...res.settings };
          }
          if (res.teachers) {
            this.teachersList = res.teachers.list || [];
            this.activeTeacher = res.teachers.active;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Không thể tải thông tin Quản Trị Hệ Thống!', 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  loadLogs(): void {
    this.vneduService.getAdminLogs(100).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.auditLogs = res.logs || [];
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  get filteredLogs(): any[] {
    if (this.logFilter === 'all') return this.auditLogs;
    return this.auditLogs.filter(l => l.type === this.logFilter);
  }

  showToast(text: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info'): void {
    this.toast = { text, type };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 4000);
    this.cdr.detectChanges();
  }

  // Action: Save settings
  onSaveSettings(): void {
    this.isSaving = true;
    this.vneduService.saveAdminSettings(this.settings).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res && res.success) {
          this.showToast('Đã lưu cấu hình tự động hóa hệ thống thành công! 🛡️', 'success');
        } else {
          this.showToast('Lỗi khi lưu cấu hình: ' + (res?.error || 'Vui lòng thử lại'), 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast('Không thể kết nối lưu cấu hình: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Action: Ping vnEdu
  onPingVnEdu(): void {
    this.isPinging = true;
    this.pingResult = null;
    const startTime = Date.now();
    this.vneduService.getStatus().subscribe({
      next: (res) => {
        this.isPinging = false;
        const latency = Date.now() - startTime;
        this.pingResult = {
          success: res && res.connected,
          latency,
          msg: res && res.connected ? `Kết nối vnEdu hoạt động tốt (${latency}ms)` : 'vnEdu phản hồi nhưng phiên đã hết hạn'
        };
        this.showToast(this.pingResult.msg, this.pingResult.success ? 'success' : 'warning');
        this.loadAdminData();
      },
      error: (err) => {
        this.isPinging = false;
        this.pingResult = {
          success: false,
          latency: Date.now() - startTime,
          msg: 'Không thể kết nối vnEdu: ' + err.message
        };
        this.showToast(this.pingResult.msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Action: Clear Cache
  onClearCache(): void {
    if (!confirm('Cô có chắc chắn muốn dọn dẹp toàn bộ bộ nhớ đệm (Cache) của hệ thống không?')) return;
    this.vneduService.clearAdminCache().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.showToast(`Đã dọn dẹp ${res.freedKB || 0} KB bộ nhớ đệm thành công! 🧹`, 'success');
          this.loadAdminData();
        }
      },
      error: (err) => {
        this.showToast('Lỗi khi dọn dẹp cache: ' + err.message, 'danger');
      }
    });
  }

  // Action: Teacher management
  onOpenAddTeacher(): void {
    this.isEditingTeacher = false;
    this.teacherForm = {
      username: '',
      name: '',
      title: '',
      gender: 'female',
      subject: '',
      school: this.settings.schoolName || 'Trường THCS An Lập',
      branch: this.settings.schoolBranch || 'Phân hiệu An Lập'
    };
    this.showTeacherModal = true;
    this.cdr.detectChanges();
  }

  onOpenEditTeacher(t: any): void {
    this.isEditingTeacher = true;
    this.teacherForm = {
      username: t.username,
      name: t.name || t.title,
      title: t.title || t.name,
      gender: t.gender || 'female',
      subject: t.subject || '',
      school: t.school || 'Trường THCS An Lập',
      branch: t.branch || 'Phân hiệu An Lập'
    };
    this.showTeacherModal = true;
    this.cdr.detectChanges();
  }

  onCloseTeacherModal(): void {
    this.showTeacherModal = false;
    this.cdr.detectChanges();
  }

  onSaveTeacher(): void {
    if (!this.teacherForm.username || !this.teacherForm.username.trim()) {
      alert('Vui lòng nhập số điện thoại hoặc mã tài khoản vnEdu.');
      return;
    }

    this.isSaving = true;
    this.vneduService.saveAdminTeacher(this.teacherForm).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res && res.success) {
          this.showToast(`Đã lưu hồ sơ Thầy/Cô ${this.teacherForm.name || this.teacherForm.username} thành công! 🎉`, 'success');
          this.showTeacherModal = false;
          this.loadAdminData();
        } else {
          this.showToast('Lỗi lưu hồ sơ giáo viên', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast('Lỗi lưu hồ sơ: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  onSwitchTeacher(username: string): void {
    this.authService.switchTeacher(username).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.showToast(`Đã chuyển làm việc sang tài khoản ${res.teacher?.title || res.teacher?.name}! ⚡`, 'success');
          this.loadAdminData();
        }
      },
      error: () => {
        this.showToast('Lỗi chuyển tài khoản', 'danger');
      }
    });
  }

  onDeleteTeacher(t: any): void {
    if (t.username === '051197003685') {
      alert('Tài khoản Quản Trị Viên Cô Lê Thị Diệu Huyên là tài khoản gốc bảo vệ hệ thống, không thể xóa!');
      return;
    }
    if (!confirm(`Cô có chắc chắn muốn xóa hồ sơ của ${t.title || t.name} (${t.username}) khỏi hệ thống không?`)) {
      return;
    }

    this.vneduService.deleteTeacher(t.username).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.showToast(`Đã xóa hồ sơ giáo viên ${t.username} thành công!`, 'info');
          this.loadAdminData();
        } else {
          this.showToast(res?.msg || 'Không thể xóa hồ sơ', 'danger');
        }
      },
      error: (err) => {
        this.showToast('Lỗi khi xóa hồ sơ: ' + err.message, 'danger');
      }
    });
  }

  // Backup & Restore
  onDownloadBackup(): void {
    window.open('/api/admin/backup', '_blank');
  }

  onUploadBackup(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const backupData = JSON.parse(e.target.result);
        if (!confirm('Khôi phục từ file backup sẽ ghi đè cấu hình hiện tại. Cô có chắc chắn muốn tiến hành?')) {
          return;
        }
        this.vneduService.restoreAdminBackup(backupData).subscribe({
          next: (res) => {
            if (res && res.success) {
              this.showToast('Đã khôi phục toàn bộ hệ thống từ file sao lưu thành công! 🛡️', 'success');
              this.loadAdminData();
            } else {
              this.showToast('Lỗi khôi phục: ' + (res?.error || 'File không hợp lệ'), 'danger');
            }
          },
          error: (err) => {
            this.showToast('Lỗi kết nối khôi phục: ' + err.message, 'danger');
          }
        });
      } catch (err: any) {
        alert('File sao lưu không đúng định dạng JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  }

  getTeacherInitial(name?: string): string {
    if (!name) return 'H';
    const parts = name.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    return (lastName ? lastName.charAt(0) : 'H').toUpperCase();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.unsubscribe.forEach(s => s.unsubscribe());
  }
}
