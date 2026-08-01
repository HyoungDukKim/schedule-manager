import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
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
    isScheduleRepeat(schedule.repeat)
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
  await updateDoc(getScheduleDocument(userId, id), schedule);
};

// 일정 삭제
export const deleteSchedule = async (userId: string, id: string) => {
  await deleteDoc(getScheduleDocument(userId, id));
};
