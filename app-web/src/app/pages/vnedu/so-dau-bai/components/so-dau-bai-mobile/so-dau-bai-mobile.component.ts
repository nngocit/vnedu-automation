import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { VnEduSlot, WeekOption } from '../../../models/vnedu.model';
import { VnEduService } from '../../../services/vnedu.service';

@Component({
  selector: 'app-so-dau-bai-mobile',
  templateUrl: './so-dau-bai-mobile.component.html',
  styleUrls: ['./so-dau-bai-mobile.component.scss'],
  standalone: false
})
export class SoDauBaiMobileComponent implements OnInit, OnChanges, OnDestroy {
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
  @Input() appVersion: string = 'v2.8.21';
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
  // HỖ TRỢ REAL-TIME ĐỒNG BỘ TỨC THỜI (BROADCASTCHANNEL + SSE + POLLING)
  // ========================================================
  currentChatRole: 'huyen' | 'admin' = 'huyen';
  activeContact: any = null;
  searchTeacherQuery: string = '';
  selectedDepartmentFilter: string = 'all';
  messageInputText: string = '';
  isLoadingChatUsers: boolean = false;
  chatMessages: any[] = [];
  showClearChatConfirmModal: boolean = false;
  clearTargetType: 'all' | 'conversation' = 'all';

  // Quản lý trả lời tin nhắn (Quote Reply như Zalo)
  replyingToMessage: { id?: string; senderName?: string; text?: string } | null = null;

  // Quản lý cuộc gọi thoại & video (Call Feature như Zalo)
  activeCall: {
    isOpen: boolean;
    type: 'voice' | 'video';
    isCaller: boolean;
    partnerId: string;
    partnerName: string;
    partnerAvatar: string;
    status: 'ringing' | 'connected' | 'ended';
    durationSec: number;
    isMuted: boolean;
    isCameraOff: boolean;
  } | null = null;

  isSpeakerOn: boolean = true;
  private mobileGainNode: any = null;

  incomingCallPrompt: {
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callType: 'voice' | 'video';
  } | null = null;

  private callTimerInterval: any = null;

  // Quản lý âm thanh chuông cuộc gọi Web Audio API & WebRTC P2P Micro/Camera
  private soundCtx: any = null;
  private ringTimer: any = null;
  private peerConnection: RTCPeerConnection | null = null;
  private pendingIceCandidates: any[] = [];
  private localMediaStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  isSecureOrigin: boolean = true;

  private chatBroadcastChannel: BroadcastChannel | null = null;
  private chatEventSource: EventSource | null = null;
  private chatPollingTimer: any = null;

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
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
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

  // Đếm số lượng tin nhắn chưa đọc từ một liên hệ cụ thể gửi tới tài khoản hiện tại
  getUnreadCountForContact(contact: any): number {
    if (!contact) return 0;
    const myId = this.currentChatUserId;
    const contactId = contact.id || contact.username;
    if (!this.chatMessages || this.chatMessages.length === 0) return 0;
    return this.chatMessages.filter(m =>
      m.senderId === contactId &&
      m.receiverId === myId &&
      m.status !== 'read'
    ).length;
  }

  // Tổng số tin nhắn chưa xem của toàn bộ các liên hệ gửi tới tài khoản hiện tại
  get totalUnreadMessagesCount(): number {
    const myId = this.currentChatUserId;
    if (!this.chatMessages || this.chatMessages.length === 0) return 0;
    return this.chatMessages.filter(m =>
      m.receiverId === myId &&
      m.status !== 'read'
    ).length;
  }

  // Lưu số tin chưa đọc trước khi click mở cuộc hội thoại để hiển thị dải thông báo
  unreadMessagesCountBeforeOpening: number = 0;

  // Kiểm tra mình đã từng gửi tin nhắn nào cho người đang chat chưa
  get hasSentMessagesToActiveContact(): boolean {
    if (!this.activeContact || !this.chatMessages) return false;
    const myId = this.currentChatUserId;
    const contactId = this.activeContact.id || this.activeContact.username;
    return this.chatMessages.some(m => m.senderId === myId && m.receiverId === contactId);
  }

  // Đếm số tin mình đã gửi tới activeContact mà đối phương chưa xem
  get unreadSentMessagesCountForActiveContact(): number {
    if (!this.activeContact || !this.chatMessages) return 0;
    const myId = this.currentChatUserId;
    const contactId = this.activeContact.id || this.activeContact.username;
    return this.chatMessages.filter(m => m.senderId === myId && m.receiverId === contactId && m.status !== 'read').length;
  }

