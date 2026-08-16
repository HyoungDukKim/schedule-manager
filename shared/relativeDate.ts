import type { AiScheduleRequestContext } from "./aiScheduleValidation.js";

const KOREAN_WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const;

const parseCalendarDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatCalendarDate = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

const addCalendarDays = (date: Date, amount: number) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
};

const createCalendarDate = (year: number, month: number, day: number) => {
  const result = new Date(Date.UTC(year, month - 1, day));
  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  ) {
    return null;
  }
  return result;
};

const getMonday = (date: Date) => {
  const daysAfterMonday = (date.getUTCDay() + 6) % 7;
  return addCalendarDays(date, -daysAfterMonday);
};

const getKoreanWeekdayIndex = (weekday: string) =>
  KOREAN_WEEKDAYS.indexOf(weekday as (typeof KOREAN_WEEKDAYS)[number]);

// AI가 계산할 필요가 없도록 사용자 localDate 기준의 주요 날짜표를 만듭니다.
export const buildRelativeDateReference = (context: AiScheduleRequestContext) => {
  const today = parseCalendarDate(context.localDate);
  const thisMonday = getMonday(today);
  const nextMonday = addCalendarDays(thisMonday, 7);
  const weekdayLines = KOREAN_WEEKDAYS.map((weekday, index) => {
    const mondayBasedOffset = index === 0 ? 6 : index - 1;
    return `- 이번주 ${weekday}: ${formatCalendarDate(addCalendarDays(thisMonday, mondayBasedOffset))}\n- 다음주 ${weekday}: ${formatCalendarDate(addCalendarDays(nextMonday, mondayBasedOffset))}`;
  });

  return [
    `- 오늘: ${formatCalendarDate(today)} (${KOREAN_WEEKDAYS[today.getUTCDay()]})`,
    `- 내일: ${formatCalendarDate(addCalendarDays(today, 1))} (${KOREAN_WEEKDAYS[addCalendarDays(today, 1).getUTCDay()]})`,
    `- 모레: ${formatCalendarDate(addCalendarDays(today, 2))} (${KOREAN_WEEKDAYS[addCalendarDays(today, 2).getUTCDay()]})`,
    ...weekdayLines,
  ].join("\n");
};

// 명확하게 인식할 수 있는 상대 날짜는 서버에서 한 번 더 결정론적으로 계산합니다.
export const resolveRelativeDate = (
  text: string,
  context: AiScheduleRequestContext,
): string | null => {
  const today = parseCalendarDate(context.localDate);

  if (/모레/.test(text)) return formatCalendarDate(addCalendarDays(today, 2));
  if (/내일/.test(text)) return formatCalendarDate(addCalendarDays(today, 1));
  if (/오늘/.test(text)) return formatCalendarDate(today);

  const weeklyMatch = text.match(/(이번\s*주|다음\s*주)\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/);
  if (weeklyMatch) {
    const weekOffset = weeklyMatch[1].replace(/\s/g, "") === "다음주" ? 7 : 0;
    const weekdayIndex = getKoreanWeekdayIndex(weeklyMatch[2]);
    const mondayBasedOffset = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
    return formatCalendarDate(addCalendarDays(getMonday(today), weekOffset + mondayBasedOffset));
  }

  const nextMonthMatch = text.match(/다음\s*달\s*(\d{1,2})일/);
  if (nextMonthMatch) {
    const year = today.getUTCFullYear() + (today.getUTCMonth() === 11 ? 1 : 0);
    const month = ((today.getUTCMonth() + 1) % 12) + 1;
    const result = createCalendarDate(year, month, Number(nextMonthMatch[1]));
    return result ? formatCalendarDate(result) : null;
  }

  const yearMatch = text.match(/(올해|내년)\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (yearMatch) {
    const year = today.getUTCFullYear() + (yearMatch[1] === "내년" ? 1 : 0);
    const result = createCalendarDate(year, Number(yearMatch[2]), Number(yearMatch[3]));
    return result ? formatCalendarDate(result) : null;
  }

  return null;
};

export const getDateWeekday = (date: string) =>
  KOREAN_WEEKDAYS[parseCalendarDate(date).getUTCDay()];
