package com.claudelens.backend.dto.project;

import com.claudelens.backend.domain.Project;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ProjectResponse {

    private UUID id;
    private String name;
    private String apiKey;
    private String language;
    private String framework;
    private String projectSize;
    private String devEnvironment;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;

    // 생성/재발급 직후에만 평문 키를 보여준다. 그 외에는 항상 마스킹된 값을 내려준다.
    public static ProjectResponse from(Project project) {
        return build(project, mask(project.getApiKey()));
    }

    public static ProjectResponse revealed(Project project) {
        return build(project, project.getApiKey());
    }

    private static ProjectResponse build(Project project, String apiKey) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .apiKey(apiKey)
                .language(project.getLanguage())
                .framework(project.getFramework())
                .projectSize(project.getProjectSize())
                .devEnvironment(project.getDevEnvironment())
                .startedAt(project.getStartedAt())
                .endedAt(project.getEndedAt())
                .createdAt(project.getCreatedAt())
                .build();
    }

    private static String mask(String apiKey) {
        if (apiKey == null || apiKey.length() <= 8) return "clk_****";
        return apiKey.substring(0, 8) + "…" + apiKey.substring(apiKey.length() - 4);
    }
}
