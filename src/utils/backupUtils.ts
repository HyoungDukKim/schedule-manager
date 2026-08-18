import type {
  BackupImportError,
  BackupImportPreview,
  BackupImportRow,
} from "../types/backup";
import type { Schedule, ScheduleData } from "../types/schedule";
import { validateScheduleData } from "../../shared/scheduleContract.js";

// CSV는 다른 시스템에서도 다루기 쉽도록 영문 필드명을 사용합니다.
const CSV_HEADERS = [
  "title",
  "completed",
  "date",
  "time",
  "category",
  "priority",
  "repeat",
  "repeatEndDate",
  "notificationEnabled",
  "notificationMinutesBefore",
] as const;

// Excel은 사용자가 바로 읽을 수 있도록 한글 헤더를 사용합니다.
const EXCEL_HEADERS = [
  "제목",
  "완료",
  "날짜",
  "시간",
  "카테고리",
  "우선순위",
  "반복",
  "반복종료일",
  "알림사용",
  "알림시간(분전)",
] as const;

// 브라우저 메모리에서 처리하는 파일이므로 크기와 workbook 복잡도에 상한을 둡니다.
export const MAX_BACKUP_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_BACKUP_SHEETS = 5;
export const MAX_BACKUP_ROWS = 5_000;
export const MAX_BACKUP_COLUMNS = 32;
export const MAX_BACKUP_CELL_LENGTH = 1_000;

const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);
const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/octet-stream",
]);

type BackupRecord = Record<string, unknown>;

// 파일 구조 문제는 행 데이터 오류와 구분하여 사용자에게 안전한 문구로 전달합니다.
export class BackupFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupFileValidationError";
  }
}

const getFileExtension = (fileName: string) =>
  fileName.split(".").pop()?.toLowerCase() ?? "";

// 파일 선택 UI를 우회해도 동일한 확장자·MIME·크기 검증이 적용되게 합니다.
export const getBackupFileValidationError = (file: File) => {
  const extension = getFileExtension(file.name);
  if (extension !== "csv" && extension !== "xlsx") {
    return "CSV 또는 XLSX 파일만 선택해 주세요.";
  }
  if (file.size > MAX_BACKUP_FILE_SIZE) {
    return "백업 파일은 5MB 이하만 가져올 수 있습니다.";
  }

  // 일부 브라우저는 로컬 파일 MIME을 비워 전달하므로 빈 값은 허용합니다.
  const mimeType = file.type.toLowerCase();
  if (
    mimeType &&
    !(
      extension === "csv"
        ? CSV_MIME_TYPES.has(mimeType)
        : XLSX_MIME_TYPES.has(mimeType)
    )
  ) {
    return extension === "csv"
      ? "CSV 파일 형식을 확인해 주세요."
      : "XLSX 파일 형식을 확인해 주세요.";
  }

  return null;
};

// 파일 이름에 사용할 오늘 날짜를 로컬 시간 기준으로 만듭니다.
const getBackupDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 브라우저에서 만든 Blob을 사용자의 기기로 내려받습니다.
const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// 쉼표, 큰따옴표, 줄바꿈이 있는 제목도 안전하게 CSV 한 칸으로 만듭니다.
const escapeCsvCell = (value: string | boolean | number) => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

// Firestore 문서 ID를 제외하고 백업 대상 필드만 일정한 순서로 반환합니다.
const getBackupValues = (schedule: Schedule) => [
  schedule.title,
  schedule.completed,
  schedule.date,
  schedule.time,
  schedule.category,
  schedule.priority,
  schedule.repeat,
  schedule.repeatEndDate ?? "",
  schedule.notificationEnabled ?? false,
  schedule.notificationEnabled ? (schedule.notificationMinutesBefore ?? 0) : "",
];

// 테스트 가능한 순수 함수로 UTF-8 BOM이 포함된 CSV 문자열을 만듭니다.
export const createSchedulesCsv = (schedules: Schedule[]) => {
  const rows = [
    CSV_HEADERS.join(","),
    ...schedules.map((schedule) =>
      getBackupValues(schedule).map(escapeCsvCell).join(","),
    ),
  ];
  return `\uFEFF${rows.join("\r\n")}`;
};

// 전체 일정 데이터를 Excel에서 한글이 깨지지 않는 UTF-8 BOM CSV로 저장합니다.
export const exportSchedulesToCsv = (schedules: Schedule[]) => {
  const csv = createSchedulesCsv(schedules);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `schedule-backup-${getBackupDate()}.csv`);
};

