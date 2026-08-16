// React의 State 기능을 가져옵니다.
// 현재 달력에 표시할 연도와 월을 관리할 때 사용합니다.
import { memo, useCallback, useEffect, useMemo, useState } from "react";

// 일정 데이터 타입을 가져옵니다.
import type { Schedule } from "../../types/schedule";
import type { ScheduleDateRangeFilter } from "../../types/ui";

// 부모 Main 컴포넌트에서 받을 Props 타입입니다.
type Props = {
  // 달력에 표시할 일정 배열입니다.
  schedules: Schedule[];

  // 선택한 날짜 범위 밖의 달력 칸에는 일정을 표시하지 않습니다.
  dateRangeFilter: ScheduleDateRangeFilter;

  // 달력에서 일정을 눌렀을 때 수정폼을 여는 함수입니다.
  onEdit: (id: string) => void;

  // 선택한 날짜를 초기값으로 기존 일정 폼을 여는 함수입니다.
  onAddForDate: (date: string) => void;
};

import { WEEK_DAYS } from "../../constants/schedule";
import { formatDate, parseDate } from "../../utils/dateUtils";
import {
  getSchedulesForDate,
  isDateInScheduleRange,
} from "../../utils/scheduleUtils";

function CalendarView({
  schedules,
  dateRangeFilter,
  onEdit,
  onAddForDate,
}: Props) {
  // 오늘 날짜입니다.
  const [today] = useState(() => new Date());

  // 달력에 표시할 연도와 월을 관리합니다.
  //
  // 날짜는 1일로 고정하여
  // 월 이동 시 날짜 초과 문제를 방지합니다.
  const [currentMonth, setCurrentMonth] =
    useState(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    );

  // 모바일은 전체 월간 달력으로, PC는 기존처럼 오늘 선택 상태로 시작합니다.
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    window.matchMedia("(max-width: 700px)").matches
      ? null
      : formatDate(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  // 모바일에서 년·월 선택 Bottom Sheet가 열려 있는지 관리합니다.
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // 현재 달력의 연도입니다.
  const currentYear =
    currentMonth.getFullYear();

  // 현재 달력의 월입니다.
  // JavaScript에서 월은 0부터 시작합니다.
  const currentMonthIndex =
    currentMonth.getMonth();

  // 너무 좁지 않으면서도 빠르게 선택할 수 있도록 현재 연도 기준 앞뒤 10년을 제공합니다.
  const selectableYears = useMemo(
    () => Array.from({ length: 21 }, (_, index) => today.getFullYear() - 10 + index),
    [today],
  );

  // 현재 달의 1일이 무슨 요일인지 확인합니다.
  //
  // 일요일: 0
  // 월요일: 1
  // ...
  // 토요일: 6
  // 달력은 최대 6주이므로 42칸을 만듭니다.
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonthIndex, 1).getDay();
    const lastDate = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

    return Array.from({ length: 42 }, (_, index) => {
      // 실제 날짜 숫자를 계산합니다.
      const day = index - firstDayIndex + 1;

      // 현재 달에 포함되지 않는 칸은 null로 반환합니다.
      if (day < 1 || day > lastDate) {
        return null;
      }

      return day;
    });
  }, [currentMonthIndex, currentYear]);

  const schedulesByDate = useMemo(() => {
    const result = new Map<string, Schedule[]>();

    calendarCells.forEach((day) => {
      if (day === null) return;

      const targetDate = new Date(currentYear, currentMonthIndex, day);
      const targetDateString = formatDate(currentYear, currentMonthIndex, day);

      // 날짜 칸은 유지하되 선택 범위 밖에서는 일정만 비워 둡니다.
      if (!isDateInScheduleRange(targetDate, dateRangeFilter, today)) {
        result.set(targetDateString, []);
        return;
      }

      const dailySchedules = getSchedulesForDate(schedules, targetDate);

      result.set(targetDateString, dailySchedules);
    });

    return result;
  }, [calendarCells, currentMonthIndex, currentYear, dateRangeFilter, schedules, today]);

  // 반복 일정을 포함해 선택한 날짜에 실제 발생하는 일정만 시간순으로 표시합니다.
  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return [];
    const targetDate = parseDate(selectedDate);
    return getSchedulesForDate(schedules, targetDate);
  }, [schedules, selectedDate]);

  const selectedDateParts = selectedDate?.split("-").map(Number) ?? [];
  const selectedDateWeekday = selectedDate
    ? WEEK_DAYS[parseDate(selectedDate).getDay()]
    : "";

  // 다른 달로 이동하면 그 달이 오늘의 달인 경우 오늘을, 아니면 1일을 선택합니다.
  const moveMonth = useCallback((amount: number) => {
    const nextMonth = new Date(currentYear, currentMonthIndex + amount, 1);
    const isTodayMonth =
      nextMonth.getFullYear() === today.getFullYear() &&
      nextMonth.getMonth() === today.getMonth();
    setCurrentMonth(nextMonth);
    // 모바일 기본 상태처럼 선택이 없었다면 새 달에서도 전체 달력을 유지합니다.
    if (selectedDate) {
      setSelectedDate(formatDate(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        isTodayMonth ? today.getDate() : 1,
      ));
    }
  }, [currentMonthIndex, currentYear, selectedDate, today]);

  // 이전 달로 이동합니다.
  const moveToPreviousMonth = useCallback(() => {
    moveMonth(-1);
  }, [moveMonth]);

  // 다음 달로 이동합니다.
  const moveToNextMonth = useCallback(() => {
    moveMonth(1);
  }, [moveMonth]);

  // 오늘이 포함된 달로 이동합니다.
  const moveToToday = useCallback(() => {
    setCurrentMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    );
    setSelectedDate(formatDate(today.getFullYear(), today.getMonth(), today.getDate()));
  }, [today]);

  // 년 또는 월을 바꾸면 해당 월의 달력으로 즉시 이동하고 날짜 선택은 해제합니다.
  const moveToSelectedMonth = useCallback((year: number, monthIndex: number) => {
    setCurrentMonth(new Date(year, monthIndex, 1));
    setSelectedDate(null);
  }, []);

  // Bottom Sheet가 열려 있을 때 Escape 키로도 닫을 수 있게 합니다.
  useEffect(() => {
    if (!isMonthPickerOpen) return;

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMonthPickerOpen(false);
    };

    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [isMonthPickerOpen]);

  return (
    <section className={`calendar ${selectedDate ? "has-selection" : ""}`}>
      {/* 달력 연도·월과 이동 버튼 영역입니다. */}
      <div className="calendar-header">
        <div className="calendar-month-heading">
          {/* PC에서는 기존 년·월 제목을 그대로 표시합니다. */}
          <h3 className="desktop-calendar-month">
            {currentYear}년{" "}
            {currentMonthIndex + 1}월
          </h3>

          {/* 모바일에서는 년·월을 누르면 원하는 달을 고를 수 있습니다. */}
          <button
            type="button"
            className="mobile-calendar-month-trigger"
            aria-haspopup="dialog"
            aria-expanded={isMonthPickerOpen}
            onClick={() => setIsMonthPickerOpen(true)}
          >
            {currentYear}. {currentMonthIndex + 1}.
            <span aria-hidden="true">▼</span>
          </button>
        </div>

        {/* 이전 달, 오늘, 다음 달 이동 버튼입니다. */}
        <div className="calendar-navigation">
          <button
            type="button"
            onClick={moveToPreviousMonth}
            aria-label="이전 달"
          >
            ←
          </button>

          <button
            type="button"
            className="today-btn"
            onClick={moveToToday}
          >
            오늘
          </button>

          <button
            type="button"
            onClick={moveToNextMonth}
            aria-label="다음 달"
          >
            →
          </button>
        </div>
      </div>

      {isMonthPickerOpen && (
        <div
          className="mobile-month-picker-backdrop"
          role="presentation"
          onClick={() => setIsMonthPickerOpen(false)}
        >
          <section
            className="mobile-month-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="month-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-month-picker-header">
              <h3 id="month-picker-title">년·월 이동</h3>
              <button type="button" onClick={() => setIsMonthPickerOpen(false)} aria-label="년·월 선택 닫기">
                ×
              </button>
            </div>

            <div className="mobile-month-picker-fields">
              <label>
                년
                <select
                  value={currentYear}
                  onChange={(event) => moveToSelectedMonth(Number(event.target.value), currentMonthIndex)}
                >
                  {selectableYears.map((year) => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </label>

              <label>
                월
                <select
                  value={currentMonthIndex}
                  onChange={(event) => moveToSelectedMonth(currentYear, Number(event.target.value))}
                >
                  {Array.from({ length: 12 }, (_, monthIndex) => (
                    <option key={monthIndex} value={monthIndex}>{monthIndex + 1}월</option>
                  ))}
                </select>
              </label>
            </div>

            <button type="button" className="mobile-month-picker-done" onClick={() => setIsMonthPickerOpen(false)}>
              완료
            </button>
          </section>
        </div>
      )}

      {/* 요일 제목입니다. */}
      <div className="calendar-weekdays">
        {WEEK_DAYS.map((weekDay) => (
          <div
            key={weekDay}
            className="calendar-weekday"
          >
            {weekDay}
          </div>
        ))}
      </div>

      {/* 날짜 42칸을 표시합니다. */}
      <div className="calendar-grid">
        {calendarCells.map(
          (day, index) => {
            // 현재 달에 속하지 않는 빈칸입니다.
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="calendar-cell empty"
                />
              );
            }

            // 현재 달력 칸의 Date 객체입니다.
            // 현재 날짜의 YYYY-MM-DD 문자열입니다.
            const targetDateString =
              formatDate(
                currentYear,
                currentMonthIndex,
                day,
              );

            // 오늘인지 확인합니다.
            const isToday =
              targetDateString ===
              formatDate(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
              );
            const isSelected = targetDateString === selectedDate;

            // 해당 날짜에 표시할 일정을 찾습니다.
            const dailySchedules = schedulesByDate.get(targetDateString) ?? [];

            return (
              <div
                key={targetDateString}
                className={`calendar-cell ${
                  isToday ? "today" : ""
                } ${isSelected ? "selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${currentMonthIndex + 1}월 ${day}일 선택`}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate((current) =>
                  current === targetDateString ? null : targetDateString
                )}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDate((current) =>
                      current === targetDateString ? null : targetDateString
                    );
                  }
                }}
              >
                {/* 날짜 숫자입니다. */}
                <div className="calendar-date-header">
                  <span
                    className="calendar-date-number"
                  >
                    {day}
                  </span>

                  {/* 일정 개수가 있을 때만 표시합니다. */}
                  {dailySchedules.length >
                    0 && (
                    <span className="calendar-count">
                      {dailySchedules.length}
                    </span>
                  )}
                </div>

                {/* 날짜별 일정 목록입니다. */}
                <div className="calendar-schedules">
                  {dailySchedules.map(
                    (schedule) => (
                      <button
                        key={`${targetDateString}-${schedule.id}`}
                        type="button"
                        className="calendar-schedule"
                        data-category={
                          schedule.category
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDate(targetDateString);
                          onEdit(schedule.id);
                        }}
                        title={`${schedule.time} ${schedule.title}`}
                      >
                        <span className="calendar-schedule-time">
                          {schedule.time}
                        </span>

                        <span className="calendar-schedule-title">
                          {schedule.title}
                        </span>

                        {schedule.repeat !==
                          "반복 안함" && (
                          <span
                            className="calendar-repeat"
                            aria-label={
                              schedule.repeat
                            }
                          >
                            ↻
                          </span>
                        )}
                      </button>
                    ),
                  )}
                  {dailySchedules.length > 3 && (
                    <span className="calendar-more-count">+{dailySchedules.length - 3}</span>
                  )}
                </div>

                <div className="calendar-dots" aria-label={`일정 ${dailySchedules.length}개`}>
                  {dailySchedules.slice(0, 3).map((schedule) => (
                    <span key={schedule.id} data-category={schedule.category} />
                  ))}
                </div>
              </div>
            );
          },
        )}
      </div>

      {selectedDate && (
        <section className="selected-date-panel" aria-labelledby="selected-date-title">
          <div className="selected-date-panel-header">
            <h3 id="selected-date-title">
              {selectedDateParts[1]}.{selectedDateParts[2]}. {selectedDateWeekday}
            </h3>
            <div>
              <span>일정 {selectedDateSchedules.length}개</span>
              <button type="button" onClick={() => setSelectedDate(null)} aria-label="선택 날짜 접기">접기</button>
            </div>
          </div>

          {selectedDateSchedules.length === 0 ? (
            <p className="selected-date-empty">등록된 일정이 없습니다.</p>
          ) : (
            <div className="selected-date-list">
              {selectedDateSchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  type="button"
                  className={`selected-date-schedule ${schedule.completed ? "completed" : ""}`}
                  data-category={schedule.category}
                  onClick={() => onEdit(schedule.id)}
                >
                  <strong>{schedule.time}</strong>
                  <span className="selected-date-schedule-title">{schedule.title}</span>
                  <span className="selected-date-schedule-meta">
                    {schedule.category} · {schedule.priority}
                    {schedule.repeat !== "반복 안함" && ` · ${schedule.repeat}`}
                    {schedule.notificationEnabled && " · 🔔"}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button type="button" className="selected-date-add-btn" onClick={() => onAddForDate(selectedDate)}>
            + {selectedDateParts[1]}월 {selectedDateParts[2]}일 일정 등록
          </button>
        </section>
      )}
    </section>
  );
}

export default memo(CalendarView);
