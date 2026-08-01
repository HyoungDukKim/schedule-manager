// React의 State 기능을 가져옵니다.
// 현재 달력에 표시할 연도와 월을 관리할 때 사용합니다.
import { memo, useCallback, useMemo, useState } from "react";

// 일정 데이터 타입을 가져옵니다.
import type { Schedule } from "../../types/schedule";

// 부모 Main 컴포넌트에서 받을 Props 타입입니다.
type Props = {
  // 달력에 표시할 일정 배열입니다.
  schedules: Schedule[];

  // 달력에서 일정을 눌렀을 때 수정폼을 여는 함수입니다.
  onEdit: (id: string) => void;
};

import { WEEK_DAYS } from "../../constants/schedule";
import { formatDate } from "../../utils/dateUtils";
import { isScheduleOnDate } from "../../utils/scheduleUtils";

function CalendarView({
  schedules,
  onEdit,
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

  // 현재 달력의 연도입니다.
  const currentYear =
    currentMonth.getFullYear();

  // 현재 달력의 월입니다.
  // JavaScript에서 월은 0부터 시작합니다.
  const currentMonthIndex =
    currentMonth.getMonth();

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
      const dailySchedules = schedules
        .filter((schedule) => isScheduleOnDate(schedule, targetDate))
        .sort((first, second) => first.time.localeCompare(second.time));

      result.set(targetDateString, dailySchedules);
    });

    return result;
  }, [calendarCells, currentMonthIndex, currentYear, schedules]);

  // 이전 달로 이동합니다.
  const moveToPreviousMonth = useCallback(() => {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }, []);

  // 다음 달로 이동합니다.
  const moveToNextMonth = useCallback(() => {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }, []);

  // 오늘이 포함된 달로 이동합니다.
  const moveToToday = useCallback(() => {
    setCurrentMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    );
  }, [today]);

  return (
    <section className="calendar">
      {/* 달력 연도·월과 이동 버튼 영역입니다. */}
      <div className="calendar-header">
        {/* 현재 달력의 연도와 월을 먼저 표시합니다. */}
        <h3>
          {currentYear}년{" "}
          {currentMonthIndex + 1}월
        </h3>

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

            // 해당 날짜에 표시할 일정을 찾습니다.
            const dailySchedules = schedulesByDate.get(targetDateString) ?? [];

            return (
              <div
                key={targetDateString}
                className={`calendar-cell ${
                  isToday ? "today" : ""
                }`}
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
                        onClick={() =>
                          onEdit(schedule.id)
                        }
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
                </div>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}

export default memo(CalendarView);
