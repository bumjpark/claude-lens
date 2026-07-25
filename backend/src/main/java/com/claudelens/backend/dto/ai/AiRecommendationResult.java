package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiRecommendationResult {
    private String category;
    private String priority;
    private String problem;
    private String evidence;
    private String suggestion;

    @JsonProperty("example_prompt")
    private String examplePrompt;
}
