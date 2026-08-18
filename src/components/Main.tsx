import { useCallback, useState } from "react";
import type { User } from "firebase/auth";
import "../styles/main.css";

import AiScheduleInput from "./ai/AiScheduleInput";
import BackupRestore from "./backup/BackupRestore";
import CalendarView from "./calendar/CalendarView";
import AppNavigation from "./layout/AppNavigation";
import Header from "./layout/Header";
import NotificationCenter from "./notification/NotificationCenter";
import ScheduleForm from "./schedule/ScheduleForm";
import ScheduleList from "./schedule/ScheduleList";
import SettingsView from "./settings/SettingsView";
import StatisticsView from "./statistics/StatisticsView";
import {
  getDefaultCategory,
  getDefaultPriority,
  getDefaultRepeat,
  getDefaultTime,
  SCHEDULE_DATE_RANGE_FILTERS,
  SCHEDULE_FILTER_CATEGORIES,
  SCHEDULE_SORT_OPTIONS,
} from "../constants/schedule";
import { useSchedules } from "../hooks/useSchedules";
import { useTheme } from "../hooks/useTheme";
import type { AiScheduleDraft } from "../types/aiSchedule";
import type { ScheduleFormValues } from "../types/schedule";
import type {
  AppView,
  ScheduleCategoryFilter,
  ScheduleDateRangeFilter,
  ScheduleSortOption,
} from "../types/ui";
import { getToday } from "../utils/dateUtils";

type Props = {
  user: User;
  onSwitchAccount: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
};

const VIEW_COPY: Record<AppView, { title: string; description: string }> = {
  calendar: { title: "달력", description: "월간 달력에서 날짜별 일정을 확인하세요." },
  schedules: { title: "일정", description: "일정을 검색하고 필터링하여 관리하세요." },
  ai: { title: "AI 일정", description: "자연어를 일정 초안으로 바꾼 뒤 확인하고 저장하세요." },
  statistics: { title: "통계", description: "현재 일정 데이터를 요약해서 확인하세요." },
  backup: { title: "백업/복원", description: "전체 일정을 CSV 또는 Excel로 백업하고 복원하세요." },
  settings: { title: "설정", description: "알림, 화면, PWA와 계정 정보를 확인하세요." },
};

