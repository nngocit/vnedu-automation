import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { VnEduService } from '../../services/vnedu.service';

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  time: string;
  model?: string;
  isGemini?: boolean;
  quickActions?: Array<{
    type: string;
    slotRef?: { thu: number; tiet: number; lop: string };
    label: string;
  }>;
}

@Component({
  selector: 'app-ai-assistant-widget',
  templateUrl: './ai-assistant-widget.component.html',
  styleUrls: ['./ai-assistant-widget.component.scss'],
  standalone: false
})
export class AiAssistantWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() currentWeek: number = 9;
  @Input() slots: any[] = [];
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  isOpen = false;
  isLoading = false;
  userInput = '';
  shouldScrollToBottom = false;

  messages: ChatMessage[] = [];
  suggestions: string[] = [
    'Hôm nay cô dạy tiết nào?',
    'Tiết nào chưa lưu vnEdu?',
    'Có tiết nào lệch Giám thị không?',
    'Sĩ số các lớp & ai vắng',
    'Nhắc việc tuần này'
  ];

  summaryData: any = null;
  unreadReminders = 0;

  private sub = new Subscription();

  constructor(
    private vneduService: VnEduService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Lắng nghe trạng thái mở/đóng từ service (Ví dụ bấm từ Navbar)
    this.sub.add(
      this.vneduService.isAiChatOpen$.subscribe((open) => {
        this.isOpen = open;
        if (open && this.messages.length === 0) {
          this.initWelcomeMessage();
        }
        this.cdr.detectChanges();
      })
    );

    // Nạp tóm tắt ban đầu để tính số nhắc việc cần chú ý
    this.loadSummary();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  toggleChat(): void {
    this.vneduService.toggleAiChat();
  }

  closeChat(): void {
    this.vneduService.toggleAiChat(false);
  }

  loadSummary(): void {
    this.vneduService.getAiSummary(this.currentWeek).subscribe({
      next: (res) => {
        if (res.success) {
          this.summaryData = res;
          this.unreadReminders = (res.unsyncedCount || 0) + (res.missingLessonCount || 0);
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  initWelcomeMessage(): void {
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const unsynced = this.summaryData ? this.summaryData.unsyncedCount : 0;
    const total = this.summaryData ? this.summaryData.totalSlots : 14;
    const synced = this.summaryData ? this.summaryData.syncedSlots : 14;

    const welcomeText =
      `Dạ em chào **Cô Lê Thị Diệu Huyên**! Em là **Trợ lý AI vnEdu** sẵn sàng đồng hành cùng Cô tại trường THCS An Lập. 🌸\n\n` +
      `📌 **Điểm tin Tuần ${this.currentWeek}:**\n` +
      `• Đã lưu vnEdu: **${synced}/${total}** tiết\n` +
      `• Còn cần lưu: **${unsynced}** tiết\n\n` +
      `Cô có thể bấm vào các gợi ý nhanh bên dưới hoặc gõ câu hỏi bất kỳ để em tra cứu và nhắc việc cho Cô nhé!`;

    this.messages = [
      {
        id: 'welcome_' + Date.now(),
        role: 'ai',
        text: welcomeText,
        time: nowStr
      }
    ];
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();
  }

  sendMessage(presetText?: string): void {
    const textToSend = (presetText || this.userInput || '').trim();
    if (!textToSend || this.isLoading) return;

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Đẩy tin nhắn của giáo viên
    this.messages.push({
      id: 'user_' + Date.now(),
      role: 'user',
      text: textToSend,
      time: nowStr
    });

    this.userInput = '';
    this.isLoading = true;
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();

    // Gửi lên server
    this.vneduService.sendAiChat(textToSend, this.currentWeek, this.messages, this.slots).subscribe({
      next: (res) => {
        this.isLoading = false;
        const aiTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        if (res.success && res.reply) {
          this.messages.push({
            id: 'ai_' + Date.now(),
            role: 'ai',
            text: res.reply,
            time: aiTime,
            model: res.model,
            isGemini: res.isGemini,
            quickActions: res.quickActions || []
          });

          if (res.suggestions && Array.isArray(res.suggestions) && res.suggestions.length > 0) {
            this.suggestions = res.suggestions;
          }
        } else {
          this.messages.push({
            id: 'ai_' + Date.now(),
            role: 'ai',
            text: 'Dạ hệ thống đang bận một chút, Cô vui lòng thử lại nhé ạ.',
            time: aiTime
          });
        }

        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        const aiTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        this.messages.push({
          id: 'ai_' + Date.now(),
          role: 'ai',
          text: 'Dạ kết nối máy chủ bị gián đoạn, Cô vui lòng kiểm tra lại mạng hoặc thử lại sau nhé ạ.',
          time: aiTime
        });
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
      }
    });
  }

  handleQuickAction(action: any): void {
    if (action.type === 'NAVIGATE_SLOT' && action.slotRef) {
      // Kích hoạt cuộn và highlight dòng tiết học trên bảng SĐB
      this.vneduService.triggerNavigateToSlot(action.slotRef);
      // Tự động thu nhỏ chat để giáo viên nhìn thấy dòng tiết học
      // (Không đóng hẳn để Cô có thể mở lại khi cần)
    }
  }

  clearHistory(): void {
    this.messages = [];
    this.initWelcomeMessage();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  formatMarkdown(text: string): string {
    if (!text) return '';
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headers ### Title
    formatted = formatted.replace(/^### (.*?)$/gm, '<h6 class="fw-bold text-primary mt-2.5 mb-1.5">$1</h6>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h5 class="fw-bold text-dark mt-3 mb-2">$1</h5>');
    formatted = formatted.replace(/^# (.*?)$/gm, '<h4 class="fw-bolder text-dark mt-3.5 mb-2.5">$1</h4>');

    // Horizontal rule ---
    formatted = formatted.replace(/^---$/gm, '<hr class="my-2 border-secondary border-opacity-25"/>');

    // Bold **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    formatted = formatted.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>');

    // Inline code `code`
    formatted = formatted.replace(/`([^`\n]+)`/g, '<code class="bg-light px-1.5 py-0.5 rounded text-indigo fw-semibold">$1</code>');

    // Toán học & Ký hiệu hình học phổ biến cho GV Toán
    formatted = formatted
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\triangle/g, '△')
      .replace(/\\approx/g, '≈')
      .replace(/\\neq/g, '≠')
      .replace(/\\le(?:q)?\b/g, '≤')
      .replace(/\\ge(?:q)?\b/g, '≥')
      .replace(/\\times/g, '×')
      .replace(/\\pm/g, '±')
      .replace(/\\circ/g, '°')
      .replace(/\$([^\$\n]+)\$/g, '<span class="fw-semibold text-primary">$1</span>');

    // Bullet points * item hoặc - item (hỗ trợ cả lùi đầu dòng)
    formatted = formatted.replace(/^(\s*)[*-] (.+)$/gm, (match, spaces, content) => {
      const indent = spaces.length > 2 ? '&nbsp;&nbsp;&nbsp;&nbsp;◦ ' : '• ';
      return indent + content;
    });

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br/>');

    return formatted;
  }
}