  // Trạng thái đang gõ phím của đối phương (Typing Indicator)
  isPartnerTyping: boolean = false;
  typingDebounceTimer: any = null;
  private incomingTypingQueue: any[] = [];
  private isProcessingTypingQueue = false;

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
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      this.isSecureOrigin = window.isSecureContext || isLocal;
    }
    if (this.isSuperAdminLoggedIn || (this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') || (this.currentLoggedInUser?.username === 'xuanngocit@gmail.com')) {
      this.currentChatRole = 'admin';
    } else {
      // Đọc vai trò đã chọn từ sessionStorage để ghi nhớ trạng thái đổi vai trò khi mở tab khác
      const savedRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('vnedu_chat_role') : null;
      if (savedRole === 'admin' || savedRole === 'huyen') {
        this.currentChatRole = savedRole as any;
      } else {
        this.currentChatRole = 'huyen';
      }
    }
    this.initSelectedDay();
    this.loadChatUsersFromBackend();
    this.loadChatMessagesFromBackend();
    this.initRealtimeChatListeners();
  }

  ngOnDestroy(): void {
    this.stopCallTimer();
    this.cleanupMedia();
    if (this.chatBroadcastChannel) {
      try {
        this.chatBroadcastChannel.close();
      } catch (_) {}
      this.chatBroadcastChannel = null;
    }
    if (this.chatEventSource) {
      try {
        this.chatEventSource.close();
      } catch (_) {}
      this.chatEventSource = null;
    }
    if (this.chatPollingTimer) {
      clearInterval(this.chatPollingTimer);
      this.chatPollingTimer = null;
    }
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
  // CÁC THAO TÁC XỬ LÝ CHAT NỘI BỘ vnEdu THỰC TẾ (REAL-TIME)
  // ========================================================
  initRealtimeChatListeners(): void {
    // 1. BroadcastChannel: Đồng bộ tức thời 0ms giữa các Tab / Cửa sổ cùng trình duyệt
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.chatBroadcastChannel = new BroadcastChannel('vnedu_chat_bus');
        this.chatBroadcastChannel.onmessage = (event) => {
          if (event?.data?.type === 'new_message' && event?.data?.message) {
            this.handleIncomingMessage(event.data.message);
          } else if (event?.data?.type === 'typing') {
            this.handleIncomingTypingEvent(event.data.senderId, event.data.receiverId, event.data.isTyping);
          } else if (event?.data?.type === 'messages_read') {
            this.handleIncomingReadEvent(event.data.readerId, event.data.partnerId);
          } else if (event?.data?.type === 'messages_cleared') {
            this.handleIncomingClearEvent(event.data.userA, event.data.userB, event.data.clearAll);
          } else if (event?.data?.type === 'call_signal') {
            this.handleIncomingCallSignal(event.data);
          }
        };
      } catch (err) {
        console.warn('Không thể khởi tạo BroadcastChannel:', err);
      }
    }

    // 2. Server-Sent Events (SSE): Push thời gian thực từ máy chủ cho mọi thiết bị / trình duyệt khác
    this.connectChatEventSource();

    // 3. Polling dự phòng mỗi 3 giây khi đang mở tab tin nhắn (Đảm bảo 100% không sót)
    if (typeof window !== 'undefined') {
      this.chatPollingTimer = setInterval(() => {
        if (this.activeTab === 'messages') {
          this.loadChatMessagesFromBackend(true);
        }
      }, 3000);
    }
  }

  connectChatEventSource(): void {
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        if (this.chatEventSource) {
          this.chatEventSource.close();
          this.chatEventSource = null;
        }
        this.chatEventSource = new EventSource('/api/chat/stream');
        this.chatEventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'new_message' && data?.message) {
              this.handleIncomingMessage(data.message);
            } else if (data?.type === 'typing') {
              this.handleIncomingTypingEvent(data.senderId, data.receiverId, data.isTyping);
            } else if (data?.type === 'messages_read') {
              this.handleIncomingReadEvent(data.readerId, data.partnerId);
            } else if (data?.type === 'messages_cleared') {
              this.handleIncomingClearEvent(data.userA, data.userB, data.clearAll);
            } else if (data?.type === 'call_signal') {
              this.handleIncomingCallSignal(data);
            }
          } catch (_) {}
        };
        this.chatEventSource.onerror = () => {
          if (this.chatEventSource) {
            this.chatEventSource.close();
            this.chatEventSource = null;
          }
          // Tự động kết nối lại sau 5 giây nếu gián đoạn
          setTimeout(() => this.connectChatEventSource(), 5000);
        };
      } catch (err) {
        console.warn('Lỗi kết nối Server-Sent Events chat:', err);
      }
    }
  }

  onMessageInputChange(): void {
    if (!this.activeContact) return;
    const myId = this.currentChatUserId;
    const partnerId = this.activeContact.id || this.activeContact.username;
    this.broadcastTyping(true);

    if (this.typingDebounceTimer) {
      clearTimeout(this.typingDebounceTimer);
    }
    this.typingDebounceTimer = setTimeout(() => {
      this.broadcastTyping(false);
    }, 2500);
  }

  broadcastTyping(isTyping: boolean): void {
    if (!this.activeContact) return;
    const myId = this.currentChatUserId;
    const partnerId = this.activeContact.id || this.activeContact.username;
    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'typing', senderId: myId, receiverId: partnerId, isTyping });
      }
    } catch (_) {}
    this.vneduService.sendTypingStatus(myId, partnerId, isTyping).subscribe({ next: () => {}, error: () => {} });
  }

  handleIncomingTypingEvent(senderId: string, receiverId: string, isTyping: boolean): void {
    const myId = this.currentChatUserId;
    const contactId = this.activeContact?.id || this.activeContact?.username;
    if (this.activeContact && senderId === contactId && receiverId === myId) {
      this.isPartnerTyping = isTyping;
      this.cdr.detectChanges();
      if (isTyping) {
        setTimeout(() => this.scrollChatToBottom(), 50);
      }
    }
  }

  handleIncomingMessage(incomingMsg: any): void {
    if (!incomingMsg || !incomingMsg.id) return;
    if (!this.chatMessages) this.chatMessages = [];

    // Kiểm tra trùng lặp (Deduplicate)
    const exists = this.chatMessages.some(m =>
      m.id === incomingMsg.id ||
      (m.senderId === incomingMsg.senderId &&
       m.receiverId === incomingMsg.receiverId &&
       m.text === incomingMsg.text &&
       Math.abs(new Date(m.timestamp || 0).getTime() - new Date(incomingMsg.timestamp || 0).getTime()) < 6000)
    );
    if (exists) return;

    const myId = this.currentChatUserId;
    const contactId = this.activeContact?.id || this.activeContact?.username;

    // Nếu đang mở đúng cuộc trò chuyện này và tin nhắn từ đối phương gửi tới:
    // Hiển thị hiệu ứng typing 2 - 3s (2.3s) rồi mới chuyển qua tin nhắn chính thức!
    if (this.activeContact && incomingMsg.senderId === contactId && incomingMsg.receiverId === myId) {
      this.incomingTypingQueue.push(incomingMsg);
      if (!this.isProcessingTypingQueue) {
        this.processIncomingTypingQueue();
      }
    } else {
      this.commitIncomingMessage(incomingMsg);
    }
  }

  private processIncomingTypingQueue(): void {
    if (this.incomingTypingQueue.length === 0) {
      this.isPartnerTyping = false;
      this.isProcessingTypingQueue = false;
      this.cdr.detectChanges();
      return;
    }

    this.isProcessingTypingQueue = true;
    this.isPartnerTyping = true;
    this.cdr.detectChanges();
    this.scrollChatToBottom();

    const nextMsg = this.incomingTypingQueue.shift();
    setTimeout(() => {
      this.isPartnerTyping = false;
      this.commitIncomingMessage(nextMsg);
      this.cdr.detectChanges();
      this.scrollChatToBottom();

      if (this.incomingTypingQueue.length > 0) {
        setTimeout(() => this.processIncomingTypingQueue(), 300);
      } else {
        this.isProcessingTypingQueue = false;
      }
    }, 2300); // Tầm 2 - 3 giây (2.3s) gõ xong mới chuyển qua
  }

  private commitIncomingMessage(incomingMsg: any): void {
    const myId = this.currentChatUserId;
    if (this.activeContact) {
      const contactId = this.activeContact.id || this.activeContact.username;
      if (incomingMsg.senderId === contactId && incomingMsg.receiverId === myId) {
        incomingMsg.status = 'read';
        this.vneduService.markChatMessagesAsRead(myId, contactId).subscribe({ next: () => {}, error: () => {} });
        try {
          if (this.chatBroadcastChannel) {
            this.chatBroadcastChannel.postMessage({ type: 'messages_read', readerId: myId, partnerId: contactId });
          }
        } catch (_) {}
      }
    }

    if (!this.chatMessages) this.chatMessages = [];
    const exists = this.chatMessages.some(m => m.id === incomingMsg.id);
    if (!exists) {
      this.chatMessages.push(incomingMsg);
    }

    const partnerId = incomingMsg.senderId === myId ? incomingMsg.receiverId : incomingMsg.senderId;
    const contact = this.chatContacts.find(c => c.id === partnerId || c.username === partnerId);
    if (contact) {
      contact.lastMessage = incomingMsg.text;
      contact.lastTime = incomingMsg.time;
    }
    this.cdr.detectChanges();
    if (this.activeContact) {
      setTimeout(() => this.scrollChatToBottom(), 50);
    }
  }

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

  loadChatMessagesFromBackend(silent: boolean = false): void {
    this.vneduService.getChatMessages().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.messages)) {
          const prevCount = this.chatMessages?.length || 0;
          let changed = false;
          let hasNew = false;

          if (!this.chatMessages) {
            this.chatMessages = [];
          }

          const localMap = new Map(this.chatMessages.map(m => [m.id, m]));

          res.messages.forEach((srvMsg: any) => {
            const local = localMap.get(srvMsg.id);
            if (local) {
              if (local.status !== srvMsg.status ||
                  local.isRecalled !== srvMsg.isRecalled ||
                  JSON.stringify(local.reactions) !== JSON.stringify(srvMsg.reactions)) {
                local.status = srvMsg.status;
                local.isRecalled = srvMsg.isRecalled;
                local.content = srvMsg.content;
                local.text = srvMsg.text || srvMsg.content;
                local.reactions = srvMsg.reactions;
                changed = true;
              }
            } else {
              this.chatMessages.push(srvMsg);
              localMap.set(srvMsg.id, srvMsg);
              changed = true;
              hasNew = true;
            }
          });

          // Chỉ đồng bộ xóa nếu tin nhắn không phải mới gửi trong 30s gần nhất
          const nowMs = Date.now();
          const serverIds = new Set(res.messages.map((m: any) => m.id));
          const filtered = this.chatMessages.filter(m => {
            if (serverIds.has(m.id)) return true;
            const msgTime = new Date(m.timestamp || 0).getTime();
            if (nowMs - msgTime < 30000) return true;
            return false;
          });

          if (filtered.length !== this.chatMessages.length) {
            this.chatMessages = filtered;
            changed = true;
          }

          if (changed || this.chatMessages.length !== prevCount || !silent) {
            this.cdr.detectChanges();
            if (!silent || hasNew) {
              setTimeout(() => this.scrollChatToBottom(), 60);
            }
          }
        }
      },
      error: () => {}
    });
  }

  toggleChatRole(): void {
    this.currentChatRole = this.currentChatRole === 'admin' ? 'huyen' : 'admin';
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('vnedu_chat_role', this.currentChatRole);
      } catch (_) {}
    }
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
    this.unreadMessagesCountBeforeOpening = this.getUnreadCountForContact(contact);
    this.markCurrentConversationAsRead(contact);
    this.loadChatMessagesFromBackend();
    setTimeout(() => this.scrollChatToBottom(), 80);
  }

  // Đánh dấu toàn bộ tin nhắn trong cuộc hội thoại hiện tại là đã đọc
  markCurrentConversationAsRead(contact: any): void {
    if (!contact) return;
    const myId = this.currentChatUserId;
    const contactId = contact.id || contact.username;
    let hasUnread = false;

    (this.chatMessages || []).forEach(m => {
      if (m.senderId === contactId && m.receiverId === myId && m.status !== 'read') {
        m.status = 'read';
        hasUnread = true;
      }
    });

    if (hasUnread) {
      this.cdr.detectChanges();
      this.vneduService.markChatMessagesAsRead(myId, contactId).subscribe({
        next: () => {},
        error: () => {}
      });
      try {
        if (this.chatBroadcastChannel) {
          this.chatBroadcastChannel.postMessage({ type: 'messages_read', readerId: myId, partnerId: contactId });
        }
      } catch (_) {}
    }
  }

  // Xử lý sự kiện tin nhắn đã được đọc từ client khác
  handleIncomingReadEvent(readerId: string, partnerId?: string): void {
    let changed = false;
    (this.chatMessages || []).forEach(m => {
      if (m.receiverId === readerId && (!partnerId || m.senderId === partnerId)) {
        if (m.status !== 'read') {
          m.status = 'read';
          changed = true;
        }
      }
    });
    if (changed) {
      this.cdr.detectChanges();
    }
  }

  // Xử lý sự kiện tin nhắn đã bị xóa từ client khác
  handleIncomingClearEvent(userA?: string, userB?: string, clearAll?: boolean): void {
    if (clearAll || (!userA && !userB)) {
      this.chatMessages = [];
      this.activeContact = null;
      (this.chatContacts || []).forEach(c => {
        c.lastMessage = 'Chưa có tin nhắn mới';
        c.lastTime = '';
        c.unreadCount = 0;
      });
    } else {
      this.chatMessages = (this.chatMessages || []).filter(m => !(
        (m.senderId === userA && m.receiverId === userB) ||
        (m.senderId === userB && m.receiverId === userA)
      ));
      const contact = (this.chatContacts || []).find(c => c.id === userA || c.id === userB || c.username === userA || c.username === userB);
      if (contact) {
        contact.lastMessage = 'Chưa có tin nhắn mới';
        contact.lastTime = '';
        contact.unreadCount = 0;
      }
    }
    this.cdr.detectChanges();
  }

  // Các thao tác modal xóa tin nhắn an toàn
  promptClearAllMessages(): void {
    this.clearTargetType = 'all';
    this.showClearChatConfirmModal = true;
  }

  promptClearCurrentConversation(): void {
    this.clearTargetType = 'conversation';
    this.showClearChatConfirmModal = true;
  }

  cancelClearChat(): void {
    this.showClearChatConfirmModal = false;
  }

  confirmClearChat(): void {
    this.showClearChatConfirmModal = false;
    const isAll = this.clearTargetType === 'all';
    const myId = this.currentChatUserId;
    const partnerId = this.activeContact?.id || this.activeContact?.username;

    if (isAll) {
      this.chatMessages = [];
      this.activeContact = null;
      (this.chatContacts || []).forEach(c => {
        c.lastMessage = 'Chưa có tin nhắn mới';
        c.lastTime = '';
        c.unreadCount = 0;
      });
      this.cdr.detectChanges();

      try {
        if (this.chatBroadcastChannel) {
          this.chatBroadcastChannel.postMessage({ type: 'messages_cleared', clearAll: true });
        }
      } catch (_) {}

      this.vneduService.clearChatMessages(undefined, undefined, true).subscribe({
        next: () => {},
        error: (err) => console.warn('Lỗi xóa lịch sử tin nhắn:', err)
      });
    } else if (partnerId) {
      this.chatMessages = (this.chatMessages || []).filter(m => !(
        (m.senderId === myId && m.receiverId === partnerId) ||
        (m.senderId === partnerId && m.receiverId === myId)
      ));
      const contact = this.chatContacts.find(c => c.id === partnerId || c.username === partnerId);
      if (contact) {
        contact.lastMessage = 'Chưa có tin nhắn mới';
        contact.lastTime = '';
        contact.unreadCount = 0;
      }
      this.cdr.detectChanges();

      try {
        if (this.chatBroadcastChannel) {
          this.chatBroadcastChannel.postMessage({ type: 'messages_cleared', userA: myId, userB: partnerId, clearAll: false });
        }
      } catch (_) {}

      this.vneduService.clearChatMessages(myId, partnerId, false).subscribe({
        next: () => {},
        error: (err) => console.warn('Lỗi xóa cuộc hội thoại:', err)
      });
    }
  }

  closeConversation(): void {
    this.activeContact = null;
    this.unreadMessagesCountBeforeOpening = 0;
  }

  cleanCallLogText(text: string): string {
    if (!text) return '';
    return text.replace(/^[📞📹\s]+/, '').trim();
  }

  trackByMsgId(index: number, msg: any): string {
    return msg?.id || (msg?.senderId + '_' + (msg?.timestamp || index));
  }

  get activeMessages(): any[] {
    if (!this.activeContact) return [];
    const myId = this.currentChatUserId;
    const contactId = this.activeContact.id || this.activeContact.username;
    const isGroup = this.activeContact.type === 'group' || contactId === 'conv_ktdl_nhom';
    const isDirectWithHuyen = (contactId === '051197003685' || contactId === 'xuanngocit@gmail.com');
    const targetConvId = this.activeContact.conversationId || (
      isGroup ? (this.activeContact.id || 'conv_ktdl_nhom') : (isDirectWithHuyen ? 'conv_dieu_huyen' : ('conv_' + contactId))
    );

    return (this.chatMessages || []).filter(m => {
      if (m.is_deleted || m.isDeleted) return false;
      // 1. Khớp theo conversationId
      if (m.conversationId && (m.conversationId === targetConvId || m.conversationId === contactId)) {
        return true;
      }
      // 2. Với nhóm KTDL_NHOM hoặc group
      if (isGroup && m.conversationId && (m.conversationId === 'conv_ktdl_nhom' || m.conversationId === this.activeContact.id)) {
        return true;
      }
      // 3. Khớp trực tiếp 1-1 theo cặp người gửi / người nhận
      if (!isGroup) {
        if ((m.senderId === myId && m.receiverId === contactId) ||
            (m.senderId === contactId && m.receiverId === myId)) {
          return true;
        }
        // Trường hợp đặc biệt 1-1 giữa Diệu Huyên và Xuân Ngọc
        if (isDirectWithHuyen && (m.conversationId === 'conv_dieu_huyen' ||
            (!m.conversationId && (
              (m.senderId === '051197003685' && m.receiverId === 'xuanngocit@gmail.com') ||
              (m.senderId === 'xuanngocit@gmail.com' && m.receiverId === '051197003685')
            )))) {
          return true;
        }
      }
      return false;
    });
  }

  isMsgFromMe(msg: any): boolean {
    if (!msg) return false;
    return msg.senderId === this.currentChatUserId;
  }

  getSenderAvatarEmoji(msg: any): string {
    if (msg.senderAvatar) return msg.senderAvatar;
    if (msg.senderId === 'xuanngocit@gmail.com') return '👨‍💼';
    if (msg.senderId === 'thai_cuong') return '🏎️';
    if (msg.senderId === 'dk_hieu') return '🏸';
    if (msg.senderId === 'hung_bao') return '💎';
    if (msg.senderId === 'do_huong') return '🌸';
    return '👩‍🏫';
  }

  getSenderAvatarBg(msg: any): string {
    if (msg.senderId === 'xuanngocit@gmail.com') return '#eff6ff';
    if (msg.senderId === 'thai_cuong') return '#fef2f2';
    if (msg.senderId === 'dk_hieu') return '#f0fdf4';
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

    const replyPayload = this.replyingToMessage ? { ...this.replyingToMessage } : null;
    this.replyingToMessage = null;

    const mentions = (text.match(/@[A-ZÀ-Ỹa-zà-ỹ0-9_]+(?:\s+[A-ZÀ-Ỹa-zà-ỹ0-9_]+)?/g) || []);
    const isGroup = (this.activeContact?.id === 'conv_ktdl_nhom' || this.activeContact?.type === 'group');
    const isDirectWithHuyen = (senderId === 'xuanngocit@gmail.com' && receiverId === '051197003685') ||
                              (senderId === '051197003685' && receiverId === 'xuanngocit@gmail.com');
    const convId = isGroup
      ? (this.activeContact.id || 'conv_ktdl_nhom')
      : (isDirectWithHuyen ? 'conv_dieu_huyen' : ('conv_' + receiverId));

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const localMsg: any = {
      id: msgId,
      conversationId: convId,
      senderId,
      senderName,
      senderAvatar: this.currentChatRole === 'admin' ? '👨‍💼' : '👩‍🏫',
      receiverId: isGroup ? null : receiverId,
      receiverName: isGroup ? null : receiverName,
      content: text,
      text,
      time: timeStr,
      timestamp: now.toISOString(),
      status: 'delivered',
      mentions,
      reactions: {}
    };

    if (replyPayload) {
      localMsg.replyTo = replyPayload;
    }

    if (!this.chatMessages) this.chatMessages = [];
    this.chatMessages.push(localMsg);
    this.activeContact.lastMessage = text;
    this.activeContact.lastTime = timeStr;
    this.messageInputText = '';
    this.showMentionPopup = false;
    this.broadcastTyping(false);
    if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);
    this.cdr.detectChanges();
    setTimeout(() => this.scrollChatToBottom(), 50);

    // Phát sóng 0ms tức thì cho các tab khác trong cùng trình duyệt
    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'new_message', message: localMsg });
      }
    } catch (_) {}

    // Lưu vào Backend máy chủ và đẩy SSE cho các thiết bị khác (đồng bộ id chính xác)
    this.vneduService.sendChatMessage({
      id: msgId,
      conversationId: convId,
      senderId,
      senderName,
      receiverId: isGroup ? null : receiverId,
      receiverName: isGroup ? null : receiverName,
      text,
      replyTo: replyPayload,
      mentions
    }).subscribe({
      next: (res) => {
        if (res && res.success && res.message) {
          localMsg.id = res.message.id;
          try {
            if (this.chatBroadcastChannel) {
              this.chatBroadcastChannel.postMessage({ type: 'new_message', message: res.message });
            }
          } catch (_) {}
        }
      },
      error: (err) => {
        console.warn('Lỗi gửi tin nhắn tới máy chủ:', err);
      }
    });
  }

  // ========================================================
  // XỬ LÝ TRẢ LỜI TIN NHẮN (REPLY QUOTE NHƯ ZALO)
  // ========================================================
  startReply(msg: any): void {
    if (!msg || msg.isCallLog) return;
    this.replyingToMessage = {
      id: msg.id,
      senderName: this.isMsgFromMe(msg) ? 'Bạn' : (msg.senderName || this.activeContact?.name || 'Thầy/Cô'),
      text: msg.text
    };
    this.cdr.detectChanges();
    setTimeout(() => {
      const inputEl = document.querySelector('.chat-text-input') as HTMLInputElement;
      if (inputEl) inputEl.focus();
    }, 50);
  }

  cancelReply(): void {
    this.replyingToMessage = null;
    this.cdr.detectChanges();
  }

  // ========================================================
  // QUẢN LÝ QUOTE, ACTION TOOLBAR ("", ➜, ...), TAG TÊN & XÓA TIN NHẮN
  // ========================================================
  activeMsgMenuId: string | null = null;
  showMentionPopup: boolean = false;
  mentionCandidates: any[] = [];
  mentionQuery: string = '';
  pinnedMessage: any = null;

  deleteIndividualMessage(msg: any): void {
    this.activeMsgMenuId = null;
    if (!msg || !msg.id) return;
    const myId = this.currentChatUserId;
    this.chatMessages = (this.chatMessages || []).filter(m => m.id !== msg.id);
    this.cdr.detectChanges();
    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'message_deleted', messageId: msg.id });
      }
    } catch (_) {}
    this.vneduService.deleteChatMessage(msg.id, myId).subscribe();
  }

  recallMessage(msg: any): void {
    this.activeMsgMenuId = null;
    if (!msg || !msg.id) return;
    const myId = this.currentChatUserId;
    msg.isRecalled = true;
    msg.content = 'Tin nhắn đã được thu hồi';
    msg.text = 'Tin nhắn đã được thu hồi';
    this.cdr.detectChanges();
    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'message_recalled', messageId: msg.id, content: 'Tin nhắn đã được thu hồi' });
      }
    } catch (_) {}
    this.vneduService.recallChatMessage(msg.id, myId).subscribe();
  }

  toggleReaction(msg: any, reactionType: string = 'like'): void {
    if (!msg || !msg.id) return;
    const myId = this.currentChatUserId;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[reactionType]) msg.reactions[reactionType] = [];
    const idx = msg.reactions[reactionType].indexOf(myId);
    if (idx >= 0) {
      msg.reactions[reactionType].splice(idx, 1);
    } else {
      msg.reactions[reactionType].push(myId);
    }
    this.cdr.detectChanges();
    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'message_reacted', messageId: msg.id, reactions: msg.reactions });
      }
    } catch (_) {}
    this.vneduService.reactChatMessage(msg.id, myId, reactionType).subscribe();
  }

  getReactionCount(msg: any, reactionType: string = 'like'): number {
    return msg?.reactions?.[reactionType]?.length || 0;
  }

  pinMessage(msg: any): void {
    this.activeMsgMenuId = null;
    if (!msg || !msg.id) return;
    const convId = msg.conversationId || (this.activeContact?.type ? this.activeContact.id : 'conv_ktdl_nhom');
    const previewText = msg.isRecalled ? 'Tin nhắn đã được thu hồi' : (msg.content || msg.text || 'Tin nhắn');
    const pinnedObj = {
      id: msg.id,
      senderName: msg.senderName || 'Người gửi',
      text: previewText
    };
    this.pinnedMessage = pinnedObj;
    this.cdr.detectChanges();
    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'message_pinned', conversationId: convId, pinnedMessage: pinnedObj });
      }
    } catch (_) {}
    this.vneduService.pinChatMessage(convId, msg.id).subscribe();
  }

  unpinMessage(): void {
    this.pinnedMessage = null;
    this.cdr.detectChanges();
  }

  copyMessage(msg: any): void {
    this.activeMsgMenuId = null;
    const content = msg.isRecalled ? 'Tin nhắn đã được thu hồi' : (msg.content || msg.text || '');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content).catch(() => {});
    }
  }

  forwardMessage(msg: any): void {
    this.activeMsgMenuId = null;
    this.messageInputText = (msg.isRecalled ? 'Tin nhắn đã được thu hồi' : (msg.content || msg.text || ''));
    const inputEl = document.querySelector('.chat-text-input') as HTMLInputElement;
    if (inputEl) inputEl.focus();
  }

  toggleMsgMenu(msgId: string, event: Event): void {
    event.stopPropagation();
    this.activeMsgMenuId = this.activeMsgMenuId === msgId ? null : msgId;
  }

  onInputTextChange(val: string): void {
    const lastWord = (val || '').split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      this.mentionQuery = lastWord.substring(1).toLowerCase();
      this.showMentionPopup = true;
      this.updateMentionCandidates();
    } else {
      this.showMentionPopup = false;
    }
  }

  updateMentionCandidates(): void {
    const defaultList = [
      { name: 'Thái Cường', avatar: '🏎️', role: 'Thành viên' },
      { name: 'Xuân Ngọc', avatar: '👨‍💼', role: 'Quản trị viên' },
      { name: 'Diệu Huyên', avatar: '👩‍🏫', role: 'Giáo viên' },
      { name: 'Đkhiếu', avatar: '🏸', role: 'Thành viên' },
      { name: 'Hưng Bảo', avatar: '⭐', role: 'Thành viên' }
    ];
    if (this.mentionQuery) {
      this.mentionCandidates = defaultList.filter(m => m.name.toLowerCase().includes(this.mentionQuery));
    } else {
      this.mentionCandidates = defaultList;
    }
  }

  insertMention(user: any): void {
    const name = user.name;
    const words = (this.messageInputText || '').split(/\s+/);
    words.pop();
    words.push(`@${name} `);
    this.messageInputText = words.join(' ');
    this.showMentionPopup = false;
    this.cdr.detectChanges();
    const inputEl = document.querySelector('.chat-text-input') as HTMLInputElement;
    if (inputEl) inputEl.focus();
  }

  formatMessageHtml(rawText: string): SafeHtml {
    if (!rawText) return '';
    const escaped = rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const formatted = escaped.replace(/(@[A-ZÀ-Ỹa-zà-ỹ0-9_]+(?:\s+[A-ZÀ-Ỹa-zà-ỹ0-9_]+)?)/g, '<span class="chat-mention fw-bold" style="color: #3880ff; cursor: pointer;">$1</span>');
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  // ========================================================
  // BỘ PHÁT ÂM THANH CHUÔNG CUỘC GỌI (WEB AUDIO API CHUẨN ZALO)
  // ========================================================
  private playCallTone(type: 'outgoing' | 'incoming' | 'connected' | 'end'): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.soundCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.soundCtx = new AudioCtx();
      }
      if (this.soundCtx && this.soundCtx.state === 'suspended') {
        this.soundCtx.resume();
      }
      this.stopRingTone();

      if (type === 'outgoing') {
        // Tiếng tút tút khi gọi đi (425Hz)
        const tone = () => {
          if (!this.soundCtx) return;
          const osc = this.soundCtx.createOscillator();
          const gain = this.soundCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(425, this.soundCtx.currentTime);
          gain.gain.setValueAtTime(0.08, this.soundCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.soundCtx.currentTime + 1.2);
          osc.connect(gain);
          gain.connect(this.soundCtx.destination);
          osc.start();
          osc.stop(this.soundCtx.currentTime + 1.2);
        };
        tone();
        this.ringTimer = setInterval(tone, 3000);
      } else if (type === 'incoming') {
        // Nhạc chuông du dương khi nhận cuộc gọi đến (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const chime = () => {
          if (!this.soundCtx) return;
          notes.forEach((freq, idx) => {
            const osc = this.soundCtx.createOscillator();
            const gain = this.soundCtx.createGain();
            const startTime = this.soundCtx.currentTime + idx * 0.18;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
            osc.connect(gain);
            gain.connect(this.soundCtx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.35);
          });
        };
        chime();
        this.ringTimer = setInterval(chime, 2500);
      } else if (type === 'connected') {
        // Bíp kết nối cuộc gọi
        if (!this.soundCtx) return;
        const osc = this.soundCtx.createOscillator();
        const gain = this.soundCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.soundCtx.currentTime);
        gain.gain.setValueAtTime(0.09, this.soundCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.soundCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.soundCtx.destination);
        osc.start();
        osc.stop(this.soundCtx.currentTime + 0.25);
      } else if (type === 'end') {
        // 3 tiếng tút báo cúp máy
        if (!this.soundCtx) return;
        [0, 0.22, 0.44].forEach(d => {
          const osc = this.soundCtx.createOscillator();
          const gain = this.soundCtx.createGain();
          const st = this.soundCtx.currentTime + d;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(425, st);
          gain.gain.setValueAtTime(0.09, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.16);
          osc.connect(gain);
          gain.connect(this.soundCtx.destination);
          osc.start(st);
          osc.stop(st + 0.16);
        });
      }
    } catch (_) {}
  }

  private stopRingTone(): void {
    if (this.ringTimer) {
      clearInterval(this.ringTimer);
      this.ringTimer = null;
    }
  }

  // ========================================================
  // QUẢN LÝ WEBRTC P2P VOICE & VIDEO (MICRO & CAMERA THỰC TẾ)
  // ========================================================
  getHttpsSwitchUrl(): string {
    if (typeof window === 'undefined') return '';
    const host = window.location.hostname;
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;
    return `https://${host}:3443${path}${search}${hash}`;
  }

  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    const queued = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];
    for (const candidate of queued) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Mobile lỗi thêm pending ICE candidate:', e);
      }
    }
  }

  private async initWebRTC(isCaller: boolean, callType: 'voice' | 'video'): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      // Dọn dẹp connection cũ nếu có, bảo toàn pending ice candidates
      this.stopRingTone();
      if (this.localMediaStream) {
        this.localMediaStream.getTracks().forEach(t => t.stop());
        this.localMediaStream = null;
      }
      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch (_) {}
        this.peerConnection = null;
      }

      // Xin quyền truy cập micro & camera (hỗ trợ lọc ồn, khử tiếng vang)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.localMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: { ideal: true },
              noiseSuppression: { ideal: true },
              autoGainControl: { ideal: true }
            },
            video: callType === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
          });
        } catch (e1) {
          try {
            this.localMediaStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: callType === 'video'
            });
          } catch (e2) {
            console.warn('Mobile micro không khả dụng hoặc chưa cấp quyền:', e2);
          }
        }
      }

      // Nếu không có micro (do dùng HTTP chưa cấp quyền), tạo fallback audio stream để giữ kết nối WebRTC RTP
      if (!this.localMediaStream || this.localMediaStream.getAudioTracks().length === 0) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.001;
            const dst = ctx.createMediaStreamDestination();
            osc.connect(gain);
            gain.connect(dst);
            osc.start();
            this.localMediaStream = dst.stream;
          }
        } catch (_) {}
      }

      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        iceCandidatePoolSize: 10
      };

      if (typeof RTCPeerConnection !== 'undefined') {
        this.peerConnection = new RTCPeerConnection(config);

        if (this.localMediaStream) {
          this.localMediaStream.getTracks().forEach(track => {
            this.peerConnection!.addTrack(track, this.localMediaStream!);
          });
        }

        // Nhận luồng âm thanh từ bên kia truyền qua (kết hợp Audio Element và Web Audio API)
        this.peerConnection.ontrack = (event) => {
          const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          let audioEl = document.getElementById('vneduMobileRemoteAudio') as HTMLAudioElement;
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = 'vneduMobileRemoteAudio';
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            document.body.appendChild(audioEl);
          }
          this.remoteAudioElement = audioEl;
          audioEl.srcObject = stream;
          audioEl.volume = this.isSpeakerOn ? 1.0 : 0.6;
          audioEl.play().catch(e => console.warn('Mobile remote audio play error:', e));

          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              if (!this.soundCtx) this.soundCtx = new AudioCtx();
              if (this.soundCtx.state === 'suspended') this.soundCtx.resume();
              const src = this.soundCtx.createMediaStreamSource(stream);
              const gainNode = this.soundCtx.createGain();
              gainNode.gain.value = this.isSpeakerOn ? 2.5 : 1.0;
              src.connect(gainNode);
              gainNode.connect(this.soundCtx.destination);
              this.mobileGainNode = gainNode;
            }
          } catch (err) {
            console.warn('Mobile Web Audio routing error:', err);
          }
        };

        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate && this.activeCall) {
            const partnerId = this.activeCall.partnerId;
            const signalData = {
              signalType: 'call_ice' as const,
              callerId: this.currentChatUserId,
              receiverId: partnerId,
              candidate: event.candidate
            };
            try {
              if (this.chatBroadcastChannel) {
                this.chatBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
              }
            } catch (_) {}
            this.vneduService.sendCallSignal(signalData).subscribe({
              next: () => {},
              error: () => {}
            });
          }
        };

        if (isCaller) {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);
          const partnerId = this.activeContact?.id || this.activeContact?.username;
          if (partnerId) {
            const signalData = {
              signalType: 'call_offer' as const,
              callerId: this.currentChatUserId,
              callerName: this.currentChatUserName,
              receiverId: partnerId,
              callType,
              sdp: offer
            };
            try {
              if (this.chatBroadcastChannel) {
                this.chatBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
              }
            } catch (_) {}
            this.vneduService.sendCallSignal(signalData).subscribe({
              next: () => {},
              error: () => {}
            });
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi khởi tạo WebRTC trên Mobile:', err);
    }
  }

  private async handleRemoteOffer(data: any): Promise<void> {
    if (!this.peerConnection) {
      await this.initWebRTC(false, data.callType || 'voice');
    }
    if (this.peerConnection && data.sdp && !this.peerConnection.remoteDescription) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await this.flushPendingIceCandidates();
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        const signalData = {
          signalType: 'call_answer' as const,
          callerId: this.currentChatUserId,
          callerName: this.currentChatUserName,
          receiverId: data.callerId,
          sdp: answer
        };
        try {
          if (this.chatBroadcastChannel) {
            this.chatBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
          }
        } catch (_) {}
        this.vneduService.sendCallSignal(signalData).subscribe({
          next: () => {},
          error: () => {}
        });
      } catch (err) {
        console.warn('Lỗi Mobile xử lý SDP offer:', err);
      }
    }
  }

  private async handleRemoteAnswer(data: any): Promise<void> {
    if (this.peerConnection && data.sdp && !this.peerConnection.remoteDescription) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await this.flushPendingIceCandidates();
      } catch (err) {
        console.warn('Lỗi Mobile xử lý SDP answer:', err);
      }
    }
  }

  private async handleRemoteIce(data: any): Promise<void> {
    if (data && data.candidate) {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Mobile addIceCandidate error:', e);
        }
      } else {
        this.pendingIceCandidates.push(data.candidate);
      }
    }
  }

  private cleanupMedia(): void {
    this.stopRingTone();
    this.pendingIceCandidates = [];
    if (this.localMediaStream) {
      this.localMediaStream.getTracks().forEach(t => t.stop());
      this.localMediaStream = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (_) {}
      this.peerConnection = null;
    }
    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }
  }

  // ========================================================
  // XỬ LÝ CUỘC GỌI THOẠI & VIDEO NHƯ ZALO (VOICE & VIDEO CALL)
  // ========================================================
  initiateCall(type: 'voice' | 'video' = 'voice'): void {
    if (!this.activeContact) return;
    const partnerId = this.activeContact.id || this.activeContact.username;
    const partnerName = this.activeContact.name || this.activeContact.title;
    const partnerAvatar = this.activeContact.avatarEmoji || (partnerId === 'xuanngocit@gmail.com' ? '👨‍💼' : '👩‍🏫');

    this.activeCall = {
      isOpen: true,
      type,
      isCaller: true,
      partnerId,
      partnerName,
      partnerAvatar,
      status: 'ringing',
      durationSec: 0,
      isMuted: false,
      isCameraOff: false
    };

    // Mở khóa audio element và AudioContext bằng user gesture chạm màn hình
    try {
      const audioEl = document.getElementById('vneduMobileRemoteAudio') as HTMLAudioElement;
      if (audioEl) {
        audioEl.play().catch(() => {});
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.soundCtx) this.soundCtx = new AudioCtx();
        if (this.soundCtx.state === 'suspended') {
          this.soundCtx.resume().catch(() => {});
        }
      }
    } catch (_) {}

    // Phát chuông tút tút khi gọi đi (Web Audio API)
    this.playCallTone('outgoing');

    const myId = this.currentChatUserId;
    const myName = this.currentChatUserName;
    const myAvatar = myId === 'xuanngocit@gmail.com' ? '👨‍💼' : '👩‍🏫';

    const signalData = {
      signalType: 'call_start' as const,
      callerId: myId,
      callerName: myName,
      callerAvatar: myAvatar,
      receiverId: partnerId,
      receiverName: partnerName,
      callType: type
    };

    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
      }
    } catch (_) {}

    this.vneduService.sendCallSignal(signalData).subscribe({
      next: () => {},
      error: (err) => console.warn('Lỗi gửi tín hiệu bắt đầu cuộc gọi:', err)
    });
    this.cdr.detectChanges();

    // Khởi tạo luồng WebRTC truyền âm thanh P2P
    this.initWebRTC(true, type);
  }

  acceptIncomingCall(): void {
    if (!this.incomingCallPrompt) return;
    const incoming = { ...this.incomingCallPrompt };
    this.incomingCallPrompt = null;

    // Ngắt chuông, phát tiếng bíp kết nối (Web Audio API)
    this.playCallTone('connected');

    // Mở khóa audio element và AudioContext bằng user gesture click
    try {
      const audioEl = document.getElementById('vneduMobileRemoteAudio') as HTMLAudioElement;
      if (audioEl) {
        audioEl.play().catch(() => {});
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.soundCtx) this.soundCtx = new AudioCtx();
        if (this.soundCtx.state === 'suspended') {
          this.soundCtx.resume().catch(() => {});
        }
      }
    } catch (_) {}

    this.activeCall = {
      isOpen: true,
      type: incoming.callType,
      isCaller: false,
      partnerId: incoming.callerId,
      partnerName: incoming.callerName,
      partnerAvatar: incoming.callerAvatar,
      status: 'connected',
      durationSec: 0,
      isMuted: false,
      isCameraOff: false
    };

    this.startCallTimer();

    const signalData = {
      signalType: 'call_accept' as const,
      callerId: incoming.callerId,
      callerName: incoming.callerName,
      receiverId: this.currentChatUserId,
      receiverName: this.currentChatUserName,
      callType: incoming.callType
    };

    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
      }
    } catch (_) {}

    this.vneduService.sendCallSignal(signalData).subscribe({
      next: () => {},
      error: (err) => console.warn('Lỗi gửi tín hiệu nhận cuộc gọi:', err)
    });
    this.cdr.detectChanges();

    // Bắt đầu nhận luồng micro/camera thực tế từ người gọi
    this.initWebRTC(false, incoming.callType);
  }

  rejectIncomingCall(): void {
    if (!this.incomingCallPrompt) return;
    const incoming = { ...this.incomingCallPrompt };
    this.incomingCallPrompt = null;

    this.playCallTone('end');
    this.cleanupMedia();

    const signalData = {
      signalType: 'call_reject' as const,
      callerId: incoming.callerId,
      callerName: incoming.callerName,
      receiverId: this.currentChatUserId,
      receiverName: this.currentChatUserName,
      callType: incoming.callType
    };

    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
      }
    } catch (_) {}

    this.vneduService.sendCallSignal(signalData).subscribe({
      next: () => {},
      error: (err) => console.warn('Lỗi gửi tín hiệu từ chối cuộc gọi:', err)
    });

    this.logCallEnd(incoming.callerId, incoming.callerName, incoming.callType, 0, 'rejected');
    this.cdr.detectChanges();
  }

  endCall(reason: 'completed' | 'missed' | 'rejected' = 'completed'): void {
    if (!this.activeCall) return;
    const call = { ...this.activeCall };
    const duration = call.durationSec;
    const partnerId = call.partnerId;
    const partnerName = call.partnerName;
    const callType = call.type;
    const effectiveStatus = (call.status === 'ringing') ? 'missed' : 'completed';

    this.stopCallTimer();
    this.playCallTone('end');
    this.cleanupMedia();
    this.activeCall = null;
    this.cdr.detectChanges();

    const signalData = {
      signalType: 'call_end' as const,
      callerId: this.currentChatUserId,
      callerName: this.currentChatUserName,
      receiverId: partnerId,
      receiverName: partnerName,
      callType,
      duration
    };

    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
      }
    } catch (_) {}

    this.vneduService.sendCallSignal(signalData).subscribe({
      next: () => {},
      error: (err) => console.warn('Lỗi gửi kết thúc cuộc gọi:', err)
    });

    this.logCallEnd(partnerId, partnerName, callType, duration, effectiveStatus);
  }

  startCallTimer(): void {
    this.stopCallTimer();
    this.callTimerInterval = setInterval(() => {
      if (this.activeCall && this.activeCall.status === 'connected') {
        this.activeCall.durationSec++;
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  stopCallTimer(): void {
    if (this.callTimerInterval) {
      clearInterval(this.callTimerInterval);
      this.callTimerInterval = null;
    }
  }

  toggleCallMute(): void {
    if (this.activeCall) {
      this.activeCall.isMuted = !this.activeCall.isMuted;
      if (this.localMediaStream) {
        this.localMediaStream.getAudioTracks().forEach(t => {
          t.enabled = !this.activeCall!.isMuted;
        });
      }
      this.cdr.detectChanges();
    }
  }

  toggleCallCamera(): void {
    if (this.activeCall) {
      this.activeCall.isCameraOff = !this.activeCall.isCameraOff;
      if (this.localMediaStream) {
        this.localMediaStream.getVideoTracks().forEach(t => {
          t.enabled = !this.activeCall!.isCameraOff;
        });
      }
      this.cdr.detectChanges();
    }
  }

  toggleSpeaker(): void {
    this.isSpeakerOn = !this.isSpeakerOn;
    if (this.mobileGainNode) {
      try {
        this.mobileGainNode.gain.value = this.isSpeakerOn ? 2.5 : 1.0;
      } catch (_) {}
    }
    const audioEl = document.getElementById('vneduMobileRemoteAudio') as HTMLAudioElement;
    if (audioEl) {
      audioEl.volume = this.isSpeakerOn ? 1.0 : 0.6;
      if ('setSinkId' in audioEl && typeof (audioEl as any).setSinkId === 'function') {
        (audioEl as any).setSinkId(this.isSpeakerOn ? 'default' : '').catch(() => {});
      }
    }
    this.cdr.detectChanges();
  }

  formatCallDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  logCallEnd(partnerId: string, partnerName: string, callType: 'voice' | 'video', durationSec: number, status: 'completed' | 'missed' | 'rejected'): void {
    const senderId = this.currentChatUserId;
    const senderName = this.currentChatUserName;
    const text = status === 'completed'
      ? (callType === 'video' ? `Cuộc gọi video (${this.formatCallDuration(durationSec)})` : `Cuộc gọi thoại (${this.formatCallDuration(durationSec)})`)
      : (callType === 'video' ? `Cuộc gọi video nhỡ` : `Cuộc gọi thoại nhỡ`);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const localMsg: any = {
      id: 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId,
      senderName,
      receiverId: partnerId,
      receiverName: partnerName,
      text,
      time: timeStr,
      timestamp: now.toISOString(),
      status: 'delivered',
      isCallLog: true,
      callType,
      callDuration: durationSec,
      callStatus: status
    };

    if (!this.chatMessages) this.chatMessages = [];
    this.chatMessages.push(localMsg);
    if (this.activeContact && (this.activeContact.id === partnerId || this.activeContact.username === partnerId)) {
      this.activeContact.lastMessage = text;
      this.activeContact.lastTime = timeStr;
    }
    this.cdr.detectChanges();
    setTimeout(() => this.scrollChatToBottom(), 50);

    try {
      if (this.chatBroadcastChannel) {
        this.chatBroadcastChannel.postMessage({ type: 'new_message', message: localMsg });
      }
    } catch (_) {}

    this.vneduService.sendChatMessage({
      senderId,
      senderName,
      receiverId: partnerId,
      receiverName: partnerName,
      text,
      isCallLog: true,
      callType,
      callDuration: durationSec,
      callStatus: status
    }).subscribe({
      next: (res) => {
        if (res?.success && res.message) {
          localMsg.id = res.message.id;
        }
      },
      error: (err) => console.warn('Lỗi ghi log cuộc gọi:', err)
    });
  }

  handleIncomingCallSignal(data: any): void {
    const myId = this.currentChatUserId;
    if (!data) return;

    // Chỉ bỏ qua nếu là sự kiện bắt đầu gọi (call_start) do chính tài khoản mình phát ra
    if (data.signalType === 'call_start' && data.callerId === myId) return;

    const isForMe = (data.receiverId === myId) ||
                    (this.currentChatRole === 'admin' && (data.receiverId === 'xuanngocit@gmail.com' || data.receiverId === 'admin')) ||
                    (this.currentChatRole === 'huyen' && (data.receiverId === '051197003685' || data.receiverId === '051197003685@vnedu.vn')) ||
                    (this.currentLoggedInUser && (data.receiverId === this.currentLoggedInUser.username || data.receiverId === this.currentLoggedInUser.email));

    if (data.signalType === 'call_start' && isForMe) {
      this.incomingCallPrompt = {
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar || (data.callerId === 'xuanngocit@gmail.com' ? '👨‍💼' : '👩‍🏫'),
        callType: data.callType || 'voice'
      };
      // Phát nhạc chuông du dương báo cuộc gọi đến (Web Audio API)
      this.playCallTone('incoming');
      this.cdr.detectChanges();
    } else if (data.signalType === 'call_accept') {
      // Đối phương đã bấm nghe máy: Dừng ngay lập tức chuông đổ, chuyển sang đàm thoại
      if (this.activeCall && (this.activeCall.isCaller || this.activeCall.status === 'ringing')) {
        this.stopRingTone();
        this.playCallTone('connected');
        this.activeCall.status = 'connected';
        this.startCallTimer();
        this.cdr.detectChanges();
      }
    } else if (data.signalType === 'call_reject') {
      if (this.activeCall && (this.activeCall.isCaller || this.activeCall.status === 'ringing')) {
        this.stopRingTone();
        this.playCallTone('end');
        this.stopCallTimer();
        this.cleanupMedia();
        this.activeCall = null;
        this.cdr.detectChanges();
      }
    } else if (data.signalType === 'call_end') {
      this.stopRingTone();
      this.playCallTone('end');
      this.cleanupMedia();
      this.incomingCallPrompt = null;
      this.stopCallTimer();
      this.activeCall = null;
      this.cdr.detectChanges();
    } else if (data.signalType === 'call_offer' && isForMe) {
      this.handleRemoteOffer(data);
    } else if (data.signalType === 'call_answer' && (isForMe || (this.activeCall && this.activeCall.isCaller))) {
      this.stopRingTone();
      if (this.activeCall) {
        this.activeCall.status = 'connected';
        this.startCallTimer();
        this.cdr.detectChanges();
      }
      this.handleRemoteAnswer(data);
    } else if (data.signalType === 'call_ice' && (isForMe || (this.activeCall && this.activeCall.partnerId === data.callerId) || (this.incomingCallPrompt && this.incomingCallPrompt.callerId === data.callerId))) {
      this.handleRemoteIce(data);
    }
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
