package com.claudelens.backend.dto.analysis;

import com.claudelens.backend.domain.CaseStudyItem;
import com.claudelens.backend.domain.ConsultCategoryItem;
import com.claudelens.backend.domain.Evaluation;
import com.claudelens.backend.domain.InteractionPatternItem;
import com.claudelens.backend.domain.Recommendation;
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
    private List<ConsultCategoryItem> consultCategories;
    private String consultSummary;
    private Double consultTotalScore;
    private String consultLevel;

    private static final double[] LEVEL_THRESHOLDS = {5, 10, 15, 20};
    private static final String[] LEVEL_LABELS = {
            "Level 1 (입문)", "Level 2 (초급)", "Level 3 (중급)", "Level 4 (고급)", "Level 5 (마스터)"
    };

    // 개발 활동 요약(section 1)/핵심 결론(section 2)은 결제 여부와 무관하게 항상 내려주고,
    // 그 아래(주요 작업 분석~AI 컨설트 총평)는 결제 전이면 서버에서부터 내려주지 않는다.
    // (프론트에서 블러만 씌우면 DOM 검사로 원문이 그대로 보여서 실효성이 없음)
    public static EvaluationResponse from(Evaluation e, List<Recommendation> recommendations, boolean paid) {
        double consultTotal = (e.getConsultCategories() == null)
                ? 0
                : e.getConsultCategories().stream()
                        .mapToDouble(c -> c.getScore() != null ? c.getScore() : 0)
                        .sum();

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
                .keyConclusions(e.getKeyConclusions());

        if (!paid) {
            return builder.build();
        }

        return builder
                .maturityLevel(e.getMaturityLevel())
                .grade(e.getGrade())
                .agentUsageAnalysis(e.getAgentUsageAnalysis())
                .caseStudies(e.getCaseStudies())
                .strengths(e.getStrengths())
                .weaknesses(e.getWeaknesses())
                .interactionPatterns(e.getInteractionPatterns())
                .patternAnalysis(e.getPatternAnalysis())
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
}
