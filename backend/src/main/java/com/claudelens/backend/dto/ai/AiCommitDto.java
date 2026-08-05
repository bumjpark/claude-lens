package com.claudelens.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

// AI 서비스(Python/Pydantic, snake_case)와 주고받는 DTO라 필드명을 명시적으로 매핑한다.
// 커밋 해시는 근거 인용에 쓸 일이 없어서(다른 로그 id처럼 evidence에 노출되면 안 됨)
// 의도적으로 넘기지 않는다.
@Getter
@AllArgsConstructor
public class AiCommitDto {
    private String message;

    @JsonProperty("files_changed")
    private List<String> filesChanged;

    @JsonProperty("committed_at")
    private String committedAt;
}
