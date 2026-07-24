package com.claudelens.backend.service;

import com.claudelens.backend.domain.InteractionLog;
import com.claudelens.backend.dto.ingest.IngestStatusResponse;
import com.claudelens.backend.dto.ingest.InteractionLogBatchRequest;
import com.claudelens.backend.dto.ingest.InteractionLogRequest;
import com.claudelens.backend.repository.InteractionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IngestService {

    private final InteractionLogRepository interactionLogRepository;

    // 단건 저장
    public void saveInteractionLog(InteractionLogRequest request) {
        InteractionLog log = buildLog(request);
        interactionLogRepository.save(log);
    }

    // 일괄 저장
    public void saveInteractionLogBatch(InteractionLogBatchRequest request) {
        List<InteractionLog> logs = request.getLogs().stream()
                .map(this::buildLog)
                .collect(Collectors.toList());
        interactionLogRepository.saveAll(logs);
    }

    // 수집 현황 조회
    public IngestStatusResponse getStatus(UUID projectId) {
        List<InteractionLog> logs = interactionLogRepository.findByProjectId(projectId);

        long totalLogs = logs.size();
        long retryCount = logs.stream().filter(InteractionLog::getIsRetry).count();
        long codeRequestCount = logs.stream().filter(InteractionLog::getIsCodeRequest).count();
        long errorRequestCount = logs.stream().filter(InteractionLog::getIsErrorRequest).count();
        long reviewRequestCount = logs.stream().filter(InteractionLog::getIsReviewRequest).count();
        long designRequestCount = logs.stream().filter(InteractionLog::getIsDesignRequest).count();

        double retryRate = totalLogs > 0
                ? Math.round((double) retryCount / totalLogs * 1000) / 10.0
                : 0.0;

        return IngestStatusResponse.builder()
                .totalLogs(totalLogs)
                .retryCount(retryCount)
                .retryRate(retryRate)
                .codeRequestCount(codeRequestCount)
                .errorRequestCount(errorRequestCount)
                .reviewRequestCount(reviewRequestCount)
                .designRequestCount(designRequestCount)
                .build();
    }

    // InteractionLog 빌드 + 자동 분류
    private InteractionLog buildLog(InteractionLogRequest request) {
        String prompt = request.getPromptText().toLowerCase();
        String response = request.getResponseText().toLowerCase();

        // 재요청 여부 감지
        boolean isRetry = prompt.contains("다시") || prompt.contains("또") ||
                prompt.contains("안 돼") || prompt.contains("안돼") ||
                prompt.contains("에러") || prompt.contains("오류");

        // 요청 유형 자동 분류
        boolean isCodeRequest = prompt.contains("코드") || prompt.contains("구현") ||
                prompt.contains("작성") || response.contains("```");

        boolean isErrorRequest = prompt.contains("에러") || prompt.contains("오류") ||
                prompt.contains("error") || prompt.contains("exception");

        boolean isReviewRequest = prompt.contains("리뷰") || prompt.contains("검토") ||
                prompt.contains("확인해") || prompt.contains("review");

        boolean isDesignRequest = prompt.contains("설계") || prompt.contains("구조") ||
                prompt.contains("architecture") || prompt.contains("어떻게 만들");

        return InteractionLog.builder()
                .projectId(request.getProjectId())
                .taskId(request.getTaskId())
                .promptText(request.getPromptText())
                .responseText(request.getResponseText())
                .isRetry(isRetry)
                .isCodeRequest(isCodeRequest)
                .isErrorRequest(isErrorRequest)
                .isReviewRequest(isReviewRequest)
                .isDesignRequest(isDesignRequest)
                .responseTimeMs(request.getResponseTimeMs())
                .requestedAt(request.getRequestedAt() != null
                        ? request.getRequestedAt()
                        : LocalDateTime.now())
                .build();
    }
}
