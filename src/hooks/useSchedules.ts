import { useEffect, useMemo, useState } from "react";
import { STORAGE_KEY } from "../constants/schedule";
import type {
  Schedule,
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../types/schedule";
import { filterSchedules, loadSchedules } from "../utils/scheduleUtils";

export type ScheduleFormValues = {
  title: string;
  date: string;
  time: string;
  category: ScheduleCategory;
  priority: SchedulePriority;
  repeat: ScheduleRepeat;
};

export const useSchedules = (searchText: string) => {
  const [schedules, setSchedules] = useState<Schedule[]>(loadSchedules);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  }, [schedules]);

  const filteredSchedules = useMemo(
    () => filterSchedules(schedules, searchText),
    [schedules, searchText],
  );

  const openEditSchedule = (id: number) => {
    const selectedSchedule = schedules.find((schedule) => schedule.id === id);
    if (selectedSchedule) setEditingSchedule(selectedSchedule);
  };

  const saveSchedule = (values: ScheduleFormValues) => {
    if (editingSchedule) {
      setSchedules((previous) =>
        previous.map((schedule) =>
          schedule.id === editingSchedule.id ? { ...schedule, ...values } : schedule,
        ),
      );
    } else {
      setSchedules((previous) => [
        ...previous,
        { id: Date.now(), completed: false, ...values },
      ]);
    }
    setEditingSchedule(null);
  };

  const cancelEditing = () => setEditingSchedule(null);

  const toggleSchedule = (id: number) => {
    setSchedules((previous) =>
      previous.map((schedule) =>
        schedule.id === id ? { ...schedule, completed: !schedule.completed } : schedule,
      ),
    );
  };

  const deleteSchedule = (id: number) => {
    setSchedules((previous) => previous.filter((schedule) => schedule.id !== id));
    if (editingSchedule?.id === id) setEditingSchedule(null);
  };

  return {
    schedules,
    filteredSchedules,
    editingSchedule,
    setEditingSchedule,
    openEditSchedule,
    saveSchedule,
    cancelEditing,
    toggleSchedule,
    deleteSchedule,
  };
};
