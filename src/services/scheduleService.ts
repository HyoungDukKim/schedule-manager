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
  validateScheduleData,
  validateScheduleFormValues,
} from "../../shared/scheduleContract.js";

const COLLECTION_NAME = "schedules";

const getSchedulesCollection = (userId: string) =>
  collection(db, "users", userId, COLLECTION_NAME);

const getScheduleDocument = (userId: string, scheduleId: string) =>
  doc(db, "users", userId, COLLECTION_NAME, scheduleId);

export class ScheduleDataValidationError extends Error {
  constructor() {
    super("Schedule data does not match the application contract.");
    this.name = "ScheduleDataValidationError";
  }
}

export type ScheduleLoadResult = {
  schedules: Schedule[];
  invalidCount: number;
};

// 일정 목록 조회
export const getSchedules = async (userId: string): Promise<ScheduleLoadResult> => {
  const snapshot = await getDocs(getSchedulesCollection(userId));
  const schedules: Schedule[] = [];
  let invalidCount = 0;

  snapshot.docs.forEach((document) => {
    const data: unknown = document.data();
    const validation = validateScheduleData(data);
    if (validation.success) {
      schedules.push({ id: document.id, ...validation.data });
    } else {
      // 문서 내용이나 ID는 노출하지 않고 누락 개수만 상위 Hook에 전달합니다.
      invalidCount += 1;
    }
  });

  return { schedules, invalidCount };
};

// 일정 추가
export const addSchedule = async (
  userId: string,
  schedule: ScheduleData,
): Promise<string> => {
  const validation = validateScheduleData(schedule);
  if (!validation.success) throw new ScheduleDataValidationError();
  const documentRef = await addDoc(
    getSchedulesCollection(userId),
    validation.data,
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
  const normalizedSchedules = schedules.map((schedule) => {
    const validation = validateScheduleData(schedule);
    if (!validation.success) throw new ScheduleDataValidationError();
    return validation.data;
  });

  // Firestore batch는 최대 500개 쓰기를 지원하므로 안전하게 나눠 저장합니다.
  for (let start = 0; start < normalizedSchedules.length; start += 500) {
    const chunk = normalizedSchedules.slice(start, start + 500);
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
  const isFullFormUpdate = "title" in schedule;
  let normalizedUpdate: Record<string, unknown>;

  if (isFullFormUpdate) {
    const validation = validateScheduleFormValues(schedule);
    if (!validation.success) throw new ScheduleDataValidationError();
    normalizedUpdate = { ...validation.data };
  } else {
    const updateKeys = Object.keys(schedule);
    if (
      updateKeys.length !== 1 ||
      updateKeys[0] !== "completed" ||
      typeof schedule.completed !== "boolean"
    ) {
      throw new ScheduleDataValidationError();
    }
    normalizedUpdate = { completed: schedule.completed };
  }

  const updateData: Record<string, unknown> = { ...normalizedUpdate };

  // 폼 전체 수정에서 종료일을 선택하지 않았다면 과거 종료일 필드를 제거합니다.
  // 완료 체크처럼 repeat를 보내지 않는 부분 수정에서는 기존 종료일을 유지합니다.
  if (isFullFormUpdate && !normalizedUpdate.repeatEndDate) {
    updateData.repeatEndDate = deleteField();
  }

  // 전체 폼 수정에서 알림을 끄면 이전 알림 선택 필드를 함께 제거합니다.
  if (isFullFormUpdate && normalizedUpdate.notificationEnabled !== true) {
    updateData.notificationEnabled = deleteField();
    updateData.notificationMinutesBefore = deleteField();
  }

  await updateDoc(getScheduleDocument(userId, id), updateData);
};

// 일정 삭제
export const deleteSchedule = async (userId: string, id: string) => {
  await deleteDoc(getScheduleDocument(userId, id));
};
