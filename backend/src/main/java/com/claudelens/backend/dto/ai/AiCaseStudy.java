package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiCaseStudy {
    private String title;

    @JsonProperty("structural_issue")
    private String structuralIssue;

    private String interpretation;
    private String evidence;
}
