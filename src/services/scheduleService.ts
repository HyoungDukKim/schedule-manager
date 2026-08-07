import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
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
        DATE_PATTERN.test(schedule.repeatEndDate)))
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

  await updateDoc(getScheduleDocument(userId, id), updateData);
};

// 일정 삭제
export const deleteSchedule = async (userId: string, id: string) => {
  await deleteDoc(getScheduleDocument(userId, id));
};
