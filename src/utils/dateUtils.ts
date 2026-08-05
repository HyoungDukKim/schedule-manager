// 숫자를 두 자리 문자열로 변환합니다.
export const padNumber = (value: number) => String(value).padStart(2, "0");

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환합니다.
export const getToday = () => {
  const today = new Date();
  return formatDate(today.getFullYear(), today.getMonth(), today.getDate());
};

// 연도, 월, 일을 YYYY-MM-DD 형식으로 변환합니다.
export const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${padNumber(month + 1)}-${padNumber(day)}`;
};

// YYYY-MM-DD 문자열을 지역 시간 기준 Date 객체로 변환합니다.
export const parseDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// 전달받은 날짜를 시간 정보가 없는 로컬 자정 기준 날짜로 만듭니다.
export const getLocalDate = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

// 원본 Date 객체를 변경하지 않고 지정한 일수만큼 이동한 새 날짜를 반환합니다.
export const addDays = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);

// 별도 주간 기준이 없으므로 이번 주의 시작일을 월요일로 계산합니다.
export const getMondayOfWeek = (date: Date) => {
  const localDate = getLocalDate(date);
  const daysAfterMonday = (localDate.getDay() + 6) % 7;
  return addDays(localDate, -daysAfterMonday);
};

// 두 날짜 사이의 날짜 차이를 계산합니다.
export const getDateDifference = (startDate: Date, targetDate: Date) => {
  const oneDay = 1000 * 60 * 60 * 24;
  const start = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const target = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return Math.floor((target - start) / oneDay);
};
