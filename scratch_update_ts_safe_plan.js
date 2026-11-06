const fs = require('fs');

const tsPaths = [
  'H:/2026/App/Huyen/app-web/src/app/pages/vnedu/so-dau-bai/so-dau-bai.component.ts',
  'H:/2026/App/APP WEB/src/app/pages/vnedu/so-dau-bai/so-dau-bai.component.ts'
];

for (const p of tsPaths) {
  let content = fs.readFileSync(p, 'utf8');

  // 1. Add isWeekPlanCreatedAndHasData getter
  if (!content.includes('isWeekPlanCreatedAndHasData')) {
    const target = 'get displayScanSlots(): any[] {';
    const addition = `  // Kiểm tra tuần hiện tại đã có kế hoạch và đã có nhập liệu hay chưa
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

  `;
    content = content.replace(target, addition + target);
  }

  // 2. Add refreshFromVnEdu and onBlockedCreatePlanClick methods, update autoPlanNewWeek
  if (!content.includes('refreshFromVnEdu()')) {
    const oldAutoPlan = `  // Lập kế hoạch dạy học tuần mới
  autoPlanNewWeek(): void {
    this.isLoading = true;
    this.showToast(\`Đang tự động lập kế hoạch tuần \${this.currentWeek} lên vnEdu...\`, 'info');

    this.vneduService.syncBatch(this.currentWeek, 'all', []).subscribe({
      next: () => {
        this.loadSchedule(this.currentWeek);
        this.showToast(\`Đã cập nhật kế hoạch dạy học tuần \${this.currentWeek} thành công!\`, 'success');
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Lỗi lập kế hoạch: ' + err.message, 'danger');
      }
    });
  }`;

    const newAutoPlan = `  // Chặn thao tác bấm tạo khi tuần đã có kế hoạch & nhập liệu
  onBlockedCreatePlanClick(): void {
    this.validationModalTitle = \`Bảo Vệ An Toàn Dữ Liệu: Tuần \${this.currentWeek}\`;
    this.validationModalErrors = [
      \`Kế hoạch dạy học Tuần \${this.currentWeek} đã được tạo và đã có dữ liệu nhập liệu trên vnEdu (\${this.slots.length} tiết giảng dạy).\`,
      \`Để đảm bảo an toàn tuyệt đối, hệ thống khóa nút tạo mới để chống việc sinh lại từ TKB làm ghi đè hoặc mất bài dạy và nhận xét của Cô.\`,
      \`Cô vui lòng sử dụng nút "🔄 Cập nhật từ vnEdu" trên thanh công cụ để nạp dữ liệu chuẩn xác nhất.\`
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
    this.showToast(\`Đang cập nhật dữ liệu an toàn từ cổng vnEdu cho Tuần \${this.currentWeek}...\`, 'info');
    this.loadSchedule(this.currentWeek);
    setTimeout(() => {
      this.loadAuditNotifications();
      this.showToast(\`✓ Đã cập nhật dữ liệu an toàn từ vnEdu cho Tuần \${this.currentWeek}!\`, 'success');
    }, 1200);
  }

  // Lập kế hoạch dạy học tuần mới (chỉ cho phép khi tuần CHƯA CÓ dữ liệu)
  autoPlanNewWeek(): void {
    if (this.isWeekPlanCreatedAndHasData) {
      this.onBlockedCreatePlanClick();
      return;
    }

    this.isLoading = true;
    this.showToast(\`Đang tự động lập kế hoạch tuần \${this.currentWeek} lên vnEdu...\`, 'info');

    this.vneduService.syncBatch(this.currentWeek, 'all', []).subscribe({
      next: () => {
        this.loadSchedule(this.currentWeek);
        this.showToast(\`Đã cập nhật kế hoạch dạy học tuần \${this.currentWeek} thành công!\`, 'success');
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Lỗi lập kế hoạch: ' + err.message, 'danger');
      }
    });
  }`;

    if (content.includes(oldAutoPlan)) {
      content = content.replace(oldAutoPlan, newAutoPlan);
      console.log('Replaced autoPlanNewWeek in:', p);
    } else {
      console.log('oldAutoPlan pattern not found in:', p);
    }
  }

  fs.writeFileSync(p, content, 'utf8');
  console.log('Updated TS file:', p);
}
