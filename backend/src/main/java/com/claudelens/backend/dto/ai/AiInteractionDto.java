package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

// AI 서비스(Python/Pydantic, snake_case)와 주고받는 DTO라 필드명을 명시적으로 매핑한다.
// Lombok이 boolean is* 필드의 getter 이름을 다르게 생성해서 @JsonNaming 자동 변환에
// 기대면 조용히 어긋날 수 있어 명시 @JsonProperty를 쓴다.
@Getter
@AllArgsConstructor
public class AiInteractionDto {
    private String id;

    @JsonProperty("prompt_text")
    private String promptText;

    @JsonProperty("response_text")
    private String responseText;

    @JsonProperty("is_retry")
    private boolean isRetry;

    @JsonProperty("is_code_request")
    private boolean isCodeRequest;

    @JsonProperty("is_error_request")
    private boolean isErrorRequest;

    @JsonProperty("is_review_request")
    private boolean isReviewRequest;

    @JsonProperty("is_design_request")
    private boolean isDesignRequest;

    @JsonProperty("requested_at")
    private String requestedAt;
}
