import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Schedule,
  ScheduleFormValues,
} from "../types/schedule";
import type {
  ScheduleCategoryFilter,
  ScheduleSortOption,
} from "../types/ui";
import {
  addSchedule,
  deleteSchedule as deleteScheduleFromFirestore,
  getSchedules,
  updateSchedule,
} from "../services/scheduleService";
import { filterSchedules, sortSchedules } from "../utils/scheduleUtils";

export const useSchedules = (
  userId: string,
  searchText: string,
  categoryFilter: ScheduleCategoryFilter,
  sortOption: ScheduleSortOption,
) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const schedulesRef = useRef(schedules);

  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  useEffect(() => {
    let isActive = true;

    const fetchSchedules = async () => {
      try {
        const loadedSchedules = await getSchedules(userId);
        if (isActive) setSchedules(loadedSchedules);
      } catch (error) {
        console.error("Firestore에서 일정 데이터를 불러오지 못했습니다.", error);
      }
    };

    void fetchSchedules();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const filteredSchedules = useMemo(
    // 검색과 카테고리 필터를 먼저 적용한 뒤 그 결과를 선택한 방식으로 정렬합니다.
    () => {
      const filtered = filterSchedules(schedules, searchText, categoryFilter);
      return sortSchedules(filtered, sortOption);
    },
    [categoryFilter, schedules, searchText, sortOption],
  );

  const openEditSchedule = useCallback((id: string) => {
    const selectedSchedule = schedulesRef.current.find((schedule) => schedule.id === id);
    if (selectedSchedule) setEditingSchedule(selectedSchedule);
  }, []);

  const saveSchedule = useCallback(async (values: ScheduleFormValues) => {
    try {
      if (editingSchedule) {
        await updateSchedule(userId, editingSchedule.id, values);
        setSchedules((previous) =>
          previous.map((schedule) =>
            schedule.id === editingSchedule.id ? { ...schedule, ...values } : schedule,
          ),
        );
      } else {
        const scheduleData = { completed: false, ...values };
        const id = await addSchedule(userId, scheduleData);
        setSchedules((previous) => [...previous, { id, ...scheduleData }]);
      }
      setEditingSchedule(null);
      return true;
    } catch (error) {
      console.error("Firestore에 일정을 저장하지 못했습니다.", error);
      return false;
    }
  }, [editingSchedule, userId]);

  const cancelEditing = useCallback(() => setEditingSchedule(null), []);

  const toggleSchedule = useCallback(async (id: string) => {
    const selectedSchedule = schedulesRef.current.find((schedule) => schedule.id === id);
    if (!selectedSchedule) return;

    try {
      const completed = !selectedSchedule.completed;
      await updateSchedule(userId, id, { completed });
      setSchedules((previous) =>
        previous.map((schedule) =>
          schedule.id === id ? { ...schedule, completed } : schedule,
        ),
      );
    } catch (error) {
      console.error("Firestore에서 일정 완료 상태를 변경하지 못했습니다.", error);
    }
  }, [userId]);

  const deleteSchedule = useCallback(async (id: string) => {
    try {
      await deleteScheduleFromFirestore(userId, id);
      setSchedules((previous) => previous.filter((schedule) => schedule.id !== id));
      if (editingSchedule?.id === id) setEditingSchedule(null);
    } catch (error) {
      console.error("Firestore에서 일정을 삭제하지 못했습니다.", error);
    }
  }, [editingSchedule, userId]);

  return {
    filteredSchedules,
    editingSchedule,
    openEditSchedule,
    saveSchedule,
    cancelEditing,
    toggleSchedule,
    deleteSchedule,
  };
};
