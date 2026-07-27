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

    private String grade;

    @Column(name = "evaluated_at", nullable = false, updatable = false)
    private LocalDateTime evaluatedAt;

    @Column(name = "commit_count")
    private Integer commitCount;

    @Column(name = "interaction_count")
    private Integer interactionCount;

    @Column(name = "avg_response_time_ms")
    private Integer avgResponseTimeMs;

    @Column(name = "median_response_time_ms")
    private Integer medianResponseTimeMs;

    @Column(name = "activity_summary")
    private String activitySummary;

    @Column(name = "agent_usage_analysis")
    private String agentUsageAnalysis;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> keyConclusions;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<CaseStudyItem> caseStudies;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> strengths;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> weaknesses;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<InteractionPatternItem> interactionPatterns;

    @Column(name = "pattern_analysis")
    private String patternAnalysis;

    @Column(name = "consult_input_perspective_score")
    private Integer consultInputPerspectiveScore;

    @Column(name = "consult_prompt_efficiency_score")
    private Integer consultPromptEfficiencyScore;

    @Column(name = "consult_technical_depth_score")
    private Integer consultTechnicalDepthScore;

    @Column(name = "consult_validation_maturity_score")
    private Integer consultValidationMaturityScore;

    @Column(name = "consult_token_efficiency_score")
    private Integer consultTokenEfficiencyScore;

    @Column(name = "consult_summary")
    private String consultSummary;

    @PrePersist
    protected void onCreate() {
        evaluatedAt = LocalDateTime.now();
    }
}
