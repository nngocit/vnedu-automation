import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { VnEduService, AppNotification } from '../../../../../pages/vnedu/services/vnedu.service';
import { AuthService, UserType } from '../../../../../modules/auth';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() appHeaderDefaulMenuDisplay: boolean;
  @Input() isRtl: boolean;

  itemClass: string = 'ms-1 ms-lg-3';
  btnClass: string = 'btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary w-35px h-35px w-md-40px h-md-40px';
  userAvatarClass: string = 'symbol-35px symbol-md-40px';
  btnIconClass: string = 'fs-2 fs-md-1';

  appVersion: string = 'v2.8.19';

  notifications: AppNotification[] = [];
  showNotificationDropdown: boolean = false;
  activeNotificationTab: 'all' | 'alerts' | 'info' = 'all';
  user$: Observable<UserType>;
  private sub: Subscription = new Subscription();

  get unreadNotificationsCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  get hasCriticalErrors(): boolean {
    return this.notifications.some(n => n.severity === 'error' && !n.isRead);
  }

  get filteredNotifications(): AppNotification[] {
    if (this.activeNotificationTab === 'alerts') {
      return this.notifications.filter(n => n.severity === 'error' || n.severity === 'warning');
    }
    if (this.activeNotificationTab === 'info') {
      return this.notifications.filter(n => n.severity === 'info' || n.severity === 'success');
    }
    return this.notifications;
  }

  constructor(
    private vneduService: VnEduService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user$ = this.authService.currentUserSubject.asObservable();
    this.sub.add(
      this.vneduService.notifications$.subscribe(list => {
        this.notifications = list || [];
        this.cdr.detectChanges();
      })
    );

    // Tự động mở hòm thư thông báo khi có yêu cầu (ví dụ phát hiện cảnh báo SĐĐ Giám thị mới)
    this.sub.add(
      this.vneduService.openNotificationDropdown$.subscribe(open => {
        this.showNotificationDropdown = open;
        this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  toggleNotificationDropdown(): void {
    this.showNotificationDropdown = !this.showNotificationDropdown;
    this.cdr.detectChanges();
  }

  getTeacherInitial(name?: string): string {
    if (!name) return 'H';
    const parts = name.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    return (lastName ? lastName.charAt(0) : 'H').toUpperCase();
  }

  openAiChat(): void {
    this.vneduService.toggleAiChat(true);
  }

  closeNotificationDropdown(): void {
    this.showNotificationDropdown = false;
    this.cdr.detectChanges();
  }

  setNotificationTab(tab: 'all' | 'alerts' | 'info'): void {
    this.activeNotificationTab = tab;
    this.cdr.detectChanges();
  }

  markAllAsRead(): void {
    const readList: string[] = [];
    this.notifications.forEach(n => {
      n.isRead = true;
      if (n.id) readList.push(n.id);
      if (n.id && n.id.startsWith('gt_mismatch_')) {
        const parts = n.id.replace('gt_mismatch_', '').split('_');
        if (parts.length >= 3) {
          const thu = parseInt(parts[0]);
          const tiet = parseInt(parts[1]);
          const lop = parts[2];
          const week = n.slotRef?.week || 10;
          this.vneduService.ackAttendanceConflict(week, thu, tiet, lop).subscribe();
        }
      }
    });
    try {
      localStorage.setItem('vnedu_read_notifs', JSON.stringify(readList));
    } catch (_) {}
    this.vneduService.setNotifications(this.notifications);
    this.cdr.detectChanges();
  }

  dismissNotification(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    try {
      const raw = localStorage.getItem('vnedu_dismissed_notifs');
      const list = raw ? JSON.parse(raw) : [];
      list.push(id);
      localStorage.setItem('vnedu_dismissed_notifs', JSON.stringify(Array.from(new Set(list))));
    } catch (_) {}

    if (id && id.startsWith('gt_mismatch_')) {
      const parts = id.replace('gt_mismatch_', '').split('_');
      if (parts.length >= 3) {
        const thu = parseInt(parts[0]);
        const tiet = parseInt(parts[1]);
        const lop = parts[2];
        const targetNotif = this.notifications.find(n => n.id === id);
        const week = targetNotif?.slotRef?.week || 10;
        this.vneduService.ackAttendanceConflict(week, thu, tiet, lop).subscribe();
      }
    }
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.vneduService.setNotifications(this.notifications);
    this.cdr.detectChanges();
  }

  reaudit(): void {
    this.vneduService.triggerReaudit();
  }

  navigateToSlot(notif: AppNotification, event?: Event): void {
    if (event) event.stopPropagation();
    notif.isRead = true;
    this.vneduService.setNotifications(this.notifications);
    this.showNotificationDropdown = false;
    this.cdr.detectChanges();

    if (notif.slotRef) {
      const isAttendanceRelated = notif.category === 'ATTENDANCE' ||
        Boolean(notif.title && (notif.title.toLowerCase().includes('vắng') || notif.title.toLowerCase().includes('điểm danh') || notif.title.toLowerCase().includes('sĩ số')));
      const payload: { thu: number; tiet: number; lop: string; category?: string; openModal?: boolean } = {
        thu: notif.slotRef.thu,
        tiet: notif.slotRef.tiet,
        lop: notif.slotRef.lop,
        category: notif.category,
        openModal: isAttendanceRelated
      };

      if (this.router.url.indexOf('/vnedu/so-dau-bai') === -1) {
        this.router.navigate(['/vnedu/so-dau-bai']).then(() => {
          setTimeout(() => {
            this.vneduService.triggerNavigateToSlot(payload);
          }, 350);
        });
      } else {
        this.vneduService.triggerNavigateToSlot(payload);
      }
    }
  }
}