function Main({ user, onSwitchAccount, onLogout }: Props) {
  const [appView, setAppView] = useState<AppView>("calendar");
  const [showForm, setShowForm] = useState(false);
  const [addFormDate, setAddFormDate] = useState<string | null>(null);
  const [aiFormDraft, setAiFormDraft] = useState<AiScheduleDraft | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ScheduleCategoryFilter>("전체");
  const [dateRangeFilter, setDateRangeFilter] = useState<ScheduleDateRangeFilter>("전체");
  const [sortOption, setSortOption] = useState<ScheduleSortOption>("날짜 빠른순");
  const { theme, toggleTheme } = useTheme();
  const {
    schedules, filteredSchedules, sortedSchedules, scheduleError, scheduleWarning,
    editingSchedule, openEditSchedule, saveSchedule, cancelEditing,
    importSchedules, toggleSchedule, deleteSchedule,
  } = useSchedules(user.uid, searchText, categoryFilter, dateRangeFilter, sortOption);

  const normalizedSearchText = searchText.trim();
  const currentCopy = VIEW_COPY[appView];

  const openAddForm = useCallback(() => {
    cancelEditing();
    setAiFormDraft(null);
    setAddFormDate(null);
    setFormVersion((version) => version + 1);
    setShowForm(true);
    window.requestAnimationFrame(() => {
      document.querySelector(".schedule-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [cancelEditing]);

  // 달력 아래 등록 버튼은 선택한 날짜만 새 일정 기본값으로 전달합니다.
  const openAddFormForDate = useCallback((date: string) => {
    cancelEditing();
    setAiFormDraft(null);
    setAddFormDate(date);
    setFormVersion((version) => version + 1);
    setShowForm(true);
    window.requestAnimationFrame(() => {
      document.querySelector(".schedule-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [cancelEditing]);

  const openEditForm = useCallback((id: string) => {
    setAiFormDraft(null);
    setAddFormDate(null);
    setFormVersion((version) => version + 1);
    openEditSchedule(id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [openEditSchedule]);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setAiFormDraft(null);
    setAddFormDate(null);
    cancelEditing();
  }, [cancelEditing]);

  const handleSave = useCallback(async (
    values: ScheduleFormValues,
    forceCreate = false,
  ) => {
    const saved = await saveSchedule(values, forceCreate);
    if (saved) {
      setShowForm(false);
      setAiFormDraft(null);
      setAddFormDate(null);
    }
    return saved;
  }, [saveSchedule]);

  // 완전한 AI Draft도 반드시 Main의 기존 저장 흐름을 거쳐 새 일정으로 저장합니다.
  const handleAiSave = useCallback(
    (values: ScheduleFormValues) => handleSave(values, true),
    [handleSave],
  );

  // 기존 ScheduleForm은 저장 성공 여부를 사용하지 않으므로 기존 Promise<void> 계약을 유지합니다.
  const handleFormSave = useCallback(async (values: ScheduleFormValues) => {
    await handleSave(values);
  }, [handleSave]);

  const applyAiDraft = useCallback((draft: AiScheduleDraft) => {
    cancelEditing();
    setAiFormDraft(draft);
    setAddFormDate(null);
    setFormVersion((version) => version + 1);
    setShowForm(true);
    window.requestAnimationFrame(() => {
      document.querySelector(".schedule-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [cancelEditing]);

  return (
    <>
      <Header user={user} onSwitchAccount={onSwitchAccount} onLogout={onLogout} onAddSchedule={openAddForm} />
      <AppNavigation currentView={appView} onChange={setAppView} />
      <div className="container app-shell">
        <main className={`main app-view-${appView}`}>
          <div className="main-header">
            <div>
              <h2>{currentCopy.title}</h2>
              <p className="main-description">{currentCopy.description}</p>
            </div>
          </div>

          {scheduleError && <div className="data-error-notice" role="alert">{scheduleError}</div>}
          {scheduleWarning && <div className="data-error-notice" role="status">{scheduleWarning}</div>}

          {showForm && (
            <ScheduleForm
              key={formVersion}
              onSave={handleFormSave}
              onCancel={cancelForm}
              initialTitle={aiFormDraft ? aiFormDraft.title ?? "" : editingSchedule?.title ?? ""}
              initialDate={aiFormDraft ? aiFormDraft.date ?? "" : addFormDate ?? editingSchedule?.date ?? getToday()}
              initialTime={aiFormDraft ? aiFormDraft.time ?? "" : editingSchedule?.time ?? getDefaultTime()}
              initialCategory={aiFormDraft?.category ?? editingSchedule?.category ?? getDefaultCategory()}
              initialPriority={aiFormDraft?.priority ?? editingSchedule?.priority ?? getDefaultPriority()}
              initialRepeat={aiFormDraft?.repeat ?? editingSchedule?.repeat ?? getDefaultRepeat()}
              initialRepeatEndDate={aiFormDraft ? aiFormDraft.repeatEndDate ?? undefined : editingSchedule?.repeatEndDate}
              initialNotificationEnabled={aiFormDraft?.notificationEnabled ?? editingSchedule?.notificationEnabled}
              initialNotificationMinutesBefore={aiFormDraft ? aiFormDraft.notificationMinutesBefore ?? undefined : editingSchedule?.notificationMinutesBefore}
              isEditing={editingSchedule !== null && aiFormDraft === null}
            />
          )}

          <NotificationCenter userId={user.uid} schedules={schedules} showControls={appView === "settings"} />

          {appView === "calendar" && (
            <CalendarView
              schedules={schedules}
              dateRangeFilter="전체"
              onEdit={openEditForm}
              onAddForDate={openAddFormForDate}
            />
          )}

          {appView === "schedules" && (
            <>
              <div className="schedule-toolbar">
                <div className="search-area">
                  <label htmlFor="schedule-search">일정 검색</label>
                  <input id="schedule-search" type="search" placeholder="일정 제목을 검색하세요." value={searchText} onChange={(event) => setSearchText(event.target.value)} />
                  {normalizedSearchText !== "" && <p className="search-result">검색 결과: {filteredSchedules.length}개</p>}
                </div>
              </div>

              <div className="schedule-filter-controls">
                <div className="category-filter" aria-label="일정 카테고리 필터">
                  <span className="category-filter-label">카테고리</span>
                  <div className="category-filter-buttons">
                    {SCHEDULE_FILTER_CATEGORIES.map((category) => (
                      <button key={category} type="button" className={categoryFilter === category ? "active" : ""} onClick={() => setCategoryFilter(category)} aria-pressed={categoryFilter === category}>{category}</button>
                    ))}
                  </div>
                </div>

                <div className="date-range-filter" aria-label="일정 날짜 범위 필터">
                  <span className="date-range-filter-label">날짜</span>
                  <div className="date-range-filter-buttons">
                    {SCHEDULE_DATE_RANGE_FILTERS.map((dateRange) => (
                      <button key={dateRange} type="button" className={dateRangeFilter === dateRange ? "active" : ""} onClick={() => setDateRangeFilter(dateRange)} aria-pressed={dateRangeFilter === dateRange}>{dateRange}</button>
                    ))}
                  </div>
                </div>

                <div className="schedule-sort">
                  <label htmlFor="schedule-sort">일정 정렬</label>
                  <select id="schedule-sort" value={sortOption} onChange={(event) => setSortOption(event.target.value as ScheduleSortOption)}>
                    {SCHEDULE_SORT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              {filteredSchedules.length === 0 ? (
                <div className="search-empty">검색 조건에 맞는 일정이 없습니다.</div>
              ) : (
                <ScheduleList schedules={sortedSchedules} onToggle={toggleSchedule} onEdit={openEditForm} onDelete={deleteSchedule} />
              )}
            </>
          )}

          <div className="app-view-panel" hidden={appView !== "ai"}>
            <AiScheduleInput onApply={applyAiDraft} onSave={handleAiSave} />
          </div>
          <div className="app-view-panel" hidden={appView !== "backup"}>
            <BackupRestore schedules={schedules} onImport={importSchedules} />
          </div>

          {appView === "statistics" && <StatisticsView schedules={filteredSchedules} />}
          {appView === "settings" && (
            <SettingsView
              user={user}
              theme={theme}
              onToggleTheme={toggleTheme}
              onSwitchAccount={onSwitchAccount}
              onLogout={onLogout}
            />
          )}
        </main>
      </div>

      {/* 모바일에서는 어느 메뉴에서나 기존 일정 폼을 여는 고정 + 버튼을 사용합니다. */}
      <button
        type="button"
        className="mobile-schedule-fab"
        onClick={openAddForm}
        aria-label="일정 추가"
      >
        +
      </button>
    </>
  );
}

export default Main;
