package com.claudelens.backend.controller;

import com.claudelens.backend.dto.project.ProjectCreateRequest;
import com.claudelens.backend.dto.project.ProjectResponse;
import com.claudelens.backend.dto.project.ProjectUpdateRequest;
import com.claudelens.backend.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ProjectCreateRequest request) {
        return ResponseEntity.ok(
                projectService.create(userDetails.getUsername(), request));
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getMyProjects(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                projectService.getMyProjects(userDetails.getUsername()));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> getProject(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(
                projectService.getProject(userDetails.getUsername(), projectId));
    }

    @PatchMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID projectId,
            @RequestBody ProjectUpdateRequest request) {
        return ResponseEntity.ok(
                projectService.update(userDetails.getUsername(), projectId, request));
    }
}
