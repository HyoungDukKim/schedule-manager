import { memo } from "react";
import type { Schedule } from "../../types/schedule";

// ScheduleList로부터 받는 Props 타입입니다.
type Props = {
  schedule: Schedule;

  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function ScheduleItem({
  schedule: {
    id,
    title,
    date,
    time,
    category,
    priority,
    repeat,
    repeatEndDate,
    completed,
  },
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="schedule-item">
      {/* 체크박스와 일정 정보 영역입니다. */}
      <label className="schedule-content">
        <input
          type="checkbox"
          checked={completed}
          onChange={() => onToggle(id)}
        />

        <span className="schedule-info">
          {/* 완료된 일정은 취소선을 표시합니다. */}
          <span
            className={
              completed ? "completed" : ""
            }
          >
            {title}
          </span>

          {/* 일정 날짜와 시간 */}
          <span className="schedule-datetime">
            <span>📅 {date}</span>
            <span>⏰ {time}</span>
          </span>

          {/* 카테고리, 우선순위, 반복 규칙 */}
          <span className="schedule-tags">
            <span
              className="category-badge"
              data-category={category}
            >
              🏷 {category}
            </span>

            <span
              className="priority-badge"
              data-priority={priority}
            >
              {priority === "높음" && "🔴"}
              {priority === "보통" && "🟡"}
              {priority === "낮음" && "🟢"}{" "}
              {priority}
            </span>

            {/* 반복 일정일 때만 반복 배지를 표시합니다. */}
            {repeat !== "반복 안함" && (
              <span
                className="repeat-badge"
                data-repeat={repeat}
              >
                🔁 {repeat}
                {/* 종료일이 있는 반복 일정은 배지 안에 종료일도 표시합니다. */}
                {repeatEndDate && ` · ~ ${repeatEndDate}`}
              </span>
            )}
          </span>
        </span>
      </label>

      {/* 수정 및 삭제 버튼 */}
      <div className="schedule-actions">
        <button
          type="button"
          className="edit-btn"
          onClick={() => onEdit(id)}
        >
          수정
        </button>

        <button
          type="button"
          className="delete-btn"
          onClick={() => onDelete(id)}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export default memo(ScheduleItem);
