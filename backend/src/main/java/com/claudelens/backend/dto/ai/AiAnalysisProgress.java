package com.claudelens.backend.dto.ai;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiAnalysisProgress {
    private int stage;
    private String label;
    private boolean done;
}
