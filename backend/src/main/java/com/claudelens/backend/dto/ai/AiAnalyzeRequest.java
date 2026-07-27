package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class AiAnalyzeRequest {
    @JsonProperty("project_id")
    private String projectId;

    @JsonProperty("user_role")
    private String userRole;

    @JsonProperty("user_experience_level")
    private String userExperienceLevel;

    private List<AiInteractionDto> interactions;
}