// 테스트 가능한 형태로 한글 헤더의 "일정" Excel 파일 바이트를 만듭니다.
export const createSchedulesXlsx = async (schedules: Schedule[]) => {
  // Excel 기능을 사용할 때만 SheetJS 코드를 불러와 초기 앱 로딩을 가볍게 유지합니다.
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...EXCEL_HEADERS],
    ...schedules.map((schedule) => [
      schedule.title,
      schedule.completed ? "완료" : "미완료",
      schedule.date,
      schedule.time,
      schedule.category,
      schedule.priority,
      schedule.repeat,
      schedule.repeatEndDate ?? "",
      schedule.notificationEnabled ?? false,
      schedule.notificationEnabled ? (schedule.notificationMinutesBefore ?? 0) : "",
    ]),
  ]);
  worksheet["!cols"] = [
    { wch: 30 },
    { wch: 9 },
    { wch: 13 },
    { wch: 9 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 11 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "일정");
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    compression: true,
  }) as ArrayBuffer;
};

// 생성한 Excel 파일 바이트를 사용자의 기기로 내려받습니다.
export const exportSchedulesToXlsx = async (schedules: Schedule[]) => {
  const content = await createSchedulesXlsx(schedules);
  const blob = new Blob([content], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `schedule-backup-${getBackupDate()}.xlsx`);
};

// 영문 CSV와 한글 Excel 헤더를 모두 같은 필드로 읽습니다.
const getField = (record: BackupRecord, english: string, korean: string) =>
  record[english] ?? record[korean] ?? "";

const getText = (value: unknown) => String(value ?? "").trim();

const parseCompleted = (value: unknown) => {
  if (typeof value === "boolean") return value;
  const normalized = getText(value).toLowerCase();
  if (["true", "1", "완료", "예", "yes"].includes(normalized)) return true;
  if (["false", "0", "미완료", "아니오", "no", ""].includes(normalized)) {
    return false;
  }
  return null;
};

// 한 행을 현재 ScheduleData 구조로 검증하고 변환합니다.
const validateRecord = (
  record: BackupRecord,
  rowNumber: number,
): BackupImportRow | BackupImportError => {
  const title = getText(getField(record, "title", "제목"));
  const completed = parseCompleted(getField(record, "completed", "완료"));
  const date = getText(getField(record, "date", "날짜"));
  const time = getText(getField(record, "time", "시간"));
  const category = getText(getField(record, "category", "카테고리"));
  const priority = getText(getField(record, "priority", "우선순위"));
  const repeat = getText(getField(record, "repeat", "반복"));
  const repeatEndDate = getText(
    getField(record, "repeatEndDate", "반복종료일"),
  );
  const notificationEnabled = parseCompleted(
    getField(record, "notificationEnabled", "알림사용"),
  );
  const notificationMinutesText = getText(
    getField(record, "notificationMinutesBefore", "알림시간(분전)"),
  );
  const notificationMinutes = Number(notificationMinutesText);

  if (completed === null) {
    return { rowNumber, reason: "완료 값은 true/false 또는 완료/미완료여야 합니다." };
  }
  if (notificationEnabled === null) {
    return { rowNumber, reason: "알림 사용 값은 true 또는 false여야 합니다." };
  }

  const candidate: Record<string, unknown> = {
    title,
    completed,
    date,
    time,
    category,
    priority,
    repeat,
    ...(repeatEndDate ? { repeatEndDate } : {}),
    ...(notificationEnabled
      ? {
          notificationEnabled: true,
          ...(notificationMinutesText ? { notificationMinutesBefore: notificationMinutes } : {}),
        }
      : notificationMinutesText
        ? {
            notificationEnabled: false,
            notificationMinutesBefore: notificationMinutes,
          }
        : {}),
  };
  const validation = validateScheduleData(candidate);
  if (!validation.success) {
    const issue = validation.issues[0];
    const reasonByField: Record<string, string> = {
      title: issue.message,
      date: "날짜 형식 오류",
      time: "시간 형식 오류",
      category: "알 수 없는 카테고리",
      priority: "알 수 없는 우선순위",
      repeat: "알 수 없는 반복 방식",
      repeatEndDate: issue.message,
      notificationEnabled: issue.message,
      notificationMinutesBefore: issue.message,
    };
    return {
      rowNumber,
      reason: reasonByField[issue.field] ?? "일정 데이터 형식 오류",
    };
  }

  return {
    rowNumber,
    schedule: validation.data,
  };
};

// 제목·날짜·시간이 모두 같으면 같은 일정의 중복 후보로 판단합니다.
const getDuplicateKey = (schedule: Pick<ScheduleData, "title" | "date" | "time">) =>
  `${schedule.title}\u0000${schedule.date}\u0000${schedule.time}`;

