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
    private String grade;
    private LocalDateTime evaluatedAt;
    private List<RecommendationResponse> recommendations;
    private Integer commitCount;
    private Integer interactionCount;
    private Integer avgResponseTimeMs;
    private Integer medianResponseTimeMs;
    private String activitySummary;
    private String interactionLogAnalysis;
    private String agentUsageAnalysis;
    private String contextInterpretation;

    public static EvaluationResponse from(Evaluation e, List<Recommendation> recommendations) {
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
                .interactionLogAnalysis(e.getInteractionLogAnalysis())
                .agentUsageAnalysis(e.getAgentUsageAnalysis())
                .contextInterpretation(e.getContextInterpretation())
                .build();
    }
}
