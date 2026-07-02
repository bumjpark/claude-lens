package com.claudelens.backend.dto.project;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ProjectCreateRequest {

    @NotBlank(message = "프로젝트 이름을 입력해주세요")
    private String name;

    private String language;
    private String framework;
    private String projectSize;
    private String devEnvironment;
}
