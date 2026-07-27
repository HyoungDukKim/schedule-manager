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

// 두 날짜 사이의 날짜 차이를 계산합니다.
export const getDateDifference = (startDate: Date, targetDate: Date) => {
  const oneDay = 1000 * 60 * 60 * 24;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return Math.floor((target.getTime() - start.getTime()) / oneDay);
};
