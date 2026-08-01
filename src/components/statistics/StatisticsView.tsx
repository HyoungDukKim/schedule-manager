import { memo } from "react";
// 일정 데이터 타입을 가져옵니다.
import type { Schedule } from "../../types/schedule";
import {
  SCHEDULE_CATEGORIES as CATEGORIES,
  SCHEDULE_PRIORITIES as PRIORITIES,
} from "../../constants/schedule";
import { getScheduleStatistics } from "../../utils/statisticsUtils";

// Main 컴포넌트에서 받을 Props 타입입니다.
type Props = {
  schedules: Schedule[];
};

function StatisticsView({
  schedules,
}: Props) {
  // 통계 계산은 공통 유틸 함수에서 처리합니다.
  const {
    totalCount,
    completedCount,
    incompleteCount,
    repeatCount,
    urgentCount,
    completionRate,
    completionDegree,
    categoryCounts,
    priorityStatistics,
  } = getScheduleStatistics(schedules);

  return (
    <section className="statistics-view">
      {/* 통계 화면 제목입니다. */}
      <div className="statistics-header">
        <div>
          <h3>일정 통계</h3>

          <p>
            현재 저장된 일정의 진행 상태를
            확인할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 주요 통계 카드 영역입니다. */}
      <div className="statistics-summary">
        <article className="summary-card">
          <span className="summary-icon">
            📋
          </span>

          <div>
            <span className="summary-label">
              전체 일정
            </span>

            <strong className="summary-value">
              {totalCount}
            </strong>
          </div>
        </article>

        <article className="summary-card">
          <span className="summary-icon">
            ✅
          </span>

          <div>
            <span className="summary-label">
              완료 일정
            </span>

            <strong className="summary-value">
              {completedCount}
            </strong>
          </div>
        </article>

        <article className="summary-card">
          <span className="summary-icon">
            ⏳
          </span>

          <div>
            <span className="summary-label">
              미완료 일정
            </span>

            <strong className="summary-value">
              {incompleteCount}
            </strong>
          </div>
        </article>

        <article className="summary-card">
          <span className="summary-icon">
            🚨
          </span>

          <div>
            <span className="summary-label">
              긴급 미완료
            </span>

            <strong className="summary-value">
              {urgentCount}
            </strong>
          </div>
        </article>
      </div>

      {/* 완료율과 상세 통계 영역입니다. */}
      <div className="statistics-details">
        {/* 완료율 영역입니다. */}
        <article className="statistics-panel completion-panel">
          <div className="panel-title">
            <div>
              <h4>일정 완료율</h4>

              <p>
                전체 일정 중 완료된 일정의
                비율입니다.
              </p>
            </div>
          </div>

          <div className="completion-content">
            {/* CSS conic-gradient를 사용한 원형 그래프입니다. */}
            <div
              className="completion-chart"
              style={{
                background: `conic-gradient(
                  #2563eb ${completionDegree}deg,
                  #e2e8f0 ${completionDegree}deg
                )`,
              }}
              aria-label={`완료율 ${completionRate}%`}
            >
              {/* 원형 그래프의 가운데 흰색 영역입니다. */}
              <div className="completion-chart-center">
                <strong>
                  {completionRate}%
                </strong>

                <span>완료</span>
              </div>
            </div>

            {/* 완료율 오른쪽 설명입니다. */}
            <div className="completion-description">
              <div>
                <span className="legend-dot completed-dot" />

                <span>
                  완료 {completedCount}개
                </span>
              </div>

              <div>
                <span className="legend-dot incomplete-dot" />

                <span>
                  미완료 {incompleteCount}개
                </span>
              </div>

              <div>
                <span className="legend-dot repeat-dot" />

                <span>
                  반복 일정 {repeatCount}개
                </span>
              </div>
            </div>
          </div>
        </article>

        {/* 카테고리별 통계입니다. */}
        <article className="statistics-panel">
          <div className="panel-title">
            <div>
              <h4>카테고리별 일정</h4>

              <p>
                일정이 어떤 분야에 많이
                분포되어 있는지 보여줍니다.
              </p>
            </div>
          </div>

          <div className="statistics-bars">
            {CATEGORIES.map((category) => {
              // 현재 카테고리에 해당하는 일정 개수를 계산합니다.
              const categoryCount = categoryCounts[category];

              // 전체 일정 중 카테고리가 차지하는 비율입니다.
              const categoryRate =
                totalCount === 0
                  ? 0
                  : Math.round(
                      (categoryCount /
                        totalCount) *
                        100,
                    );

              return (
                <div
                  key={category}
                  className="statistics-bar-item"
                >
                  <div className="statistics-bar-header">
                    <span>
                      {category}
                    </span>

                    <span>
                      {categoryCount}개 ·{" "}
                      {categoryRate}%
                    </span>
                  </div>

                  {/* 막대그래프의 바깥 배경입니다. */}
                  <div className="statistics-bar-track">
                    {/* 계산된 비율만큼 너비를 적용합니다. */}
                    <div
                      className="statistics-bar-fill"
                      data-category={category}
                      style={{
                        width: `${categoryRate}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* 우선순위별 통계입니다. */}
        <article className="statistics-panel">
          <div className="panel-title">
            <div>
              <h4>우선순위별 일정</h4>

              <p>
                중요도에 따른 일정 개수를
                보여줍니다.
              </p>
            </div>
          </div>

          <div className="priority-statistics">
            {PRIORITIES.map((priority) => {
              // 해당 우선순위의 전체 일정 개수입니다.
              const priorityCount = priorityStatistics[priority].totalCount;

              // 해당 우선순위 중 완료된 일정 개수입니다.
              const completedPriorityCount =
                priorityStatistics[priority].completedCount;

              return (
                <div
                  key={priority}
                  className="priority-stat-card"
                  data-priority={priority}
                >
                  <span className="priority-stat-name">
                    {priority === "높음" &&
                      "🔴"}
                    {priority === "보통" &&
                      "🟡"}
                    {priority === "낮음" &&
                      "🟢"}{" "}
                    {priority}
                  </span>

                  <strong>
                    {priorityCount}개
                  </strong>

                  <small>
                    완료{" "}
                    {completedPriorityCount}개
                  </small>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}

export default memo(StatisticsView);
