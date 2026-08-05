package com.claudelens.backend.dto.ingest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
public class GitCommitLogRequest {

    @NotNull(message = "프로젝트 ID를 입력해주세요")
    private UUID projectId;

    @NotBlank(message = "커밋 해시를 입력해주세요")
    private String commitHash;

    @NotBlank(message = "커밋 메시지를 입력해주세요")
    private String message;

    private List<String> filesChanged;
    private LocalDateTime committedAt;
}
