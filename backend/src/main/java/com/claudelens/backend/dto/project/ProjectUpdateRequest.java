package com.claudelens.backend.dto.project;

import lombok.Getter;
import java.time.LocalDateTime;

@Getter
public class ProjectUpdateRequest {
    private String language;
    private String framework;
    private String projectSize;
    private String devEnvironment;
    private LocalDateTime endedAt;
}
