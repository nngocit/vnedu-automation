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
  @Input() isLoading: boolean = false;
  @Input() appVersion: string = 'v2.8.7';
  @Input() notifications: any[] = [];
  @Input() unreadNotificationsCount: number = 0;

  @Output() weekChange = new EventEmitter<number>();
  @Output() prevWeek = new EventEmitter<void>();
  @Output() nextWeek = new EventEmitter<void>();
  @Output() syncSingle = new EventEmitter<VnEduSlot>();
  @Output() syncToday = new EventEmitter<void>();
  @Output() syncAll = new EventEmitter<void>();
  @Output() openAttendance = new EventEmitter<VnEduSlot>();
  @Output() scanSupervisor = new EventEmitter<void>();
  @Output() switchTeacher = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  selectedThu: number = 0;
  activeTab: 'schedule' | 'sync' | 'messages' | 'discover' | 'profile' = 'schedule';
  syncSubTab: 'overview' | 'days' = 'overview';
  showLogoutConfirmModal: boolean = false;
  showNotificationSheet: boolean = false;

  // ========================================================
  // QUẢN LÝ TIN NHẮN TEXT NỘI BỘ GIÁO VIÊN TRONG TRƯỜNG
  // ========================================================
  activeContact: any = null;
  searchTeacherQuery: string = '';
  selectedDepartmentFilter: string = 'all';
  messageInputText: string = '';

  quickChatReplies: string[] = [
    'Dạ vâng Thầy/Cô ạ',
    'Em đã chốt SĐB khớp 100%',
    'Nhờ Thầy/Cô dạy thay giúp em',
    'Em sẽ kiểm tra lại ngay',
    'Cảm ơn Thầy/Cô nhiều ạ'
  ];

  chatContacts: any[] = [
    {
      id: 'bgh',
      name: 'Thầy Nguyễn Hữu Trí',
      title: 'Hiệu trưởng',
      department: 'Ban Giám Hiệu',
      role: 'BGH',
      avatarEmoji: '👨‍💼',
      avatarBg: '#e0e7ff',
      isOnline: true,
      unreadCount: 1,
      lastMessage: 'Thầy/Cô lưu ý hoàn thành ký SĐB tuần 10 trước 17h thứ 6 nhé.',
      lastTime: '09:15'
    },
    {
      id: 'nam_tv',
      name: 'Thầy Trần Văn Nam',
      title: 'Tổ trưởng Toán - Tin',
      department: 'Tổ Toán - Tin',
      role: 'Toán',
      avatarEmoji: '👨‍🏫',
      avatarBg: '#dbeafe',
      isOnline: true,
      unreadCount: 0,
      lastMessage: 'Cô Huyên ơi tiết 3 sáng mai cô đổi tiết giúp em được không ạ?',
      lastTime: '08:30'
    },
    {
      id: 'bao_giamthi',
      name: 'Thầy Đặng Quốc Bảo',
      title: 'Giám thị & TPT Đội',
      department: 'Giám thị',
      role: 'BGH',
      avatarEmoji: '👮‍♂️',
      avatarBg: '#fef3c7',
      isOnline: true,
      unreadCount: 0,
      lastMessage: 'Sĩ số tuần 10 của lớp 7A3AL đã đối chiếu khớp 100% vnEdu rồi nhé cô.',
      lastTime: 'Hôm qua'
    },
    {
      id: 'mai_nt',
      name: 'Cô Nguyễn Thị Mai',
      title: 'Tổ trưởng Ngữ Văn',
      department: 'Tổ Ngữ Văn',
      role: 'Văn',
      avatarEmoji: '👩‍🏫',
      avatarBg: '#fce7f3',
      isOnline: false,
      unreadCount: 0,
      lastMessage: 'Hôm nay lớp 7A2AL học rất ngoan và tích cực cô nhé.',
      lastTime: 'Hôm qua'
    },
    {
      id: 'lan_ht',
      name: 'Cô Hoàng Thị Lan',
      title: 'Tổ Ngoại Ngữ',
      department: 'Tổ Tiếng Anh',
      role: 'Ngoại Ngữ',
      avatarEmoji: '👩‍💼',
      avatarBg: '#ccfbf1',
      isOnline: true,
      unreadCount: 0,
      lastMessage: 'Kế hoạch sinh hoạt chuyên môn cụm trường chuyển sang tuần sau nha cô.',
      lastTime: 'T3, 10/11'
    },
    {
      id: 'tuan_pm',
      name: 'Thầy Phạm Minh Tuấn',
      title: 'Tổ KHTN',
      department: 'Tổ Tự Nhiên',
      role: 'Tự Nhiên',
      avatarEmoji: '👨‍🔬',
      avatarBg: '#ecfdf5',
      isOnline: false,
      unreadCount: 0,
      lastMessage: 'Phòng thực hành Hóa - Sinh đã vệ sinh xong rồi cô nhé.',
      lastTime: '08/11'
    }
  ];

  chatMessagesMap: { [contactId: string]: any[] } = {
    'bgh': [
      { id: '1', senderId: 'bgh', senderName: 'Thầy Nguyễn Hữu Trí', text: 'Chào cô Huyên, tình hình nhập Sổ đầu bài tuần 10 của tổ Toán tiến độ thế nào rồi cô?', time: '09:00', isMe: false },
      { id: '2', senderId: 'me', senderName: 'Cô Lê Thị Diệu Huyên', text: 'Dạ chào Thầy, tổ Toán đã nhập và đối chiếu khớp 100% qua hệ thống tự động rồi ạ.', time: '09:05', isMe: true },
      { id: '3', senderId: 'bgh', senderName: 'Thầy Nguyễn Hữu Trí', text: 'Thầy/Cô lưu ý hoàn thành ký SĐB tuần 10 trước 17h thứ 6 nhé.', time: '09:15', isMe: false }
    ],
    'nam_tv': [
      { id: '1', senderId: 'nam_tv', senderName: 'Thầy Trần Văn Nam', text: 'Chào cô Huyên, cô dạy xong tiết 2 sáng mai có trống tiết không ạ?', time: '08:20', isMe: false },
      { id: '2', senderId: 'nam_tv', senderName: 'Thầy Trần Văn Nam', text: 'Cô Huyên ơi tiết 3 sáng mai cô đổi tiết giúp em được không ạ?', time: '08:30', isMe: false }
    ],
    'bao_giamthi': [
      { id: '1', senderId: 'me', senderName: 'Cô Lê Thị Diệu Huyên', text: 'Thầy Bảo kiểm tra giúp em sĩ số lớp 7A3AL sáng nay nhé.', time: '10:15', isMe: true },
      { id: '2', senderId: 'bao_giamthi', senderName: 'Thầy Đặng Quốc Bảo', text: 'Sĩ số tuần 10 của lớp 7A3AL đã đối chiếu khớp 100% vnEdu rồi nhé cô.', time: '10:20', isMe: false }
    ]
  };

  get todayThu(): number {
    const today = this.dayGroups?.find(g => g.isToday);
    return today ? today.thu : (this.dayGroups?.[0]?.thu || 2);
  }

  // Thống kê đồng bộ toàn tuần
  get totalSlotsCount(): number {
    if (!this.dayGroups) return 0;
    return this.dayGroups.reduce((acc, g) => acc + (g.slots?.length || 0), 0);
  }

  get syncedSlotsCount(): number {
    if (!this.dayGroups) return 0;
    return this.dayGroups.reduce((acc, g) => acc + (g.slots?.filter((s: any) => s.isSynced).length || 0), 0);
  }

  get pendingSlotsCount(): number {
    if (!this.dayGroups) return 0;
    return this.dayGroups.reduce((acc, g) => acc + (g.slots?.filter((s: any) => !s.isSynced && !s.isFutureSlot && this.currentWeek <= this.realCurrentWeek).length || 0), 0);
  }

  get mismatchedSlotsCount(): number {
    if (!this.dayGroups) return 0;
    return this.dayGroups.reduce((acc, g) => acc + (g.slots?.filter((s: any) => this.isCanDoiChieu(s)).length || 0), 0);
  }

  get syncPercentage(): number {
    const total = this.totalSlotsCount;
    if (total === 0) return 100;
    return Math.min(100, Math.round((this.syncedSlotsCount / total) * 100));
  }

  ngOnInit(): void {
    this.initSelectedDay();
    this.loadMessagesFromStorage();
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
    this.activeTab = 'schedule';
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

  // Chuyển trực tiếp từ trang Đồng Bộ về ngày trong Lịch Dạy
  goToScheduleDay(thu: number): void {
    this.selectedThu = thu;
    this.activeTab = 'schedule';
  }

  // Thao tác đăng xuất
  onPromptLogout(): void {
    this.showLogoutConfirmModal = true;
  }

  confirmLogout(): void {
    this.showLogoutConfirmModal = false;
    this.logout.emit();
  }

  cancelLogout(): void {
    this.showLogoutConfirmModal = false;
  }

  // ========================================================
  // CÁC THAO TÁC XỬ LÝ CHAT NỘI BỘ GIÁO VIÊN
  // ========================================================
  get filteredContacts(): any[] {
    let list = this.chatContacts;
    if (this.selectedDepartmentFilter !== 'all') {
      list = list.filter(c => c.department.includes(this.selectedDepartmentFilter) || c.role === this.selectedDepartmentFilter);
    }
    if (this.searchTeacherQuery?.trim()) {
      const q = this.searchTeacherQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
      );
    }
    return list;
  }

  selectContact(contact: any): void {
    this.activeContact = contact;
    contact.unreadCount = 0;
    this.saveMessagesToStorage();
    setTimeout(() => this.scrollChatToBottom(), 80);
  }

  closeConversation(): void {
    this.activeContact = null;
  }

  sendMessage(): void {
    const text = (this.messageInputText || '').trim();
    if (!text || !this.activeContact) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMsg = {
      id: Date.now().toString(),
      senderId: 'me',
      senderName: this.teacherTitle,
      text: text,
      time: timeStr,
      isMe: true
    };

    if (!this.chatMessagesMap[this.activeContact.id]) {
      this.chatMessagesMap[this.activeContact.id] = [];
    }
    this.chatMessagesMap[this.activeContact.id].push(newMsg);
    this.activeContact.lastMessage = text;
    this.activeContact.lastTime = timeStr;
    this.messageInputText = '';
    this.saveMessagesToStorage();
    setTimeout(() => this.scrollChatToBottom(), 80);
  }

  sendQuickReply(text: string): void {
    this.messageInputText = text;
    this.sendMessage();
  }

  scrollChatToBottom(): void {
    try {
      const el = document.querySelector('.chat-messages-scroll');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (_) {}
  }

  private saveMessagesToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('vnedu_teacher_chat_v1', JSON.stringify({
          messages: this.chatMessagesMap,
          contacts: this.chatContacts
        }));
      }
    } catch (_) {}
  }

  private loadMessagesFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('vnedu_teacher_chat_v1');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.messages) {
            this.chatMessagesMap = { ...this.chatMessagesMap, ...data.messages };
          }
          if (data.contacts && Array.isArray(data.contacts)) {
            data.contacts.forEach((sc: any) => {
              const target = this.chatContacts.find(c => c.id === sc.id);
              if (target) {
                target.lastMessage = sc.lastMessage || target.lastMessage;
                target.lastTime = sc.lastTime || target.lastTime;
                target.unreadCount = sc.unreadCount ?? target.unreadCount;
              }
            });
          }
        }
      }
    } catch (_) {}
  }

  trackBySlot(index: number, slot: any): any {
    return `${slot.thu}_${slot.tiet}_${slot.lop}`;
  }

  trackByThu(index: number, group: any): any {
    return group.thu;
  }
}
