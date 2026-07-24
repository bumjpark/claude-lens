package com.claudelens.backend.controller;

import com.claudelens.backend.dto.ingest.IngestStatusResponse;
import com.claudelens.backend.dto.ingest.InteractionLogBatchRequest;
import com.claudelens.backend.dto.ingest.InteractionLogRequest;
import com.claudelens.backend.service.IngestService;
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
            @Valid @RequestBody InteractionLogRequest request) {
        ingestService.saveInteractionLog(request);
        return ResponseEntity.ok().build();
    }

    // 일괄 업로드
    @PostMapping("/interaction/batch")
    public ResponseEntity<Void> saveInteractionLogBatch(
            @Valid @RequestBody InteractionLogBatchRequest request) {
        ingestService.saveInteractionLogBatch(request);
        return ResponseEntity.ok().build();
    }

    // 수집 현황 확인
    @GetMapping("/status/{projectId}")
    public ResponseEntity<IngestStatusResponse> getStatus(
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(ingestService.getStatus(projectId));
    }
}
