package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiConsultReviewResult {
    @JsonProperty("maturity_level")
    private String maturityLevel;

    private String grade;

    @JsonProperty("agent_usage_analysis")
    private String agentUsageAnalysis;

    @JsonProperty("input_perspective_score")
    private Integer inputPerspectiveScore;

    @JsonProperty("prompt_efficiency_score")
    private Integer promptEfficiencyScore;

    @JsonProperty("technical_depth_score")
    private Integer technicalDepthScore;

    @JsonProperty("validation_maturity_score")
    private Integer validationMaturityScore;

    @JsonProperty("token_efficiency_score")
    private Integer tokenEfficiencyScore;

    @JsonProperty("consult_summary")
    private String consultSummary;
}
