package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiConsultCategory {
    private String category;
    private Double score;

    @JsonProperty("positive_note")
    private String positiveNote;

    @JsonProperty("improvement_note")
    private String improvementNote;
}
