// 일정 데이터 타입을 가져옵니다.
import type { Schedule } from "../../types/schedule";

// 일정 한 개를 표시하는 컴포넌트입니다.
import ScheduleItem from "./ScheduleItem";

// Main으로부터 받는 Props 타입입니다.
type Props = {
  // 화면에 표시할 일정 배열입니다.
  schedules: Schedule[];

  // 완료 상태 변경 함수입니다.
  onToggle: (id: number) => void;

  // 수정폼 열기 함수입니다.
  onEdit: (id: number) => void;

  // 일정 삭제 함수입니다.
  onDelete: (id: number) => void;
};

function ScheduleList({
  schedules,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="schedule-list">
      {/* 일정 배열을 화면 요소로 변환합니다. */}
      {schedules.map((schedule) => (
        <ScheduleItem
          key={schedule.id}
          id={schedule.id}
          title={schedule.title}
          date={schedule.date}
          time={schedule.time}
          category={schedule.category}
          priority={schedule.priority}
          repeat={schedule.repeat}
          completed={schedule.completed}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default ScheduleList;