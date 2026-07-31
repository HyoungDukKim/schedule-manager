import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Schedule } from "../types/schedule";

const COLLECTION_NAME = "schedules";

// 일정 목록 조회
export const getSchedules = async (): Promise<Schedule[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Schedule[];
};

// 일정 추가
export const addSchedule = async (
  schedule: Omit<Schedule, "id">
): Promise<string> => {
  const documentRef = await addDoc(
    collection(db, COLLECTION_NAME),
    schedule
  );

  return documentRef.id;
};

// 일정 수정
export const updateSchedule = async (
  id: string,
  schedule: Omit<Schedule, "id">
) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), schedule);
};

// 일정 삭제
export const deleteSchedule = async (id: string) => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};