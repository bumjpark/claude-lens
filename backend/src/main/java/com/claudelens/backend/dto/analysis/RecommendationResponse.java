package com.claudelens.backend.dto.analysis;

import com.claudelens.backend.domain.Recommendation;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class RecommendationResponse {
    private UUID id;
    private String category;
    private String priority;
    private String problem;
    private String evidence;
    private String suggestion;
    private String examplePrompt;

    public static RecommendationResponse from(Recommendation r) {
        return RecommendationResponse.builder()
                .id(r.getId())
                .category(r.getCategory())
                .priority(r.getPriority())
                .problem(r.getProblem())
                .evidence(r.getEvidence())
                .suggestion(r.getSuggestion())
                .examplePrompt(r.getExamplePrompt())
                .build();
    }
}
