package com.claudelens.backend.domain;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskFlagItem {
    private String title;
    private String description;
    private String evidence;
}
