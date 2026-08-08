import type { ScheduleData } from "./schedule";

// 가져오기 파일에서 검증에 실패한 행의 위치와 이유입니다.
export type BackupImportError = {
  rowNumber: number;
  reason: string;
};

// 검증을 통과한 일정과 원본 파일의 행 번호입니다.
export type BackupImportRow = {
  rowNumber: number;
  schedule: ScheduleData;
};

// 사용자가 Firestore 저장 전에 확인할 가져오기 분석 결과입니다.
export type BackupImportPreview = {
  fileName: string;
  totalCount: number;
  validRows: BackupImportRow[];
  duplicateRows: BackupImportRow[];
  errors: BackupImportError[];
};
