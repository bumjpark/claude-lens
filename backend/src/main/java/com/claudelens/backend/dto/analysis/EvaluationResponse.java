package com.claudelens.backend.dto.analysis;

import com.claudelens.backend.domain.CaseStudyItem;
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
    private Integer consultInputPerspectiveScore;
    private Integer consultPromptEfficiencyScore;
    private Integer consultTechnicalDepthScore;
    private Integer consultValidationMaturityScore;
    private Integer consultTokenEfficiencyScore;
    private String consultSummary;
    private Integer consultTotalScore;
    private String consultLevel;

    private static final int[] LEVEL_THRESHOLDS = {5, 10, 15, 20};
    private static final String[] LEVEL_LABELS = {
            "Level 1 (입문)", "Level 2 (초급)", "Level 3 (중급)", "Level 4 (고급)", "Level 5 (마스터)"
    };

    public static EvaluationResponse from(Evaluation e, List<Recommendation> recommendations) {
        int consultTotal = sum(
                e.getConsultInputPerspectiveScore(),
                e.getConsultPromptEfficiencyScore(),
                e.getConsultTechnicalDepthScore(),
                e.getConsultValidationMaturityScore(),
                e.getConsultTokenEfficiencyScore());

        return EvaluationResponse.builder()
                .id(e.getId())
                .maturityLevel(e.getMaturityLevel())
                .grade(e.getGrade())
                .evaluatedAt(e.getEvaluatedAt())
                .recommendations(recommendations.stream().map(RecommendationResponse::from).toList())
                .commitCount(e.getCommitCount())
                .interactionCount(e.getInteractionCount())
                .avgResponseTimeMs(e.getAvgResponseTimeMs())
                .medianResponseTimeMs(e.getMedianResponseTimeMs())
                .activitySummary(e.getActivitySummary())
                .agentUsageAnalysis(e.getAgentUsageAnalysis())
                .keyConclusions(e.getKeyConclusions())
                .caseStudies(e.getCaseStudies())
                .strengths(e.getStrengths())
                .weaknesses(e.getWeaknesses())
                .interactionPatterns(e.getInteractionPatterns())
                .patternAnalysis(e.getPatternAnalysis())
                .consultInputPerspectiveScore(e.getConsultInputPerspectiveScore())
                .consultPromptEfficiencyScore(e.getConsultPromptEfficiencyScore())
                .consultTechnicalDepthScore(e.getConsultTechnicalDepthScore())
                .consultValidationMaturityScore(e.getConsultValidationMaturityScore())
                .consultTokenEfficiencyScore(e.getConsultTokenEfficiencyScore())
                .consultSummary(e.getConsultSummary())
                .consultTotalScore(consultTotal)
                .consultLevel(levelFor(consultTotal))
                .build();
    }

    private static int sum(Integer... scores) {
        int total = 0;
        for (Integer score : scores) {
            if (score != null) total += score;
        }
        return total;
    }

    private static String levelFor(int total) {
        for (int i = 0; i < LEVEL_THRESHOLDS.length; i++) {
            if (total <= LEVEL_THRESHOLDS[i]) return LEVEL_LABELS[i];
        }
        return LEVEL_LABELS[LEVEL_LABELS.length - 1];
    }
}
