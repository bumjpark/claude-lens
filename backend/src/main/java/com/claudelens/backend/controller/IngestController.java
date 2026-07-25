package com.claudelens.backend.controller;

import com.claudelens.backend.dto.ingest.IngestStatusResponse;
import com.claudelens.backend.dto.ingest.InteractionLogBatchRequest;
import com.claudelens.backend.dto.ingest.InteractionLogRequest;
import com.claudelens.backend.security.ApiKeyAuthenticationFilter;
import com.claudelens.backend.service.IngestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ingest")
@RequiredArgsConstructor
public class IngestController {

    private final IngestService ingestService;

    // 단건 전송
    @PostMapping("/interaction")
    public ResponseEntity<Void> saveInteractionLog(
            HttpServletRequest httpRequest,
            @Valid @RequestBody InteractionLogRequest request) {
        requireOwnProject(httpRequest, request.getProjectId());
        ingestService.saveInteractionLog(request);
        return ResponseEntity.ok().build();
    }

    // 일괄 업로드
    @PostMapping("/interaction/batch")
    public ResponseEntity<Void> saveInteractionLogBatch(
            HttpServletRequest httpRequest,
            @Valid @RequestBody InteractionLogBatchRequest request) {
        request.getLogs().forEach(log -> requireOwnProject(httpRequest, log.getProjectId()));
        ingestService.saveInteractionLogBatch(request);
        return ResponseEntity.ok().build();
    }

    // 수집 현황 확인
    @GetMapping("/status/{projectId}")
    public ResponseEntity<IngestStatusResponse> getStatus(
            HttpServletRequest httpRequest,
            @PathVariable UUID projectId) {
        requireOwnProject(httpRequest, projectId);
        return ResponseEntity.ok(ingestService.getStatus(projectId));
    }

    // API Key가 인증한 프로젝트와 요청 본문의 projectId가 일치하는지 검증한다.
    // (다른 프로젝트의 apiKey로 남의 projectId에 로그를 끼워넣는 것을 방지)
    private void requireOwnProject(HttpServletRequest httpRequest, UUID projectId) {
        Object authenticatedProjectId = httpRequest.getAttribute(
                ApiKeyAuthenticationFilter.AUTHENTICATED_PROJECT_ID_ATTRIBUTE);
        if (!authenticatedProjectId.equals(projectId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "API Key가 이 프로젝트에 대한 권한이 없습니다");
        }
    }
}
