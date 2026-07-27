package com.claudelens.backend.domain;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InteractionPatternItem {
    private String patternName;
    private String description;
}
