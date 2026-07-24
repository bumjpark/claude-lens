package com.claudelens.backend.dto.ingest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
public class InteractionLogRequest {

    @NotNull(message = "프로젝트 ID를 입력해주세요")
    private UUID projectId;

    private UUID taskId;

    @NotBlank(message = "프롬프트 내용을 입력해주세요")
    private String promptText;

    @NotBlank(message = "응답 내용을 입력해주세요")
    private String responseText;

    private Integer responseTimeMs;
    private LocalDateTime requestedAt;
}
