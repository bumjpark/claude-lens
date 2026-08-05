package com.claudelens.backend.dto.ai;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiRiskFlag {
    private String title;
    private String description;
    private String evidence;
}
