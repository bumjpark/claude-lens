package com.claudelens.backend.service;

import com.claudelens.backend.client.AiAnalysisClient;
import com.claudelens.backend.domain.*;
import com.claudelens.backend.dto.ai.AiAnalyzeResponse;
import com.claudelens.backend.dto.ai.AiPromptAnalysisResult;
import com.claudelens.backend.dto.ai.AiRecommendationResult;
import com.claudelens.backend.dto.analysis.EvaluationResponse;
import com.claudelens.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final InteractionLogRepository interactionLogRepository;
    private final PromptAnalysisRepository promptAnalysisRepository;
    private final EvaluationRepository evaluationRepository;
    private final RecommendationRepository recommendationRepository;
    private final AiAnalysisClient aiAnalysisClient;

    @Transactional
    public EvaluationResponse analyze(String email, UUID projectId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("유저를 찾을 수 없습니다"));
        Project project = projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다"));

        List<InteractionLog> logs = interactionLogRepository.findByProjectId(projectId);
        if (logs.isEmpty()) {
            throw new IllegalArgumentException("분석할 대화 로그가 없습니다");
        }

        AiAnalyzeResponse aiResponse = aiAnalysisClient.analyze(projectId, logs);

        savePromptAnalyses(project, aiResponse.getPromptAnalyses());
        Evaluation evaluation = saveEvaluation(project, aiResponse);
        List<Recommendation> recommendations = saveRecommendations(evaluation, aiResponse.getRecommendations());

        return EvaluationResponse.from(evaluation, recommendations);
    }

    @Transactional(readOnly = true)
    public EvaluationResponse getEvaluation(String email, UUID projectId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("유저를 찾을 수 없습니다"));
        projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다"));

        Evaluation evaluation = evaluationRepository.findByProjectId(projectId)
                .orElseThrow(() -> new IllegalArgumentException("아직 분석 결과가 없습니다. 먼저 분석을 실행해주세요"));
        List<Recommendation> recommendations =
                recommendationRepository.findByEvaluationIdOrderByOrderIndex(evaluation.getId());

        return EvaluationResponse.from(evaluation, recommendations);
    }

    // 재분석 시 이전 결과를 지우고 새로 채운다 (누적이 아니라 최신 분석으로 대체)
    private void savePromptAnalyses(Project project, List<AiPromptAnalysisResult> results) {
        promptAnalysisRepository.deleteByProjectId(project.getId());
        List<PromptAnalysis> analyses = results.stream()
                .map(r -> PromptAnalysis.builder()
                        .logId(r.getLogId())
                        .project(project)
                        .promptType(r.getPromptType())
                        .contextScore(r.getContextScore())
                        .clarityScore(r.getClarityScore())
                        .constraintScore(r.getConstraintScore())
                        .goalScore(r.getGoalScore())
                        .totalQualityScore(r.getTotalQualityScore())
                        .evidence(r.getEvidence())
                        .build())
                .toList();
        promptAnalysisRepository.saveAll(analyses);
    }

    private Evaluation saveEvaluation(Project project, AiAnalyzeResponse aiResponse) {
        var result = aiResponse.getEvaluation();
        Evaluation evaluation = evaluationRepository.findByProjectId(project.getId())
                .orElseGet(Evaluation::new);

        evaluation.setProject(project);
        evaluation.setMaturityLevel(result.getMaturityLevel());
        evaluation.setPromptQualityScore(result.getPromptQualityScore());
        evaluation.setEfficiencyScore(result.getEfficiencyScore());
        evaluation.setContextUsageScore(result.getContextUsageScore());
        evaluation.setValidationScore(result.getValidationScore());
        evaluation.setCollaborationScore(result.getCollaborationScore());
        evaluation.setTotalScore(result.getTotalScore());
        evaluation.setGrade(result.getGrade());
        evaluation.setStrengths(result.getStrengths());
        evaluation.setWeaknesses(result.getWeaknesses());
        evaluation.setEvaluatedAt(LocalDateTime.now());

        return evaluationRepository.save(evaluation);
    }

    private List<Recommendation> saveRecommendations(Evaluation evaluation, List<AiRecommendationResult> results) {
        recommendationRepository.deleteByEvaluationId(evaluation.getId());
        List<Recommendation> recommendations = new ArrayList<>();
        for (int i = 0; i < results.size(); i++) {
            AiRecommendationResult r = results.get(i);
            recommendations.add(Recommendation.builder()
                    .evaluation(evaluation)
                    .category(r.getCategory())
                    .priority(r.getPriority())
                    .problem(r.getProblem())
                    .evidence(r.getEvidence())
                    .suggestion(r.getSuggestion())
                    .examplePrompt(r.getExamplePrompt())
                    .orderIndex(i)
                    .build());
        }
        return recommendationRepository.saveAll(recommendations);
    }
}
