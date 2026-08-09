import { useState } from "react";
import type { FormEvent } from "react";
import type { AiScheduleDraft } from "../../types/aiSchedule";
import { analyzeNaturalLanguageSchedule } from "../../services/aiScheduleService";
import AiSchedulePreview from "./AiSchedulePreview";

type Props = {
  onApply: (draft: AiScheduleDraft) => void;
};

function AiScheduleInput({ onApply }: Props) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<AiScheduleDraft | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedText = text.trim();
    if (!normalizedText || isLoading) return;

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

  return (
    <section className="ai-schedule" aria-labelledby="ai-schedule-title">
      <div className="ai-schedule-header">
        <div>
          <h3 id="ai-schedule-title">AI로 일정 만들기</h3>
          <p>자연어로 입력한 뒤 결과를 확인하고 기존 일정 폼에서 저장합니다.</p>
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
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || text.trim() === ""}>
          {isLoading ? "분석 중..." : "AI로 분석"}
        </button>
      </form>

      {error && <p className="ai-schedule-error" role="alert">{error}</p>}
      {draft && (
        <AiSchedulePreview
          draft={draft}
          onApply={(value) => {
            onApply(value);
            setDraft(null);
          }}
          onCancel={() => setDraft(null)}
        />
      )}
    </section>
  );
}

export default AiScheduleInput;
