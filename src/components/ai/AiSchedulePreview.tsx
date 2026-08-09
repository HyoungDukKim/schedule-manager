import type { AiScheduleDraft } from "../../types/aiSchedule";
import { SCHEDULE_NOTIFICATION_OPTIONS } from "../../constants/schedule";

type Props = {
  draft: AiScheduleDraft;
  onApply: (draft: AiScheduleDraft) => void;
  onCancel: () => void;
};

const getNotificationText = (draft: AiScheduleDraft) => {
  if (!draft.notificationEnabled || draft.notificationMinutesBefore === null) {
    return "사용 안 함";
  }
  return SCHEDULE_NOTIFICATION_OPTIONS.find(
    (option) => option.value === draft.notificationMinutesBefore,
  )?.label ?? "확인 필요";
};

function AiSchedulePreview({ draft, onApply, onCancel }: Props) {
  const rows = [
    ["제목", draft.title ?? "확인 필요"],
    ["날짜", draft.date ?? "확인 필요"],
    ["시간", draft.time ?? "확인 필요"],
    ["카테고리", draft.category],
    ["우선순위", draft.priority],
    ["반복", draft.repeat],
    ["반복 종료일", draft.repeatEndDate ?? "없음"],
    ["알림", getNotificationText(draft)],
  ];

  return (
    <div className="ai-schedule-preview" aria-labelledby="ai-preview-title">
      <h4 id="ai-preview-title">AI 분석 미리보기</h4>

      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {draft.needsClarification && (
        <div className="ai-clarification" role="status">
          <strong>추가 확인이 필요합니다.</strong>
          {draft.missingFields.length > 0 && (
            <p>확인할 항목: {draft.missingFields.join(", ")}</p>
          )}
          {draft.clarificationQuestions.length > 0 && (
            <ul>
              {draft.clarificationQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="ai-preview-help">
        적용 후 기존 일정 입력 폼에서 내용을 수정하고 최종 저장해 주세요.
      </p>
      <div className="ai-preview-actions">
        <button type="button" onClick={() => onApply(draft)}>
          입력 폼에 적용
        </button>
        <button type="button" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

export default AiSchedulePreview;
