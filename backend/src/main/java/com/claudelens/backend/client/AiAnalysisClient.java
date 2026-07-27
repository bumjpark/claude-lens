package com.claudelens.backend.client;

import com.claudelens.backend.domain.InteractionLog;
import com.claudelens.backend.domain.User;
import com.claudelens.backend.dto.ai.AiAnalysisProgress;
import com.claudelens.backend.dto.ai.AiAnalyzeRequest;
import com.claudelens.backend.dto.ai.AiAnalyzeResponse;
import com.claudelens.backend.dto.ai.AiInteractionDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

@Component
public class AiAnalysisClient {

    private final RestClient restClient;

    public AiAnalysisClient(@Value("${ai.service.url:http://localhost:8000}") String aiServiceUrl) {
        // 기본 JDK HttpClient는 HTTP/2 업그레이드를 시도하는데, uvicorn(AI 서비스)이 이를
        // 처리하지 못해 요청 body가 깨진다. 순수 HTTP/1.1만 쓰는 요청 팩토리로 고정한다.
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(180_000); // 4단계 LLM 호출이 연쇄되어 오래 걸릴 수 있음

        this.restClient = RestClient.builder()
                .baseUrl(aiServiceUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public AiAnalyzeResponse analyze(UUID projectId, List<InteractionLog> logs, User user) {
        AiAnalyzeRequest request = new AiAnalyzeRequest(
                projectId.toString(),
                user.getRole(),
                user.getExperienceLevel(),
                logs.stream().map(this::toDto).toList());

        return restClient.post()
                .uri("/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(AiAnalyzeResponse.class);
    }

    public AiAnalysisProgress getProgress(UUID projectId) {
        return restClient.get()
                .uri("/analyze/{projectId}/status", projectId)
                .retrieve()
                .body(AiAnalysisProgress.class);
    }

    private AiInteractionDto toDto(InteractionLog log) {
        return new AiInteractionDto(
                log.getId(),
                log.getPromptText(),
                log.getResponseText(),
                Boolean.TRUE.equals(log.getIsRetry()),
                Boolean.TRUE.equals(log.getIsCodeRequest()),
                Boolean.TRUE.equals(log.getIsErrorRequest()),
                Boolean.TRUE.equals(log.getIsReviewRequest()),
                Boolean.TRUE.equals(log.getIsDesignRequest()));
    }
}
