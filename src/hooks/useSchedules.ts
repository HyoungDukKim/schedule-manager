import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Schedule,
  ScheduleData,
  ScheduleFormValues,
} from "../types/schedule";
import type {
  ScheduleCategoryFilter,
  ScheduleDateRangeFilter,
  ScheduleSortOption,
} from "../types/ui";
import {
  addSchedule,
  addSchedules as addSchedulesToFirestore,
  deleteSchedule as deleteScheduleFromFirestore,
  getSchedules,
  updateSchedule,
} from "../services/scheduleService";
import {
  filterSchedules,
  filterSchedulesByDateRange,
  sortSchedules,
} from "../utils/scheduleUtils";

// 오프라인은 전역 PWA 안내가 담당하고, 온라인 Firebase 오류만 본문에 표시합니다.
const getScheduleErrorMessage = () =>
  navigator.onLine
    ? "일정 데이터에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
    : null;

export const useSchedules = (
  userId: string,
  searchText: string,
  categoryFilter: ScheduleCategoryFilter,
  dateRangeFilter: ScheduleDateRangeFilter,
  sortOption: ScheduleSortOption,
) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const schedulesRef = useRef(schedules);

  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  useEffect(() => {
    let isActive = true;

    const fetchSchedules = async () => {
      // Effect 본문의 동기 State 변경을 피하면서 계정 전환 직후 이전 일정을 비웁니다.
      await Promise.resolve();
      if (!isActive) return;
      setSchedules([]);
      schedulesRef.current = [];
      setEditingSchedule(null);
      setScheduleError(null);

      try {
        const loadedSchedules = await getSchedules(userId);
        if (isActive) setSchedules(loadedSchedules);
      } catch (error) {
        console.error("Firestore에서 일정 데이터를 불러오지 못했습니다.", error);
        if (isActive) setScheduleError(getScheduleErrorMessage());
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
            // 폼 값은 일정의 전체 편집 가능 필드이므로 종료일 제거도 그대로 반영합니다.
            schedule.id === editingSchedule.id
              ? {
                  id: schedule.id,
                  completed: schedule.completed,
                  ...values,
                }
              : schedule,
          ),
        );
      } else {
        const scheduleData = { completed: false, ...values };
        const id = await addSchedule(userId, scheduleData);
        setSchedules((previous) => [...previous, { id, ...scheduleData }]);
      }
      setEditingSchedule(null);
      setScheduleError(null);
      return true;
    } catch (error) {
      console.error("Firestore에 일정을 저장하지 못했습니다.", error);
      setScheduleError(getScheduleErrorMessage());
      return false;
    }
  }, [editingSchedule, userId]);

  const cancelEditing = useCallback(() => setEditingSchedule(null), []);

  // 미리보기에서 확인한 일정만 현재 로그인 사용자의 새 문서로 추가합니다.
  const importSchedules = useCallback(async (values: ScheduleData[]) => {
    try {
      const importedSchedules = await addSchedulesToFirestore(userId, values);
      setSchedules((previous) => [...previous, ...importedSchedules]);
      setScheduleError(null);
      return true;
    } catch (error) {
      console.error("Firestore에 백업 일정을 가져오지 못했습니다.", error);
      setScheduleError(getScheduleErrorMessage());
      return false;
    }
  }, [userId]);

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
      setScheduleError(null);
    } catch (error) {
      console.error("Firestore에서 일정 완료 상태를 변경하지 못했습니다.", error);
      setScheduleError(getScheduleErrorMessage());
    }
  }, [userId]);

  const deleteSchedule = useCallback(async (id: string) => {
    try {
      await deleteScheduleFromFirestore(userId, id);
      setSchedules((previous) => previous.filter((schedule) => schedule.id !== id));
      if (editingSchedule?.id === id) setEditingSchedule(null);
      setScheduleError(null);
    } catch (error) {
      console.error("Firestore에서 일정을 삭제하지 못했습니다.", error);
      setScheduleError(getScheduleErrorMessage());
    }
  }, [editingSchedule, userId]);

  return {
    schedules,
    filteredSchedules,
    sortedSchedules,
    scheduleError,
    editingSchedule,
    openEditSchedule,
    saveSchedule,
    cancelEditing,
    importSchedules,
    toggleSchedule,
    deleteSchedule,
  };
};
