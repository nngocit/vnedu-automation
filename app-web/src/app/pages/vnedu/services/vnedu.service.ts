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
  slotRef?: {
    week?: number;
    ngay?: string;
    thu: number;
    tiet: number;
    lop: string;
    category?: string;
    openModal?: boolean;
    [key: string]: any;
  };
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
  private navigateSlotSubject = new Subject<{ thu: number; tiet: number; lop: string; category?: string; openModal?: boolean }>();
  public navigateSlot$ = this.navigateSlotSubject.asObservable();

  // Sự kiện yêu cầu quét lại từ chuông
  private reauditSubject = new Subject<number>();
  public reaudit$ = this.reauditSubject.asObservable();

  // Sự kiện tự động mở / đóng hòm thư (Notification Dropdown) từ xa
  private openNotificationDropdownSubject = new Subject<boolean>();
  public openNotificationDropdown$ = this.openNotificationDropdownSubject.asObservable();

  triggerOpenNotificationDropdown(open: boolean = true): void {
    this.openNotificationDropdownSubject.next(open);
  }

  setNotifications(list: AppNotification[]): void {
    this.notificationsSubject.next(list);
  }

  getNotifications(): AppNotification[] {
    return this.notificationsSubject.getValue();
  }

  triggerNavigateToSlot(slotRef: { thu: number; tiet: number; lop: string; category?: string; openModal?: boolean }): void {
    this.navigateSlotSubject.next(slotRef);
  }

  triggerReaudit(week?: number): void {
    this.reauditSubject.next(week || 9);
  }

  // Trạng thái mở/đóng Trợ lý AI Chat
  private aiChatOpenSubject = new BehaviorSubject<boolean>(false);
  public isAiChatOpen$ = this.aiChatOpenSubject.asObservable();

  toggleAiChat(forceState?: boolean): void {
    if (forceState !== undefined) {
      this.aiChatOpenSubject.next(forceState);
    } else {
      this.aiChatOpenSubject.next(!this.aiChatOpenSubject.getValue());
    }
  }

  sendAiChat(message: string, currentWeek: number = 9, history: any[] = [], slots: any[] = []): Observable<any> {
    return this.http.post<any>('/api/ai/chat', { message, currentWeek, history, slots });
  }

  getAiSummary(week: number = 9): Observable<any> {
    return this.http.get<any>(`/api/ai/summary?week=${week}`);
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

  // ========================================================
  // TRUNG TÂM QUẢN TRỊ HỆ THỐNG (ADMIN ARMOR APIs)
  // ========================================================
  getAdminOverview(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/overview`, {
      headers: this.getHeaders()
    });
  }

  getAdminSettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/settings`, {
      headers: this.getHeaders()
    });
  }

  saveAdminSettings(settings: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/settings`, settings, {
      headers: this.getHeaders()
    });
  }

  getAdminLogs(limit: number = 50): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/logs?limit=${limit}`, {
      headers: this.getHeaders()
    });
  }

  clearAdminCache(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/cache/clear`, {}, {
      headers: this.getHeaders()
    });
  }

  restoreAdminBackup(backupData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/restore`, backupData, {
      headers: this.getHeaders()
    });
  }

  saveAdminTeacher(teacherData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/teachers/save`, teacherData, {
      headers: this.getHeaders()
    });
  }

  deleteTeacher(username: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/teachers/delete`, { username }, {
      headers: this.getHeaders()
    });
  }

  ackAttendanceConflict(week: number, thu: number, tiet: number, lop: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/db/attendance/ack`, { week, thu, tiet, lop }, {
      headers: this.getHeaders()
    });
  }

  // ========================================================
  // TIN NHẮN NỘI BỘ vnEdu (LẤY TỪ TÀI KHOẢN THỰC ĐÃ ĐĂNG NHẬP)
  // ========================================================
  getChatUsers(): Observable<{ success: boolean; users: any[] }> {
    return this.http.get<{ success: boolean; users: any[] }>(`${this.baseUrl}/chat/users`, {
      headers: this.getHeaders()
    });
  }

  getChatMessages(userA?: string, userB?: string): Observable<{ success: boolean; messages: any[] }> {
    let url = `${this.baseUrl}/chat/messages`;
    if (userA && userB) {
      url += `?userA=${encodeURIComponent(userA)}&userB=${encodeURIComponent(userB)}`;
    }
    return this.http.get<{ success: boolean; messages: any[] }>(url, {
      headers: this.getHeaders()
    });
  }

  sendChatMessage(data: {
    id?: string;
    conversationId?: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    receiverId?: string;
    receiverName?: string;
    text?: string;
    content?: string;
    msgType?: string;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: string;
    replyTo?: { id?: string; senderName?: string; text?: string } | null;
    mentions?: string[];
    isCallLog?: boolean;
    callType?: 'voice' | 'video';
    callDuration?: number;
    callStatus?: 'completed' | 'missed' | 'rejected';
  }): Observable<{ success: boolean; message: any }> {
    return this.http.post<{ success: boolean; message: any }>(`${this.baseUrl}/chat/messages`, data, {
      headers: this.getHeaders()
    });
  }

  getConversations(userId?: string, category: string = 'all', search: string = ''): Observable<{ success: boolean; conversations: any[] }> {
    let url = `${this.baseUrl}/chat/conversations?category=${encodeURIComponent(category)}`;
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.http.get<{ success: boolean; conversations: any[] }>(url, {
      headers: this.getHeaders()
    });
  }

  getConversationMessages(conversationId: string): Observable<{ success: boolean; messages: any[] }> {
    return this.http.get<{ success: boolean; messages: any[] }>(`${this.baseUrl}/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
      headers: this.getHeaders()
    });
  }

  getContacts(search: string = '', tag: string = 'all'): Observable<{ success: boolean; contacts: any[] }> {
    let url = `${this.baseUrl}/chat/contacts?tag=${encodeURIComponent(tag)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.http.get<{ success: boolean; contacts: any[] }>(url, {
      headers: this.getHeaders()
    });
  }

  createGroupChat(data: { name: string; creatorId: string; creatorName?: string; memberIds?: string[]; avatar?: string }): Observable<{ success: boolean; group: any }> {
    return this.http.post<{ success: boolean; group: any }>(`${this.baseUrl}/chat/groups`, data, {
      headers: this.getHeaders()
    });
  }

  recallChatMessage(messageId: string, userId?: string): Observable<{ success: boolean; messageId?: string; content?: string }> {
    return this.http.post<{ success: boolean; messageId?: string; content?: string }>(`${this.baseUrl}/chat/messages/recall`, { messageId, userId }, {
      headers: this.getHeaders()
    });
  }

  deleteChatMessage(messageId: string, userId?: string): Observable<{ success: boolean; messageId?: string }> {
    return this.http.post<{ success: boolean; messageId?: string }>(`${this.baseUrl}/chat/messages/delete`, { messageId, userId }, {
      headers: this.getHeaders()
    });
  }

  reactChatMessage(messageId: string, userId: string, reaction: string = 'like'): Observable<{ success: boolean; messageId?: string; reactions?: any }> {
    return this.http.post<{ success: boolean; messageId?: string; reactions?: any }>(`${this.baseUrl}/chat/messages/react`, { messageId, userId, reaction }, {
      headers: this.getHeaders()
    });
  }

  pinChatMessage(conversationId: string, messageId: string): Observable<{ success: boolean; conversationId?: string; pinnedMessage?: any }> {
    return this.http.post<{ success: boolean; conversationId?: string; pinnedMessage?: any }>(`${this.baseUrl}/chat/conversations/${encodeURIComponent(conversationId)}/pin`, { messageId }, {
      headers: this.getHeaders()
    });
  }

  sendCallSignal(signalData: {
    signalType: 'call_start' | 'call_accept' | 'call_reject' | 'call_end' | 'call_offer' | 'call_answer' | 'call_ice';
    callerId: string;
    callerName?: string;
    callerAvatar?: string;
    receiverId: string;
    receiverName?: string;
    callType?: 'voice' | 'video';
    duration?: number;
    sdp?: any;
    candidate?: any;
  }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/chat/call/signal`, signalData, {
      headers: this.getHeaders()
    });
  }

  markChatMessagesAsRead(readerId: string, partnerId?: string): Observable<{ success: boolean; result?: any }> {
    return this.http.post<{ success: boolean; result?: any }>(`${this.baseUrl}/chat/messages/read`, { readerId, partnerId }, {
      headers: this.getHeaders()
    });
  }

  sendTypingStatus(senderId: string, receiverId: string, isTyping: boolean): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/chat/typing`, { senderId, receiverId, isTyping }, {
      headers: this.getHeaders()
    });
  }

  clearChatMessages(userA?: string, userB?: string, clearAll: boolean = false): Observable<{ success: boolean; result?: any }> {
    return this.http.post<{ success: boolean; result?: any }>(`${this.baseUrl}/chat/messages/clear`, { userA, userB, clearAll }, {
      headers: this.getHeaders()
    });
  }
}
