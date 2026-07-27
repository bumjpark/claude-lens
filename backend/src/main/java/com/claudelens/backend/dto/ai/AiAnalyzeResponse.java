package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AiAnalyzeResponse {
    @JsonProperty("prompt_analyses")
    private List<AiPromptAnalysisResult> promptAnalyses;

    private AiEvaluationResult evaluation;

    private List<AiRecommendationResult> recommendations;
}
