const fs = require('fs');

const htmlPaths = [
  'H:/2026/App/Huyen/app-web/src/app/pages/vnedu/so-dau-bai/so-dau-bai.component.html',
  'H:/2026/App/APP WEB/src/app/pages/vnedu/so-dau-bai/so-dau-bai.component.html'
];

for (const p of htmlPaths) {
  let content = fs.readFileSync(p, 'utf8');

  const oldButtons = `      <button class="pill-btn pill-outline shadow-xs" (click)="autoPlanNewWeek()" [disabled]="isLoading" title="Tự động chuẩn bị KHDH cho tuần mới">
        <app-keenicon name="calendar-add" class="fs-4 me-1 text-gray-700"></app-keenicon>
        Lập trước KHDH
      </button>

      <button class="pill-btn pill-outline-circle shadow-xs" (click)="loadSchedule(currentWeek)" [disabled]="isLoading" title="Tải lại dữ liệu tuần">
        <app-keenicon name="arrows-circle" class="fs-4 text-gray-700" [ngClass]="{'fa-spin': isLoading}"></app-keenicon>
      </button>`;

  const newButtons = `      <!-- TH1: Khi Kế hoạch tuần ĐÃ TẠO và CÓ NHẬP LIỆU -> KHÓA TẠO MỚI ĐỂ BẢO VỆ AN TOÀN -->
      <button *ngIf="isWeekPlanCreatedAndHasData"
              type="button"
              class="pill-btn pill-locked-safe shadow-xs"
              (click)="onBlockedCreatePlanClick()"
              title="🛡️ Kế hoạch Tuần {{ currentWeek }} đã tạo và có dữ liệu nhập liệu trên vnEdu. Khóa tạo mới để chống ghi đè mất dữ liệu.">
        <span class="fs-5 me-1">🔒</span>
        <span class="text-gray-600 fw-bold fs-8">KHDH Đã Tạo</span>
      </button>

      <!-- TH2: Khi Tuần CHƯA CÓ KẾ HOẠCH -> Cho phép Lập trước KHDH -->
      <button *ngIf="!isWeekPlanCreatedAndHasData"
              class="pill-btn pill-outline shadow-xs"
              (click)="autoPlanNewWeek()"
              [disabled]="isLoading"
              title="Tự động chuẩn bị KHDH cho tuần mới">
        <app-keenicon name="calendar-add" class="fs-4 me-1 text-gray-700"></app-keenicon>
        Lập trước KHDH
      </button>

      <!-- NÚT CẬP NHẬT TỪ VNEDU CHO AN TOÀN (CHỈ UPDATE, KHÔNG TẠO ĐÈ) -->
      <button type="button"
              class="pill-btn pill-update-vnedu shadow-xs"
              (click)="refreshFromVnEdu()"
              [disabled]="isLoading"
              title="Cập nhật dữ liệu mới nhất từ cổng vnEdu (An toàn tuyệt đối, không ghi đè dữ liệu bài dạy)">
        <app-keenicon name="arrows-circle" class="fs-4 me-1 text-primary" [ngClass]="{'fa-spin': isLoading}"></app-keenicon>
        <span>Cập nhật từ vnEdu</span>
      </button>`;

  if (content.includes(oldButtons)) {
    content = content.replace(oldButtons, newButtons);
    console.log('Replaced toolbar buttons in:', p);
  } else {
    console.log('oldButtons not found in:', p);
  }

  // Update empty state text
  const oldEmpty = `<div class="fs-7 text-gray-500 mt-1">Vui lòng chọn tuần khác hoặc bấm "Lập trước KHDH".</div>`;
  const newEmpty = `<div class="fs-7 text-gray-500 mt-1" *ngIf="!isWeekPlanCreatedAndHasData">
        Vui lòng chọn tuần khác hoặc bấm "Lập trước KHDH".
      </div>
      <div class="fs-7 text-gray-500 mt-1" *ngIf="isWeekPlanCreatedAndHasData">
        Kế hoạch Tuần {{ currentWeek }} đã được lưu trên vnEdu. Bấm nút "Tất cả các lớp" để xem lại các tiết dạy.
      </div>`;

  if (content.includes(oldEmpty)) {
    content = content.replace(oldEmpty, newEmpty);
    console.log('Replaced empty state in:', p);
  }

  fs.writeFileSync(p, content, 'utf8');
  console.log('Saved HTML:', p);
}
