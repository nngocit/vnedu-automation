export interface VnEduSlot {
  index: number;
  thu: number;
  buoi: number | string;
  tiet: number;
  ngay: string;
  lop: string;
  mon: string;
  monHocId: string;
  phanMonId: string;
  phanMon?: string;
  ppct: number | string;
  tenBai?: string;
  baiDay?: string;
  noiDung?: string;
  ghiChu?: string;
  nhanXet?: string;
  nhanXetDefault?: string;
  diem?: string | number;
  diemDefault?: number;
  diemKl?: string | number;
  diemVs?: string | number;
  soLuongNghi?: number;
  hsVangList?: AbsentStudent[];
  isMatched?: boolean;
  sdbSoLuongNghi?: number;
  sdbDsVang?: string[];
  giamThiSoLuongNghi?: number;
  giamThiDsVang?: any[];
  isSynced?: boolean;
  chitietId?: string | null;
  liveId?: string | null;
  isSaving?: boolean;
}

export interface AbsentStudent {
  id: string;
  fullName: string;
  stt?: number;
  maHs?: string;
  coPhep: boolean;
  khongPhep: boolean;
  statusText?: string;
}

export interface VnEduWeekSchedule {
  success: boolean;
  source: string;
  fileName: string;
  weekNumber: number;
  weekRange?: string;
  tuNgay: string;
  denNgay: string;
  totalSlots: number;
  syncedSlots: number;
  readySlots: number;
  schedule: VnEduSlot[];
}

export interface WeekOption {
  number?: number;
  week?: number;
  weekNumber?: number;
  label?: string;
  title?: string;
  sheetName?: string;
  current?: boolean;
  isCurrent?: boolean;
  isCurrentRealWeek?: boolean;
  hasData?: boolean;
  hasVnEdu?: boolean;
  hasExcel?: boolean;
  past?: boolean;
  future?: boolean;
  count?: number;
  synced?: number;
}

export interface VnEduInfo {
  success: boolean;
  teacherName?: string;
  schoolName?: string;
  teacher?: {
    name: string;
    account: string;
    school: string;
    year: string;
  };
  file?: {
    name: string;
    time: number;
    isCustom: boolean;
  } | null;
  weeks: WeekOption[];
  currentRealWeek: number;
  nextRealWeek: number;
  currentSemester: string;
  semester2Unlocked: boolean;
}

export interface VnEduStatus {
  success: boolean;
  connected: boolean;
  account: string;
  teacherName: string;
  tokenPreview: string | null;
}

export interface PpctConfig {
  hdtn: {
    mode: string;
    weeks: {
      [key: string]: {
        tiet1: number;
        tiet2: number;
      };
    };
  };
  autoSyncToVnEdu: boolean;
}
