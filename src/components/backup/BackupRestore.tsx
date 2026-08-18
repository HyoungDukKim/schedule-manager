import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { BackupImportPreview } from "../../types/backup";
import type { Schedule, ScheduleData } from "../../types/schedule";
import {
  BackupFileValidationError,
  exportSchedulesToCsv,
  exportSchedulesToXlsx,
  getBackupFileValidationError,
  parseScheduleBackup,
} from "../../utils/backupUtils";
import "../../styles/backup.css";

type Props = {
  // 검색이나 필터가 적용되지 않은 로그인 사용자의 전체 일정입니다.
  schedules: Schedule[];
  onImport: (schedules: ScheduleData[]) => Promise<boolean>;
};

function BackupRestore({ schedules, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BackupImportPreview | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelPreview = () => {
    setPreview(null);
    setError(null);
    resetFile();
  };

  const handleCsvExport = () => {
    setError(null);
    setMessage(null);

    try {
      exportSchedulesToCsv(schedules);
      setMessage(`전체 일정 ${schedules.length}개를 CSV로 내보냈습니다.`);
    } catch (exportError) {
      console.error("CSV 백업을 만들지 못했습니다.", exportError);
      setError("CSV 파일을 만들지 못했습니다.");
    }
  };

  const handleExcelExport = async () => {
    setIsExporting(true);
    setError(null);
    setMessage(null);

    try {
      await exportSchedulesToXlsx(schedules);
      setMessage(`전체 일정 ${schedules.length}개를 Excel로 내보냈습니다.`);
    } catch (exportError) {
      console.error("Excel 백업을 만들지 못했습니다.", exportError);
      setError("Excel 파일을 만들지 못했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileValidationError = getBackupFileValidationError(file);
    if (fileValidationError) {
      setPreview(null);
      setError(fileValidationError);
      resetFile();
      return;
    }

    setIsParsing(true);
    setPreview(null);
    setError(null);
    setMessage(null);

    try {
      // 파일은 브라우저 메모리에서만 분석하며 이 단계에서는 Firestore에 저장하지 않습니다.
      const result = await parseScheduleBackup(file, schedules);
      setPreview(result);
    } catch (parseError) {
      console.error("백업 파일을 분석하지 못했습니다.", parseError);
      setError(
        parseError instanceof BackupFileValidationError
          ? parseError.message
          : "파일을 읽을 수 없습니다. 올바른 CSV 또는 XLSX인지 확인해 주세요.",
      );
      resetFile();
    } finally {
      setIsParsing(false);
    }
  };

  const executeImport = async () => {
    if (!preview || preview.validRows.length === 0) return;

    setIsImporting(true);
    setError(null);
    setMessage(null);

    // 오류 행과 중복 후보를 제외한 정상 일정만 Firestore에 전달합니다.
    const succeeded = await onImport(
      preview.validRows.map(({ schedule }) => schedule),
    );

    if (succeeded) {
      setMessage(`${preview.validRows.length}개 일정을 추가했습니다.`);
      setPreview(null);
      resetFile();
    } else {
      setError("일정을 가져오지 못했습니다. 인터넷 연결과 권한을 확인해 주세요.");
    }

    setIsImporting(false);
  };

  return (
    <section className="backup-restore" aria-labelledby="backup-title">
      <div className="backup-header">
        <div>
          <h3 id="backup-title">백업 및 복원</h3>
          <p>현재 계정의 전체 일정을 파일로 보관하거나 새 일정으로 추가합니다.</p>
        </div>

        <div className="backup-actions">
          <button type="button" onClick={handleCsvExport}>
            CSV 내보내기
          </button>
          <button
            type="button"
            onClick={() => void handleExcelExport()}
            disabled={isExporting}
          >
            {isExporting ? "Excel 생성 중..." : "Excel 내보내기"}
          </button>

          <label className="backup-file-button" htmlFor="backup-file-input">
            {isParsing ? "파일 분석 중..." : "파일 가져오기"}
          </label>
          <input
            ref={fileInputRef}
            id="backup-file-input"
            className="backup-file-input"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => void handleFileChange(event)}
            disabled={isParsing || isImporting}
          />
        </div>
      </div>

      {message && <p className="backup-message success" role="status">{message}</p>}
      {error && <p className="backup-message error" role="alert">{error}</p>}

      {preview && (
        <div className="backup-preview">
          <h4>{preview.fileName} 가져오기 미리보기</h4>

          <div className="backup-summary" aria-label="가져오기 분석 결과">
            <span>총 {preview.totalCount}개</span>
            <span>정상 {preview.validRows.length}개</span>
            <span>오류 {preview.errors.length}개</span>
            <span>중복 후보 {preview.duplicateRows.length}개</span>
          </div>

          {preview.validRows.length > 0 && (
            <div className="backup-preview-table-wrap">
              <table className="backup-preview-table">
                <thead>
                  <tr>
                    <th>행</th>
                    <th>제목</th>
                    <th>날짜</th>
                    <th>시간</th>
                    <th>카테고리</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.validRows.slice(0, 10).map(({ rowNumber, schedule }) => (
                    <tr key={`${rowNumber}-${schedule.title}`}>
                      <td>{rowNumber}</td>
                      <td>{schedule.title}</td>
                      <td>{schedule.date}</td>
                      <td>{schedule.time}</td>
                      <td>{schedule.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.validRows.length > 10 && (
                <p>처음 10개만 미리 표시합니다.</p>
              )}
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="backup-issues error">
              <strong>오류 행</strong>
              <ul>
                {preview.errors.map(({ rowNumber, reason }) => (
                  <li key={`${rowNumber}-${reason}`}>
                    {rowNumber}행: {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.duplicateRows.length > 0 && (
            <div className="backup-issues duplicate">
              <strong>중복 후보 — 기본적으로 건너뜁니다.</strong>
              <ul>
                {preview.duplicateRows.map(({ rowNumber, schedule }) => (
                  <li key={`${rowNumber}-${schedule.title}`}>
                    {rowNumber}행: {schedule.title} / {schedule.date} / {schedule.time}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="backup-import-count">
            가져오기 예정 {preview.validRows.length}개 · 중복 제외{" "}
            {preview.duplicateRows.length}개 · 오류 {preview.errors.length}개
          </p>

          <div className="backup-confirm-actions">
            <button
              type="button"
              onClick={() => void executeImport()}
              disabled={isImporting || preview.validRows.length === 0}
            >
              {isImporting ? "가져오는 중..." : "가져오기 실행"}
            </button>
            <button type="button" onClick={cancelPreview} disabled={isImporting}>
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default BackupRestore;
