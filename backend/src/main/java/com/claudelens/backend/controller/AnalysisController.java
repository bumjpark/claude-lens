package com.claudelens.backend.controller;

import com.claudelens.backend.dto.ai.AiAnalysisProgress;
import com.claudelens.backend.dto.analysis.EvaluationResponse;
import com.claudelens.backend.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects/{projectId}")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;

    // AI 분석 실행 (프로젝트 소유자만). Claude API 여러 번 연쇄 호출이라 수십 초 걸릴 수 있음.
    @PostMapping("/analyze")
    public ResponseEntity<EvaluationResponse> analyze(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(
                analysisService.analyze(userDetails.getUsername(), projectId));
    }

    // 분석 진행 상태 폴링 (프론트에서 분석 중 1초 간격으로 조회)
    @GetMapping("/analyze/status")
    public ResponseEntity<AiAnalysisProgress> getAnalysisProgress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(
                analysisService.getAnalysisProgress(userDetails.getUsername(), projectId));
    }

    // 가장 최근 분석 결과 조회
    @GetMapping("/evaluation")
    public ResponseEntity<EvaluationResponse> getEvaluation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(
                analysisService.getEvaluation(userDetails.getUsername(), projectId));
    }
}
