import type { Schedule } from "../types/schedule";

export const getScheduleStatistics = (schedules: Schedule[]) => {
  const totalCount = schedules.length;
  const completedCount = schedules.filter((schedule) => schedule.completed).length;
  const incompleteCount = totalCount - completedCount;
  const repeatCount = schedules.filter((schedule) => schedule.repeat !== "반복 안함").length;
  const urgentCount = schedules.filter(
    (schedule) => schedule.priority === "높음" && !schedule.completed,
  ).length;
  const completionRate =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    totalCount,
    completedCount,
    incompleteCount,
    repeatCount,
    urgentCount,
    completionRate,
    completionDegree: completionRate * 3.6,
  };
};
