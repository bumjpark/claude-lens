package com.claudelens.backend.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.UUID;

@Document(collection = "interaction_logs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InteractionLog {

    @Id
    private String id;

    @Field("project_id")
    private UUID projectId;

    @Field("task_id")
    private UUID taskId;

    @Field("prompt_text")
    private String promptText;

    @Field("response_text")
    private String responseText;

    @Field("request_count")
    @Builder.Default
    private Integer requestCount = 1;

    @Field("is_retry")
    @Builder.Default
    private Boolean isRetry = false;

    @Field("is_code_request")
    @Builder.Default
    private Boolean isCodeRequest = false;

    @Field("is_error_request")
    @Builder.Default
    private Boolean isErrorRequest = false;

    @Field("is_review_request")
    @Builder.Default
    private Boolean isReviewRequest = false;

    @Field("is_design_request")
    @Builder.Default
    private Boolean isDesignRequest = false;

    @Field("response_time_ms")
    private Integer responseTimeMs;

    @Field("requested_at")
    private LocalDateTime requestedAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
