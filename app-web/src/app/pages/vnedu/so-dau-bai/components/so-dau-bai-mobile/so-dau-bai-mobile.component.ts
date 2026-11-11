import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { VnEduSlot, WeekOption } from '../../../models/vnedu.model';

@Component({
  selector: 'app-so-dau-bai-mobile',
  templateUrl: './so-dau-bai-mobile.component.html',
  styleUrls: ['./so-dau-bai-mobile.component.scss'],
  standalone: false
})
export class SoDauBaiMobileComponent implements OnInit, OnChanges {
  @Input() dayGroups: any[] = [];
  @Input() currentWeek: number = 10;
  @Input() realCurrentWeek: number = 10;
  @Input() weeksList: WeekOption[] = [];
  @Input() teacherTitle: string = 'Cô Lê Thị Diệu Huyên';
  @Input() teacherSchool: string = 'Trường THCS An Lập';
  @Input() isSuperAdminLoggedIn: boolean = false;
  @Input() currentLoggedInUser: any = null;
  @Input() isFutureWeek: boolean = false;
  @Input() isSavingBatch: boolean = false;
  @Input() appVersion: string = 'v2.7.0';

  @Output() weekChange = new EventEmitter<number>();
  @Output() prevWeek = new EventEmitter<void>();
  @Output() nextWeek = new EventEmitter<void>();
  @Output() syncSingle = new EventEmitter<VnEduSlot>();
  @Output() syncToday = new EventEmitter<void>();
  @Output() syncAll = new EventEmitter<void>();
  @Output() openAttendance = new EventEmitter<VnEduSlot>();
  @Output() scanSupervisor = new EventEmitter<void>();
  @Output() switchTeacher = new EventEmitter<void>();

  selectedThu: number = 0;

  ngOnInit(): void {
    this.initSelectedDay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dayGroups'] && this.dayGroups && this.dayGroups.length > 0) {
      if (!this.selectedThu || !this.dayGroups.some(g => g.thu === this.selectedThu)) {
        this.initSelectedDay();
      }
    }
  }

  initSelectedDay(): void {
    if (!this.dayGroups || this.dayGroups.length === 0) return;
    const today = this.dayGroups.find(g => g.isToday);
    if (today) {
      this.selectedThu = today.thu;
    } else {
      this.selectedThu = this.dayGroups[0].thu;
    }
  }

  selectDay(thu: number): void {
    this.selectedThu = thu;
  }

  get selectedGroup(): any {
    if (!this.dayGroups || this.dayGroups.length === 0) return null;
    return this.dayGroups.find(g => g.thu === this.selectedThu) || this.dayGroups[0];
  }

  getDayShort(thu: number): string {
    const map: { [key: number]: string } = {
      2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7', 8: 'CN'
    };
    return map[thu] || `T${thu}`;
  }

  getDayDate(ngay: string): string {
    if (!ngay) return '';
    const parts = ngay.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return ngay;
  }

  getSlotTime(slot: any): string {
    if (slot.tiet <= 5) {
      switch (slot.tiet) {
        case 1: return '07:05 - 07:50';
        case 2: return '07:55 - 08:40';
        case 3: return '08:50 - 09:35';
        case 4: return '09:45 - 10:30';
        case 5: return '10:35 - 11:20';
        default: return '';
      }
    }
    return '';
  }

  getDisplayAbsentCount(slot: any): number {
    if (!slot) return 0;
    if ((this.isFutureWeek || slot.isFutureSlot) && !slot.isSynced) return 0;
    if (slot.sdbSoLuongNghi !== undefined && slot.sdbSoLuongNghi !== null) return slot.sdbSoLuongNghi;
    if (slot.soLuongNghi !== undefined && slot.soLuongNghi !== null) return slot.soLuongNghi;
    if (slot.hsVangList && slot.hsVangList.length > 0) return slot.hsVangList.length;
    if (slot.giamThiSoLuongNghi !== undefined && slot.giamThiSoLuongNghi !== null) return slot.giamThiSoLuongNghi;
    return 0;
  }

  isCanDoiChieu(slot: any): boolean {
    if (!slot) return false;
    if (this.currentWeek < this.realCurrentWeek) return false;
    if ((this.isFutureWeek || slot.isFutureSlot) && !slot.isSynced) return false;
    if (slot.isMatched !== undefined && slot.isMatched !== null) return !slot.isMatched;
    if (slot.sdbSoLuongNghi !== undefined && slot.giamThiSoLuongNghi !== undefined) {
      return slot.giamThiSoLuongNghi > 0 && slot.sdbSoLuongNghi !== slot.giamThiSoLuongNghi;
    }
    if (slot.giamThiSoLuongNghi && slot.giamThiSoLuongNghi > 0 && (!slot.sdbSoLuongNghi || slot.sdbSoLuongNghi === 0)) {
      return true;
    }
    return false;
  }

  getAttendanceChipClass(slot: any): string {
    if (this.currentWeek < this.realCurrentWeek) {
      const count = this.getDisplayAbsentCount(slot);
      return count > 0 ? 'chip-matched' : 'chip-present all-present';
    }
    if ((this.isFutureWeek || slot.isFutureSlot) && !slot.isSynced) {
      return 'chip-future-slot';
    }
    if (this.isCanDoiChieu(slot)) {
      return 'chip-mismatched has-absent pending';
    }
    const count = this.getDisplayAbsentCount(slot);
    if (count > 0) {
      return 'chip-matched';
    }
    return 'chip-present all-present';
  }

  getClassBadgeClass(lop: string): string {
    if (!lop) return 'class-badge-default';
    if (lop.includes('7A2')) return 'class-badge-7a2';
    if (lop.includes('7A3')) return 'class-badge-7a3';
    if (lop.includes('9A2')) return 'class-badge-9a2';
    return 'class-badge-default';
  }

  onWeekSelect(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    if (val) {
      this.weekChange.emit(val);
    }
  }

  trackBySlot(index: number, slot: any): any {
    return `${slot.thu}_${slot.tiet}_${slot.lop}`;
  }

  trackByThu(index: number, group: any): any {
    return group.thu;
  }
}
