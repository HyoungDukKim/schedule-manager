import type {
  BackupImportError,
  BackupImportPreview,
  BackupImportRow,
} from "../types/backup";
import type { Schedule, ScheduleData } from "../types/schedule";
import {
  isScheduleCategory,
  isSchedulePriority,
  isScheduleRepeat,
} from "./scheduleUtils";

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

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type BackupRecord = Record<string, unknown>;

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

// 문자열 모양뿐 아니라 실제 달력에 존재하는 날짜인지 확인합니다.
const isValidDate = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

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

  if (!title) return { rowNumber, reason: "제목이 비어 있습니다." };
  if (title.length > 200) {
    return { rowNumber, reason: "제목은 200자 이하여야 합니다." };
  }
  if (completed === null) {
    return { rowNumber, reason: "완료 값은 true/false 또는 완료/미완료여야 합니다." };
  }
  if (!isValidDate(date)) return { rowNumber, reason: "날짜 형식 오류" };
  if (!TIME_PATTERN.test(time)) return { rowNumber, reason: "시간 형식 오류" };
  if (!isScheduleCategory(category)) {
    return { rowNumber, reason: "알 수 없는 카테고리" };
  }
  if (!isSchedulePriority(priority)) {
    return { rowNumber, reason: "알 수 없는 우선순위" };
  }
  if (!isScheduleRepeat(repeat)) {
    return { rowNumber, reason: "알 수 없는 반복 방식" };
  }
  if (repeatEndDate && !isValidDate(repeatEndDate)) {
    return { rowNumber, reason: "반복 종료일 형식 오류" };
  }
  if (repeatEndDate && repeatEndDate < date) {
    return { rowNumber, reason: "반복 종료일이 시작일보다 빠릅니다." };
  }
  if (notificationEnabled === null) {
    return { rowNumber, reason: "알림 사용 값은 true 또는 false여야 합니다." };
  }
  if (
    notificationEnabled &&
    (!notificationMinutesText || ![0, 5, 10, 30, 60].includes(notificationMinutes))
  ) {
    return { rowNumber, reason: "알림 시간은 0, 5, 10, 30, 60 중 하나여야 합니다." };
  }

  return {
    rowNumber,
    schedule: {
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
            notificationMinutesBefore: notificationMinutes as 0 | 5 | 10 | 30 | 60,
          }
        : {}),
    },
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
  // CSV의 YYYY-MM-DD 값을 Excel 날짜로 자동 변환하지 않고 원문 그대로 읽습니다.
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    raw: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  const records = worksheet
    ? XLSX.utils.sheet_to_json<BackupRecord>(worksheet, {
        defval: "",
        raw: true,
        blankrows: false,
      })
    : [];

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
