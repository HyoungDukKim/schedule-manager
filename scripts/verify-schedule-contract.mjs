import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
});

const baseSchedule = {
  title: "계약 검증 일정",
  completed: false,
  date: "2026-08-22",
  time: "09:00",
  category: "업무",
  priority: "보통",
  repeat: "반복 안함",
};

try {
  const contract = await server.ssrLoadModule("/shared/scheduleContract.ts");
  const { validateScheduleData, validateScheduleFormValues } = contract;

  const validSchedules = [
    baseSchedule,
    { ...baseSchedule, repeat: "매일" },
    { ...baseSchedule, repeat: "매주" },
    { ...baseSchedule, repeat: "매월" },
    { ...baseSchedule, repeat: "매년" },
    { ...baseSchedule, date: "2028-02-29" },
    { ...baseSchedule, repeat: "매주", repeatEndDate: "2026-12-31" },
    {
      ...baseSchedule,
      notificationEnabled: true,
      notificationMinutesBefore: 0,
    },
    {
      ...baseSchedule,
      notificationEnabled: true,
      notificationMinutesBefore: 30,
    },
  ];

  validSchedules.forEach((schedule, index) => {
    assert.equal(
      validateScheduleData(schedule).success,
      true,
      `정상 일정 ${index + 1}이 거부되었습니다.`,
    );
  });
  console.log(`✓ 정상 계약 조합 ${validSchedules.length}개 허용`);

  const legacyResult = validateScheduleData({
    ...baseSchedule,
    notificationEnabled: false,
  });
  assert.equal(legacyResult.success, true);
  assert.equal(legacyResult.data.notificationEnabled, undefined);
  assert.equal(legacyResult.data.notificationMinutesBefore, undefined);
  console.log("✓ 과거 notificationEnabled:false 단독 문서를 표준 형태로 정규화");

  const invalidSchedules = [
    ["실제로 존재하지 않는 날짜", { ...baseSchedule, date: "2026-02-31" }],
    ["평년의 2월 29일", { ...baseSchedule, date: "2026-02-29" }],
    ["잘못된 시간", { ...baseSchedule, time: "25:00" }],
    [
      "반복 안함과 종료일 조합",
      { ...baseSchedule, repeatEndDate: "2026-12-31" },
    ],
    [
      "시작일보다 빠른 종료일",
      { ...baseSchedule, repeat: "매주", repeatEndDate: "2026-08-21" },
    ],
    [
      "알림 시간만 존재",
      { ...baseSchedule, notificationMinutesBefore: 5 },
    ],
    [
      "알림 false와 시간 동시 존재",
      {
        ...baseSchedule,
        notificationEnabled: false,
        notificationMinutesBefore: 5,
      },
    ],
    [
      "허용되지 않은 20분 알림",
      {
        ...baseSchedule,
        notificationEnabled: true,
        notificationMinutesBefore: 20,
      },
    ],
    ["알 수 없는 카테고리", { ...baseSchedule, category: "미분류" }],
    ["알 수 없는 반복", { ...baseSchedule, repeat: "격주" }],
  ];

  invalidSchedules.forEach(([name, schedule]) => {
    assert.equal(
      validateScheduleData(schedule).success,
      false,
      `${name} 조합이 허용되었습니다.`,
    );
  });
  console.log(`✓ 비정상 계약 조합 ${invalidSchedules.length}개 차단`);

  const notificationSchedule = validSchedules.find(
    (schedule) => schedule.notificationMinutesBefore === 30,
  );
  assert.ok(notificationSchedule);
  const { completed: _completed, ...formValues } = notificationSchedule;
  const formResult = validateScheduleFormValues(formValues);
  assert.equal(formResult.success, true);
  assert.equal(formResult.data.notificationMinutesBefore, 30);
  console.log("✓ ScheduleFormValues도 동일한 공통 계약 적용");
} finally {
  await server.close();
}
