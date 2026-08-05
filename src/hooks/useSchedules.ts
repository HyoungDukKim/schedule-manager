import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Schedule,
  ScheduleFormValues,
} from "../types/schedule";
import type {
  ScheduleCategoryFilter,
  ScheduleDateRangeFilter,
  ScheduleSortOption,
} from "../types/ui";
import {
  addSchedule,
  deleteSchedule as deleteScheduleFromFirestore,
  getSchedules,
  updateSchedule,
} from "../services/scheduleService";
import {
  filterSchedules,
  filterSchedulesByDateRange,
  sortSchedules,
} from "../utils/scheduleUtils";

export const useSchedules = (
  userId: string,
  searchText: string,
  categoryFilter: ScheduleCategoryFilter,
  dateRangeFilter: ScheduleDateRangeFilter,
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

  const searchAndCategoryFilteredSchedules = useMemo(
    // Firestore 원본 일정에 검색을 적용한 뒤 카테고리로 한 번 더 걸러냅니다.
    () => filterSchedules(schedules, searchText, categoryFilter),
    [categoryFilter, schedules, searchText],
  );

  // 검색과 카테고리 다음 단계에서 선택한 로컬 날짜 범위를 적용합니다.
  const filteredSchedules = useMemo(
    () =>
      filterSchedulesByDateRange(
        searchAndCategoryFilteredSchedules,
        dateRangeFilter,
      ),
    [dateRangeFilter, searchAndCategoryFilteredSchedules],
  );

  // 검색과 카테고리 필터가 끝난 결과를 마지막 단계에서 정렬합니다.
  const sortedSchedules = useMemo(
    () => sortSchedules(filteredSchedules, sortOption),
    [filteredSchedules, sortOption],
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
    sortedSchedules,
    editingSchedule,
    openEditSchedule,
    saveSchedule,
    cancelEditing,
    toggleSchedule,
    deleteSchedule,
  };
};