// CSV 또는 XLSX를 메모리에서 파싱하고 저장 전 미리보기 결과를 만듭니다.
export const parseScheduleBackup = async (
  file: File,
  existingSchedules: Schedule[],
): Promise<BackupImportPreview> => {
  const fileValidationError = getBackupFileValidationError(file);
  if (fileValidationError) {
    throw new BackupFileValidationError(fileValidationError);
  }

  if (file.size === 0) {
    return {
      fileName: file.name,
      totalCount: 0,
      validRows: [],
      duplicateRows: [],
      errors: [{ rowNumber: 1, reason: "가져올 일정 데이터가 없습니다." }],
    };
  }

  const XLSX = await import("xlsx");
  const fileBytes = await file.arrayBuffer();
  const extension = getFileExtension(file.name);

  if (extension === "xlsx") {
    const signature = new Uint8Array(fileBytes, 0, Math.min(4, fileBytes.byteLength));
    const hasZipSignature =
      signature.length === 4 &&
      signature[0] === 0x50 &&
      signature[1] === 0x4b &&
      signature[2] === 0x03 &&
      signature[3] === 0x04;
    if (!hasZipSignature) {
      throw new BackupFileValidationError("손상되었거나 올바르지 않은 XLSX 파일입니다.");
    }
  }

  // 먼저 시트 이름만 읽어 지나치게 복잡한 workbook을 전체 파싱하기 전에 차단합니다.
  const workbookInfo = XLSX.read(fileBytes, {
    type: "array",
    bookSheets: true,
  });
  if (workbookInfo.SheetNames.length > MAX_BACKUP_SHEETS) {
    throw new BackupFileValidationError(
      `XLSX 파일은 시트를 ${MAX_BACKUP_SHEETS}개 이하로 구성해 주세요.`,
    );
  }

  // CSV의 YYYY-MM-DD 값을 Excel 날짜로 자동 변환하지 않고 원문 그대로 읽습니다.
  // 수식은 계산하지 않으며, 아래 검사에서 수식·링크 셀 자체를 가져오기 거부합니다.
  const workbook = XLSX.read(fileBytes, {
    type: "array",
    raw: true,
    cellFormula: true,
    cellHTML: false,
    cellStyles: false,
    bookDeps: false,
    bookFiles: false,
    bookVBA: false,
    dense: false,
    nodim: true,
    sheetRows: MAX_BACKUP_ROWS + 2,
    sheets: 0,
    WTF: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

  if (worksheet) {
    const reportedRange = worksheet["!fullref"] ?? worksheet["!ref"];
    if (reportedRange) {
      const range = XLSX.utils.decode_range(reportedRange);
      if (range.e.r - range.s.r + 1 > MAX_BACKUP_ROWS + 1) {
        throw new BackupFileValidationError(
          `가져올 수 있는 일정은 최대 ${MAX_BACKUP_ROWS.toLocaleString("ko-KR")}개입니다.`,
        );
      }
      if (range.e.c - range.s.c + 1 > MAX_BACKUP_COLUMNS) {
        throw new BackupFileValidationError(
          `XLSX 파일은 최대 ${MAX_BACKUP_COLUMNS}열까지만 사용할 수 있습니다.`,
        );
      }
    }

    for (const [address, cell] of Object.entries(worksheet)) {
      if (address.startsWith("!")) continue;
      const typedCell = cell as { f?: unknown; l?: unknown; v?: unknown };
      if (typedCell.f !== undefined) {
        throw new BackupFileValidationError("수식이 포함된 XLSX 파일은 가져올 수 없습니다.");
      }
      if (typedCell.l !== undefined) {
        throw new BackupFileValidationError("링크가 포함된 XLSX 파일은 가져올 수 없습니다.");
      }
      if (
        typeof typedCell.v === "string" &&
        typedCell.v.length > MAX_BACKUP_CELL_LENGTH
      ) {
        throw new BackupFileValidationError(
          `셀 하나의 내용은 ${MAX_BACKUP_CELL_LENGTH.toLocaleString("ko-KR")}자 이하여야 합니다.`,
        );
      }
    }
  }

  const records = worksheet
    ? XLSX.utils.sheet_to_json<BackupRecord>(worksheet, {
        defval: "",
        raw: true,
        blankrows: false,
      })
    : [];

  if (records.length > MAX_BACKUP_ROWS) {
    throw new BackupFileValidationError(
      `가져올 수 있는 일정은 최대 ${MAX_BACKUP_ROWS.toLocaleString("ko-KR")}개입니다.`,
    );
  }

  const errors: BackupImportError[] = [];
  const validRows: BackupImportRow[] = [];
  const duplicateRows: BackupImportRow[] = [];
  const duplicateKeys = new Set(existingSchedules.map(getDuplicateKey));

  records.forEach((record, index) => {
    // 첫 행은 헤더이므로 실제 데이터 행 번호는 index + 2입니다.
    const result = validateRecord(record, index + 2);
    if ("reason" in result) {
      errors.push(result);
      return;
    }

    const duplicateKey = getDuplicateKey(result.schedule);
    if (duplicateKeys.has(duplicateKey)) {
      duplicateRows.push(result);
      return;
    }

    duplicateKeys.add(duplicateKey);
    validRows.push(result);
  });

  if (records.length === 0) {
    errors.push({ rowNumber: 1, reason: "가져올 일정 데이터가 없습니다." });
  }

  return {
    fileName: file.name,
    totalCount: records.length,
    validRows,
    duplicateRows,
    errors,
  };
};
