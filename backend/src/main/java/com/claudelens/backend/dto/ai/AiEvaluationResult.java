package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiEvaluationResult {
    @JsonProperty("maturity_level")
    private String maturityLevel;

    private String grade;

    @JsonProperty("interaction_log_analysis")
    private String interactionLogAnalysis;

    @JsonProperty("task_flow_analysis")
    private String taskFlowAnalysis;

    @JsonProperty("agent_usage_analysis")
    private String agentUsageAnalysis;

    @JsonProperty("context_interpretation")
    private String contextInterpretation;
}
