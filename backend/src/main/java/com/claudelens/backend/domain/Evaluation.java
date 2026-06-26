package com.claudelens.backend.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "evaluations")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evaluation {

    @Id
    @UuidGenerator
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "maturity_level", nullable = false)
    private String maturityLevel;

    @Column(name = "prompt_quality_score")
    private Integer promptQualityScore;

    @Column(name = "efficiency_score")
    private Integer efficiencyScore;

    @Column(name = "context_usage_score")
    private Integer contextUsageScore;

    @Column(name = "validation_score")
    private Integer validationScore;

    @Column(name = "collaboration_score")
    private Integer collaborationScore;

    @Column(name = "total_score")
    private Integer totalScore;

    private String grade;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> strengths;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> weaknesses;

    @Column(name = "evaluated_at", nullable = false, updatable = false)
    private LocalDateTime evaluatedAt;

    @PrePersist
    protected void onCreate() {
        evaluatedAt = LocalDateTime.now();
    }
}
