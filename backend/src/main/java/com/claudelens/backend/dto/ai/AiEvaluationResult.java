package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AiEvaluationResult {
    @JsonProperty("maturity_level")
    private String maturityLevel;

    @JsonProperty("prompt_quality_score")
    private Integer promptQualityScore;

    @JsonProperty("efficiency_score")
    private Integer efficiencyScore;

    @JsonProperty("context_usage_score")
    private Integer contextUsageScore;

    @JsonProperty("validation_score")
    private Integer validationScore;

    @JsonProperty("collaboration_score")
    private Integer collaborationScore;

    @JsonProperty("total_score")
    private Integer totalScore;

    private String grade;

    private List<String> strengths;

    private List<String> weaknesses;
}
