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
    private String language;
    private String framework;
    private String projectSize;
    private String devEnvironment;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;

    public static ProjectResponse from(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .language(project.getLanguage())
                .framework(project.getFramework())
                .projectSize(project.getProjectSize())
                .devEnvironment(project.getDevEnvironment())
                .startedAt(project.getStartedAt())
                .endedAt(project.getEndedAt())
                .createdAt(project.getCreatedAt())
                .build();
    }
}
