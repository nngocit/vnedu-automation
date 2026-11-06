const fs = require('fs');

const scssPaths = [
  'H:/2026/App/Huyen/app-web/src/app/pages/vnedu/so-dau-bai/so-dau-bai.component.scss',
  'H:/2026/App/APP WEB/src/app/pages/vnedu/so-dau-bai/so-dau-bai.component.scss'
];

const newStyles = `
/* ============================================================ */
/* SECTION 17: NÚT KHÓA AN TOÀN KHDH & CẬP NHẬT TỪ VNEDU        */
/* ============================================================ */
.pill-locked-safe {
  background: #f1f5f9 !important;
  color: #64748b !important;
  border: 1px dashed #cbd5e1 !important;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.45rem 0.85rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
  opacity: 0.9;

  &:hover {
    background: #e2e8f0 !important;
    color: #475569 !important;
    border-color: #94a3b8 !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
}

.pill-update-vnedu {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  border: 1px solid #bfdbfe !important;
  font-size: 0.8125rem;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #dbeafe !important;
    color: #1e40af !important;
    border-color: #93c5fd !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.18);
  }
}

/* Dark mode */
:host-context(.dark-mode),
body.dark-mode {
  .pill-locked-safe {
    background: #1e293b !important;
    color: #94a3b8 !important;
    border-color: #334155 !important;
    &:hover {
      background: #334155 !important;
      color: #cbd5e1 !important;
    }
  }

  .pill-update-vnedu {
    background: rgba(37, 99, 235, 0.15) !important;
    color: #60a5fa !important;
    border-color: rgba(96, 165, 250, 0.3) !important;
    &:hover:not(:disabled) {
      background: rgba(37, 99, 235, 0.25) !important;
      color: #93c5fd !important;
    }
  }
}
`;

for (const p of scssPaths) {
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes('SECTION 17: NÚT KHÓA AN TOÀN KHDH')) {
    content += newStyles;
    fs.writeFileSync(p, content, 'utf8');
    console.log('Appended styles to:', p);
  }
}
