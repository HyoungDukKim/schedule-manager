// 카테고리, 우선순위, 반복 타입을 가져옵니다.
import type {
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../../types/schedule";

// ScheduleList로부터 받는 Props 타입입니다.
type Props = {
  id: number;
  title: string;
  date: string;
  time: string;

  category: ScheduleCategory;
  priority: SchedulePriority;
  repeat: ScheduleRepeat;

  completed: boolean;

  onToggle: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

function ScheduleItem({
  id,
  title,
  date,
  time,
  category,
  priority,
  repeat,
  completed,
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

export default ScheduleItem;