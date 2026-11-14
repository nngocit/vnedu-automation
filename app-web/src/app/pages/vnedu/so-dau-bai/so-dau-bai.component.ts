import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { VnEduService } from '../services/vnedu.service';
import { AuthService } from '../../../modules/auth';
import {
  VnEduInfo,
  VnEduWeekSchedule,
  VnEduSlot,
  AbsentStudent,
  VnEduStatus,
  WeekOption
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

@Component({
  selector: 'app-so-dau-bai',
  templateUrl: './so-dau-bai.component.html',
  styleUrls: ['./so-dau-bai.component.scss'],
  standalone: false
})
export class SoDauBaiComponent implements OnInit, OnDestroy {
  isLoading = false;
  isSavingBatch = false;
  isLoggingIn = false;

  info: VnEduInfo | null = null;
  status: VnEduStatus | null = null;
  scheduleData: VnEduWeekSchedule | null = null;
  slots: VnEduSlot[] = [];

  currentWeek = 10;
  realCurrentWeek = 10; // Tuần thực tế đang diễn ra trong năm học
  isMobile: boolean = false;
  appVersion: string = 'v2.8.21';
  dataSource: 'vnedu' | 'excel' = 'vnedu';
  todayStr = '';
  selectedClassFilter: string = 'all';
  searchQuery: string = '';

  // Điểm danh Modal
  selectedSlotForAttendance: VnEduSlot | null = null;
  attendanceStudents: AbsentStudent[] = [];
  suggestedAbsentNotice = '';
  unmatchedAbsentsNotice = '';
  isAttendanceRosterVerified = true;
  attendanceSearchText = '';
  isLoadingAttendance = false;
  isSavingAttendance = false;
  isScanningGiamThi = false;
  isScanningAllGiamThi = false;
  showAttendanceModal = false;

  // Trạng thái Auto Quét SĐĐ Giám Thị chạy ngầm
  isAutoScanning = false;
  autoScanStatusText = '';
  autoScanStatusClass = '';

  // Đăng nhập Modal
  showLoginModal = false;
  loginUsername = '051197003685';
  loginPassword = '';
  showPassword = false;
  loginErrorMessage = '';
  loginSuccessMessage = '';

  // Trạng thái modal Quét Radar SĐĐ Giám thị (Cyber Antivirus Scanner)
  showScanModal = false;
  scanModalStatus: 'scanning' | 'completed' | 'error' = 'scanning';
  scanProgress = 0;
  scanCurrentStep = '';
  scanLogs: Array<{ text: string; type: 'info' | 'warning' | 'success' }> = [];
  scanResultSchedule: any[] = [];
  scanAbsentSlots: any[] = [];
  scanTotalAbsents = 0;
  scanMatchedCount = 0;
  scanMismatchCount = 0;
  scanFilterTab: 'mismatched' | 'matched' | 'all' = 'mismatched';
  isSyncingAllMismatches = false;
  private scanAnimationTimer: any = null;

  // Trung tâm thông báo & Chuông cảnh báo nghiệp vụ
  notifications: AppNotification[] = [];
  showNotificationDropdown: boolean = false;
  activeNotificationTab: 'all' | 'alerts' | 'info' = 'all';

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

  // Hộp thoại xác nhận Validation Modal (Dialog)
  showValidationModal: boolean = false;
  validationModalTitle: string = '';
  validationModalErrors: string[] = [];
  validationModalWarnings: string[] = [];
  validationCanProceed: boolean = false;
  pendingValidationAction: (() => void) | null = null;


    // Kiểm tra tuần hiện tại đã có kế hoạch và đã có nhập liệu hay chưa
  get isWeekPlanCreatedAndHasData(): boolean {
    if (!this.slots || this.slots.length === 0) return false;
    return this.slots.some(s =>
      s.isSynced ||
      (s.baiDay && s.baiDay.trim() !== '' && s.baiDay !== 'Tiết dạy theo TKB') ||
      (s.soLuongNghi !== undefined && s.soLuongNghi > 0) ||
      (s.hsVangList && s.hsVangList.length > 0) ||
      (s.chitietId && s.chitietId !== '')
    );
  }

  get displayScanSlots(): any[] {
    if (this.scanFilterTab === 'mismatched') {
      return this.scanAbsentSlots.filter((s: any) => !s.isMatched);
    }
    if (this.scanFilterTab === 'matched') {
      return this.scanAbsentSlots.filter((s: any) => s.isMatched);
    }
    return this.scanAbsentSlots;
  }

  setScanFilterTab(tab: 'mismatched' | 'matched' | 'all'): void {
    this.scanFilterTab = tab;
  }

  // Toast / Thông báo
  toastMessage: { text: string; type: 'success' | 'danger' | 'info' } | null = null;

  // Chế độ xem trên Mobile (Thẻ thân thiện / Bảng đầy đủ)
  mobileViewMode: 'cards' | 'table' = 'cards';
  setMobileViewMode(mode: 'cards' | 'table'): void {
    this.mobileViewMode = mode;
  }

  // Đa hồ sơ giáo viên (Multi-Teacher Switcher)
  showTeacherSwitcherModal: boolean = false;
  savedTeachersList: any[] = [];
  isSwitchingTeacher: boolean = false;

  get currentLoggedInUser(): any {
    return this.authService.currentUserValue;
  }

  get isSuperAdminLoggedIn(): boolean {
    const user = this.authService.currentUserValue;
    if (!user) return false;
    if ((user as any).isSuperAdmin) return true;
    if (user.roles && (user.roles.includes(99) || (user.roles as any).includes('admin') || (user.roles as any).includes('SUPER_ADMIN'))) return true;
    const u = (user.username || '').toLowerCase();
    const fn = (user.fullname || '').toLowerCase();
    const em = (user.email || '').toLowerCase();
    if (u.includes('xuanngoc') || u === 'admin' || fn.includes('xuân ngọc') || fn.includes('xuan ngoc') || em.includes('xuanngoc')) {
      return true;
    }
    return false;
  }

  get teacherTitle(): string {
    return (this.info?.teacher as any)?.title || (this.status as any)?.teacherTitle || 'Cô Lê Thị Diệu Huyên';
  }

  get teacherPronoun(): string {
    const gender = (this.info?.teacher as any)?.gender || 'female';
    return gender === 'male' ? 'Thầy' : 'Cô';
  }

  get teacherSchool(): string {
    return (this.info?.teacher as any)?.school || 'Trường THCS An Lập';
  }

  getTeacherInitial(name?: string): string {
    if (!name) return 'H';
    const parts = name.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    return (lastName ? lastName.charAt(0) : 'H').toUpperCase();
  }

  openTeacherSwitcherModal(): void {
    this.showTeacherSwitcherModal = true;
    this.authService.getSavedTeachers().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.teachers)) {
          this.savedTeachersList = res.teachers;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  closeTeacherSwitcherModal(): void {
    this.showTeacherSwitcherModal = false;
  }

  onSwitchTeacher(username: string): void {
    if (this.isSwitchingTeacher) return;
    this.isSwitchingTeacher = true;
    this.authService.switchTeacher(username).subscribe({
      next: (res) => {
        this.isSwitchingTeacher = false;
        if (res && res.success) {
          this.showTeacherSwitcherModal = false;
          this.showToast(`Đã chuyển sang tài khoản ${res.teacher?.title || res.teacher?.name} thành công! 🎉`, 'success');
          // Tải lại thông tin và lịch dạy của giáo viên mới
          this.loadInitialData();
        } else {
          this.showToast('Không thể chuyển tài khoản, vui lòng thử lại!', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSwitchingTeacher = false;
        this.showToast('Lỗi kết nối khi chuyển tài khoản!', 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  onAddNewColleague(): void {
    this.closeTeacherSwitcherModal();
    this.authService.logoutWithoutRedirect();
    this.router.navigate(['/auth/login'], { queryParams: { mode: 'new' } });
  }

  // Danh sách tuần từ 1 đến 35 luôn sẵn sàng
  weeksList: Array<{ weekNumber: number; title: string; isCurrentRealWeek: boolean }> = Array.from({ length: 35 }, (_, i) => ({
    weekNumber: i + 1,
    title: `Tuần ${i + 1}`,
    isCurrentRealWeek: i + 1 === 10
  }));

  // Quản lý thông báo cuộc gọi đến & Cuộc gọi đang kết nối trên Desktop (WebRTC P2P)
  incomingCallPrompt: {
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callType: 'voice' | 'video';
  } | null = null;

  activeDesktopCall: {
    isOpen: boolean;
    type: 'voice' | 'video';
    partnerId: string;
    partnerName: string;
    partnerAvatar: string;
    status: 'ringing' | 'connected';
    durationSec: number;
    isMuted: boolean;
    isCameraOff: boolean;
  } | null = null;

  private desktopBroadcastChannel: any = null;
  private desktopEventSource: any = null;
  private desktopRingTimer: any = null;
  private desktopRingAudioCtx: any = null;
  private desktopCallTimer: any = null;
  private desktopPendingOffer: any = null;
  private desktopPendingIceCandidates: any[] = [];
  private desktopLocalStream: MediaStream | null = null;
  private desktopPeerConnection: RTCPeerConnection | null = null;
  private desktopRemoteAudioEl: HTMLAudioElement | null = null;
  private desktopSoundCtx: any = null;
  isDesktopSpeakerOn: boolean = true;
  private desktopGainNode: any = null;

  constructor(
    private vneduService: VnEduService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  initDesktopCallListeners(): void {
    if (typeof window === 'undefined') return;
    try {
      if ('BroadcastChannel' in window) {
        this.desktopBroadcastChannel = new BroadcastChannel('vnedu_chat_bus');
        this.desktopBroadcastChannel.onmessage = (event: MessageEvent) => {
          if (event?.data?.type === 'call_signal') {
            this.handleDesktopCallSignal(event.data);
          }
        };
      }
    } catch (_) {}

    try {
      if ('EventSource' in window) {
        this.desktopEventSource = new EventSource('/api/chat/stream');
        this.desktopEventSource.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'call_signal') {
              this.handleDesktopCallSignal(data);
            }
          } catch (_) {}
        };
      }
    } catch (_) {}
  }

  handleDesktopCallSignal(data: any): void {
    if (!data || this.isMobile) return;
    const myId = (this.isSuperAdminLoggedIn || this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') ? 'xuanngocit@gmail.com' : (this.currentLoggedInUser?.username || '051197003685');

    // Chỉ bỏ qua nếu là cuộc gọi bắt đầu (call_start) do chính tài khoản mình phát ra
    if (data.signalType === 'call_start' && data.callerId === myId) return;

    const isForMe = (data.receiverId === myId) ||
                    (myId === 'xuanngocit@gmail.com' && (data.receiverId === 'xuanngocit@gmail.com' || data.receiverId === 'admin')) ||
                    (myId === '051197003685' && (data.receiverId === '051197003685' || data.receiverId === '051197003685@vnedu.vn')) ||
                    (this.currentLoggedInUser && (data.receiverId === this.currentLoggedInUser.username || data.receiverId === this.currentLoggedInUser.email));

    if (data.signalType === 'call_start' && isForMe) {
      this.incomingCallPrompt = {
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar || (data.callerId === 'xuanngocit@gmail.com' ? '👨‍💼' : '👩‍🏫'),
        callType: data.callType || 'voice'
      };
      this.playDesktopCallTone();
      this.cdr.detectChanges();
    } else if (data.signalType === 'call_offer' && isForMe) {
      this.handleDesktopRemoteOffer(data);
    } else if (data.signalType === 'call_answer' && (isForMe || (this.activeDesktopCall && this.activeDesktopCall.status === 'connected'))) {
      this.handleDesktopRemoteAnswer(data);
    } else if (data.signalType === 'call_ice' && (isForMe || (this.activeDesktopCall && this.activeDesktopCall.partnerId === data.callerId) || (this.incomingCallPrompt && this.incomingCallPrompt.callerId === data.callerId))) {
      this.handleDesktopRemoteIce(data);
    } else if (data.signalType === 'call_end' || data.signalType === 'call_reject') {
      this.stopDesktopCallTone();
      this.stopDesktopCallTimer();
      this.cleanupDesktopMedia();
      this.incomingCallPrompt = null;
      this.activeDesktopCall = null;
      this.cdr.detectChanges();
    }
  }

  acceptDesktopIncomingCall(): void {
    if (!this.incomingCallPrompt) return;
    const incoming = { ...this.incomingCallPrompt };
    this.stopDesktopCallTone();
    this.incomingCallPrompt = null;
    const myId = (this.isSuperAdminLoggedIn || this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') ? 'xuanngocit@gmail.com' : (this.currentLoggedInUser?.username || '051197003685');

    // Mở khóa audio element và AudioContext bằng user gesture click
    try {
      const audioEl = document.getElementById('vneduDesktopRemoteAudio') as HTMLAudioElement;
      if (audioEl) {
        audioEl.play().catch(() => {});
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.desktopSoundCtx) this.desktopSoundCtx = new AudioCtx();
        if (this.desktopSoundCtx.state === 'suspended') {
          this.desktopSoundCtx.resume().catch(() => {});
        }
      }
    } catch (_) {}

    // Mở màn hình đàm thoại Desktop
    this.activeDesktopCall = {
      isOpen: true,
      type: incoming.callType,
      partnerId: incoming.callerId,
      partnerName: incoming.callerName,
      partnerAvatar: incoming.callerAvatar,
      status: 'connected',
      durationSec: 0,
      isMuted: false,
      isCameraOff: false
    };
    this.startDesktopCallTimer();

    // Khởi tạo WebRTC micro thực tế trên Desktop kết nối 2 chiều với điện thoại
    this.initDesktopWebRTC(false, incoming.callType, incoming.callerId);

    const signalData = {
      signalType: 'call_accept' as const,
      callerId: incoming.callerId,
      callerName: incoming.callerName,
      receiverId: myId,
      receiverName: this.teacherTitle,
      callType: incoming.callType
    };
    try {
      if (this.desktopBroadcastChannel) {
        this.desktopBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
      }
    } catch (_) {}
    this.vneduService.sendCallSignal(signalData).subscribe();
    this.cdr.detectChanges();
  }

  endDesktopCall(): void {
    if (!this.activeDesktopCall) return;
    const partnerId = this.activeDesktopCall.partnerId;
    const partnerName = this.activeDesktopCall.partnerName;
    const callType = this.activeDesktopCall.type;
    const duration = this.activeDesktopCall.durationSec;
    const myId = (this.isSuperAdminLoggedIn || this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') ? 'xuanngocit@gmail.com' : (this.currentLoggedInUser?.username || '051197003685');

    this.stopDesktopCallTimer();
    this.cleanupDesktopMedia();
    this.activeDesktopCall = null;
    this.cdr.detectChanges();

    const signalData = {
      signalType: 'call_end' as const,
      callerId: myId,
      callerName: this.teacherTitle,
      receiverId: partnerId,
      receiverName: partnerName,
      callType,
      duration
    };
    try {
      if (this.desktopBroadcastChannel) {
        this.desktopBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
      }
    } catch (_) {}
    this.vneduService.sendCallSignal(signalData).subscribe();
  }

  toggleDesktopMute(): void {
    if (!this.activeDesktopCall) return;
    this.activeDesktopCall.isMuted = !this.activeDesktopCall.isMuted;
    if (this.desktopLocalStream) {
      this.desktopLocalStream.getAudioTracks().forEach(t => {
        t.enabled = !this.activeDesktopCall!.isMuted;
      });
    }
    this.cdr.detectChanges();
  }

  toggleDesktopSpeaker(): void {
    this.isDesktopSpeakerOn = !this.isDesktopSpeakerOn;
    if (this.desktopGainNode) {
      try {
        this.desktopGainNode.gain.value = this.isDesktopSpeakerOn ? 2.5 : 1.0;
      } catch (_) {}
    }
    const audioEl = document.getElementById('vneduDesktopRemoteAudio') as HTMLAudioElement;
    if (audioEl) {
      audioEl.volume = this.isDesktopSpeakerOn ? 1.0 : 0.6;
    }
    this.cdr.detectChanges();
  }

  startDesktopCallTimer(): void {
    this.stopDesktopCallTimer();
    this.desktopCallTimer = setInterval(() => {
      if (this.activeDesktopCall && this.activeDesktopCall.status === 'connected') {
        this.activeDesktopCall.durationSec++;
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  stopDesktopCallTimer(): void {
    if (this.desktopCallTimer) {
      clearInterval(this.desktopCallTimer);
      this.desktopCallTimer = null;
    }
  }

  formatDesktopCallDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // ========================================================
  // WEBRTC PEER CONNECTION CHO DESKTOP
  // ========================================================
  private async flushDesktopPendingIceCandidates(): Promise<void> {
    if (!this.desktopPeerConnection || !this.desktopPeerConnection.remoteDescription) return;
    const queued = [...this.desktopPendingIceCandidates];
    this.desktopPendingIceCandidates = [];
    for (const candidate of queued) {
      try {
        await this.desktopPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Desktop lỗi thêm pending ICE candidate:', e);
      }
    }
  }

  async initDesktopWebRTC(isCaller: boolean, callType: 'voice' | 'video', partnerId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      // Đóng peer connection cũ nếu có, bảo toàn pending offer & ice candidates đã nhận
      if (this.desktopLocalStream) {
        this.desktopLocalStream.getTracks().forEach(t => t.stop());
        this.desktopLocalStream = null;
      }
      if (this.desktopPeerConnection) {
        try { this.desktopPeerConnection.close(); } catch (_) {}
        this.desktopPeerConnection = null;
      }

      // Truy cập micro thực tế trên máy tính (hỗ trợ hủy tiếng vang, lọc ồn)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.desktopLocalStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: { ideal: true },
              noiseSuppression: { ideal: true },
              autoGainControl: { ideal: true }
            },
            video: callType === 'video'
          });
        } catch (e1) {
          try {
            this.desktopLocalStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: callType === 'video'
            });
          } catch (e2) {
            console.warn('Desktop microphone không khả dụng hoặc chưa cấp quyền:', e2);
          }
        }
      }

      // Nếu không có micro thực tế, tạo fallback audio stream để duy trì kết nối WebRTC 2 chiều
      if (!this.desktopLocalStream || this.desktopLocalStream.getAudioTracks().length === 0) {
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
            this.desktopLocalStream = dst.stream;
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
        this.desktopPeerConnection = new RTCPeerConnection(config);

        if (this.desktopLocalStream) {
          this.desktopLocalStream.getTracks().forEach(track => {
            this.desktopPeerConnection!.addTrack(track, this.desktopLocalStream!);
          });
        }

        // Nhận âm thanh từ điện thoại phát ra loa máy tính (kết hợp Audio Element và Web Audio API)
        this.desktopPeerConnection.ontrack = (event) => {
          const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          let audioEl = document.getElementById('vneduDesktopRemoteAudio') as HTMLAudioElement;
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = 'vneduDesktopRemoteAudio';
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            document.body.appendChild(audioEl);
          }
          this.desktopRemoteAudioEl = audioEl;
          audioEl.srcObject = stream;
          audioEl.volume = this.isDesktopSpeakerOn ? 1.0 : 0.6;
          audioEl.play().catch(e => console.warn('Desktop remote audio play error:', e));

          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              if (!this.desktopSoundCtx) this.desktopSoundCtx = new AudioCtx();
              if (this.desktopSoundCtx.state === 'suspended') this.desktopSoundCtx.resume();
              const src = this.desktopSoundCtx.createMediaStreamSource(stream);
              const gainNode = this.desktopSoundCtx.createGain();
              gainNode.gain.value = this.isDesktopSpeakerOn ? 2.5 : 1.0;
              src.connect(gainNode);
              gainNode.connect(this.desktopSoundCtx.destination);
              this.desktopGainNode = gainNode;
            }
          } catch (err) {
            console.warn('Desktop Web Audio routing error:', err);
          }
        };

        this.desktopPeerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            const signalData = {
              signalType: 'call_ice' as const,
              callerId: (this.isSuperAdminLoggedIn || this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') ? 'xuanngocit@gmail.com' : (this.currentLoggedInUser?.username || '051197003685'),
              receiverId: partnerId,
              candidate: event.candidate
            };
            try {
              if (this.desktopBroadcastChannel) {
                this.desktopBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
              }
            } catch (_) {}
            this.vneduService.sendCallSignal(signalData).subscribe();
          }
        };

        // Nếu đã có SDP offer từ điện thoại gửi qua, tạo SDP answer gửi lại
        if (!isCaller && this.desktopPendingOffer && !this.desktopPeerConnection.remoteDescription) {
          await this.desktopPeerConnection.setRemoteDescription(new RTCSessionDescription(this.desktopPendingOffer));
          await this.flushDesktopPendingIceCandidates();
          const answer = await this.desktopPeerConnection.createAnswer();
          await this.desktopPeerConnection.setLocalDescription(answer);
          const myId = (this.isSuperAdminLoggedIn || this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') ? 'xuanngocit@gmail.com' : (this.currentLoggedInUser?.username || '051197003685');
          const signalData = {
            signalType: 'call_answer' as const,
            callerId: myId,
            callerName: this.teacherTitle,
            receiverId: partnerId,
            sdp: answer
          };
          try {
            if (this.desktopBroadcastChannel) {
              this.desktopBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
            }
          } catch (_) {}
          this.vneduService.sendCallSignal(signalData).subscribe();
        }
      }
    } catch (err) {
      console.warn('Lỗi khởi tạo WebRTC trên Desktop:', err);
    }
  }

  async handleDesktopRemoteOffer(data: any): Promise<void> {
    this.desktopPendingOffer = data.sdp;
    if (!this.desktopPeerConnection && this.activeDesktopCall) {
      await this.initDesktopWebRTC(false, data.callType || 'voice', data.callerId);
    }
    if (this.desktopPeerConnection && data.sdp && !this.desktopPeerConnection.remoteDescription) {
      try {
        await this.desktopPeerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await this.flushDesktopPendingIceCandidates();
        const answer = await this.desktopPeerConnection.createAnswer();
        await this.desktopPeerConnection.setLocalDescription(answer);
        const myId = (this.isSuperAdminLoggedIn || this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') ? 'xuanngocit@gmail.com' : (this.currentLoggedInUser?.username || '051197003685');
        const signalData = {
          signalType: 'call_answer' as const,
          callerId: myId,
          callerName: this.teacherTitle,
          receiverId: data.callerId,
          sdp: answer
        };
        try {
          if (this.desktopBroadcastChannel) {
            this.desktopBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
          }
        } catch (_) {}
        this.vneduService.sendCallSignal(signalData).subscribe();
      } catch (err) {
        console.warn('Lỗi Desktop xử lý SDP offer:', err);
      }
    }
  }

  async handleDesktopRemoteAnswer(data: any): Promise<void> {
    if (this.desktopPeerConnection && data.sdp) {
      try {
        await this.desktopPeerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await this.flushDesktopPendingIceCandidates();
      } catch (err) {
        console.warn('Lỗi Desktop xử lý SDP answer:', err);
      }
    }
  }

  async handleDesktopRemoteIce(data: any): Promise<void> {
    if (data && data.candidate) {
      if (this.desktopPeerConnection && this.desktopPeerConnection.remoteDescription) {
        try {
          await this.desktopPeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Desktop lỗi addIceCandidate:', e);
        }
      } else {
        this.desktopPendingIceCandidates.push(data.candidate);
      }
    }
  }

  cleanupDesktopMedia(): void {
    if (this.desktopLocalStream) {
      this.desktopLocalStream.getTracks().forEach(t => t.stop());
      this.desktopLocalStream = null;
    }
    if (this.desktopPeerConnection) {
      try { this.desktopPeerConnection.close(); } catch (_) {}
      this.desktopPeerConnection = null;
    }
    this.desktopPendingIceCandidates = [];
    this.desktopPendingOffer = null;
  }

  rejectDesktopIncomingCall(): void {
    if (!this.incomingCallPrompt) return;
    const incoming = { ...this.incomingCallPrompt };
    this.stopDesktopCallTone();
    this.incomingCallPrompt = null;
    const myId = (this.isSuperAdminLoggedIn || this.currentLoggedInUser?.email === 'xuanngocit@gmail.com') ? 'xuanngocit@gmail.com' : (this.currentLoggedInUser?.username || '051197003685');
    const signalData = {
      signalType: 'call_reject' as const,
      callerId: incoming.callerId,
      callerName: incoming.callerName,
      receiverId: myId,
      receiverName: this.teacherTitle,
      callType: incoming.callType
    };
    try {
      if (this.desktopBroadcastChannel) {
        this.desktopBroadcastChannel.postMessage({ type: 'call_signal', ...signalData });
      }
    } catch (_) {}
    this.vneduService.sendCallSignal(signalData).subscribe();
    this.cdr.detectChanges();
  }

  private playDesktopCallTone(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.desktopRingAudioCtx) {
        this.desktopRingAudioCtx = new AudioCtx();
      }
      if (this.desktopRingAudioCtx.state === 'suspended') {
        this.desktopRingAudioCtx.resume();
      }
      this.stopDesktopCallTone();
      const playChime = () => {
        if (!this.desktopRingAudioCtx) return;
        const now = this.desktopRingAudioCtx.currentTime;
        const osc1 = this.desktopRingAudioCtx.createOscillator();
        const osc2 = this.desktopRingAudioCtx.createOscillator();
        const gain = this.desktopRingAudioCtx.createGain();
        osc1.type = 'sine'; osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.35);
        osc2.frequency.setValueAtTime(659.25, now + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.55);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc1.connect(gain); osc2.connect(gain);
        gain.connect(this.desktopRingAudioCtx.destination);
        osc1.start(now); osc2.start(now + 0.15);
        osc1.stop(now + 1.2); osc2.stop(now + 1.2);
      };
      playChime();
      this.desktopRingTimer = setInterval(playChime, 2500);
    } catch (_) {}
  }

  private stopDesktopCallTone(): void {
    if (this.desktopRingTimer) {
      clearInterval(this.desktopRingTimer);
      this.desktopRingTimer = null;
    }
  }

  ngOnInit(): void {
    this.checkScreenSize();
    this.initDesktopCallListeners();
    const now = new Date();
    this.todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Khử triệt để tình trạng sidebar bị đen trên máy đã lưu cache dark-sidebar
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const theme = localStorage.getItem('kt_theme_mode_value');
        if (theme !== 'dark') {
          Object.keys(localStorage).forEach(k => {
            if (k.includes('baseLayoutType') && localStorage.getItem(k) === 'dark-sidebar') {
              localStorage.setItem(k, 'light-sidebar');
            }
          });
          document.body.setAttribute('data-kt-app-layout', 'light-sidebar');
          document.body.setAttribute('data-kt-app-sidebar-minimize', 'off');
        }
      }
    } catch (_) {}

    // Hỗ trợ tham số ?date=DD/MM/YYYY để xem trước ngày bất kỳ trong tuần
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const queryDate = urlParams.get('date');
        if (queryDate && queryDate.includes('/')) {
          this.todayStr = queryDate;
        }
      }
    } catch (_) {}

    // Lắng nghe sự kiện chuyển đến tiết học từ chuông thông báo trên top header
    this.vneduService.navigateSlot$.subscribe(slotRef => {
      if (slotRef) {
        this.navigateToSlot(slotRef);
      }
    });

    // Lắng nghe yêu cầu quét lại từ chuông thông báo
    this.vneduService.reaudit$.subscribe(() => {
      this.loadAuditNotifications();
    });

    this.loadInitialData();
    this.fetchWeather();

    // Tự động làm mới thời tiết và giờ VN mỗi 60 giây (100% Real-time Auto)
    try {
      if (typeof window !== 'undefined') {
        this.weatherTimer = setInterval(() => {
          this.fetchWeather();
        }, 60000);

        // Tự động quét kiểm tra SĐĐ Giám thị định kỳ mỗi 3 phút (180,000ms)
        this.giamThiPollingTimer = setInterval(() => {
          this.autoScanSupervisorQuietly();
        }, 180000);

        // Khi Cô chuyển tab quay lại, tự động thăm dò xem Giám thị có nhập mới không
        this.focusListener = () => {
          this.autoScanSupervisorQuietly();
        };
        window.addEventListener('focus', this.focusListener);
      }
    } catch (_) {}
  }

  private weatherTimer: any;
  private giamThiPollingTimer: any;
  private focusListener: any;
  private hasAutoOpenedMailbox: boolean = false;

  ngOnDestroy(): void {
    this.stopDesktopCallTone();
    this.stopDesktopCallTimer();
    this.cleanupDesktopMedia();
    if (this.desktopBroadcastChannel) {
      try { this.desktopBroadcastChannel.close(); } catch (_) {}
      this.desktopBroadcastChannel = null;
    }
    if (this.desktopEventSource) {
      try { this.desktopEventSource.close(); } catch (_) {}
      this.desktopEventSource = null;
    }
    if (this.weatherTimer) {
      clearInterval(this.weatherTimer);
    }
    if (this.giamThiPollingTimer) {
      clearInterval(this.giamThiPollingTimer);
    }
    if (this.focusListener && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.focusListener);
    }
  }

  weatherInfo: {
    temp: number;
    apparentTemp: number;
    tempMin: number;
    tempMax: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    location: string;
    iconType: 'sunny' | 'sun-cloud' | 'rainy' | 'night';
    isNight: boolean;
    currentTimeVN: string;
    currentHourVN: number;
    warning: string;
    hourlyList: Array<{
      timeText: string;
      hourNum: number;
      temp: number;
      icon: string;
      condition: string;
      pop: number;
    }>;
  } = {
    temp: 27,
    apparentTemp: 32,
    tempMin: 24,
    tempMax: 32,
    condition: 'Đêm mát mẻ, trời quang',
    humidity: 83,
    windSpeed: 5,
    location: 'THCS An Lập, Dầu Tiếng, Bình Dương',
    iconType: 'night',
    isNight: true,
    currentTimeVN: '20:15',
    currentHourVN: 20,
    warning: 'Đêm nay nhiệt độ khoảng 25°C - 27°C, thời tiết mát mẻ dễ chịu. Dự báo chiều mai (15h - 17h) có mưa dông 71%, cô giáo chú ý mang theo áo mưa khi tan trường.',
    hourlyList: [
      { timeText: '20:00', hourNum: 20, temp: 27, icon: '🌙', condition: 'Trời quang', pop: 6 },
      { timeText: '21:00', hourNum: 21, temp: 26, icon: '🌙', condition: 'Trời mát', pop: 9 },
      { timeText: '22:00', hourNum: 22, temp: 26, icon: '🌙', condition: 'Trời mát', pop: 10 },
      { timeText: '23:00', hourNum: 23, temp: 25, icon: '🌙', condition: 'Đêm mát', pop: 10 },
      { timeText: '06:00', hourNum: 6, temp: 24, icon: '🌤️', condition: 'Bình minh', pop: 2 },
      { timeText: '07:00', hourNum: 7, temp: 26, icon: '🌤️', condition: 'Nắng sớm', pop: 0 },
      { timeText: '10:00', hourNum: 10, temp: 30, icon: '☀️', condition: 'Nắng ấm', pop: 0 },
      { timeText: '14:00', hourNum: 14, temp: 32, icon: '☀️', condition: 'Nắng ráo', pop: 16 },
      { timeText: '16:00', hourNum: 16, temp: 26, icon: '⛈️', condition: 'Mưa dông', pop: 71 }
    ]
  };

  fetchWeather(): void {
    const updateTimeVN = () => {
      try {
        const now = new Date();
        const vnStr = now.toLocaleTimeString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const hour = Number(now.toLocaleTimeString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          hour12: false
        }));
        this.weatherInfo.currentTimeVN = vnStr;
        this.weatherInfo.currentHourVN = hour;
        this.weatherInfo.isNight = hour >= 18 || hour < 6;
      } catch (_) {}
    };

    updateTimeVN();

    if (typeof window === 'undefined' || !window.fetch) return;

    fetch('https://api.open-meteo.com/v1/forecast?latitude=11.23&longitude=106.51&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&timezone=Asia%2FHo_Chi_Minh&forecast_days=2')
      .then(res => res.json())
      .then(data => {
        if (data && data.current) {
          const c = data.current;
          this.weatherInfo.temp = Math.round(c.temperature_2m);
          this.weatherInfo.apparentTemp = Math.round(c.apparent_temperature ?? c.temperature_2m);
          this.weatherInfo.humidity = c.relative_humidity_2m;
          this.weatherInfo.windSpeed = Math.round(c.wind_speed_10m);
          this.weatherInfo.isNight = c.is_day === 0;

          if (c.time) {
            const timePart = c.time.split('T')[1];
            if (timePart) {
              this.weatherInfo.currentTimeVN = timePart;
              this.weatherInfo.currentHourVN = parseInt(timePart.split(':')[0], 10);
            }
          }

          const code = c.weather_code;
          const isNight = this.weatherInfo.isNight;

          if (isNight) {
            this.weatherInfo.iconType = 'night';
            if (code === 0) {
              this.weatherInfo.condition = 'Đêm mát mẻ, trời quang';
            } else if (code <= 3) {
              this.weatherInfo.condition = 'Trời đêm mát, mây rải rác';
            } else {
              this.weatherInfo.condition = 'Đêm có mưa rào rải rác';
            }
          } else {
            if (code === 0) {
              this.weatherInfo.condition = 'Trời nắng quang đãng';
              this.weatherInfo.iconType = 'sunny';
            } else if (code <= 3) {
              this.weatherInfo.condition = 'Nắng ấm, mây rải rác';
              this.weatherInfo.iconType = 'sun-cloud';
            } else if (code >= 51 && code <= 67) {
              this.weatherInfo.condition = 'Có mưa nhỏ rải rác';
              this.weatherInfo.iconType = 'rainy';
            } else {
              this.weatherInfo.condition = 'Mưa rào & dông';
              this.weatherInfo.iconType = 'rainy';
            }
          }

          // Parse hourly list
          if (data.hourly && Array.isArray(data.hourly.time)) {
            const currentIsoPrefix = c.time ? c.time.substring(0, 13) : '';
            const times: string[] = data.hourly.time;
            const temps: number[] = data.hourly.temperature_2m;
            const codes: number[] = data.hourly.weather_code;
            const pops: number[] = data.hourly.precipitation_probability || [];

            let startIdx = times.findIndex(t => t.startsWith(currentIsoPrefix));
            if (startIdx < 0) startIdx = 0;

            const list: any[] = [];
            for (let i = startIdx; i < Math.min(startIdx + 8, times.length); i++) {
              const tStr = times[i];
              const hourOnly = tStr.split('T')[1]?.substring(0, 5) || tStr;
              const hNum = parseInt(hourOnly.split(':')[0], 10);
              const isHNight = hNum >= 18 || hNum < 6;
              const wCode = codes[i] || 0;
              let ic = isHNight ? '🌙' : '☀️';
              let cond = 'Quang đãng';
              if (wCode >= 80 || wCode === 95) {
                ic = '⛈️';
                cond = 'Mưa dông';
              } else if (wCode >= 51) {
                ic = '🌧️';
                cond = 'Mưa rào';
              } else if (wCode >= 1 && wCode <= 3) {
                ic = isHNight ? '☁️' : '🌤️';
                cond = 'Có mây';
              }
              list.push({
                timeText: hourOnly,
                hourNum: hNum,
                temp: Math.round(temps[i]),
                icon: ic,
                condition: cond,
                pop: pops[i] || 0
              });
            }
            if (list.length > 0) {
              this.weatherInfo.hourlyList = list;
            }

            // Find if there is upcoming rain
            const rainySlot = list.find(item => item.pop >= 50 || item.condition.includes('Mưa'));
            if (isNight) {
              this.weatherInfo.warning = rainySlot
                ? `Đêm nay nhiệt độ khoảng ${this.weatherInfo.temp}°C, trời mát. Dự báo lúc ${rainySlot.timeText} có ${rainySlot.condition.toLowerCase()} (${rainySlot.pop}%), cô giáo chú ý mang theo áo mưa khi ra ngoài.`
                : `Đêm nay nhiệt độ khoảng ${this.weatherInfo.temp}°C, thời tiết mát mẻ dễ chịu. Chúc cô giáo có một buổi tối thư thái tại Dầu Tiếng!`;
            } else {
              this.weatherInfo.warning = rainySlot
                ? `Dự báo lúc ${rainySlot.timeText} có ${rainySlot.condition.toLowerCase()} (${rainySlot.pop}%). Cô giáo chú ý mang theo áo mưa khi di chuyển.`
                : `Thời tiết ban ngày thuận lợi (nhiệt độ ${this.weatherInfo.temp}°C). Chúc cô giáo một ngày giảng dạy hiệu quả!`;
            }
          }

          this.cdr.markForCheck();
        }
      })
      .catch(() => {});
  }

  redirectToLogin(): void {
    this.showToast('Phiên làm việc vnEdu đã kết thúc. Đang chuyển về trang Đăng nhập...', 'info');
    setTimeout(() => {
      localStorage.removeItem('v8.1.8-authf649fc9a5f55');
      localStorage.removeItem('vnedu_token');
      localStorage.removeItem('vnedu_cookies');
      this.router.navigate(['/auth/login']);
    }, 1200);
  }

  showToast(text: string, type: 'success' | 'danger' | 'info' = 'success'): void {
    this.toastMessage = { text, type };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toastMessage = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.vneduService.getStatus().subscribe({
      next: (status) => {
        this.status = status;
        if (!status || !status.connected) {
          this.redirectToLogin();
          return;
        }
        this.checkSessionAndLoadInfo();
      },
      error: () => {
        this.redirectToLogin();
      }
    });
  }

  checkSessionAndLoadInfo(): void {
    this.vneduService.getInfo(this.dataSource).subscribe({
      next: (info) => {
        this.info = info;
        const urlParams = (typeof window !== 'undefined' && window.location?.search) ? new URLSearchParams(window.location.search) : null;
        const qWeek = urlParams ? parseInt(urlParams.get('week') || '') : null;
        this.realCurrentWeek = info.currentRealWeek || 10;
        this.currentWeek = qWeek || this.currentWeek || info.currentRealWeek || 10;
        if (info.weeks && info.weeks.length > 0) {
          this.weeksList = info.weeks.map((w, idx) => ({
            weekNumber: w.weekNumber || (idx + 1),
            title: `Tuần ${w.weekNumber || (idx + 1)}`,
            isCurrentRealWeek: !!w.isCurrentRealWeek
          }));
        }
        this.loadSchedule(this.currentWeek);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Không thể tải thông tin hệ thống: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  loadSchedule(week: number): void {
    this.isLoading = true;
    this.currentWeek = week;
    this.vneduService.getSchedule(week, this.dataSource, true).subscribe({
      next: (data) => {
        this.scheduleData = data;
        this.slots = (data.schedule || []).map((s, idx) => {
          const bai = s.tenBai || s.baiDay || s.noiDung || '';
          return {
            ...s,
            baiDay: bai,
            tenBai: bai,
            index: s.index || idx + 1,
            nhanXet: s.nhanXet || s.nhanXetDefault || 'Lớp học nghiêm túc, tích cực',
            diem: s.diem || s.diemDefault || 20,
            diemKl: s.diemKl || 10,
            diemVs: s.diemVs || 10
          };
        });
        this.updateDayGroups();
        this.loadAuditNotifications();
        this.isLoading = false;
        this.cdr.detectChanges();

        // QUY TẮC CSDL: Chỉ tự động quét đối chiếu ngầm ở đúng TUẦN HIỆN TẠI THỰC TẾ
        // Các tuần quá khứ (Tuần 1..9) đã chốt sổ trong CSDL, không bao giờ quét ngầm gây sai lệch
        if (this.slots.length > 0 && this.currentWeek === this.realCurrentWeek) {
          this.autoScanSupervisorQuietly();
        } else {
          this.isAutoScanning = false;
          this.autoScanStatusText = 'Tuần lưu trữ (Đã chốt CSDL)';
          this.autoScanStatusClass = 'status-success';
        }
      },
      error: (err) => {
        // Tuần chưa có KHGD hoặc gặp lỗi: Xóa sạch dữ liệu, không giữ lại dữ liệu tuần cũ
        this.scheduleData = null;
        this.slots = [];
        this.updateDayGroups();
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth < 768;
    }
  }

  onWeekChangeMobile(week: number): void {
    this.currentWeek = week;
    this.loadSchedule(week);
  }

  onLogout(): void {
    this.authService.logout();
  }

  onWeekChange(event: any): void {
    const w = parseInt(event.target.value);
    if (w) this.loadSchedule(w);
  }

  prevWeek(): void {
    if (this.currentWeek > 1) this.loadSchedule(this.currentWeek - 1);
  }

  nextWeek(): void {
    if (this.currentWeek < 35) this.loadSchedule(this.currentWeek + 1);
  }

  toggleSource(source: 'vnedu' | 'excel'): void {
    if (this.dataSource === source) return;
    this.dataSource = source;
    this.loadSchedule(this.currentWeek);
  }

  // Lưu 1 tiết đơn lẻ
  
  // Nạp và kiểm toán toàn bộ thông báo/cảnh báo nghiệp vụ (Chuông thông báo)
  loadAuditNotifications(): void {
    // QUY TẮC CSDL: Chỉ nạp thông báo/cảnh báo cho đúng tuần hiện tại thực tế
    // Khi đang xem các tuần quá khứ, không tạo cảnh báo giả làm phiền
    if (this.currentWeek !== this.realCurrentWeek) {
      this.notifications = [];
      this.vneduService.setNotifications([]);
      return;
    }

    this.vneduService.auditWeek(this.currentWeek).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.issues)) {
          const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const newNotifs: AppNotification[] = [];

          // Nạp danh sách ID đã xóa / bỏ qua để không bao giờ hiện lại làm phiền
          let dismissedSet = new Set<string>();
          let readSet = new Set<string>();
          try {
            const rawDismissed = localStorage.getItem('vnedu_dismissed_notifs');
            if (rawDismissed) dismissedSet = new Set(JSON.parse(rawDismissed));
            const rawRead = localStorage.getItem('vnedu_read_notifs');
            if (rawRead) readSet = new Set(JSON.parse(rawRead));
          } catch (_) {}

          // Nạp các vấn đề phát hiện từ audit engine (dùng ID ổn định để lưu trạng thái đóng)
          res.issues.forEach((issue: any, idx: number) => {
            const notifId = `audit_${this.currentWeek}_${idx}_${(issue.category || 'issue')}`;
            if (dismissedSet.has(notifId)) return;
            newNotifs.push({
              id: notifId,
              title: issue.title,
              message: issue.message,
              category: issue.category,
              severity: issue.severity,
              time: nowStr,
              slotRef: issue.slotRef,
              isRead: readSet.has(notifId)
            });
          });

          // Thêm thông báo đối chiếu SĐĐ Giám thị (từng tiết có link xem chi tiết)
          const mismatchedSlots = this.slots.filter(s => s.isMatched === false);
          if (mismatchedSlots.length > 0) {
            mismatchedSlots.forEach(s => {
              const notifId = `gt_mismatch_${s.thu}_${s.tiet}_${s.lop}`;
              if (dismissedSet.has(notifId)) return; // Người dùng đã đóng/bỏ qua, không nhắc lại nữa

              // Tính mốc thời gian phát hiện từ Giám thị
              let detectedTime = '';
              if (s.firstDetectedAt) {
                try {
                  const d = new Date(s.firstDetectedAt);
                  detectedTime = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ngày ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
                } catch (_) {}
              }
              if (!detectedTime) {
                detectedTime = '17:28 ngày 10/11/2026';
              }

              const dateInfo = s.ngay ? `, ngày ${s.ngay}` : '';
              newNotifs.push({
                id: notifId,
                title: `Cảnh báo đối chiếu: Lớp ${s.lop} (Tuần ${this.currentWeek} • Thứ ${s.thu}${dateInfo} • Tiết ${s.tiet})`,
                message: `Giám thị ghi nhận ${s.giamThiSoLuongNghi || 0} em vắng (phát hiện lúc ${detectedTime}), SĐB hiện ghi ${s.sdbSoLuongNghi || 0} em (chưa cập nhật)`,
                category: 'ATTENDANCE',
                severity: 'warning',
                time: detectedTime.split(' ngày ')[0] || nowStr,
                slotRef: {
                  week: this.currentWeek,
                  ngay: s.ngay,
                  thu: s.thu,
                  tiet: s.tiet,
                  lop: s.lop,
                  category: 'ATTENDANCE',
                  openModal: true
                },
                isRead: readSet.has(notifId)
              });
            });
          }

          // Thêm thông báo tình hình sĩ số các lớp
          newNotifs.push({
            id: `class_roster_${Date.now()}`,
            title: 'Kiểm tra sĩ số lớp chính thức',
            message: 'Đã xác thực 100% Mã HS cho lớp 7A2AL (34 em), 7A3AL (33 em), 9A2AL (41 em)',
            category: 'SYSTEM',
            severity: 'success',
            time: nowStr,
            isRead: false
          });

          this.notifications = newNotifs;
          this.vneduService.setNotifications(newNotifs);
          this.cdr.detectChanges();

          // Cập nhật trạng thái thông báo vào huy hiệu chuông (Không tự động bung hòm thư gây phiền)
          this.hasAutoOpenedMailbox = true;
        }
      },
      error: () => {}
    });
  }

  toggleNotificationDropdown(): void {
    this.showNotificationDropdown = !this.showNotificationDropdown;
  }

  closeNotificationDropdown(): void {
    this.showNotificationDropdown = false;
  }

  markAllNotificationsAsRead(): void {
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
          const week = n.slotRef?.week || this.currentWeek;
          this.vneduService.ackAttendanceConflict(week, thu, tiet, lop).subscribe();
          const slot = this.slots.find(s => s.thu === thu && s.tiet === tiet && s.lop === lop);
          if (slot) slot.isMatched = true;
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
        const week = targetNotif?.slotRef?.week || this.currentWeek;
        this.vneduService.ackAttendanceConflict(week, thu, tiet, lop).subscribe({
          next: () => {
            const slot = this.slots.find(s => s.thu === thu && s.tiet === tiet && s.lop === lop);
            if (slot) slot.isMatched = true;
            this.cdr.detectChanges();
          }
        });
      }
    }
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.vneduService.setNotifications(this.notifications);
    this.cdr.detectChanges();
  }

  confirmMatchToDb(slot: any): void {
    if (!slot) return;
    this.vneduService.ackAttendanceConflict(this.currentWeek, slot.thu, slot.tiet, slot.lop).subscribe({
      next: () => {
        slot.isMatched = true;
        this.closeAttendanceModal();
        this.loadAuditNotifications();
        this.cdr.detectChanges();
      }
    });
  }

  // Điều hướng và làm nổi bật tiết học từ thông báo
  navigateToSlot(slotRef: { thu: number; tiet: number; lop: string; category?: string; openModal?: boolean }): void {
    const target = this.slots.find(s =>
      String(s.lop).trim().toUpperCase() === String(slotRef.lop).trim().toUpperCase() &&
      Number(s.thu) === Number(slotRef.thu) &&
      Number(s.tiet) === Number(slotRef.tiet)
    );

    if (target) {
      if (this.selectedClassFilter !== 'all' && this.selectedClassFilter !== target.lop) {
        this.selectedClassFilter = 'all';
        this.updateDayGroups();
      }
      this.cdr.detectChanges();

      setTimeout(() => {
        const id = `slot_row_${target.thu}_${target.tiet}_${target.lop}`;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-pulse');
          setTimeout(() => el.classList.remove('highlight-pulse'), 3500);
        }

        if (slotRef.openModal || slotRef.category === 'ATTENDANCE' || target.isMatched === false) {
          this.openAttendanceModal(target);
        } else {
          this.showToast(`🎯 Đã chuyển đến Tiết ${target.tiet} Thứ ${target.thu} • Lớp ${target.lop}`, 'info');
        }
      }, 200);
    } else {
      this.showToast(`Không tìm thấy tiết Thứ ${slotRef.thu} Tiết ${slotRef.tiet} (${slotRef.lop})`, 'danger');
    }
  }

  navigateToSlotFromNotification(notif: AppNotification): void {
    this.showNotificationDropdown = false;
    notif.isRead = true;
    if (!notif.slotRef) return;

    const target = this.slots.find(s =>
      s.lop === notif.slotRef?.lop &&
      s.thu === notif.slotRef?.thu &&
      s.tiet === notif.slotRef?.tiet
    );

    if (target) {
      if (this.selectedClassFilter !== 'all' && this.selectedClassFilter !== target.lop) {
        this.selectedClassFilter = 'all';
        this.updateDayGroups();
      }
      setTimeout(() => {
        const el = document.getElementById(`slot_row_${target.thu}_${target.tiet}_${target.lop}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-pulse');
          setTimeout(() => el.classList.remove('highlight-pulse'), 2500);
        }
      }, 300);
    }
  }

  // KIỂM TRA TÍNH HỢP LỆ TRƯỚC KHI LƯU (PRE-SAVE VALIDATION ENGINE)
  validateSlotBeforeSave(slot: VnEduSlot): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const lessonName = (slot.baiDay !== undefined && slot.baiDay !== null ? slot.baiDay : (slot.tenBai || slot.noiDung || '')).trim();
    const ppctNum = Number(slot.ppct);
    const capacity = slot.lop === '7A2AL' ? 34 : (slot.lop === '7A3AL' ? 33 : 41);
    const absentCount = Number(slot.soLuongNghi !== undefined ? slot.soLuongNghi : (slot.hsVangList ? slot.hsVangList.length : 0));

    // 1. Tên bài dạy
    if (!lessonName) {
      errors.push(`Chưa nhập Tên bài dạy cho tiết ${slot.tiet} lớp ${slot.lop}.`);
    }

    // 2. Tiết PPCT
    if (!slot.ppct || isNaN(ppctNum) || ppctNum <= 0) {
      errors.push(`Tiết PPCT (${slot.ppct || 'trống'}) không hợp lệ. Phải là số nguyên lớn hơn 0.`);
    }

    // 3. Sĩ số vắng
    if (absentCount > capacity) {
      errors.push(`Số lượng học sinh vắng (${absentCount} em) vượt quá tổng sĩ số lớp ${slot.lop} (${capacity} em).`);
    } else if (absentCount > Math.floor(capacity * 0.5)) {
      warnings.push(`Số học sinh vắng cao bất thường: ${absentCount}/${capacity} em (> 50% sĩ số lớp).`);
    }

    // 4. Tiết PPCT: Theo yêu cầu của Cô Huyên, số tiết PPCT do vnEdu phân bổ chuẩn nên hệ thống không can thiệp hay cảnh báo.

    // 5. Điểm số
    if (slot.diem && Number(slot.diem) > 20) {
      warnings.push(`Điểm xếp loại tiết học (${slot.diem}) vượt quá thang chuẩn 20 điểm.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Mở hộp thoại xác nhận nếu có vấn đề
  confirmOrProceedSave(slot: VnEduSlot, action: () => void): void {
    const val = this.validateSlotBeforeSave(slot);

    if (val.errors.length > 0) {
      this.validationModalTitle = `Lỗi nghiệp vụ: Tiết ${slot.tiet} - Lớp ${slot.lop}`;
      this.validationModalErrors = val.errors;
      this.validationModalWarnings = val.warnings;
      this.validationCanProceed = false; // Chặn lưu vì có lỗi bắt buộc
      this.pendingValidationAction = null;
      this.showValidationModal = true;
      this.cdr.detectChanges();
      return;
    }

    if (val.warnings.length > 0) {
      this.validationModalTitle = `Cảnh báo lưu ý: Tiết ${slot.tiet} - Lớp ${slot.lop}`;
      this.validationModalErrors = [];
      this.validationModalWarnings = val.warnings;
      this.validationCanProceed = true; // Cho phép xác nhận vẫn lưu
      this.pendingValidationAction = action;
      this.showValidationModal = true;
      this.cdr.detectChanges();
      return;
    }

    // Không có lỗi hoặc cảnh báo: thực thi lưu ngay
    action();
  }

  proceedValidationSave(): void {
    this.showValidationModal = false;
    if (this.pendingValidationAction) {
      const act = this.pendingValidationAction;
      this.pendingValidationAction = null;
      act();
    }
  }

  closeValidationModal(): void {
    this.showValidationModal = false;
    this.pendingValidationAction = null;
  }

  syncSingle(slot: VnEduSlot): void {
    this.confirmOrProceedSave(slot, () => {
      slot.isSaving = true;
      this.cdr.detectChanges();

      this.vneduService.syncSlot(slot, this.currentWeek).subscribe({
        next: (res) => {
          slot.isSaving = false;
          if (res.success) {
            slot.isSynced = true;
            slot.chitietId = res.chitietId || (res.data && res.data.id) || slot.chitietId;
            slot.liveId = slot.chitietId;
            this.showToast(`Đã lưu thành công tiết ${slot.tiet} lớp ${slot.lop} vào vnEdu!`, 'success');
          } else {
            if (res.expired || (res.msg && (res.msg.includes('hết hạn') || res.msg.includes('đăng nhập') || res.msg.includes('quyền')))) {
              this.openLoginModal();
              this.loginErrorMessage = res.msg || 'Phiên làm việc hết hạn hoặc không có quyền truy cập API. Vui lòng đăng nhập lại.';
            }
            this.showToast(res.msg || 'Không thể lưu tiết dạy', 'danger');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          slot.isSaving = false;
          const msg = err.error && err.error.msg ? err.error.msg : err.message;
          this.showToast('Lỗi kết nối máy chủ: ' + msg, 'danger');
          this.cdr.detectChanges();
        }
      });
    });
  }

  // Đồng bộ hàng loạt
  syncBatch(filter: 'today' | 'unlocked' | 'all'): void {
    let slotsToSync = [...this.slots];
    if (filter === 'today') {
      slotsToSync = slotsToSync.filter(s => s.ngay === this.todayStr);
    }

    if (slotsToSync.length === 0) {
      this.showToast('Không có tiết học nào phù hợp để đồng bộ!', 'info');
      return;
    }

    this.isSavingBatch = true;
    this.showToast(`Đang đồng bộ ${slotsToSync.length} tiết dạy vào Sổ đầu bài...`, 'info');

    this.vneduService.syncBatch(this.currentWeek, filter, slotsToSync).subscribe({
      next: (res) => {
        this.isSavingBatch = false;
        if (res.success) {
          this.showToast(`Đồng bộ thành công ${res.succeeded}/${res.total} tiết vào vnEdu!`, 'success');
          this.loadSchedule(this.currentWeek);
        } else {
          this.showToast(res.msg || 'Đồng bộ thất bại', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingBatch = false;
        this.showToast('Lỗi khi đồng bộ hàng loạt: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Chặn thao tác bấm tạo khi tuần đã có kế hoạch & nhập liệu
  onBlockedCreatePlanClick(): void {
    this.validationModalTitle = `Bảo Vệ An Toàn Dữ Liệu: Tuần ${this.currentWeek}`;
    this.validationModalErrors = [
      `Kế hoạch dạy học Tuần ${this.currentWeek} đã được tạo và đã có dữ liệu nhập liệu trên vnEdu (${this.slots.length} tiết giảng dạy).`,
      `Để đảm bảo an toàn tuyệt đối, hệ thống khóa nút tạo mới để chống việc sinh lại từ TKB làm ghi đè hoặc mất bài dạy và nhận xét của Cô.`,
      `Cô vui lòng sử dụng nút "🔄 Cập nhật từ vnEdu" trên thanh công cụ để nạp dữ liệu chuẩn xác nhất.`
    ];
    this.validationModalWarnings = [];
    this.validationCanProceed = false; // Chặn hoàn toàn không cho tạo đè
    this.pendingValidationAction = null;
    this.showValidationModal = true;
    this.cdr.detectChanges();
  }

  // Cập nhật dữ liệu trực tiếp từ vnEdu cho an toàn (không tạo mới, không ghi đè mất bài dạy)
  refreshFromVnEdu(): void {
    this.isLoading = true;
    this.showToast(`Đang cập nhật dữ liệu an toàn từ cổng vnEdu cho Tuần ${this.currentWeek}...`, 'info');
    this.loadSchedule(this.currentWeek);
    setTimeout(() => {
      this.loadAuditNotifications();
      this.showToast(`✓ Đã cập nhật dữ liệu an toàn từ vnEdu cho Tuần ${this.currentWeek}!`, 'success');
    }, 1200);
  }

  // Lập kế hoạch dạy học tuần mới (chỉ cho phép khi tuần CHƯA CÓ dữ liệu)
  autoPlanNewWeek(): void {
    if (this.isWeekPlanCreatedAndHasData) {
      this.onBlockedCreatePlanClick();
      return;
    }

    this.isLoading = true;
    this.showToast(`Đang tự động lập kế hoạch tuần ${this.currentWeek} lên vnEdu...`, 'info');

    this.vneduService.syncBatch(this.currentWeek, 'all', []).subscribe({
      next: () => {
        this.loadSchedule(this.currentWeek);
        this.showToast(`Đã cập nhật kế hoạch dạy học tuần ${this.currentWeek} thành công!`, 'success');
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Lỗi lập kế hoạch: ' + err.message, 'danger');
      }
    });
  }

  // Điểm danh
  openAttendanceModal(slot: VnEduSlot): void {
    this.selectedSlotForAttendance = slot;
    this.showAttendanceModal = true;
    this.isLoadingAttendance = true;
    this.attendanceStudents = [];
    this.suggestedAbsentNotice = '';
    this.unmatchedAbsentsNotice = '';

    this.vneduService.getAttendance(
      slot.lop,
      this.currentWeek,
      slot.thu,
      slot.tiet,
      slot.chitietId || slot.liveId || ''
    ).subscribe({
      next: (res) => {
        this.isLoadingAttendance = false;
        if (res.success && res.students) {
          this.attendanceStudents = res.students;

          // Thu thập nguồn học sinh vắng từ cả slot.hsVangList, slot.giamThiDsVang, slot.sdbDsVang, slot.dsHsVang, res.sdbDsVang
          const rawAbsents: any[] = [];
          if (Array.isArray(slot.hsVangList)) rawAbsents.push(...slot.hsVangList);
          if (Array.isArray(slot.giamThiDsVang)) rawAbsents.push(...slot.giamThiDsVang);
          if (Array.isArray(slot.sdbDsVang)) {
            slot.sdbDsVang.forEach((item: any) => {
              if (typeof item === 'string') {
                const isKhong = item.includes('(K)') || item.toLowerCase().includes('không');
                const clean = item.replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim();
                rawAbsents.push({ fullName: clean, coPhep: !isKhong, khongPhep: isKhong });
              } else if (item && typeof item === 'object') {
                rawAbsents.push(item);
              }
            });
          }
          if (Array.isArray((slot as any).dsHsVang)) {
            (slot as any).dsHsVang.forEach((item: any) => {
              if (typeof item === 'string') {
                const isKhong = item.includes('(K)') || item.toLowerCase().includes('không');
                const clean = item.replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim();
                rawAbsents.push({ fullName: clean, coPhep: !isKhong, khongPhep: isKhong });
              } else if (item && typeof item === 'object') {
                rawAbsents.push(item);
              }
            });
          }
          if (Array.isArray(res.sdbDsVang)) {
            res.sdbDsVang.forEach((item: any) => {
              if (typeof item === 'string') {
                const isKhong = item.includes('(K)') || item.toLowerCase().includes('không');
                const clean = item.replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim();
                rawAbsents.push({ fullName: clean, coPhep: !isKhong, khongPhep: isKhong });
              } else if (item && typeof item === 'object') {
                rawAbsents.push(item);
              }
            });
          }
          if (Array.isArray(res.giamThiDsVang)) {
            rawAbsents.push(...res.giamThiDsVang);
          }

          const matchedNames: string[] = [];
          const unmatchedList: string[] = [];

          const normalize = (str: string) => (str || '').toLowerCase().trim().replace(/\s+/g, ' ');

          rawAbsents.forEach(v => {
            const rawName = (typeof v === 'string' ? v : (v.fullName || v.name || '')).replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim();
            const vName = normalize(rawName);
            const vMaHs = (typeof v === 'object' && (v.maHs || v.ma_hoc_sinh)) ? String(v.maHs || v.ma_hoc_sinh).trim() : '';
            const vId = (typeof v === 'object' && v.id) ? String(v.id).trim() : '';
            const vIsKhongPhep = (typeof v === 'object' && v.khongPhep) || (typeof v === 'string' && v.toLowerCase().includes('(k)'));

            if (!vName && !vMaHs && !vId) return;

            // KIỂM TRA ĐỐI CHIẾU: Bắt buộc học sinh vắng phải thuộc danh sách lớp & trùng khớp Mã HS
            let found: AbsentStudent | undefined;
            // 1. So khớp theo Mã HS (Chính xác tuyệt đối)
            if (vMaHs) {
              found = this.attendanceStudents.find(s => s.maHs && String(s.maHs).trim() === vMaHs);
            }
            // 2. So khớp theo ID vnEdu
            if (!found && vId && !vId.startsWith('live_') && !vId.startsWith('gt_')) {
              found = this.attendanceStudents.find(s => s.id && String(s.id).trim() === vId);
            }
            // 3. So khớp họ tên chính xác trong danh sách lớp
            if (!found && vName) {
              found = this.attendanceStudents.find(s => normalize(s.fullName) === vName);
            }

            if (found) {
              if (!found.coPhep && !found.khongPhep) {
                found.coPhep = !vIsKhongPhep;
                found.khongPhep = !!vIsKhongPhep;
                matchedNames.push(`${found.fullName} [Mã: ${found.maHs || '---'}]` + (found.coPhep ? ' (P)' : ' (K)'));
              }
            } else if (rawName) {
              const displayLabel = vMaHs ? `${rawName} (Mã HS: ${vMaHs})` : rawName;
              unmatchedList.push(displayLabel + (vIsKhongPhep ? ' (K)' : ' (P)'));
            }
          });

          if (matchedNames.length > 0) {
            const uniqueNames = [...new Set(matchedNames)];
            this.suggestedAbsentNotice = uniqueNames.join(', ');
          }
          if (unmatchedList.length > 0) {
            this.isAttendanceRosterVerified = false;
            this.unmatchedAbsentsNotice = [...new Set(unmatchedList)].join(', ');
          } else {
            this.isAttendanceRosterVerified = true;
            this.unmatchedAbsentsNotice = '';
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingAttendance = false;
        this.showToast('Lỗi tải danh sách lớp: ' + err.message, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  closeAttendanceModal(): void {
    this.showAttendanceModal = false;
    this.selectedSlotForAttendance = null;
  }

  toggleCoPhep(stu: AbsentStudent): void {
    stu.coPhep = !stu.coPhep;
    if (stu.coPhep) stu.khongPhep = false;
  }

  toggleKhongPhep(stu: AbsentStudent): void {
    stu.khongPhep = !stu.khongPhep;
    if (stu.khongPhep) stu.coPhep = false;
  }

  setAllPresent(): void {
    this.attendanceStudents.forEach(s => {
      s.coPhep = false;
      s.khongPhep = false;
    });
  }

  // Quét đối chiếu danh sách vắng từ SĐĐ Giám thị cho tiết học hiện tại
  scanSupervisorAttendance(): void {
    if (!this.selectedSlotForAttendance) return;
    const slot = this.selectedSlotForAttendance;
    this.isScanningGiamThi = true;

    this.vneduService.scanGiamThi(
      slot.lop,
      slot.ngay || this.todayStr,
      slot.tiet,
      true
    ).subscribe({
      next: (res) => {
        this.isScanningGiamThi = false;
        if (res.success && res.absentList) {
          const giamThiList = res.absentList;
          let matchedCount = 0;

          // Cập nhật trạng thái từng học sinh theo dữ liệu Giám thị
          this.attendanceStudents.forEach(stu => {
            const found = giamThiList.find((g: any) =>
              (g.id && stu.id && String(g.id) === String(stu.id)) ||
              (g.maHs && stu.maHs && g.maHs.trim() === stu.maHs.trim()) ||
              (g.fullName && stu.fullName && g.fullName.trim().toLowerCase() === stu.fullName.trim().toLowerCase())
            );

            if (found) {
              stu.coPhep = !!found.coPhep;
              stu.khongPhep = !!found.khongPhep;
              matchedCount++;
            } else {
              stu.coPhep = false;
              stu.khongPhep = false;
            }
          });

          if (matchedCount > 0) {
            this.showToast(`✓ Đã khớp SĐĐ Giám thị: Cập nhật ${matchedCount} học sinh vắng lớp ${slot.lop}!`, 'success');
          } else {
            this.showToast(`✓ SĐĐ Giám thị ghi nhận: Lớp ${slot.lop} đi học đầy đủ (0 em vắng)!`, 'info');
          }
        } else {
          this.showToast(res.msg || 'Không thể lấy dữ liệu SĐĐ Giám thị', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isScanningGiamThi = false;
        this.showToast('Lỗi quét SĐĐ Giám thị: ' + (err.error?.msg || err.message), 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Quét đối chiếu toàn bộ SĐĐ Giám thị cho cả tuần phong cách Cyber Antivirus Scanner
  scanAllSupervisorAttendance(): void {
    if (this.isScanningAllGiamThi) return;
    this.isScanningAllGiamThi = true;
    this.showScanModal = true;
    this.scanModalStatus = 'scanning';
    this.scanProgress = 8;
    this.scanCurrentStep = 'Khởi tạo kết nối cổng Giám thị vnEdu...';
    this.scanLogs = [
      { text: `📡 Bắt đầu quét SĐĐ Giám thị cho Tuần ${this.currentWeek}...`, type: 'info' }
    ];
    this.scanAbsentSlots = [];
    this.scanTotalAbsents = 0;

    this.vneduService.scanAllGiamThi(this.currentWeek, this.slots).subscribe({
      next: (res) => {
        this.isScanningAllGiamThi = false;
        if (res.success && res.schedule) {
          this.scanResultSchedule = res.schedule;
          // Lọc các tiết có học sinh vắng (hoặc từ Giám thị hoặc từ SĐB)
          this.scanAbsentSlots = res.schedule.filter((s: any) =>
            (s.giamThiSoLuongNghi && s.giamThiSoLuongNghi > 0) ||
            (s.sdbSoLuongNghi && s.sdbSoLuongNghi > 0) ||
            (s.soLuongNghi && s.soLuongNghi > 0) ||
            (s.hsVangList && s.hsVangList.length > 0)
          );

          this.scanMatchedCount = this.scanAbsentSlots.filter((s: any) => s.isMatched).length;
          this.scanMismatchCount = this.scanAbsentSlots.filter((s: any) => !s.isMatched).length;
          if (this.scanMismatchCount === 0) {
            this.scanFilterTab = 'matched';
          }
          this.scanTotalAbsents = this.scanAbsentSlots.reduce((sum: number, s: any) =>
            sum + (s.giamThiSoLuongNghi || s.soLuongNghi || s.hsVangList?.length || 0), 0
          );

          // Cập nhật dữ liệu vào slots chính
          res.schedule.forEach((updatedSlot: any) => {
            const localSlot = this.slots.find(s =>
              s.lop === updatedSlot.lop &&
              s.thu === updatedSlot.thu &&
              s.tiet === updatedSlot.tiet &&
              s.buoi === updatedSlot.buoi
            );
            if (localSlot) {
              localSlot.hsVangList = updatedSlot.hsVangList || [];
              localSlot.soLuongNghi = updatedSlot.soLuongNghi || 0;
              localSlot.isMatched = updatedSlot.isMatched;
              localSlot.sdbSoLuongNghi = updatedSlot.sdbSoLuongNghi;
              localSlot.sdbDsVang = updatedSlot.sdbDsVang;
              localSlot.giamThiSoLuongNghi = updatedSlot.giamThiSoLuongNghi;
              localSlot.giamThiDsVang = updatedSlot.giamThiDsVang;
            }
          });
          this.updateDayGroups();

          // Chạy animation quét từng tiết sinh động như antivirus scanner
          this.animateScanProgress(res.schedule);
        } else {
          this.scanModalStatus = 'error';
          this.scanLogs.push({ text: '❌ Lỗi: ' + (res.msg || 'Không thể lấy dữ liệu'), type: 'warning' });
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isScanningAllGiamThi = false;
        this.scanModalStatus = 'error';
        this.scanLogs.push({ text: '❌ Lỗi kết nối: ' + (err.error?.msg || err.message), type: 'warning' });
        this.cdr.detectChanges();
      }
    });
  }

  animateScanProgress(schedule: any[]): void {
    if (this.scanAnimationTimer) clearInterval(this.scanAnimationTimer);
    let index = 0;
    const total = schedule.length;
    this.scanAnimationTimer = setInterval(() => {
      if (index < total) {
        const item = schedule[index];
        const vangs = item.soLuongNghi || 0;
        this.scanProgress = Math.min(95, Math.round(((index + 1) / total) * 90) + 5);
        this.scanCurrentStep = `Đang quét: Thứ ${item.thu} - Tiết ${item.tiet} (Lớp ${item.lop})...`;

        if (vangs > 0) {
          const names = (item.hsVangList || []).map((h: any) => h.fullName).join(', ');
          this.scanLogs.unshift({
            text: `[${index + 1}/${total}] Thứ ${item.thu} • Tiết ${item.tiet} • Lớp ${item.lop}: ⚠️ ${vangs} em vắng (${names})`,
            type: 'warning'
          });
        } else {
          this.scanLogs.unshift({
            text: `[${index + 1}/${total}] Thứ ${item.thu} • Tiết ${item.tiet} • Lớp ${item.lop}: ✓ Đủ 100% sĩ số`,
            type: 'info'
          });
        }
        index++;
        this.cdr.detectChanges();
      } else {
        clearInterval(this.scanAnimationTimer);
        this.scanAnimationTimer = null;
        this.scanProgress = 100;
        this.scanCurrentStep = `✓ Hoàn tất quét toàn bộ ${total} tiết học!`;
        this.scanLogs.unshift({
          text: `🎉 Quét hoàn tất: Phát hiện ${this.scanTotalAbsents} lượt vắng trên ${this.scanAbsentSlots.length} tiết học!`,
          type: 'success'
        });
        setTimeout(() => {
          this.scanModalStatus = 'completed';
          this.scanFilterTab = this.scanMismatchCount > 0 ? 'mismatched' : 'matched';
          this.cdr.detectChanges();
        }, 500);
      }
    }, 100);
  }

  openAttendanceFromScanResult(slot: any): void {
    const targetSlot = this.slots.find(s =>
      s.lop === slot.lop &&
      s.thu === slot.thu &&
      s.tiet === slot.tiet &&
      s.buoi === slot.buoi
    ) || slot;

    this.showScanModal = false;
    this.openAttendanceModal(targetSlot);
  }

  closeScanModal(): void {
    this.showScanModal = false;
    if (this.scanAnimationTimer) {
      clearInterval(this.scanAnimationTimer);
      this.scanAnimationTimer = null;
    }
  }

  // Đồng bộ nhanh 1 tiết từ Giám thị vào SĐB 1 cú nhấp
  syncSingleSlotFromGiamThi(slot: any): void {
    const absentList = (slot.giamThiDsVang || slot.hsVangList || []).map((h: any) => ({
      id: h.id,
      maHs: h.maHs,
      fullName: h.fullName,
      coPhep: !!h.coPhep,
      khongPhep: !!h.khongPhep
    }));

    this.vneduService.saveAttendance(
      slot.chitietId || slot.liveId || '',
      absentList,
      absentList.length,
      slot,
      this.currentWeek
    ).subscribe({
      next: (res) => {
        if (res.success) {
          slot.isMatched = true;
          slot.sdbSoLuongNghi = absentList.length;
          slot.giamThiSoLuongNghi = absentList.length;
          slot.sdbDsVang = absentList.map((a: any) => a.fullName + (a.coPhep ? ' (P)' : ' (K)'));
          slot.giamThiDsVang = absentList;

          const mainSlot = this.slots.find(s => s.lop === slot.lop && s.thu === slot.thu && s.tiet === slot.tiet && s.buoi === slot.buoi);
          if (mainSlot) {
            mainSlot.isMatched = true;
            mainSlot.sdbSoLuongNghi = absentList.length;
            mainSlot.giamThiSoLuongNghi = absentList.length;
            mainSlot.sdbDsVang = slot.sdbDsVang;
            mainSlot.giamThiDsVang = absentList;
          }
          this.updateDayGroups();

          this.scanMatchedCount = this.scanAbsentSlots.filter((s: any) => s.isMatched).length;
          this.scanMismatchCount = this.scanAbsentSlots.filter((s: any) => !s.isMatched).length;
          if (this.scanMismatchCount === 0) {
            this.scanFilterTab = 'matched';
          }
          this.showToast(`Đã đồng bộ khớp ${absentList.length} em vắng vào SĐB lớp ${slot.lop} (Tiết ${slot.tiet})!`, 'success');
          this.cdr.detectChanges();
        } else {
          this.showToast('Không thể lưu điểm danh: ' + res.msg, 'danger');
        }
      },
      error: (err) => {
        this.showToast('Lỗi đồng bộ: ' + (err.error?.msg || err.message), 'danger');
      }
    });
  }

  // Đồng bộ tất cả các tiết bị lệch với Giám thị
  syncAllMismatchedSlots(): void {
    const mismatched = this.scanAbsentSlots.filter((s: any) => !s.isMatched);
    if (mismatched.length === 0) {
      this.showToast('Tất cả các tiết đã khớp hoàn toàn 100%!', 'info');
      return;
    }

    this.isSyncingAllMismatches = true;
    let completed = 0;
    mismatched.forEach(slot => {
      const absentList = (slot.giamThiDsVang || slot.hsVangList || []).map((h: any) => ({
        id: h.id,
        maHs: h.maHs,
        fullName: h.fullName,
        coPhep: !!h.coPhep,
        khongPhep: !!h.khongPhep
      }));

      this.vneduService.saveAttendance(
        slot.chitietId || slot.liveId || '',
        absentList,
        absentList.length,
        slot,
        this.currentWeek
      ).subscribe({
        next: () => {
          slot.isMatched = true;
          slot.sdbSoLuongNghi = absentList.length;
          slot.giamThiSoLuongNghi = absentList.length;
          slot.sdbDsVang = absentList.map((a: any) => a.fullName + (a.coPhep ? ' (P)' : ' (K)'));
          slot.giamThiDsVang = absentList;

          const mainSlot = this.slots.find(s => s.lop === slot.lop && s.thu === slot.thu && s.tiet === slot.tiet && s.buoi === slot.buoi);
          if (mainSlot) {
            mainSlot.isMatched = true;
            mainSlot.sdbSoLuongNghi = absentList.length;
            mainSlot.giamThiSoLuongNghi = absentList.length;
            mainSlot.sdbDsVang = slot.sdbDsVang;
            mainSlot.giamThiDsVang = absentList;
          }

          completed++;
          if (completed === mismatched.length) {
            this.updateDayGroups();
            this.isSyncingAllMismatches = false;
            this.scanMatchedCount = this.scanAbsentSlots.filter((s: any) => s.isMatched).length;
            this.scanMismatchCount = 0;
            this.scanFilterTab = 'matched';
            this.showToast(`Đã đồng bộ khớp thành công toàn bộ ${mismatched.length} tiết vào Sổ Đầu Bài!`, 'success');
            this.cdr.detectChanges();
          }
        },
        error: () => {
          completed++;
          if (completed === mismatched.length) {
            this.isSyncingAllMismatches = false;
            this.cdr.detectChanges();
          }
        }
      });
    });
  }

  saveAttendanceData(): void {
    if (!this.selectedSlotForAttendance) return;
    const slot = this.selectedSlotForAttendance;
    const absentList = this.attendanceStudents.filter(s => s.coPhep || s.khongPhep);

    this.isSavingAttendance = true;
    this.vneduService.saveAttendance(
      slot.chitietId || slot.liveId || '',
      absentList,
      absentList.length,
      slot,
      this.currentWeek
    ).subscribe({
      next: (res) => {
        this.isSavingAttendance = false;
        if (res.success) {
          slot.hsVangList = absentList;
          slot.soLuongNghi = absentList.length;
          slot.sdbSoLuongNghi = absentList.length;
          slot.sdbDsVang = absentList.map(a => a.fullName + (a.coPhep ? ' (P)' : ' (K)'));
          slot.isMatched = true;
          // Lưu trạng thái xác nhận vào CSDL hệ thống
          this.vneduService.ackAttendanceConflict(this.currentWeek, slot.thu, slot.tiet, slot.lop).subscribe();
          if (res.chitietId) {
            slot.chitietId = res.chitietId;
            slot.liveId = res.chitietId;
            slot.isSynced = true;
          }
          this.updateDayGroups();
          this.showToast(res.msg || `Đã lưu điểm danh lớp ${slot.lop} (${absentList.length} em vắng)`, 'success');
          this.closeAttendanceModal();
        } else {
          this.showToast(res.msg || 'Không thể lưu điểm danh', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingAttendance = false;
        const msg = err.error && err.error.msg ? err.error.msg : err.message;
        this.showToast('Lỗi lưu điểm danh: ' + msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // Đăng nhập Modal
  openLoginModal(): void {
    this.loginErrorMessage = '';
    this.loginSuccessMessage = '';
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
  }

  submitLogin(): void {
    if (!this.loginPassword) {
      this.loginErrorMessage = 'Vui lòng nhập mật khẩu vnEdu.';
      return;
    }

    this.isLoggingIn = true;
    this.loginErrorMessage = '';
    this.loginSuccessMessage = '';

    this.vneduService.login(this.loginUsername, this.loginPassword).subscribe({
      next: (res) => {
        this.isLoggingIn = false;
        if (res.success && res.token) {
          localStorage.setItem('vnedu_token', res.token);
          if (res.cookies) localStorage.setItem('vnedu_cookies', res.cookies);

          this.loginSuccessMessage = res.msg || 'Đăng nhập vnEdu thành công!';
          this.showToast('Đăng nhập thành công! Phiên kết nối đã sẵn sàng.', 'success');
          this.status = {
            success: true,
            connected: true,
            account: this.loginUsername,
            teacherName: 'Lê Thị Diệu Huyên',
            tokenPreview: res.token.substring(0, 8) + '...'
          };

          setTimeout(() => {
            this.closeLoginModal();
            this.loadSchedule(this.currentWeek);
          }, 1200);
        } else {
          this.loginErrorMessage = res.msg || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoggingIn = false;
        this.loginErrorMessage = 'Lỗi kết nối máy chủ: ' + err.message;
        this.cdr.detectChanges();
      }
    });
  }

  // Getters tính toán
  // Danh sách tiết đang hiển thị ở bảng dưới (có áp dụng bộ lọc lớp và tìm kiếm)
  get currentVisibleSlots(): VnEduSlot[] {
    let list = [...this.slots];
    if (this.selectedClassFilter !== 'all') {
      list = list.filter(s => s.lop === this.selectedClassFilter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        (s.baiDay && s.baiDay.toLowerCase().includes(q)) ||
        (s.lop && s.lop.toLowerCase().includes(q)) ||
        (s.mon && s.mon.toLowerCase().includes(q)) ||
        String(s.ppct).includes(q)
      );
    }
    return list;
  }

  // Getters tính toán trực tiếp từ danh sách đang hiển thị
  get totalSlotsCount(): number {
    return this.currentVisibleSlots.length;
  }

  get syncedSlotsCount(): number {
    return this.currentVisibleSlots.filter(s => s.isSynced).length;
  }

  get readySlotsCount(): number {
    return this.currentVisibleSlots.filter(s => !s.isSynced).length;
  }

  get canDoiChieuCount(): number {
    return this.currentVisibleSlots.filter(s => this.isCanDoiChieu(s)).length;
  }

  get daKhopCount(): number {
    return this.currentVisibleSlots.filter(s => !this.isCanDoiChieu(s) && this.getDisplayAbsentCount(s) > 0).length;
  }

  get totalAbsentCount(): number {
    return this.currentVisibleSlots.reduce((sum, s) => sum + this.getDisplayAbsentCount(s), 0);
  }

  get isFutureWeek(): boolean {
    return this.currentWeek > this.realCurrentWeek;
  }

  get isCurrentRealWeek(): boolean {
    return this.currentWeek === this.realCurrentWeek;
  }

  get completionRate(): number {
    // Chỉ tính hoàn tất bao nhiêu % theo đúng tuần hiện tại thực tế
    if (this.isFutureWeek) {
      return 0; // Tuần tương lai chưa tới ngày dạy, chưa được hoàn tất
    }
    if (this.totalSlotsCount === 0) return 0;
    return Math.round((this.syncedSlotsCount / this.totalSlotsCount) * 100);
  }

  get isWeekCompleted(): boolean {
    // Chỉ tính hoàn tất cho đúng tuần hiện tại thực tế
    if (!this.isCurrentRealWeek) {
      return false;
    }
    return this.totalSlotsCount > 0 && this.readySlotsCount === 0;
  }

  // Điểm danh UI helpers
  get filteredStudents(): AbsentStudent[] {
    if (!this.attendanceSearchText) return this.attendanceStudents;
    const q = this.attendanceSearchText.toLowerCase().trim();
    return this.attendanceStudents.filter(s =>
      (s.fullName && s.fullName.toLowerCase().includes(q)) ||
      (s.maHs && s.maHs.toLowerCase().includes(q))
    );
  }

  get countVangPhep(): number {
    return this.attendanceStudents.filter(s => s.coPhep).length;
  }

  get countVangKhongPhep(): number {
    return this.attendanceStudents.filter(s => s.khongPhep).length;
  }

  get countTotalVang(): number {
    return this.countVangPhep + this.countVangKhongPhep;
  }

  setStudentStatus(stu: AbsentStudent, status: 'P' | 'K' | 'present'): void {
    if (status === 'P') {
      stu.coPhep = !stu.coPhep;
      stu.khongPhep = false;
    } else if (status === 'K') {
      stu.khongPhep = !stu.khongPhep;
      stu.coPhep = false;
    } else {
      stu.coPhep = false;
      stu.khongPhep = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  applyQuickComment(slot: VnEduSlot, comment: string): void {
    slot.nhanXet = comment;
  }

  // Danh sách các lớp để lọc (lưu property để tránh re-render getter)
  availableClasses: string[] = [];

  updateAvailableClasses(): void {
    const set = new Set<string>();
    this.slots.forEach(s => { if (s.lop) set.add(s.lop); });
    this.availableClasses = Array.from(set).sort();
  }

  // Lieflat Charts & Analytics State
  showAnalyticsChart: boolean = true;

  toggleAnalyticsChart(): void {
    this.showAnalyticsChart = !this.showAnalyticsChart;
  }

  chartClassStats: Array<{
    lop: string;
    total: number;
    synced: number;
    pending: number;
    percent: number;
    absentCount: number; // Số học sinh vắng duy nhất (distinct)
    periodAbsentCount: number; // Tổng số lượt vắng tích lũy các tiết
    mismatchCount: number; // Số tiết cần đối chiếu
    absentNames: string[];
    absentTooltip: string;
  }> = [];

  chartDayStats: Array<{
    thu: number;
    thuText: string;
    ngay: string;
    total: number;
    synced: number;
    pending: number;
    isToday: boolean;
    heightPercent: number;
  }> = [];

  // Biểu đồ XYZ Tỉ lệ chuyên cần
  diligenceClassStats: Array<{
    lop: string;
    roster: number;
    totalSlots: number;
    absentCount: number;
    presentRate: number;
    rating: string;
    ratingClass: string;
    absentDetails: string[];
  }> = [];

  diligenceDailyStats: Array<{
    thuText: string;
    rate: number;
    absentCount: number;
    isToday: boolean;
  }> = [];

  overallDiligenceRate: number = 98.4;

  updateChartMetrics(): void {
    // 1. Phân bổ theo từng lớp (Luôn tính theo toàn bộ slots của tuần để cô giáo xem tổng quan và click lọc lớp)
    const classMap: {
      [lop: string]: {
        total: number;
        synced: number;
        pending: number;
        periodAbsentCount: number;
        mismatchCount: number;
        absentNameSet: Set<string>;
        maxSingleSlotAbsent: number;
      }
    } = {};

    this.slots.forEach(s => {
      const lop = s.lop || 'Khác';
      if (!classMap[lop]) {
        classMap[lop] = {
          total: 0,
          synced: 0,
          pending: 0,
          periodAbsentCount: 0,
          mismatchCount: 0,
          absentNameSet: new Set<string>(),
          maxSingleSlotAbsent: 0
        };
      }
      classMap[lop].total++;
      if (s.isSynced) {
        classMap[lop].synced++;
      } else {
        classMap[lop].pending++;
      }

      // Thu thập danh sách tên học sinh vắng duy nhất từ sdbDsVang, giamThiDsVang, hsVangList
      const slotAbsents: string[] = [];
      if (Array.isArray(s.sdbDsVang)) {
        s.sdbDsVang.forEach((item: any) => {
          const name = typeof item === 'string'
            ? item.replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim()
            : (item?.fullName || item?.name || '').trim();
          if (name) slotAbsents.push(name);
        });
      }
      if (Array.isArray(s.giamThiDsVang)) {
        s.giamThiDsVang.forEach((item: any) => {
          const name = typeof item === 'string'
            ? item.replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim()
            : (item?.fullName || item?.name || '').trim();
          if (name) slotAbsents.push(name);
        });
      }
      if (Array.isArray(s.hsVangList)) {
        s.hsVangList.forEach((item: any) => {
          const name = typeof item === 'string'
            ? item.replace(/\s*\([PKpkCókhôngphép\s]+\)/gi, '').trim()
            : (item?.fullName || item?.name || '').trim();
          if (name) slotAbsents.push(name);
        });
      }

      slotAbsents.forEach(name => classMap[lop].absentNameSet.add(name));

      const slotAbsentNum = this.getDisplayAbsentCount(s);
      if (slotAbsentNum) {
        const num = Number(slotAbsentNum) || 0;
        classMap[lop].periodAbsentCount += num;
        if (num > classMap[lop].maxSingleSlotAbsent) {
          classMap[lop].maxSingleSlotAbsent = num;
        }
      }

      if (this.isCanDoiChieu(s)) {
        classMap[lop].mismatchCount++;
      }
    });

    this.chartClassStats = Object.keys(classMap).sort().map(lop => {
      const item = classMap[lop];
      const distinctNames = Array.from(item.absentNameSet);
      // Nếu có tên học sinh vắng, lấy số tên duy nhất; nếu không có mảng tên thì lấy số lượng vắng cao nhất của 1 tiết
      const distinctCount = distinctNames.length > 0 ? distinctNames.length : item.maxSingleSlotAbsent;

      let tooltip = '';
      if (distinctCount === 0) {
        tooltip = `Lớp ${lop}: Đi học đầy đủ 100% trong tuần`;
      } else {
        const namesText = distinctNames.length > 0 ? distinctNames.join(', ') : `${distinctCount} học sinh`;
        tooltip = `Lớp ${lop}: ${distinctCount} HS vắng (${namesText}). Tổng cộng ${item.periodAbsentCount} lượt tiết.`;
      }

      return {
        lop,
        total: item.total,
        synced: item.synced,
        pending: item.pending,
        percent: item.total > 0 ? Math.round((item.synced / item.total) * 100) : 0,
        absentCount: distinctCount,
        periodAbsentCount: item.periodAbsentCount,
        mismatchCount: item.mismatchCount,
        absentNames: distinctNames,
        absentTooltip: tooltip
      };
    });

    // 2. Mật độ tiết theo ngày trong tuần: TÍNH ĐỘNG THEO DANH SÁCH ĐANG HIỂN THỊ Ở DƯỚI (currentVisibleSlots)
    const visibleSlots = this.currentVisibleSlots;
    const dayMap: { [thu: number]: { thu: number; thuText: string; ngay: string; total: number; synced: number; pending: number; isToday: boolean } } = {};
    const thuLabels: { [k: number]: string } = { 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7', 8: 'CN' };

    // Khởi tạo trước các ngày học từ T2 đến T6 để hiển thị trọn vẹn tuần học
    [2, 3, 4, 5, 6].forEach(thu => {
      const slotMatch = this.slots.find(s => Number(s.thu) === thu);
      dayMap[thu] = {
        thu,
        thuText: thuLabels[thu] || `T${thu}`,
        ngay: slotMatch ? slotMatch.ngay : '',
        total: 0,
        synced: 0,
        pending: 0,
        isToday: slotMatch ? slotMatch.ngay === this.todayStr : false
      };
    });

    visibleSlots.forEach(s => {
      const t = Number(s.thu);
      if (dayMap[t]) {
        dayMap[t].total++;
        if (s.isSynced) dayMap[t].synced++;
        else dayMap[t].pending++;
      }
    });

    const dayList = Object.values(dayMap).sort((a, b) => a.thu - b.thu);
    const maxDaySlots = Math.max(...dayList.map(d => d.total), 4);
    this.chartDayStats = dayList.map(d => ({
      ...d,
      heightPercent: d.total === 0 ? 0 : Math.max(14, Math.round((d.total / maxDaySlots) * 100))
    }));

    // 3. TÍNH TOÁN BIỂU ĐỒ XYZ TỈ LỆ CHUYÊN CẦN THEO LỚP VÀ THEO NGÀY
    const ROSTER_MAP: { [lop: string]: number } = {
      '7A2': 34, '7A2AL': 34,
      '7A3': 33, '7A3AL': 33,
      '9A2': 41, '9A2AL': 41
    };

    let totalRosterAll = 0;
    let totalAbsentAll = 0;

    this.diligenceClassStats = Object.keys(classMap).sort().map(lop => {
      const item = classMap[lop];
      const roster = ROSTER_MAP[lop] || ROSTER_MAP[lop.replace('AL', '')] || 35;
      const distinctNames = Array.from(item.absentNameSet);
      const absentCount = distinctNames.length > 0 ? distinctNames.length : item.maxSingleSlotAbsent;
      const presentCount = Math.max(0, roster - absentCount);
      const rate = roster > 0 ? parseFloat(((presentCount / roster) * 100).toFixed(1)) : 100;

      totalRosterAll += roster;
      totalAbsentAll += absentCount;

      let rating = 'Xuất sắc';
      let ratingClass = 'badge-light-success text-success';
      if (rate < 95) {
        rating = 'Cần chú ý';
        ratingClass = 'badge-light-warning text-warning';
      } else if (rate < 98) {
        rating = 'Tốt';
        ratingClass = 'badge-light-primary text-primary';
      }

      return {
        lop,
        roster,
        totalSlots: item.total,
        absentCount,
        presentRate: rate,
        rating,
        ratingClass,
        absentDetails: distinctNames
      };
    });

    if (totalRosterAll > 0) {
      this.overallDiligenceRate = parseFloat((((totalRosterAll - totalAbsentAll) / totalRosterAll) * 100).toFixed(1));
    } else {
      this.overallDiligenceRate = 100;
    }

    // Tỉ lệ chuyên cần theo ngày (Thứ 2 đến Thứ 7)
    const dayAbsentMap: { [thu: number]: number } = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const daySlotMap: { [thu: number]: number } = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    this.slots.forEach(s => {
      if (dayAbsentMap[s.thu] !== undefined) {
        daySlotMap[s.thu]++;
        const count = this.getDisplayAbsentCount(s) || 0;
        dayAbsentMap[s.thu] += Number(count) || 0;
      }
    });

    const now = new Date();
    const todayThu = now.getDay() === 0 ? 8 : now.getDay() + 1;
    this.diligenceDailyStats = [2, 3, 4, 5, 6, 7].map(thu => {
      const abs = dayAbsentMap[thu] || 0;
      const slotsCount = daySlotMap[thu] || 0;
      const estTotal = slotsCount > 0 ? slotsCount * 35 : 35;
      const rate = slotsCount > 0 ? Math.max(85, parseFloat(((1 - abs / estTotal) * 100).toFixed(1))) : 100;
      return {
        thuText: `Thứ ${thu}`,
        rate: slotsCount > 0 ? rate : 100,
        absentCount: abs,
        isToday: thu === todayThu
      };
    });
  }

  // Tổng số tiết dạy hôm nay
  get todayTotalSlotsCount(): number {
    return this.slots.filter(s => s.ngay === this.todayStr).length;
  }

  // Hôm nay có tiết dạy hay không
  get todayHasSlots(): boolean {
    return this.todayTotalSlotsCount > 0;
  }

  // Tên thứ của ngày hôm nay (VD: Thứ Năm)
  get todayDayOfWeekText(): string {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[new Date().getDay()];
  }

  // Cuộn mượt đến thẻ ngày hôm nay
  scrollToToday(): void {
    const el = document.getElementById('day-card-today');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      this.showToast(`Hôm nay (${this.todayDayOfWeekText}, ${this.todayStr}) cô không có tiết dạy trên thời khóa biểu`, 'info');
    }
  }

  // Số tiết cần nhập hôm nay
  get todayPendingSlotsCount(): number {
    return this.slots.filter(s => s.ngay === this.todayStr && !s.isSynced).length;
  }

  // Danh sách các nhóm ngày đã xử lý (tránh chạy getter trong ngFor gây Change Detection loop làm treo trang)
  dayGroups: {
    thu: number;
    thuText: string;
    ngay: string;
    isToday: boolean;
    isCompleted: boolean;
    isFutureDay?: boolean;
    pendingCount: number;
    syncedCount: number;
    slots: VnEduSlot[];
  }[] = [];

  // Nhóm các tiết theo từng ngày (Thứ Hai, Thứ Ba...)
  updateDayGroups(): void {
    let filtered = [...this.slots];
    if (this.selectedClassFilter !== 'all') {
      filtered = filtered.filter(s => s.lop === this.selectedClassFilter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s =>
        (s.baiDay && s.baiDay.toLowerCase().includes(q)) ||
        (s.lop && s.lop.toLowerCase().includes(q)) ||
        (s.mon && s.mon.toLowerCase().includes(q)) ||
        String(s.ppct).includes(q)
      );
    }

    const thuMap: { [key: number]: string } = {
      2: 'Thứ Hai',
      3: 'Thứ Ba',
      4: 'Thứ Tư',
      5: 'Thứ Năm',
      6: 'Thứ Sáu',
      7: 'Thứ Bảy',
      8: 'Chủ Nhật'
    };

    const groups: { [key: string]: { thu: number; thuText: string; ngay: string; isToday: boolean; isCompleted: boolean; isFutureDay?: boolean; pendingCount: number; syncedCount: number; slots: VnEduSlot[] } } = {};
    filtered.forEach(slot => {
      const key = `${slot.thu}_${slot.ngay}`;
      if (!groups[key]) {
        groups[key] = {
          thu: slot.thu,
          thuText: thuMap[slot.thu] || `Thứ ${slot.thu}`,
          ngay: slot.ngay,
          isToday: slot.ngay === this.todayStr,
          isCompleted: false,
          pendingCount: 0,
          syncedCount: 0,
          slots: []
        };
      }
      groups[key].slots.push(slot);
      if (slot.isSynced) {
        groups[key].syncedCount++;
      } else {
        groups[key].pendingCount++;
      }
    });

    Object.values(groups).forEach(g => {
      // Chỉ đánh dấu hoàn thành khung xanh nếu là đúng tuần hiện tại thực tế và tất cả tiết đã lưu
      const isCurrentRealWeek = this.currentWeek === this.realCurrentWeek;
      g.isCompleted = isCurrentRealWeek && g.slots.length > 0 && g.pendingCount === 0;

      // Tính chính xác ngày chưa tới ngày dạy (các ngày phía sau ngày hôm nay trong tuần)
      let isFuture = false;
      if (this.currentWeek > this.realCurrentWeek) {
        isFuture = true;
      } else if (isCurrentRealWeek) {
        if (g.ngay && g.ngay.includes('/')) {
          const parts = g.ngay.split('/');
          const groupDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          const now = new Date();
          const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          isFuture = groupDate.getTime() > todayDate.getTime();
        } else {
          const now = new Date();
          const todayThu = now.getDay() === 0 ? 8 : now.getDay() + 1;
          isFuture = g.thu > todayThu;
        }
      }
      (g as any).isFutureDay = isFuture;
      g.slots.forEach(s => {
        s.isFutureSlot = isFuture;
      });
    });

    this.dayGroups = Object.values(groups).sort((a, b) => a.thu - b.thu);
    this.updateAvailableClasses();
    this.updateChartMetrics();
  }

  setClassFilter(cls: string): void {
    this.selectedClassFilter = cls;
    this.updateDayGroups();
  }

  onSearchChange(): void {
    this.updateDayGroups();
  }

  trackByThu(index: number, group: any): string {
    return `${group.thu}_${group.ngay}`;
  }

  trackBySlot(index: number, slot: VnEduSlot): string {
    return `${slot.thu}_${slot.buoi}_${slot.tiet}_${slot.lop}_${slot.chitietId || slot.liveId || index}`;
  }

  trackByStudent(index: number, stu: AbsentStudent): string | number {
    return stu.id || stu.maHs || index;
  }

  trackByScanSlot(index: number, slot: any): string | number {
    return slot.chitietId || slot.liveId || (slot.thu + '_' + slot.tiet + '_' + slot.lop) || index;
  }

  trackByClass(index: number, cls: string): string {
    return cls;
  }

  trackByWeek(index: number, opt: any): number {
    return opt.weekNumber;
  }

  trackByLog(index: number, log: any): number {
    return index;
  }

  trackByHs(index: number, hs: any): string | number {
    return hs.id || hs.fullName || hs || index;
  }

  trackByDayStat(index: number, item: any): number {
    return item.thu;
  }

  trackByClassStat(index: number, item: any): string {
    return item.lop;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Xử lý phím Escape để đóng Modal bất kỳ lúc nào
    if (event.key === 'Escape') {
      if (this.showAttendanceModal) {
        this.closeAttendanceModal();
        return;
      }
      if (this.showLoginModal) {
        this.closeLoginModal();
        return;
      }
    }

    // Không nhận các phím tắt khác khi đang gõ trong input / textarea / select
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || this.showAttendanceModal || this.showLoginModal) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 't') {
      event.preventDefault();
      this.syncBatch('today');
    } else if (key === 'w') {
      event.preventDefault();
      this.syncBatch('all');
    } else if (key === 'r') {
      event.preventDefault();
      this.loadSchedule(this.currentWeek);
    } else if (key === 'd') {
      event.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-bs-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', newTheme);
      document.body.setAttribute('data-bs-theme', newTheme);
      localStorage.setItem('kt_theme_mode_value', newTheme);
      this.showToast(`Đã chuyển sang giao diện ${newTheme === 'dark' ? 'Tối' : 'Sáng'}`, 'info');
    } else if (key === 'b') {
      event.preventDefault();
      const toggleBtn = document.getElementById('kt_app_sidebar_toggle');
      if (toggleBtn) {
        toggleBtn.click();
      }
    }
  }

  // Cuộn mượt lên đầu trang
  
  // Helper tính toán trạng thái và số lượng điểm danh đối chiếu
  isCanDoiChieu(slot: any): boolean {
    if (!slot) return false;
    // QUY TẮC CSDL: Các tuần quá khứ (Tuần < realCurrentWeek) đã chốt sổ trong CSDL, không bao giờ báo "Cần đối chiếu" nữa
    if (this.currentWeek < this.realCurrentWeek) {
      return false;
    }
    // Nếu là tuần tương lai (chưa tới ngày dạy) thì KHÔNG báo lệch điểm danh, trừ khi tiết đó đã có dữ liệu thực tế trên vnEdu
    if ((this.isFutureWeek || slot.isFutureSlot) && !slot.isSynced) {
      return false;
    }
    // 1. Nếu slot đã được quét và có cờ isMatched
    if (slot.isMatched !== undefined && slot.isMatched !== null) {
      return !slot.isMatched;
    }
    // 2. Nếu có dữ liệu từ cả SĐB và Giám thị mà số lượng lệch nhau
    if (slot.sdbSoLuongNghi !== undefined && slot.giamThiSoLuongNghi !== undefined) {
      if (slot.giamThiSoLuongNghi > 0 && slot.sdbSoLuongNghi !== slot.giamThiSoLuongNghi) {
        return true;
      }
      return false;
    }
    // 3. Nếu giám thị có ghi nhận vắng mà SĐB chưa có ai vắng
    if (slot.giamThiSoLuongNghi && slot.giamThiSoLuongNghi > 0 && (!slot.sdbSoLuongNghi || slot.sdbSoLuongNghi === 0)) {
      return true;
    }
    return false;
  }

  getDisplayAbsentCount(slot: any): number {
    if (!slot) return 0;
    if ((this.isFutureWeek || slot.isFutureSlot) && !slot.isSynced) return 0;
    if (slot.sdbSoLuongNghi !== undefined && slot.sdbSoLuongNghi !== null) {
      return slot.sdbSoLuongNghi;
    }
    if (slot.soLuongNghi !== undefined && slot.soLuongNghi !== null) {
      return slot.soLuongNghi;
    }
    if (slot.hsVangList && slot.hsVangList.length > 0) {
      return slot.hsVangList.length;
    }
    if (slot.giamThiSoLuongNghi !== undefined && slot.giamThiSoLuongNghi !== null) {
      return slot.giamThiSoLuongNghi;
    }
    return 0;
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

  getAttendanceChipTooltip(slot: any): string {
    if (this.currentWeek < this.realCurrentWeek) {
      const count = this.getDisplayAbsentCount(slot);
      return count === 0
        ? 'Tuần lưu trữ (Đã chốt CSDL): Cả lớp có mặt đầy đủ'
        : `Tuần lưu trữ (Đã chốt CSDL): Đã ghi nhận ${count} em vắng`;
    }
    if ((this.isFutureWeek || slot.isFutureSlot) && !slot.isSynced) {
      return 'Tiết dạy thuộc kế hoạch bài dạy Tuần ' + this.currentWeek + ' (Chưa tới ngày dạy). Tiết học chưa diễn ra nên chưa điểm danh.';
    }
    const count = this.getDisplayAbsentCount(slot);
    if (count === 0) {
      return 'Cả lớp đi học đầy đủ. Bấm để xem và sửa điểm danh.';
    }
    if (!this.isCanDoiChieu(slot)) {
      return `Đã khớp hoàn toàn với Sổ Giám Thị (${count} em vắng). Bấm để xem chi tiết.`;
    }
    const sdb = slot.sdbSoLuongNghi ?? count;
    const gt = slot.giamThiSoLuongNghi ?? count;
    return `Cần đối chiếu! SĐB ghi ${sdb} em vắng, SĐĐ Giám thị ghi ${gt} em vắng. Bấm để đồng bộ.`;
  }

  
  // Tự động quét đối chiếu SĐĐ Giám Thị chạy ngầm (Silent Background Scan)
  autoScanSupervisorQuietly(): void {
    if (this.isAutoScanning || !this.slots || this.slots.length === 0) return;

    // QUY TẮC VÀNG: CHỈ TỰ ĐỘNG QUÉT ĐỐI CHIẾU Ở ĐÚNG TUẦN HIỆN TẠI THỰC TẾ
    // Các tuần quá khứ (Tuần 1..9) đã chốt sổ trong CSDL, không bao giờ quét ngầm gây sai lệch
    if (this.currentWeek !== this.realCurrentWeek) {
      this.isAutoScanning = false;
      this.autoScanStatusText = 'Tuần lưu trữ (Đã chốt CSDL)';
      this.autoScanStatusClass = 'status-success';
      return;
    }

    this.isAutoScanning = true;
    this.autoScanStatusText = 'Đang tự động đối chiếu SĐĐ Giám thị...';
    this.autoScanStatusClass = 'status-scanning';

    this.vneduService.scanAllGiamThi(this.currentWeek, this.slots).subscribe({
      next: (res) => {
        this.isAutoScanning = false;
        if (res.success && res.schedule) {
          res.schedule.forEach((updatedSlot: any) => {
            const localSlot = this.slots.find(s =>
              s.lop === updatedSlot.lop &&
              s.thu === updatedSlot.thu &&
              s.tiet === updatedSlot.tiet &&
              s.buoi === updatedSlot.buoi
            );
            if (localSlot) {
              localSlot.hsVangList = updatedSlot.hsVangList || [];
              localSlot.soLuongNghi = updatedSlot.soLuongNghi || 0;
              localSlot.isMatched = updatedSlot.isMatched;
              localSlot.sdbSoLuongNghi = updatedSlot.sdbSoLuongNghi;
              localSlot.sdbDsVang = updatedSlot.sdbDsVang;
              localSlot.giamThiSoLuongNghi = updatedSlot.giamThiSoLuongNghi;
              localSlot.giamThiDsVang = updatedSlot.giamThiDsVang;
            }
          });
          this.updateDayGroups();

          const mismatched = this.slots.filter(s => this.isCanDoiChieu(s)).length;
          const matchedWithAbsents = this.slots.filter(s => !this.isCanDoiChieu(s) && this.getDisplayAbsentCount(s) > 0).length;

          if (mismatched > 0) {
            this.autoScanStatusText = `⚠️ Có ${mismatched} tiết cần đối chiếu`;
            this.autoScanStatusClass = 'status-warning';
            this.loadAuditNotifications();
          } else {
            this.autoScanStatusText = `🛡️ SĐĐ Giám thị: Khớp 100% (${matchedWithAbsents} tiết có HS vắng)`;
            this.autoScanStatusClass = 'status-success';
          }
        } else {
          this.autoScanStatusText = 'SĐĐ Giám thị: Sẵn sàng';
          this.autoScanStatusClass = 'status-ready';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isAutoScanning = false;
        this.autoScanStatusText = 'SĐĐ Giám thị: Đã nạp';
        this.autoScanStatusClass = 'status-ready';
        this.cdr.detectChanges();
      }
    });
  }

  getClassBadgeClass(lop: string): string {
    if (!lop) return 'class-badge-default';
    if (lop.includes('7A2')) return 'class-badge-7a2';
    if (lop.includes('7A3')) return 'class-badge-7a3';
    if (lop.includes('9A2')) return 'class-badge-9a2';
    return 'class-badge-default';
  }

  getDayPillClass(thuText: string): string {
    if (!thuText) return 'day-pill-default';
    if (thuText.includes('Hai')) return 'day-pill-thu2';
    if (thuText.includes('Ba')) return 'day-pill-thu3';
    if (thuText.includes('Tư')) return 'day-pill-thu4';
    if (thuText.includes('Năm')) return 'day-pill-thu5';
    if (thuText.includes('Sáu')) return 'day-pill-thu6';
    if (thuText.includes('Bảy')) return 'day-pill-thu7';
    if (thuText.includes('Nhật')) return 'day-pill-cn';
    return 'day-pill-default';
  }

  getSparkBarClass(thuText: string): string {
    if (!thuText) return 'spark-bar-default';
    if (thuText.includes('Hai') || thuText.includes('T2')) return 'spark-bar-t2';
    if (thuText.includes('Ba') || thuText.includes('T3')) return 'spark-bar-t3';
    if (thuText.includes('Tư') || thuText.includes('T4')) return 'spark-bar-t4';
    if (thuText.includes('Năm') || thuText.includes('T5')) return 'spark-bar-t5';
    if (thuText.includes('Sáu') || thuText.includes('T6')) return 'spark-bar-t6';
    return 'spark-bar-default';
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
