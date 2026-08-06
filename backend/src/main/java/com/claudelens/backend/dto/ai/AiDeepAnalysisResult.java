package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AiDeepAnalysisResult {
    @JsonProperty("key_conclusions")
    private List<String> keyConclusions;

    @JsonProperty("case_studies")
    private List<AiCaseStudy> caseStudies;

    private List<String> strengths;
    private List<String> weaknesses;

    @JsonProperty("interaction_patterns")
    private List<AiInteractionPattern> interactionPatterns;

    @JsonProperty("pattern_analysis")
    private String patternAnalysis;

    @JsonProperty("task_flow_analysis")
    private String taskFlowAnalysis;

    @JsonProperty("risk_flags")
    private List<AiRiskFlag> riskFlags;
}
