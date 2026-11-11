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
  @Input() appVersion: string = 'v2.8.8';
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

  // ========================================================
  // QUẢN LÝ TRANG KHÁM PHÁ (THƯ VIỆN TÀI LIỆU & TIỆN ÍCH GIÁO VIÊN)
  // ========================================================
  discoverSubTab: 'documents' | 'tools' | 'news' = 'documents';
  searchDocQuery: string = '';
  selectedDocCategory: string = 'all';
  activeDocPreview: any = null;
  copiedCommentIndex: number = -1;

  // Công cụ tính điểm trung bình Thông tư 22
  calcTx1: number = 8.5;
  calcTx2: number = 9.0;
  calcTx3: number = 8.0;
  calcTx4: number = 8.0;
  calcGk: number = 8.5;
  calcCk: number = 9.0;

  get calculatedDtb(): number {
    const sumTx = Number(this.calcTx1 || 0) + Number(this.calcTx2 || 0) + Number(this.calcTx3 || 0) + Number(this.calcTx4 || 0);
    const gk = Number(this.calcGk || 0) * 2;
    const ck = Number(this.calcCk || 0) * 3;
    const totalWeight = 4 + 2 + 3; // 4 TX + 2 GK + 3 CK = 9
    const dtb = (sumTx + gk + ck) / totalWeight;
    return Math.round(dtb * 10) / 10;
  }

  get calculatedRank(): { text: string; badgeClass: string } {
    const dtb = this.calculatedDtb;
    if (dtb >= 8.0) return { text: 'Mức Tốt (Giỏi)', badgeClass: 'bg-light-success text-success border border-success-subtle' };
    if (dtb >= 6.5) return { text: 'Mức Khá', badgeClass: 'bg-light-primary text-primary border border-primary-subtle' };
    if (dtb >= 5.0) return { text: 'Mức Đạt (Trung bình)', badgeClass: 'bg-light-warning text-warning border border-warning-subtle' };
    return { text: 'Chưa Đạt', badgeClass: 'bg-light-danger text-danger border border-danger-subtle' };
  }

  // Danh mục Thư viện tài liệu (Chuẩn giao diện ảnh mẫu 7cce5eef)
  discoverCategories: any[] = [
    {
      id: 'khbd',
      title: 'I. KẾ HOẠCH BÀI DẠY (GIÁO ÁN TOÁN 7, 8, 9)',
      date: '26/10/2026',
      count: 14,
      icon: '📘',
      iconBg: '#eff6ff',
      docs: [
        { name: 'Kế hoạch bài dạy Toán 7 - Tập 1 (KNTT)', size: '1.4 MB', date: '25/10/2026', views: 1420, downloads: 350, type: 'docx' },
        { name: 'Giáo án HĐTN và Hướng nghiệp 7 - Chủ đề 3', size: '820 KB', date: '20/10/2026', views: 890, downloads: 210, type: 'docx' },
        { name: 'Kế hoạch dạy học phân hóa đối tượng môn Toán 7', size: '650 KB', date: '15/10/2026', views: 640, downloads: 145, type: 'pdf' }
      ]
    },
    {
      id: 'ppct',
      title: 'II. PHÂN PHỐI CHƯƠNG TRÌNH & MA TRẬN ĐỀ',
      date: '24/10/2026',
      count: 8,
      icon: '📊',
      iconBg: '#fef3c7',
      docs: [
        { name: 'Khung PPCT Toán THCS năm học 2026 - 2027', size: '980 KB', date: '24/10/2026', views: 2350, downloads: 780, type: 'pdf' },
        { name: 'Ma trận & Bản đặc tả Đề kiểm tra Giữa kỳ 1 Toán 7', size: '420 KB', date: '22/10/2026', views: 1890, downloads: 560, type: 'docx' }
      ]
    },
    {
      id: 'quyche',
      title: 'III. QUY CHẾ VÀ HƯỚNG DẪN SỔ ĐẦU BÀI VNEDU',
      date: '20/10/2026',
      count: 12,
      icon: '📋',
      iconBg: '#ecfdf5',
      docs: [
        { name: 'Quy chế quản lý và sử dụng Sổ Đầu Bài điện tử vnEdu', size: '750 KB', date: '18/10/2026', views: 3200, downloads: 1100, type: 'pdf' },
        { name: 'Quy trình kiểm tra, ký duyệt SĐB tuần của BGH & Giám thị', size: '540 KB', date: '12/10/2026', views: 1540, downloads: 420, type: 'pdf' }
      ]
    },
    {
      id: 'doan_doi',
      title: 'IV. HOẠT ĐỘNG TRẢI NGHIỆM & CÔNG TÁC ĐOÀN ĐỘI',
      date: '18/10/2026',
      count: 6,
      icon: '🎖️',
      iconBg: '#fee2e2',
      docs: [
        { name: 'Kế hoạch tổ chức kỷ niệm ngày Nhà giáo Việt Nam 20/11', size: '610 KB', date: '15/10/2026', views: 1670, downloads: 490, type: 'docx' },
        { name: 'Chương trình rèn luyện đội viên và phong trào thi đua hoa điểm tốt', size: '480 KB', date: '10/10/2026', views: 820, downloads: 190, type: 'pdf' }
      ]
    },
    {
      id: 'tt22',
      title: 'V. BIỂU MẪU ĐÁNH GIÁ HỌC SINH THEO THÔNG TƯ 22',
      date: '15/10/2026',
      count: 9,
      icon: '📝',
      iconBg: '#f3e8ff',
      docs: [
        { name: 'Mẫu phiếu theo dõi kết quả học tập và rèn luyện môn Toán', size: '380 KB', date: '10/10/2026', views: 1450, downloads: 380, type: 'xlsx' },
        { name: 'Hướng dẫn nhận xét sự tiến bộ của học sinh theo TT22', size: '520 KB', date: '05/10/2026', views: 2100, downloads: 640, type: 'pdf' }
      ]
    }
  ];

  // Kho nhận xét mẫu gợi ý cho giáo viên
  sampleCommentsList: any[] = [
    { type: 'positive', tag: 'Tích cực', badge: 'bg-light-success text-success', text: 'Lớp học nghiêm túc, tích cực phát biểu xây dựng bài học sôi nổi.' },
    { type: 'positive', tag: 'Tích cực', badge: 'bg-light-success text-success', text: 'Học sinh nắm vững kiến thức trọng tâm, hoàn thành tốt bài tập trên lớp.' },
    { type: 'remind', tag: 'Cần nhắc nhở', badge: 'bg-light-warning text-warning', text: 'Vài em còn nói chuyện riêng, lớp đã trật tự và tập trung sau khi nhắc nhở.' },
    { type: 'remind', tag: 'Cần nhắc nhở', badge: 'bg-light-warning text-warning', text: 'Học sinh cần chuẩn bị bài tập về nhà kỹ lưỡng hơn cho tiết học sau.' },
    { type: 'practice', tag: 'Kiểm tra', badge: 'bg-light-primary text-primary', text: 'Lớp làm bài kiểm tra nghiêm túc, trung thực, đúng thời gian quy định.' },
    { type: 'practice', tag: 'Thực hành', badge: 'bg-light-info text-info', text: 'Học sinh thao tác nhóm tốt, hoàn thành đầy đủ phiếu học tập được giao.' }
  ];

  // Tin tức nổi bật
  discoverNewsList: any[] = [
    {
      id: '1',
      title: 'Hội nghị tập huấn nâng cao năng lực chuyển đổi số trong giáo dục năm học 2026',
      sub: 'Ban Giám Hiệu & Tổ CNTT',
      date: '10/11/2026',
      views: '1.2k',
      badge: 'NỔI BẬT',
      image: '💻'
    },
    {
      id: '2',
      title: 'Phát động phong trào thi đua Dạy tốt - Học tốt chào mừng ngày Nhà giáo Việt Nam 20/11',
      sub: 'Công đoàn & Chi đoàn THCS An Lập',
      date: '08/11/2026',
      views: '950',
      badge: 'PHONG TRÀO',
      image: '💐'
    },
    {
      id: '3',
      title: 'Hướng dẫn chuẩn hóa quy trình nhập điểm và ký duyệt Sổ Đầu Bài điện tử vnEdu',
      sub: 'Phòng GD&ĐT Dầu Tiếng',
      date: '04/11/2026',
      views: '2.4k',
      badge: 'HƯỚNG DẪN',
      image: '📖'
    }
  ];

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

  // ========================================================
  // CÁC THAO TÁC TRANG KHÁM PHÁ & THƯ VIỆN TÀI LIỆU
  // ========================================================
  get filteredCategories(): any[] {
    if (!this.searchDocQuery?.trim()) return this.discoverCategories;
    const q = this.searchDocQuery.toLowerCase().trim();
    return this.discoverCategories.map(cat => {
      const matchCat = cat.title.toLowerCase().includes(q);
      const matchedDocs = cat.docs.filter((d: any) => d.name.toLowerCase().includes(q));
      if (matchCat || matchedDocs.length > 0) {
        return {
          ...cat,
          docs: matchCat ? cat.docs : matchedDocs
        };
      }
      return null;
    }).filter(c => c !== null);
  }

  copyComment(text: string, index: number): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    this.copiedCommentIndex = index;
    setTimeout(() => {
      this.copiedCommentIndex = -1;
    }, 2000);
  }

  previewDoc(doc: any): void {
    this.activeDocPreview = doc;
  }

  closeDocPreview(): void {
    this.activeDocPreview = null;
  }

  trackBySlot(index: number, slot: any): any {
    return `${slot.thu}_${slot.tiet}_${slot.lop}`;
  }

  trackByThu(index: number, group: any): any {
    return group.thu;
  }
}
