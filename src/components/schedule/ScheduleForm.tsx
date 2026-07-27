// 입력값을 관리하기 위해 useState를 가져옵니다.
import { useState } from "react";

// form 제출 이벤트의 TypeScript 타입입니다.
import type { FormEvent } from "react";

// 카테고리, 우선순위, 반복 타입을 가져옵니다.
import type {
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../../types/schedule";

// Main 컴포넌트로부터 받는 값들의 타입입니다.
type Props = {
  // 입력한 일정 정보를 Main으로 전달합니다.
  onSave: (
    title: string,
    date: string,
    time: string,
    category: ScheduleCategory,
    priority: SchedulePriority,
    repeat: ScheduleRepeat,
  ) => void;

  // 입력폼을 닫는 함수입니다.
  onCancel: () => void;

  // 추가 또는 수정 시 입력창에 표시할 초기값입니다.
  initialTitle: string;
  initialDate: string;
  initialTime: string;
  initialCategory: ScheduleCategory;
  initialPriority: SchedulePriority;
  initialRepeat: ScheduleRepeat;

  // 현재 수정 상태인지 나타냅니다.
  isEditing: boolean;
};

function ScheduleForm({
  onSave,
  onCancel,
  initialTitle,
  initialDate,
  initialTime,
  initialCategory,
  initialPriority,
  initialRepeat,
  isEditing,
}: Props) {
  // 일정 제목 State입니다.
  const [title, setTitle] =
    useState(initialTitle);

  // 일정 날짜 State입니다.
  const [date, setDate] =
    useState(initialDate);

  // 일정 시간 State입니다.
  const [time, setTime] =
    useState(initialTime);

  // 일정 카테고리 State입니다.
  const [category, setCategory] =
    useState<ScheduleCategory>(
      initialCategory,
    );

  // 일정 우선순위 State입니다.
  const [priority, setPriority] =
    useState<SchedulePriority>(
      initialPriority,
    );

  // 일정 반복 규칙 State입니다.
  const [repeat, setRepeat] =
    useState<ScheduleRepeat>(
      initialRepeat,
    );

  // 저장 버튼을 눌렀을 때 실행합니다.
  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    // form 제출로 인한 새로고침을 막습니다.
    event.preventDefault();

    // 제목 앞뒤 공백을 제거합니다.
    const trimmedTitle = title.trim();

    // 필수 입력값이 비어 있으면 저장하지 않습니다.
    if (
      trimmedTitle === "" ||
      date === "" ||
      time === ""
    ) {
      return;
    }

    // 모든 입력값을 Main 컴포넌트로 전달합니다.
    onSave(
      trimmedTitle,
      date,
      time,
      category,
      priority,
      repeat,
    );
  };

  return (
    <form
      className="schedule-form"
      onSubmit={handleSubmit}
    >
      {/* 추가와 수정 상태에 따라 제목을 변경합니다. */}
      <h3>
        {isEditing
          ? "일정 수정"
          : "새 일정"}
      </h3>

      {/* 일정 제목 입력 */}
      <div className="form-field">
        <label htmlFor="schedule-title">
          일정 제목
        </label>

        <input
          id="schedule-title"
          type="text"
          placeholder="일정 제목을 입력하세요."
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          autoFocus
        />
      </div>

      {/* 일정 날짜 입력 */}
      <div className="form-field">
        <label htmlFor="schedule-date">
          일정 날짜
        </label>

        <input
          id="schedule-date"
          type="date"
          value={date}
          onChange={(event) =>
            setDate(event.target.value)
          }
        />
      </div>

      {/* 일정 시간 입력 */}
      <div className="form-field">
        <label htmlFor="schedule-time">
          일정 시간
        </label>

        <input
          id="schedule-time"
          type="time"
          value={time}
          onChange={(event) =>
            setTime(event.target.value)
          }
        />
      </div>

      {/* 일정 카테고리 선택 */}
      <div className="form-field">
        <label htmlFor="schedule-category">
          카테고리
        </label>

        <select
          id="schedule-category"
          value={category}
          onChange={(event) =>
            setCategory(
              event.target
                .value as ScheduleCategory,
            )
          }
        >
          <option value="업무">
            업무
          </option>

          <option value="개인">
            개인
          </option>

          <option value="운동">
            운동
          </option>

          <option value="공부">
            공부
          </option>

          <option value="기타">
            기타
          </option>
        </select>
      </div>

      {/* 일정 우선순위 선택 */}
      <div className="form-field">
        <label htmlFor="schedule-priority">
          우선순위
        </label>

        <select
          id="schedule-priority"
          value={priority}
          onChange={(event) =>
            setPriority(
              event.target
                .value as SchedulePriority,
            )
          }
        >
          <option value="높음">
            높음
          </option>

          <option value="보통">
            보통
          </option>

          <option value="낮음">
            낮음
          </option>
        </select>
      </div>

      {/* 일정 반복 규칙 선택 */}
      <div className="form-field">
        <label htmlFor="schedule-repeat">
          반복
        </label>

        <select
          id="schedule-repeat"
          value={repeat}
          onChange={(event) =>
            setRepeat(
              event.target
                .value as ScheduleRepeat,
            )
          }
        >
          <option value="반복 안함">
            반복 안함
          </option>

          <option value="매일">
            매일
          </option>

          <option value="매주">
            매주
          </option>

          <option value="매월">
            매월
          </option>
        </select>
      </div>

      {/* 저장과 취소 버튼 */}
      <div className="button-group">
        <button type="submit">
          {isEditing
            ? "수정 저장"
            : "저장"}
        </button>

        <button
          type="button"
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </form>
  );
}

export default ScheduleForm;