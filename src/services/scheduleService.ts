import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Schedule, ScheduleData } from "../types/schedule";
import {
  isScheduleCategory,
  isSchedulePriority,
  isScheduleRepeat,
} from "../utils/scheduleUtils";

const COLLECTION_NAME = "schedules";

const getSchedulesCollection = (userId: string) =>
  collection(db, "users", userId, COLLECTION_NAME);

const getScheduleDocument = (userId: string, scheduleId: string) =>
  doc(db, "users", userId, COLLECTION_NAME, scheduleId);

// Firestore의 선택적 반복 종료일이 YYYY-MM-DD 형식인지 확인합니다.
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const NOTIFICATION_MINUTES = [0, 5, 10, 30, 60] as const;

// Firestore에서 읽은 값이 앱이 허용하는 알림 시간인지 확인합니다.
const isNotificationMinutes = (value: unknown) =>
  typeof value === "number" &&
  NOTIFICATION_MINUTES.includes(value as (typeof NOTIFICATION_MINUTES)[number]);

const isScheduleData = (value: unknown): value is ScheduleData => {
  if (typeof value !== "object" || value === null) return false;

  const schedule = value as Record<string, unknown>;
  return (
    typeof schedule.title === "string" &&
    typeof schedule.completed === "boolean" &&
    typeof schedule.date === "string" &&
    typeof schedule.time === "string" &&
    isScheduleCategory(schedule.category) &&
    isSchedulePriority(schedule.priority) &&
    isScheduleRepeat(schedule.repeat) &&
    (schedule.repeatEndDate === undefined ||
      (typeof schedule.repeatEndDate === "string" &&
        DATE_PATTERN.test(schedule.repeatEndDate))) &&
    (schedule.notificationEnabled === undefined ||
      typeof schedule.notificationEnabled === "boolean") &&
    (schedule.notificationMinutesBefore === undefined ||
      isNotificationMinutes(schedule.notificationMinutesBefore)) &&
    (schedule.notificationEnabled !== true ||
      isNotificationMinutes(schedule.notificationMinutesBefore))
  );
};

// 일정 목록 조회
export const getSchedules = async (userId: string): Promise<Schedule[]> => {
  const snapshot = await getDocs(getSchedulesCollection(userId));

  return snapshot.docs.flatMap((document): Schedule[] => {
    const data: unknown = document.data();
    return isScheduleData(data) ? [{ id: document.id, ...data }] : [];
  });
};

// 일정 추가
export const addSchedule = async (
  userId: string,
  schedule: ScheduleData,
): Promise<string> => {
  const documentRef = await addDoc(
    getSchedulesCollection(userId),
    schedule
  );

  return documentRef.id;
};

// 검증과 사용자 확인이 끝난 백업 일정을 새 문서로 일괄 추가합니다.
export const addSchedules = async (
  userId: string,
  schedules: ScheduleData[],
): Promise<Schedule[]> => {
  const importedSchedules: Schedule[] = [];
  const collectionReference = getSchedulesCollection(userId);

  // Firestore batch는 최대 500개 쓰기를 지원하므로 안전하게 나눠 저장합니다.
  for (let start = 0; start < schedules.length; start += 500) {
    const chunk = schedules.slice(start, start + 500);
    const batch = writeBatch(db);
    const chunkWithIds = chunk.map((schedule) => {
      const documentReference = doc(collectionReference);
      batch.set(documentReference, schedule);
      return { id: documentReference.id, ...schedule };
    });

    await batch.commit();
    importedSchedules.push(...chunkWithIds);
  }

  return importedSchedules;
};

// 일정 수정
export const updateSchedule = async (
  userId: string,
  id: string,
  schedule: Partial<ScheduleData>,
): Promise<void> => {
  const updateData: Record<string, unknown> = { ...schedule };

  // 폼 전체 수정에서 종료일을 선택하지 않았다면 과거 종료일 필드를 제거합니다.
  // 완료 체크처럼 repeat를 보내지 않는 부분 수정에서는 기존 종료일을 유지합니다.
  if ("repeat" in schedule && !schedule.repeatEndDate) {
    updateData.repeatEndDate = deleteField();
  }

  // 전체 폼 수정에서 알림을 끄면 이전 알림 선택 필드를 함께 제거합니다.
  if ("repeat" in schedule && schedule.notificationEnabled !== true) {
    updateData.notificationEnabled = deleteField();
    updateData.notificationMinutesBefore = deleteField();
  }

  await updateDoc(getScheduleDocument(userId, id), updateData);
};

// 일정 삭제
export const deleteSchedule = async (userId: string, id: string) => {
  await deleteDoc(getScheduleDocument(userId, id));
};
