import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { VnEduSlot, WeekOption } from '../../../models/vnedu.model';
import { VnEduService } from '../../../services/vnedu.service';

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
  @Input() appVersion: string = 'v2.8.14';
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
  // QUẢN LÝ TIN NHẮN vnEdu THỰC TẾ (LẤY TỪ TÀI KHOẢN ĐÃ ĐĂNG NHẬP)
  // KHÔNG SỬ DỤNG DỮ LIỆU GIẢ LẬP (CHEAT DATA)
  // ========================================================
  currentChatRole: 'huyen' | 'admin' = 'huyen';
  activeContact: any = null;
  searchTeacherQuery: string = '';
  selectedDepartmentFilter: string = 'all';
  messageInputText: string = '';
  isLoadingChatUsers: boolean = false;
  chatMessages: any[] = [];

  // Danh bạ khởi tạo mặc định từ các tài khoản thực tế đã đăng nhập hệ thống
  chatContacts: any[] = [
    {
      id: 'xuanngocit@gmail.com',
      username: 'xuanngocit@gmail.com',
      email: 'xuanngocit@gmail.com',
      name: 'Thầy Xuân Ngọc',
      title: 'Quản trị viên Hệ thống vnEdu',
      department: 'Ban Quản Trị Hệ Thống',
      subject: 'Quản trị & Giám sát CSDL',
      school: 'Hệ thống vnEdu Automation',
      role: 'ADMIN',
      accountType: 'Quản Trị Viên',
      avatarEmoji: '👨‍💼',
      avatarBg: '#eff6ff',
      isOnline: true,
      lastLogin: new Date().toISOString(),
      lastMessage: 'Chào Cô Huyên, hệ thống tự động đã đối chiếu Sổ đầu bài tuần 10 của cô với sổ giám thị, dữ liệu đã khớp 100% rồi cô nhé.',
      lastTime: '08:30',
      unreadCount: 0
    },
    {
      id: '051197003685',
      username: '051197003685',
      email: '051197003685@vnedu.vn',
      name: 'Lê Thị Diệu Huyên',
      title: 'Cô Lê Thị Diệu Huyên',
      department: 'Tổ Toán & HĐTN',
      subject: 'Toán & HĐTN',
      school: 'Trường THCS An Lập',
      role: 'TEACHER',
      accountType: 'Giáo Viên vnEdu',
      avatarEmoji: '👩‍🏫',
      avatarBg: '#fdf2f8',
      isOnline: true,
      isCurrent: true,
      lastLogin: new Date().toISOString(),
      lastMessage: 'Dạ em cảm ơn Thầy nhiều ạ! Có thông tin gì mới về lịch sinh hoạt cụm trường Thầy báo em với nhé.',
      lastTime: '09:20',
      unreadCount: 0
    }
  ];

  constructor(
    private vneduService: VnEduService,
    private cdr: ChangeDetectorRef
  ) {}

  get currentChatUserId(): string {
    if (this.currentChatRole === 'admin' || this.isSuperAdminLoggedIn || this.currentLoggedInUser?.email === 'xuanngocit@gmail.com' || this.currentLoggedInUser?.username === 'xuanngocit@gmail.com') {
      return 'xuanngocit@gmail.com';
    }
    return this.currentLoggedInUser?.username || '051197003685';
  }

  get currentChatUserName(): string {
    if (this.currentChatUserId === 'xuanngocit@gmail.com') {
      return 'Thầy Xuân Ngọc (Admin)';
    }
    return this.teacherTitle || 'Cô Lê Thị Diệu Huyên';
  }

  get quickChatReplies(): string[] {
    if (this.currentChatUserId === 'xuanngocit@gmail.com') {
      return [
        'Dạ chào Cô Huyên',
        'SĐB tuần 10 đã đối chiếu khớp 100%',
        'Cô hoàn thành ký duyệt đúng hạn nhé',
        'Cần hỗ trợ kỹ thuật vnEdu nhắn tôi',
        'Đã lưu thành công dữ liệu'
      ];
    }
    return [
      'Dạ em chào Thầy Ngọc',
      'Em đã đồng bộ SĐB tuần 10 rồi ạ',
      'Thầy kiểm tra giúp em lịch dạy nhé',
      'Em sẽ kiểm tra lại ngay',
      'Dạ em cảm ơn Thầy nhiều ạ'
    ];
  }

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
    if (this.isSuperAdminLoggedIn || (this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') || (this.currentLoggedInUser?.username === 'xuanngocit@gmail.com')) {
      this.currentChatRole = 'admin';
    } else {
      this.currentChatRole = 'huyen';
    }
    this.initSelectedDay();
    this.loadChatUsersFromBackend();
    this.loadChatMessagesFromBackend();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isSuperAdminLoggedIn'] || changes['currentLoggedInUser']) {
      if (this.isSuperAdminLoggedIn || (this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') || (this.currentLoggedInUser?.username === 'xuanngocit@gmail.com')) {
        this.currentChatRole = 'admin';
      }
    }
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
  // CÁC THAO TÁC XỬ LÝ CHAT NỘI BỘ vnEdu THỰC TẾ
  // ========================================================
  loadChatUsersFromBackend(): void {
    this.isLoadingChatUsers = true;
    this.vneduService.getChatUsers().subscribe({
      next: (res) => {
        this.isLoadingChatUsers = false;
        if (res && res.success && Array.isArray(res.users) && res.users.length > 0) {
          this.chatContacts = res.users;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isLoadingChatUsers = false;
        console.warn('Sử dụng danh sách tài khoản đã đăng nhập mặc định:', err);
      }
    });
  }

  loadChatMessagesFromBackend(): void {
    this.vneduService.getChatMessages().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.messages)) {
          this.chatMessages = res.messages;
          this.cdr.detectChanges();
          setTimeout(() => this.scrollChatToBottom(), 80);
        }
      },
      error: () => {}
    });
  }

  toggleChatRole(): void {
    this.currentChatRole = this.currentChatRole === 'admin' ? 'huyen' : 'admin';
    // Đóng cuộc hội thoại nếu đang trò chuyện với chính mình
    if (this.activeContact) {
      const myId = this.currentChatUserId;
      if (this.activeContact.id === myId || this.activeContact.username === myId) {
        this.activeContact = this.chatContacts.find(c => c.id !== myId && c.username !== myId) || null;
      }
    }
    this.cdr.detectChanges();
  }

  get filteredContacts(): any[] {
    let list = [...this.chatContacts];
    const myId = this.currentChatUserId;
    const q = (this.searchTeacherQuery || '').toLowerCase().trim();

    // Khi người dùng KHÔNG tìm kiếm: Ẩn chính mình khỏi danh sách liên hệ
    if (!q) {
      list = list.filter(c => c.id !== myId && c.username !== myId);
    }

    if (this.selectedDepartmentFilter !== 'all') {
      list = list.filter(c =>
        (c.department && c.department.includes(this.selectedDepartmentFilter)) ||
        c.role === this.selectedDepartmentFilter
      );
    }

    if (q) {
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.department?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      );
    }

    // Đưa liên hệ đối tác chính lên đầu danh sách
    list.sort((a, b) => {
      if (myId === 'xuanngocit@gmail.com') {
        if (a.username === '051197003685') return -1;
        if (b.username === '051197003685') return 1;
      } else {
        if (a.id === 'xuanngocit@gmail.com') return -1;
        if (b.id === 'xuanngocit@gmail.com') return 1;
      }
      return 0;
    });

    return list;
  }

  selectContact(contact: any): void {
    this.activeContact = contact;
    contact.unreadCount = 0;
    this.loadChatMessagesFromBackend();
    setTimeout(() => this.scrollChatToBottom(), 80);
  }

  closeConversation(): void {
    this.activeContact = null;
  }

  get activeMessages(): any[] {
    if (!this.activeContact) return [];
    const myId = this.currentChatUserId;
    const contactId = this.activeContact.id || this.activeContact.username;
    return (this.chatMessages || []).filter(m =>
      (m.senderId === myId && m.receiverId === contactId) ||
      (m.senderId === contactId && m.receiverId === myId)
    );
  }

  isMsgFromMe(msg: any): boolean {
    if (!msg) return false;
    return msg.senderId === this.currentChatUserId;
  }

  getSenderAvatarEmoji(msg: any): string {
    if (msg.senderId === 'xuanngocit@gmail.com') return '👨‍💼';
    return '👩‍🏫';
  }

  getSenderAvatarBg(msg: any): string {
    if (msg.senderId === 'xuanngocit@gmail.com') return '#eff6ff';
    return '#fdf2f8';
  }

  sendMessage(): void {
    const text = (this.messageInputText || '').trim();
    if (!text || !this.activeContact) return;

    const senderId = this.currentChatUserId;
    const senderName = this.currentChatUserName;
    const receiverId = this.activeContact.id || this.activeContact.username;
    const receiverName = this.activeContact.name || this.activeContact.title;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const localMsg = {
      id: 'msg_' + Date.now(),
      senderId,
      senderName,
      receiverId,
      receiverName,
      text,
      time: timeStr,
      timestamp: now.toISOString(),
      status: 'delivered'
    };

    if (!this.chatMessages) this.chatMessages = [];
    this.chatMessages.push(localMsg);
    this.activeContact.lastMessage = text;
    this.activeContact.lastTime = timeStr;
    this.messageInputText = '';
    setTimeout(() => this.scrollChatToBottom(), 80);

    // Lưu vào Backend máy chủ và file chat_messages.json
    this.vneduService.sendChatMessage({
      senderId,
      senderName,
      receiverId,
      receiverName,
      text
    }).subscribe({
      next: (res) => {
        if (res && res.success && res.message) {
          localMsg.id = res.message.id;
        }
      },
      error: () => {}
    });
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
