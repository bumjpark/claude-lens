package com.claudelens.backend.domain;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultCategoryItem {
    private String category;
    private Double score;
    private String positiveNote;
    private String improvementNote;
}
