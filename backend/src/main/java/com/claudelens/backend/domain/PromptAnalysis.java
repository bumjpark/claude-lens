package com.claudelens.backend.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prompt_analyses")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromptAnalysis {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "log_id", nullable = false)
    private String logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "prompt_type")
    private String promptType;

    @Column(name = "context_score")
    private Integer contextScore;

    @Column(name = "clarity_score")
    private Integer clarityScore;

    @Column(name = "constraint_score")
    private Integer constraintScore;

    @Column(name = "goal_score")
    private Integer goalScore;

    @Column(name = "total_quality_score")
    private Integer totalQualityScore;

    @Column(columnDefinition = "TEXT")
    private String evidence;

    @Column(name = "analyzed_at", nullable = false, updatable = false)
    private LocalDateTime analyzedAt;

    @PrePersist
    protected void onCreate() {
        analyzedAt = LocalDateTime.now();
    }
}
