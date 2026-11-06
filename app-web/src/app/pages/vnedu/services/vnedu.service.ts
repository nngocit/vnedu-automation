import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import {
  VnEduInfo,
  VnEduWeekSchedule,
  VnEduSlot,
  AbsentStudent,
  VnEduStatus,
  PpctConfig
} from '../models/vnedu.model';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  time: string;
  slotRef?: { thu: number; tiet: number; lop: string };
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VnEduService {
  private baseUrl = '/api';

  // Shared Notifications State (Dùng chung cho Top Header Navbar & Sổ Đầu Bài)
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Sự kiện cuộn và highlight tiết học khi bấm từ chuông thông báo
  private navigateSlotSubject = new Subject<{ thu: number; tiet: number; lop: string }>();
  public navigateSlot$ = this.navigateSlotSubject.asObservable();

  // Sự kiện yêu cầu quét lại từ chuông
  private reauditSubject = new Subject<number>();
  public reaudit$ = this.reauditSubject.asObservable();

  setNotifications(list: AppNotification[]): void {
    this.notificationsSubject.next(list);
  }

  getNotifications(): AppNotification[] {
    return this.notificationsSubject.getValue();
  }

  triggerNavigateToSlot(slotRef: { thu: number; tiet: number; lop: string }): void {
    this.navigateSlotSubject.next(slotRef);
  }

  triggerReaudit(week?: number): void {
    this.reauditSubject.next(week || 9);
  }

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('vnedu_token') || '';
    const cookies = localStorage.getItem('vnedu_cookies') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-vnedu-token': token,
      'x-vnedu-cookie': cookies
    });
  }

  getInfo(source: string = 'vnedu'): Observable<VnEduInfo> {
    return this.http.get<VnEduInfo>(`${this.baseUrl}/info?source=${source}`, {
      headers: this.getHeaders()
    });
  }

  getStatus(): Observable<VnEduStatus> {
    return this.http.get<VnEduStatus>(`${this.baseUrl}/vnedu/status`, {
      headers: this.getHeaders()
    });
  }

  login(username: string, password: string):Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vnedu/login`, { username, password }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  getSchedule(week: number, source: string = 'vnedu', checkLive: boolean = true): Observable<VnEduWeekSchedule> {
    return this.http.get<VnEduWeekSchedule>(
      `${this.baseUrl}/schedule?week=${week}&source=${source}&checkLive=${checkLive ? '1' : '0'}`,
      { headers: this.getHeaders() }
    );
  }

  syncSlot(slot: VnEduSlot, week: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/sync-slot`,
      { slot, week },
      { headers: this.getHeaders() }
    );
  }

  syncBatch(week: number, filter: 'today' | 'unlocked' | 'all', slots?: VnEduSlot[]): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/sync-batch`,
      { week, filter, slots },
      { headers: this.getHeaders() }
    );
  }

  getAttendance(lop: string, week: number, thu: number, tiet: number, chitietId?: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/attendance?lop=${encodeURIComponent(lop)}&week=${week}&thu=${thu}&tiet=${tiet}&chitietId=${chitietId || ''}`,
      { headers: this.getHeaders() }
    );
  }

  scanGiamThi(lop: string, date: string, tiet: number, forceRefresh = true): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/attendance/scan-giam-thi?lop=${encodeURIComponent(lop)}&date=${encodeURIComponent(date)}&tiet=${tiet}&forceRefresh=${forceRefresh}`,
      { headers: this.getHeaders() }
    );
  }

  scanAllGiamThi(week: number, slots?: any[]): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/attendance/scan-all-giam-thi`,
      { week, slots },
      { headers: this.getHeaders() }
    );
  }

  saveAttendance(
    chitietId: string,
    studentsData: AbsentStudent[],
    soLuongNghi: number,
    slot?: VnEduSlot,
    week?: number
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/save-attendance`,
      { chitietId, studentsData, soLuongNghi, slot, week },
      { headers: this.getHeaders() }
    );
  }

  getPpctConfig(): Observable<{ success: boolean; config: PpctConfig }> {
    return this.http.get<{ success: boolean; config: PpctConfig }>(`${this.baseUrl}/config/ppct`, {
      headers: this.getHeaders()
    });
  }

  savePpctConfig(config: PpctConfig): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/config/ppct`, { config }, {
      headers: this.getHeaders()
    });
  }

  uploadExcel(fileName: string, fileBase64: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/upload-excel`, { fileName, fileBase64 }, {
      headers: this.getHeaders()
    });
  }

  auditWeek(week: number = 9): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/validation/audit-week?week=${week}`, {
      headers: this.getHeaders()
    });
  }

  resetExcel(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/reset-excel`, {}, {
      headers: this.getHeaders()
    });
  }
}
