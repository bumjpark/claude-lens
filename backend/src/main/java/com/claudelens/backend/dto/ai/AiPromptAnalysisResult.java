package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiPromptAnalysisResult {
    @JsonProperty("log_id")
    private String logId;

    @JsonProperty("prompt_type")
    private String promptType;

    @JsonProperty("context_score")
    private Integer contextScore;

    @JsonProperty("clarity_score")
    private Integer clarityScore;

    @JsonProperty("constraint_score")
    private Integer constraintScore;

    @JsonProperty("goal_score")
    private Integer goalScore;

    @JsonProperty("total_quality_score")
    private Integer totalQualityScore;

    private String evidence;
}
