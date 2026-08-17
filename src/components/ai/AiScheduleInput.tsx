import { useState } from "react";
import type { FormEvent } from "react";
import type { AiScheduleDraft } from "../../types/aiSchedule";
import type { ScheduleFormValues } from "../../types/schedule";
import { analyzeNaturalLanguageSchedule } from "../../services/aiScheduleService";
import { convertAiDraftToScheduleFormValues } from "../../utils/scheduleValidation";
import AiSchedulePreview from "./AiSchedulePreview";

type Props = {
  onApply: (draft: AiScheduleDraft) => void;
  onSave: (values: ScheduleFormValues) => Promise<boolean>;
};

function AiScheduleInput({ onApply, onSave }: Props) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<AiScheduleDraft | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedText = text.trim();
    if (!normalizedText || isLoading || isSaving) return;

    setIsLoading(true);
    setError("");
    setDraft(null);
    try {
      setDraft(await analyzeNaturalLanguageSchedule(normalizedText));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI 일정 분석에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 입력 버튼을 누르는 순간 Draft를 다시 검증하고 기존 Main 저장 콜백으로 전달합니다.
  const handlePreviewAction = async (value: AiScheduleDraft) => {
    if (isSaving) return;

    const conversion = convertAiDraftToScheduleFormValues(value);
    if (!conversion.success) {
      // 필수 정보가 부족한 Draft는 저장하지 않고 기존 일정 폼에서 수정하게 합니다.
      onApply(value);
      setDraft(null);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const saved = await onSave(conversion.values);
      if (saved) {
        // 저장 성공 시에만 입력과 미리보기를 초기화합니다.
        setDraft(null);
        setText("");
      }
    } catch {
      // 예상하지 못한 오류도 입력과 미리보기를 유지해 다시 시도할 수 있게 합니다.
      setError("일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const canSaveDirectly = draft
    ? convertAiDraftToScheduleFormValues(draft).success
    : false;

  return (
    <section className="ai-schedule" aria-labelledby="ai-schedule-title">
      <div className="ai-schedule-header">
        <div>
          <h3 id="ai-schedule-title">AI로 일정 만들기</h3>
          <p>자연어로 입력한 뒤 결과를 확인하고 바로 일정에 입력합니다.</p>
        </div>
        <span>{text.length}/500</span>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <label htmlFor="ai-schedule-text">일정 내용</label>
        <textarea
          id="ai-schedule-text"
          value={text}
          maxLength={500}
          rows={3}
          placeholder="예: 내일 오후 3시에 치과 예약, 30분 전에 알려줘"
          onChange={(event) => setText(event.target.value)}
          disabled={isLoading || isSaving}
        />
        <button type="submit" disabled={isLoading || isSaving || text.trim() === ""}>
          {isLoading ? "분석 중..." : "AI로 분석"}
        </button>
      </form>

      {error && <p className="ai-schedule-error" role="alert">{error}</p>}
      {draft && (
        <AiSchedulePreview
          draft={draft}
          canSaveDirectly={canSaveDirectly}
          isSaving={isSaving}
          onPrimaryAction={(value) => void handlePreviewAction(value)}
          onCancel={() => setDraft(null)}
        />
      )}
    </section>
  );
}

export default AiScheduleInput;
