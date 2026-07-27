package com.claudelens.backend.domain;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseStudyItem {
    private String title;
    private String structuralIssue;
    private String interpretation;
    private String evidence;
}
