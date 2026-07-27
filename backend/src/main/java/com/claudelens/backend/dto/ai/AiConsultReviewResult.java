package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AiConsultReviewResult {
    @JsonProperty("maturity_level")
    private String maturityLevel;

    private String grade;

    @JsonProperty("agent_usage_analysis")
    private String agentUsageAnalysis;

    private List<AiConsultCategory> categories;

    @JsonProperty("consult_summary")
    private String consultSummary;
}
