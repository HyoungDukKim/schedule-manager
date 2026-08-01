import type {
  Schedule,
  ScheduleCategory,
  SchedulePriority,
} from "../types/schedule";

type PriorityStatistics = Record<
  SchedulePriority,
  { totalCount: number; completedCount: number }
>;

export const getScheduleStatistics = (schedules: Schedule[]) => {
  const totalCount = schedules.length;
  let completedCount = 0;
  let repeatCount = 0;
  let urgentCount = 0;
  const categoryCounts: Record<ScheduleCategory, number> = {
    업무: 0,
    개인: 0,
    운동: 0,
    공부: 0,
    기타: 0,
  };
  const priorityStatistics: PriorityStatistics = {
    높음: { totalCount: 0, completedCount: 0 },
    보통: { totalCount: 0, completedCount: 0 },
    낮음: { totalCount: 0, completedCount: 0 },
  };

  schedules.forEach((schedule) => {
    if (schedule.completed) completedCount += 1;
    if (schedule.repeat !== "반복 안함") repeatCount += 1;
    if (schedule.priority === "높음" && !schedule.completed) urgentCount += 1;

    categoryCounts[schedule.category] += 1;
    priorityStatistics[schedule.priority].totalCount += 1;
    if (schedule.completed) {
      priorityStatistics[schedule.priority].completedCount += 1;
    }
  });

  const incompleteCount = totalCount - completedCount;
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
    categoryCounts,
    priorityStatistics,
  };
};
