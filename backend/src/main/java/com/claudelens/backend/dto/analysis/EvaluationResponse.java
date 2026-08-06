package com.claudelens.backend.dto.analysis;

import com.claudelens.backend.domain.CaseStudyItem;
import com.claudelens.backend.domain.ConsultCategoryItem;
import com.claudelens.backend.domain.Evaluation;
import com.claudelens.backend.domain.InteractionPatternItem;
import com.claudelens.backend.domain.Recommendation;
import com.claudelens.backend.domain.RiskFlagItem;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class EvaluationResponse {
    private UUID id;
    private boolean paid;
    private String maturityLevel;
    private String grade;
    private LocalDateTime evaluatedAt;
    private List<RecommendationResponse> recommendations;
    private Integer commitCount;
    private Integer interactionCount;
    private Integer avgResponseTimeMs;
    private Integer medianResponseTimeMs;
    private String activitySummary;
    private String agentUsageAnalysis;
    private List<String> keyConclusions;
    private List<CaseStudyItem> caseStudies;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<InteractionPatternItem> interactionPatterns;
    private String patternAnalysis;
    private List<RiskFlagItem> riskFlags;
    private List<ConsultCategoryItem> consultCategories;
    private String consultSummary;
    private Double consultTotalScore;
    private String consultLevel;

    // 재요청으로 인한 추가 대기 시간(분) — 시급을 가정한 금액 환산은 사람마다 편차가 커서
    // 부정확한 확신을 줄 수 있어 일부러 안 하고, 실측 가능한 "시간"만 보여준다.
    private Integer retryCount;
    private Integer estimatedWastedMinutes;

    // 다른 사용자들과 비교했을 때 "상위 N%"에 해당하는 값 (낮을수록 잘하는 것 — 상위 10%가
    // 상위 90%보다 좋음). 비교 대상(전체 평가 건수)이 너무 적으면 의미가 없어서 null로
    // 내려보내고, 프론트에서 "비교할 사용자가 더 필요해요" 같은 문구로 처리한다.
    private Integer peerPercentile;
    private int peerCount;

    private static final double[] LEVEL_THRESHOLDS = {5, 10, 15, 20};
    private static final String[] LEVEL_LABELS = {
            "Level 1 (입문)", "Level 2 (초급)", "Level 3 (중급)", "Level 4 (고급)", "Level 5 (마스터)"
    };

    public static double computeConsultTotal(Evaluation e) {
        if (e.getConsultCategories() == null) return 0;
        return e.getConsultCategories().stream()
                .mapToDouble(c -> c.getScore() != null ? c.getScore() : 0)
                .sum();
    }

    // 개발 활동 요약(section 1)/핵심 결론(section 2)은 결제 여부와 무관하게 항상 내려주고,
    // 그 아래(주요 작업 분석~AI 컨설트 총평)는 결제 전이면 서버에서부터 내려주지 않는다.
    // (프론트에서 블러만 씌우면 DOM 검사로 원문이 그대로 보여서 실효성이 없음)
    // retryCount/estimatedWastedMinutes/peerPercentile/peerCount는 DB 전체를 훑어야 계산되는
    // 값이라 AnalysisService에서 미리 계산해서 넘겨준다 (이 클래스는 DB에 접근하지 않음).
    public static EvaluationResponse from(
            Evaluation e,
            List<Recommendation> recommendations,
            boolean paid,
            Integer retryCount,
            Integer estimatedWastedMinutes,
            Integer peerPercentile,
            int peerCount) {
        double consultTotal = computeConsultTotal(e);

        EvaluationResponse.EvaluationResponseBuilder builder = EvaluationResponse.builder()
                .id(e.getId())
                .paid(paid)
                .evaluatedAt(e.getEvaluatedAt())
                .recommendations(recommendations.stream().map(RecommendationResponse::from).toList())
                .commitCount(e.getCommitCount())
                .interactionCount(e.getInteractionCount())
                .avgResponseTimeMs(e.getAvgResponseTimeMs())
                .medianResponseTimeMs(e.getMedianResponseTimeMs())
                .activitySummary(e.getActivitySummary())
                .keyConclusions(e.getKeyConclusions())
                .retryCount(retryCount)
                .estimatedWastedMinutes(estimatedWastedMinutes)
                .peerPercentile(peerPercentile)
                .peerCount(peerCount);

        if (!paid) {
            return builder.build();
        }

        return builder
                .maturityLevel(e.getMaturityLevel())
                // grade는 LLM이 자유롭게 고르면 총점(consultLevel)과 모순되는 조합이 나올 수
                // 있어서(예: "C등급"인데 "Level 4 고급"), LLM 판단 대신 같은 총점 구간에서
                // 결정적으로 계산한다 — grade와 Level이 항상 같은 근거(총점)에서 나오므로
                // 구조적으로 모순이 생길 수 없다.
                .grade(gradeFor(consultTotal))
                .agentUsageAnalysis(e.getAgentUsageAnalysis())
                .caseStudies(e.getCaseStudies())
                .strengths(e.getStrengths())
                .weaknesses(e.getWeaknesses())
                .interactionPatterns(e.getInteractionPatterns())
                .patternAnalysis(e.getPatternAnalysis())
                // 이 필드가 추가되기 전에 분석된 기존 행은 컬럼이 NULL이라, 재분석 전까지는
                // 빈 리스트로 내려줘야 프론트에서 null.length로 죽지 않는다.
                .riskFlags(e.getRiskFlags() != null ? e.getRiskFlags() : List.of())
                .consultCategories(e.getConsultCategories())
                .consultSummary(e.getConsultSummary())
                .consultTotalScore(consultTotal)
                .consultLevel(levelFor(consultTotal))
                .build();
    }

    private static String levelFor(double total) {
        for (int i = 0; i < LEVEL_THRESHOLDS.length; i++) {
            if (total <= LEVEL_THRESHOLDS[i]) return LEVEL_LABELS[i];
        }
        return LEVEL_LABELS[LEVEL_LABELS.length - 1];
    }

    // levelFor()와 동일한 구간(0~5점짜리 5개 항목 합산, 0~25점)을 써서 grade를 계산한다.
    // Level과 grade가 항상 같은 임계값에서 나오도록 맞춰서 "C인데 고급" 같은 모순을 방지한다.
    private static String gradeFor(double total) {
        if (total <= LEVEL_THRESHOLDS[0]) return "F";
        if (total <= LEVEL_THRESHOLDS[1]) return "D";
        if (total <= LEVEL_THRESHOLDS[2]) return "C";
        if (total <= LEVEL_THRESHOLDS[3]) return "B";
        return "A";
    }
}
