// 입력값을 관리하기 위해 useState를 가져옵니다.
import { memo, useState } from "react";

// form 제출 이벤트의 TypeScript 타입입니다.
import type { FormEvent } from "react";

// 카테고리, 우선순위, 반복 타입을 가져옵니다.
import type {
  ScheduleCategory,
  ScheduleFormValues,
  SchedulePriority,
  ScheduleRepeat,
} from "../../types/schedule";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_PRIORITIES,
  SCHEDULE_REPEATS,
} from "../../constants/schedule";

// 반복 종료 방식을 화면에서 구분하기 위한 값입니다.
type RepeatEndMode = "none" | "date";

// Main 컴포넌트로부터 받는 값들의 타입입니다.
type Props = {
  // 입력한 일정 정보를 Main으로 전달합니다.
  onSave: (values: ScheduleFormValues) => void | Promise<void>;

  // 입력폼을 닫는 함수입니다.
  onCancel: () => void;

  // 추가 또는 수정 시 입력창에 표시할 초기값입니다.
  initialTitle: string;
  initialDate: string;
  initialTime: string;
  initialCategory: ScheduleCategory;
  initialPriority: SchedulePriority;
  initialRepeat: ScheduleRepeat;
  initialRepeatEndDate?: string;

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
  initialRepeatEndDate,
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

  // 기존 종료일이 있으면 날짜 지정 모드로 수정폼을 시작합니다.
  const [repeatEndMode, setRepeatEndMode] = useState<RepeatEndMode>(
    initialRepeatEndDate ? "date" : "none",
  );

  // 종료일이 없는 기존 문서는 시작일을 입력창의 초기값으로만 사용합니다.
  const [repeatEndDate, setRepeatEndDate] = useState(
    initialRepeatEndDate ?? initialDate,
  );

  // 종료일 검증에 실패했을 때 사용자에게 보여줄 안내 문구입니다.
  const [repeatEndError, setRepeatEndError] = useState("");

  // 저장 버튼을 눌렀을 때 실행합니다.
  const handleSubmit = async (
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

    const usesRepeatEndDate =
      repeat !== "반복 안함" && repeatEndMode === "date";

    // 종료일을 지정했다면 빈 값과 시작일보다 이전인 날짜를 저장하지 않습니다.
    if (
      usesRepeatEndDate &&
      (repeatEndDate === "" || repeatEndDate < date)
    ) {
      setRepeatEndError("반복 종료일은 시작일과 같거나 이후여야 합니다.");
      return;
    }

    setRepeatEndError("");

    // 모든 입력값을 Main 컴포넌트로 전달합니다.
    await onSave({
      title: trimmedTitle,
      date,
      time,
      category,
      priority,
      repeat,
      // 종료 없음이거나 반복 안함이면 선택 필드를 Firestore에 보내지 않습니다.
      ...(usesRepeatEndDate ? { repeatEndDate } : {}),
    });
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
          {SCHEDULE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
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
          {SCHEDULE_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
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
            setRepeat(event.target.value as ScheduleRepeat)
          }
        >
          {SCHEDULE_REPEATS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {/* 반복 일정에서만 종료 방식을 선택할 수 있습니다. */}
      {repeat !== "반복 안함" && (
        <fieldset className="repeat-end-field">
          <legend>반복 종료</legend>

          <div className="repeat-end-options">
            <label>
              <input
                type="radio"
                name="repeat-end-mode"
                value="none"
                checked={repeatEndMode === "none"}
                onChange={() => {
                  setRepeatEndMode("none");
                  setRepeatEndError("");
                }}
              />
              종료 없음
            </label>

            <label>
              <input
                type="radio"
                name="repeat-end-mode"
                value="date"
                checked={repeatEndMode === "date"}
                onChange={() => {
                  setRepeatEndMode("date");
                  // 시작일이 바뀌어 기존 종료일보다 늦다면 시작일로 안전하게 맞춥니다.
                  if (repeatEndDate < date) setRepeatEndDate(date);
                  setRepeatEndError("");
                }}
              />
              날짜 지정
            </label>
          </div>

          {repeatEndMode === "date" && (
            <div className="repeat-end-date">
              <label htmlFor="schedule-repeat-end-date">종료일</label>
              <input
                id="schedule-repeat-end-date"
                type="date"
                min={date}
                value={repeatEndDate}
                onChange={(event) => {
                  setRepeatEndDate(event.target.value);
                  setRepeatEndError("");
                }}
                aria-describedby={repeatEndError ? "repeat-end-error" : undefined}
              />
            </div>
          )}

          {repeatEndError && (
            <p id="repeat-end-error" className="form-error" role="alert">
              {repeatEndError}
            </p>
          )}
        </fieldset>
      )}

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

export default memo(ScheduleForm);
