import assert from "node:assert/strict";
import { createServer } from "vite";
import * as XLSX from "xlsx";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const sampleSchedule = {
  id: "sample-id",
  title: "왜관 방문",
  completed: false,
  date: "2026-08-22",
  time: "09:00",
  category: "개인",
  priority: "보통",
  repeat: "매주",
  repeatEndDate: "2026-12-31",
  notificationEnabled: true,
  notificationMinutesBefore: 30,
};

const tests = [];
const test = (name, run) => tests.push({ name, run });

const createWorkbookFile = (rows, fileName = "backup.xlsx", configure) => {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  configure?.(worksheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "일정");
  const bytes = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    compression: true,
  });
  return new File([bytes], fileName, { type: XLSX_MIME });
};

const server = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
});

try {
  const backup = await server.ssrLoadModule("/src/utils/backupUtils.ts");
  const {
    BackupFileValidationError,
    MAX_BACKUP_FILE_SIZE,
    MAX_BACKUP_ROWS,
    createSchedulesCsv,
    createSchedulesXlsx,
    getBackupFileValidationError,
    parseScheduleBackup,
  } = backup;

  test("CSV 내보내기는 UTF-8 BOM과 반복·알림 필드를 유지한다", () => {
    const csv = createSchedulesCsv([sampleSchedule]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.match(csv, /왜관 방문/);
    assert.match(csv, /2026-12-31/);
    assert.match(csv, /true,30/);
  });

  test("CSV 가져오기는 한글 제목과 선택 필드를 복원한다", async () => {
    const csv = createSchedulesCsv([sampleSchedule]);
    const preview = await parseScheduleBackup(
      new File([csv], "backup.csv", { type: "text/csv" }),
      [],
    );
    assert.equal(preview.validRows.length, 1);
    const expectedSchedule = { ...sampleSchedule };
    delete expectedSchedule.id;
    assert.deepEqual(preview.validRows[0].schedule, expectedSchedule);
  });

  test("XLSX 내보내기는 일정 시트와 한글 헤더를 만든다", async () => {
    const bytes = await createSchedulesXlsx([sampleSchedule]);
    const workbook = XLSX.read(bytes, { type: "array", raw: true });
    assert.equal(workbook.SheetNames[0], "일정");
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["일정"], {
      header: 1,
      raw: true,
    });
    assert.deepEqual(rows[0].slice(0, 4), ["제목", "완료", "날짜", "시간"]);
    assert.equal(rows[1][0], "왜관 방문");
  });

  test("XLSX 가져오기는 반복 종료일과 알림 유무를 모두 복원한다", async () => {
    const withoutOptions = {
      ...sampleSchedule,
      id: "without-options",
      title: "알림 없는 일정",
      repeat: "반복 안함",
      repeatEndDate: undefined,
      notificationEnabled: undefined,
      notificationMinutesBefore: undefined,
    };
    const bytes = await createSchedulesXlsx([sampleSchedule, withoutOptions]);
    const preview = await parseScheduleBackup(
      new File([bytes], "backup.xlsx", { type: XLSX_MIME }),
      [],
    );
    assert.equal(preview.validRows.length, 2);
    assert.equal(preview.validRows[0].schedule.repeatEndDate, "2026-12-31");
    assert.equal(preview.validRows[0].schedule.notificationMinutesBefore, 30);
    assert.equal(preview.validRows[1].schedule.repeatEndDate, undefined);
    assert.equal(preview.validRows[1].schedule.notificationEnabled, undefined);
  });

  test("잘못된 날짜는 오류 행으로 분류한다", async () => {
    const file = createWorkbookFile([
      ["제목", "완료", "날짜", "시간", "카테고리", "우선순위", "반복"],
      ["잘못된 날짜", false, "2026-02-31", "09:00", "개인", "보통", "반복 안함"],
    ]);
    const preview = await parseScheduleBackup(file, []);
    assert.equal(preview.validRows.length, 0);
    assert.equal(preview.errors[0].reason, "날짜 형식 오류");
  });

  test("복원 데이터도 반복 종료일과 알림 공통 계약을 적용한다", async () => {
    const rows = [
      [
        "제목", "완료", "날짜", "시간", "카테고리", "우선순위", "반복",
        "반복종료일", "알림사용", "알림시간(분전)",
      ],
      [
        "반복 안함 종료일", false, "2026-08-22", "09:00", "개인", "보통",
        "반복 안함", "2026-12-31", false, "",
      ],
      [
        "빠른 종료일", false, "2026-08-22", "09:00", "개인", "보통",
        "매주", "2026-08-21", false, "",
      ],
      [
        "알림 시간만", false, "2026-08-22", "09:00", "개인", "보통",
        "반복 안함", "", false, 5,
      ],
      [
        "지원하지 않는 알림", false, "2026-08-22", "09:00", "개인", "보통",
        "반복 안함", "", true, 20,
      ],
    ];
    const preview = await parseScheduleBackup(createWorkbookFile(rows), []);
    assert.equal(preview.validRows.length, 0);
    assert.equal(preview.errors.length, 4);
    assert.match(preview.errors[0].reason, /반복 안함/);
    assert.match(preview.errors[1].reason, /시작일/);
    assert.match(preview.errors[2].reason, /알림을 사용하지 않을 때/);
    assert.match(preview.errors[3].reason, /0, 5, 10, 30, 60/);
  });

  test("제목·날짜·시간이 같은 일정은 중복 후보로 분류한다", async () => {
    const bytes = await createSchedulesXlsx([sampleSchedule]);
    const preview = await parseScheduleBackup(
      new File([bytes], "backup.xlsx", { type: XLSX_MIME }),
      [sampleSchedule],
    );
    assert.equal(preview.validRows.length, 0);
    assert.equal(preview.duplicateRows.length, 1);
  });

  test("빈 파일은 저장 가능한 일정이 없는 결과를 반환한다", async () => {
    const preview = await parseScheduleBackup(
      new File([], "empty.csv", { type: "text/csv" }),
      [],
    );
    assert.equal(preview.totalCount, 0);
    assert.equal(preview.errors.length, 1);
  });

  test("5MB 초과 파일과 잘못된 MIME은 파싱 전에 차단한다", () => {
    const oversized = new File(
      [new Uint8Array(MAX_BACKUP_FILE_SIZE + 1)],
      "large.xlsx",
      { type: XLSX_MIME },
    );
    assert.match(getBackupFileValidationError(oversized), /5MB/);
    const invalidMime = new File(["x"], "backup.xlsx", { type: "text/html" });
    assert.match(getBackupFileValidationError(invalidMime), /XLSX 파일 형식/);
  });

  test("손상된 XLSX는 ZIP 서명 검사에서 차단한다", async () => {
    await assert.rejects(
      parseScheduleBackup(
        new File(["not-a-workbook"], "broken.xlsx", { type: XLSX_MIME }),
        [],
      ),
      (error) =>
        error instanceof BackupFileValidationError &&
        /손상/.test(error.message),
    );
  });

  test("최대 행 수를 넘는 workbook은 차단한다", async () => {
    const rows = [
      ["제목", "완료", "날짜", "시간", "카테고리", "우선순위", "반복"],
      ...Array.from({ length: MAX_BACKUP_ROWS + 1 }, (_, index) => [
        `일정 ${index}`,
        false,
        "2026-08-22",
        "09:00",
        "개인",
        "보통",
        "반복 안함",
      ]),
    ];
    await assert.rejects(parseScheduleBackup(createWorkbookFile(rows), []), /최대/);
  });

  test("수식 셀은 계산하거나 신뢰하지 않고 차단한다", async () => {
    const file = createWorkbookFile(
      [
        ["제목", "완료", "날짜", "시간", "카테고리", "우선순위", "반복"],
        ["수식 일정", false, "2026-08-22", "09:00", "개인", "보통", "반복 안함"],
      ],
      "formula.xlsx",
      (worksheet) => {
        worksheet.A2 = { t: "s", f: 'HYPERLINK("https://example.com","클릭")', v: "수식 일정" };
      },
    );
    await assert.rejects(parseScheduleBackup(file, []), /수식/);
  });

  test("지나치게 많은 시트와 링크 셀을 차단한다", async () => {
    const workbook = XLSX.utils.book_new();
    for (let index = 0; index < 6; index += 1) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([["제목"], [`일정 ${index}`]]),
        `일정${index}`,
      );
    }
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    await assert.rejects(
      parseScheduleBackup(new File([bytes], "many-sheets.xlsx", { type: XLSX_MIME }), []),
      /시트를 5개 이하/,
    );

    const linkedFile = createWorkbookFile(
      [
        ["제목", "완료", "날짜", "시간", "카테고리", "우선순위", "반복"],
        ["링크 일정", false, "2026-08-22", "09:00", "개인", "보통", "반복 안함"],
      ],
      "link.xlsx",
      (worksheet) => {
        worksheet.A2.l = { Target: "https://example.com" };
      },
    );
    await assert.rejects(parseScheduleBackup(linkedFile, []), /링크/);
  });

  for (const { name, run } of tests) {
    await run();
    console.log(`✓ ${name}`);
  }
  console.log(`\n백업 보안 회귀 테스트 ${tests.length}개 통과`);
} finally {
  await server.close();
}
