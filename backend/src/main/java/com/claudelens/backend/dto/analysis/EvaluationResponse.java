package com.claudelens.backend.dto.analysis;

import com.claudelens.backend.domain.Evaluation;
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
    private Integer promptQualityScore;
    private Integer efficiencyScore;
    private Integer contextUsageScore;
    private Integer validationScore;
    private Integer collaborationScore;
    private Integer totalScore;
    private String grade;
    private List<String> strengths;
    private List<String> weaknesses;
    private LocalDateTime evaluatedAt;
    private List<RecommendationResponse> recommendations;

    public static EvaluationResponse from(Evaluation e, List<Recommendation> recommendations) {
        return EvaluationResponse.builder()
                .id(e.getId())
                .maturityLevel(e.getMaturityLevel())
                .promptQualityScore(e.getPromptQualityScore())
                .efficiencyScore(e.getEfficiencyScore())
                .contextUsageScore(e.getContextUsageScore())
                .validationScore(e.getValidationScore())
                .collaborationScore(e.getCollaborationScore())
                .totalScore(e.getTotalScore())
                .grade(e.getGrade())
                .strengths(e.getStrengths())
                .weaknesses(e.getWeaknesses())
                .evaluatedAt(e.getEvaluatedAt())
                .recommendations(recommendations.stream().map(RecommendationResponse::from).toList())
                .build();
    }
}
