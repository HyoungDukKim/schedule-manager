import { useCallback, useState } from "react";
import "../styles/main.css";

import CalendarView from "./calendar/CalendarView";
import ScheduleForm from "./schedule/ScheduleForm";
import ScheduleList from "./schedule/ScheduleList";
import StatisticsView from "./statistics/StatisticsView";

import {
  getDefaultCategory,
  getDefaultPriority,
  getDefaultRepeat,
  getDefaultTime,
} from "../constants/schedule";
import { useSchedules } from "../hooks/useSchedules";
import { useTheme } from "../hooks/useTheme";
import type { ScheduleFormValues } from "../types/schedule";
import type { ViewMode } from "../types/ui";
import { getToday } from "../utils/dateUtils";

// 로그인 사용자의 일정만 조회하기 위해 사용자 ID를 전달받습니다.
type Props = {
  userId: string;
};

function Main({ userId }: Props) {
  // 화면 표시 상태는 Main이 담당합니다.
  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // 테마와 일정 데이터 로직은 Custom Hook으로 분리했습니다.
  const { theme, toggleTheme } = useTheme();
  const {
    filteredSchedules,
    editingSchedule,
    openEditSchedule,
    saveSchedule,
    cancelEditing,
    toggleSchedule,
    deleteSchedule,
  } = useSchedules(userId, searchText);

  // 검색어 앞뒤 공백을 제거하여 검색 결과 문구 표시 여부를 판단합니다.
  const normalizedSearchText = searchText.trim();

  const openAddForm = useCallback(() => {
    cancelEditing();
    setShowForm(true);
  }, [cancelEditing]);

  const openEditForm = useCallback((id: string) => {
    openEditSchedule(id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [openEditSchedule]);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    cancelEditing();
  }, [cancelEditing]);

  const handleSave = useCallback(async (values: ScheduleFormValues) => {
    const saved = await saveSchedule(values);
    if (saved) setShowForm(false);
  }, [saveSchedule]);

  return (
    <main className="main">
      <div className="main-header">
        <div>
          <h2>일정 관리</h2>
          <p className="main-description">
            목록, 달력 또는 통계로 일정을 확인하세요.
          </p>
        </div>

        <div className="main-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "다크 모드로 변경" : "라이트 모드로 변경"}
            title={theme === "light" ? "다크 모드로 변경" : "라이트 모드로 변경"}
          >
            {theme === "light" ? "🌙 다크 모드" : "☀️ 라이트 모드"}
          </button>

          <button type="button" className="add-btn" onClick={openAddForm}>
            + 일정 추가
          </button>
        </div>
      </div>

      <div className="schedule-toolbar">
        <div className="search-area">
          <label htmlFor="schedule-search">일정 검색</label>
          {/* 입력값이 바뀔 때마다 State가 갱신되어 제목 검색 결과가 즉시 반영됩니다. */}
          <input
            id="schedule-search"
            type="search"
            placeholder="일정 제목을 검색하세요."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />

          {normalizedSearchText !== "" && (
            <p className="search-result">검색 결과: {filteredSchedules.length}개</p>
          )}
        </div>

        <div className="view-toggle" aria-label="일정 보기 방식">
          <button
            type="button"
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            ☰ 목록
          </button>
          <button
            type="button"
            className={viewMode === "calendar" ? "active" : ""}
            onClick={() => setViewMode("calendar")}
          >
            ▦ 달력
          </button>
          <button
            type="button"
            className={viewMode === "statistics" ? "active" : ""}
            onClick={() => setViewMode("statistics")}
          >
            ▥ 통계
          </button>
        </div>
      </div>

      {showForm && (
        <ScheduleForm
          onSave={handleSave}
          onCancel={cancelForm}
          initialTitle={editingSchedule?.title ?? ""}
          initialDate={editingSchedule?.date ?? getToday()}
          initialTime={editingSchedule?.time ?? getDefaultTime()}
          initialCategory={editingSchedule?.category ?? getDefaultCategory()}
          initialPriority={editingSchedule?.priority ?? getDefaultPriority()}
          initialRepeat={editingSchedule?.repeat ?? getDefaultRepeat()}
          isEditing={editingSchedule !== null}
        />
      )}

      {viewMode === "statistics" ? (
        <StatisticsView schedules={filteredSchedules} />
      ) : filteredSchedules.length === 0 ? (
        <div className="search-empty">검색 조건에 맞는 일정이 없습니다.</div>
      ) : viewMode === "list" ? (
        <ScheduleList
          schedules={filteredSchedules}
          onToggle={toggleSchedule}
          onEdit={openEditForm}
          onDelete={deleteSchedule}
        />
      ) : (
        <CalendarView schedules={filteredSchedules} onEdit={openEditForm} />
      )}
    </main>
  );
}

export default Main;
