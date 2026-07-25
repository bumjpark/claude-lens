package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AiTaskFlowResult {
    @JsonProperty("positive_factors")
    private List<String> positiveFactors;

    @JsonProperty("improvement_opportunities")
    private List<String> improvementOpportunities;

    private String summary;
}
