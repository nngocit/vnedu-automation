import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { VnEduService } from '../services/vnedu.service';
import { PpctConfig } from '../models/vnedu.model';

interface WeekPpctRow {
  week: number;
  tiet1: number;
  tiet2: number;
}

@Component({
  selector: 'app-ppct-config',
  templateUrl: './ppct-config.component.html',
  styleUrls: ['./ppct-config.component.scss'],
  standalone: false
})
export class PpctConfigComponent implements OnInit {
  isLoading = false;
  isSaving = false;
  config: PpctConfig | null = null;
  weekRows: WeekPpctRow[] = [];
  autoSync = true;
  mode = 'auto';

  toastMessage: { text: string; type: 'success' | 'danger' | 'info' } | null = null;

  constructor(
    private vneduService: VnEduService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  showToast(text: string, type: 'success' | 'danger' | 'info' = 'success'): void {
    this.toastMessage = { text, type };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toastMessage = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  loadConfig(): void {
    this.isLoading = true;
    this.vneduService.getPpctConfig().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.config) {
          this.config = res.config;
          this.autoSync = res.config.autoSyncToVnEdu ?? true;
          this.mode = res.config.hdtn?.mode || 'auto';
          this.buildWeekRows(res.config.hdtn?.weeks || {});
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Lỗi khi tải cấu hình PPCT: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  buildWeekRows(weeks: { [key: string]: { tiet1: number; tiet2: number } }): void {
    const rows: WeekPpctRow[] = [];
    for (let w = 1; w <= 35; w++) {
      const key = String(w);
      if (weeks[key]) {
        rows.push({
          week: w,
          tiet1: weeks[key].tiet1,
          tiet2: weeks[key].tiet2
        });
      } else {
        // Ước tính mặc định nếu chưa cấu hình: ví dụ tuần w thì tiết 1 = w * 3, tiết 2 = w * 3 - 1
        rows.push({
          week: w,
          tiet1: w * 3,
          tiet2: w * 3 - 1
        });
      }
    }
    this.weekRows = rows;
  }

  saveConfig(): void {
    this.isSaving = true;
    const newWeeks: { [key: string]: { tiet1: number; tiet2: number } } = {};
    this.weekRows.forEach(r => {
      newWeeks[String(r.week)] = {
        tiet1: Number(r.tiet1) || 0,
        tiet2: Number(r.tiet2) || 0
      };
    });

    const updatedConfig: PpctConfig = {
      hdtn: {
        mode: this.mode,
        weeks: newWeeks
      },
      autoSyncToVnEdu: this.autoSync
    };

    this.vneduService.savePpctConfig(updatedConfig).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success) {
          this.showToast('Đã lưu cấu hình PPCT thành công!', 'success');
        } else {
          this.showToast(res.error || 'Không thể lưu cấu hình', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast('Lỗi lưu cấu hình: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  resetFormula(): void {
    // Tự động tính lại theo công thức chuẩn: Tiết 1 = Tuần * 3, Tiết 2 = Tuần * 3 - 1
    this.weekRows.forEach(r => {
      r.tiet1 = r.week * 3;
      r.tiet2 = r.week * 3 - 1;
    });
    this.showToast('Đã đặt lại theo công thức chuẩn (Tuần x 3)! Hãy nhấn Lưu để áp dụng.', 'info');
  }
}
