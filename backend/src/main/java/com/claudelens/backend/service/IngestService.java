package com.claudelens.backend.service;

import com.claudelens.backend.domain.GitCommitLog;
import com.claudelens.backend.domain.InteractionLog;
import com.claudelens.backend.dto.ingest.GitCommitLogBatchRequest;
import com.claudelens.backend.dto.ingest.GitCommitLogRequest;
import com.claudelens.backend.dto.ingest.IngestStatusResponse;
import com.claudelens.backend.dto.ingest.InteractionLogBatchRequest;
import com.claudelens.backend.dto.ingest.InteractionLogRequest;
import com.claudelens.backend.repository.GitCommitLogRepository;
import com.claudelens.backend.repository.InteractionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IngestService {

    private final InteractionLogRepository interactionLogRepository;
    private final GitCommitLogRepository gitCommitLogRepository;

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

    // 커밋 이력 일괄 저장 — 커밋 해시는 안정적인 고유 식별자라, 프롬프트 로그와 달리
    // 이미 저장된 해시는 걸러내고 새 커밋만 넣는다 (동기화 커서 경계가 겹쳐도 중복 저장 방지).
    public void saveGitCommitLogBatch(GitCommitLogBatchRequest request) {
        List<GitCommitLogRequest> incoming = request.getCommits();
        if (incoming.isEmpty()) return;

        UUID projectId = incoming.get(0).getProjectId();
        List<String> hashes = incoming.stream().map(GitCommitLogRequest::getCommitHash).toList();
        Set<String> existingHashes = gitCommitLogRepository.findByProjectIdAndCommitHashIn(projectId, hashes)
                .stream()
                .map(GitCommitLog::getCommitHash)
                .collect(Collectors.toSet());

        List<GitCommitLog> logs = incoming.stream()
                .filter(c -> !existingHashes.contains(c.getCommitHash()))
                .map(c -> GitCommitLog.builder()
                        .projectId(c.getProjectId())
                        .commitHash(c.getCommitHash())
                        .message(c.getMessage())
                        .filesChanged(c.getFilesChanged())
                        .committedAt(c.getCommittedAt() != null ? c.getCommittedAt() : LocalDateTime.now())
                        .build())
                .toList();
        gitCommitLogRepository.saveAll(logs);
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

    // "에러 없이 잘 됩니다"처럼 에러/오류를 부정하는 문구가 있으면 실제로는 에러 얘기가
    // 아니므로, 이런 경우는 에러 관련 키워드가 있어도 에러 요청으로 보지 않는다.
    private static final List<String> ERROR_NEGATION_PHRASES = List.of(
            "에러 없이", "에러없이", "오류 없이", "오류없이",
            "에러 없음", "오류 없음", "에러 없고", "오류 없고",
            "에러가 아니", "오류가 아니", "에러는 아니", "오류는 아니"
    );

    private boolean mentionsErrorWithoutNegation(String text) {
        boolean mentionsError = text.contains("에러") || text.contains("오류") ||
                text.contains("error") || text.contains("exception");
        if (!mentionsError) return false;
        return ERROR_NEGATION_PHRASES.stream().noneMatch(text::contains);
    }

    // InteractionLog 빌드 + 자동 분류
    private InteractionLog buildLog(InteractionLogRequest request) {
        String prompt = request.getPromptText().toLowerCase();
        String response = request.getResponseText().toLowerCase();

        boolean isErrorRequest = mentionsErrorWithoutNegation(prompt);

        // 재요청 여부 감지 — "또"는 "또한"처럼 재요청과 무관한 단어에도 흔히 섞여있고,
        // 에러/오류 키워드는 isErrorRequest와 개념이 겹쳐서(에러를 "언급"한 것과 "다시
        // 요청"한 것은 다름) 여기서는 제외하고 반복/실패를 직접 나타내는 표현만 본다.
        boolean isRetry = prompt.contains("다시") ||
                prompt.contains("안 돼") || prompt.contains("안돼") || prompt.contains("안됨") ||
                prompt.contains("여전히") || prompt.contains("아직도");

        // 요청 유형 자동 분류
        boolean isCodeRequest = prompt.contains("코드") || prompt.contains("구현") ||
                prompt.contains("작성") || response.contains("```");

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
