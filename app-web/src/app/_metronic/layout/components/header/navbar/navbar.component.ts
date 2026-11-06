import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { VnEduService, AppNotification } from '../../../../../pages/vnedu/services/vnedu.service';

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

  notifications: AppNotification[] = [];
  showNotificationDropdown: boolean = false;
  activeNotificationTab: 'all' | 'alerts' | 'info' = 'all';
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.vneduService.notifications$.subscribe(list => {
        this.notifications = list || [];
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

  closeNotificationDropdown(): void {
    this.showNotificationDropdown = false;
    this.cdr.detectChanges();
  }

  setNotificationTab(tab: 'all' | 'alerts' | 'info'): void {
    this.activeNotificationTab = tab;
    this.cdr.detectChanges();
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.isRead = true);
    this.vneduService.setNotifications(this.notifications);
    this.cdr.detectChanges();
  }

  dismissNotification(id: string, event?: Event): void {
    if (event) event.stopPropagation();
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
      this.vneduService.triggerNavigateToSlot(notif.slotRef);
    }
  }
}
