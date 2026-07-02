package com.claudelens.backend.service;

import com.claudelens.backend.domain.Project;
import com.claudelens.backend.domain.User;
import com.claudelens.backend.dto.project.ProjectCreateRequest;
import com.claudelens.backend.dto.project.ProjectResponse;
import com.claudelens.backend.dto.project.ProjectUpdateRequest;
import com.claudelens.backend.repository.ProjectRepository;
import com.claudelens.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    // 프로젝트 생성 (CLI init 호출)
    @Transactional
    public ProjectResponse create(String email, ProjectCreateRequest request) {
        User user = findUserByEmail(email);

        Project project = Project.builder()
                .user(user)
                .name(request.getName())
                .language(request.getLanguage())
                .framework(request.getFramework())
                .projectSize(request.getProjectSize())
                .devEnvironment(request.getDevEnvironment())
                .startedAt(LocalDateTime.now())
                .build();

        return ProjectResponse.from(projectRepository.save(project));
    }

    // 내 프로젝트 목록
    @Transactional(readOnly = true)
    public List<ProjectResponse> getMyProjects(String email) {
        User user = findUserByEmail(email);
        return projectRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(ProjectResponse::from)
                .collect(Collectors.toList());
    }

    // 프로젝트 상세
    @Transactional(readOnly = true)
    public ProjectResponse getProject(String email, UUID projectId) {
        User user = findUserByEmail(email);
        Project project = projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다"));
        return ProjectResponse.from(project);
    }

    // 프로젝트 수정 (CLI 종료 시 ended_at 업데이트)
    @Transactional
    public ProjectResponse update(String email, UUID projectId, ProjectUpdateRequest request) {
        User user = findUserByEmail(email);
        Project project = projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다"));

        if (request.getLanguage() != null) project.setLanguage(request.getLanguage());
        if (request.getFramework() != null) project.setFramework(request.getFramework());
        if (request.getProjectSize() != null) project.setProjectSize(request.getProjectSize());
        if (request.getDevEnvironment() != null) project.setDevEnvironment(request.getDevEnvironment());
        if (request.getEndedAt() != null) project.setEndedAt(request.getEndedAt());

        return ProjectResponse.from(projectRepository.save(project));
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("유저를 찾을 수 없습니다"));
    }
}
