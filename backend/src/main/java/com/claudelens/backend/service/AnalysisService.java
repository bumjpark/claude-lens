package com.claudelens.backend.service;

import com.claudelens.backend.client.AiAnalysisClient;
import com.claudelens.backend.domain.*;
import com.claudelens.backend.dto.ai.AiAnalysisProgress;
import com.claudelens.backend.dto.ai.AiAnalyzeResponse;
import com.claudelens.backend.dto.ai.AiConsultReviewResult;
import com.claudelens.backend.dto.ai.AiDeepAnalysisResult;
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
import java.util.Objects;
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
    private final TaskRepository taskRepository;
    private final PaymentRepository paymentRepository;
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

        AiAnalyzeResponse aiResponse = aiAnalysisClient.analyze(projectId, logs, user);

        savePromptAnalyses(project, aiResponse.getPromptAnalyses());
        Evaluation evaluation = saveEvaluation(project, aiResponse, logs);
        List<Recommendation> recommendations = saveRecommendations(evaluation, aiResponse.getRecommendations());

        return buildResponse(evaluation, recommendations, projectId);
    }

    @Transactional(readOnly = true)
    public AiAnalysisProgress getAnalysisProgress(String email, UUID projectId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("유저를 찾을 수 없습니다"));
        projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다"));

        return aiAnalysisClient.getProgress(projectId);
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

        return buildResponse(evaluation, recommendations, projectId);
    }

    private boolean isPaid(UUID projectId) {
        return paymentRepository.existsByProjectIdAndStatus(projectId, PaymentStatus.PAID);
    }

    // 재요청 때문에 추가로 걸린 시간과, 다른 사용자들 대비 백분위를 계산해서 응답에 얹는다.
    // 둘 다 DB 전체를 훑어야 해서(재요청 카운트는 Mongo, 백분위는 전체 Evaluation) 이 클래스
    // 안에서 계산해서 EvaluationResponse.from()에는 계산된 값만 넘긴다.
    private EvaluationResponse buildResponse(Evaluation evaluation, List<Recommendation> recommendations, UUID projectId) {
        long retryCount = interactionLogRepository.countByProjectIdAndIsRetryTrue(projectId);
        Integer avgResponseTimeMs = evaluation.getAvgResponseTimeMs();
        Integer estimatedWastedMinutes = avgResponseTimeMs == null
                ? null
                : (int) Math.round(retryCount * avgResponseTimeMs / 60000.0);

        PeerStats peerStats = computePeerStats(evaluation);

        return EvaluationResponse.from(
                evaluation,
                recommendations,
                isPaid(projectId),
                (int) retryCount,
                estimatedWastedMinutes,
                peerStats.percentile(),
                peerStats.peerCount());
    }

    // 비교 대상(전체 평가 건수)이 너무 적으면 백분위가 의미 없어서 null로 둔다 — 서비스 초기라
    // 실사용자가 몇 명 안 될 때 "상위 90%" 같은 왜곡된 숫자를 보여주지 않기 위함.
    private static final int MIN_PEERS_FOR_PERCENTILE = 5;

    private record PeerStats(Integer percentile, int peerCount) {}

    private PeerStats computePeerStats(Evaluation current) {
        List<Evaluation> all = evaluationRepository.findAll();
        int peerCount = all.size();
        if (peerCount < MIN_PEERS_FOR_PERCENTILE) {
            return new PeerStats(null, peerCount);
        }

        double myTotal = EvaluationResponse.computeConsultTotal(current);
        long scoredBelowMe = all.stream()
                .filter(e -> !e.getId().equals(current.getId()))
                .mapToDouble(EvaluationResponse::computeConsultTotal)
                .filter(total -> total < myTotal)
                .count();
        double percentileRank = 100.0 * scoredBelowMe / (peerCount - 1); // 나보다 낮은 사람 비율
        int topPercent = (int) Math.round(100 - percentileRank); // "상위 N%"로 바로 쓸 수 있는 값
        return new PeerStats(topPercent, peerCount);
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

    private Evaluation saveEvaluation(Project project, AiAnalyzeResponse aiResponse, List<InteractionLog> logs) {
        AiDeepAnalysisResult deepAnalysis = aiResponse.getDeepAnalysis();
        AiConsultReviewResult consultReview = aiResponse.getConsultReview();
        Evaluation evaluation = evaluationRepository.findByProjectId(project.getId())
                .orElseGet(Evaluation::new);

        evaluation.setProject(project);
        evaluation.setMaturityLevel(consultReview.getMaturityLevel());
        evaluation.setGrade(consultReview.getGrade());
        evaluation.setAgentUsageAnalysis(consultReview.getAgentUsageAnalysis());
        evaluation.setConsultCategories(consultReview.getCategories().stream()
                .map(c -> ConsultCategoryItem.builder()
                        .category(c.getCategory())
                        .score(c.getScore())
                        .positiveNote(c.getPositiveNote())
                        .improvementNote(c.getImprovementNote())
                        .build())
                .toList());
        evaluation.setConsultSummary(consultReview.getConsultSummary());

        evaluation.setKeyConclusions(deepAnalysis.getKeyConclusions());
        evaluation.setCaseStudies(deepAnalysis.getCaseStudies().stream()
                .map(c -> CaseStudyItem.builder()
                        .title(c.getTitle())
                        .structuralIssue(c.getStructuralIssue())
                        .interpretation(c.getInterpretation())
                        .evidence(c.getEvidence())
                        .build())
                .toList());
        evaluation.setStrengths(deepAnalysis.getStrengths());
        evaluation.setWeaknesses(deepAnalysis.getWeaknesses());
        evaluation.setInteractionPatterns(deepAnalysis.getInteractionPatterns().stream()
                .map(p -> InteractionPatternItem.builder()
                        .patternName(p.getPatternName())
                        .description(p.getDescription())
                        .build())
                .toList());
        evaluation.setPatternAnalysis(deepAnalysis.getPatternAnalysis());
        evaluation.setEvaluatedAt(LocalDateTime.now());

        int commitCount = taskRepository.findByProjectId(project.getId()).stream()
                .mapToInt(Task::getCommitCount)
                .sum();
        List<Integer> responseTimes = logs.stream()
                .map(InteractionLog::getResponseTimeMs)
                .filter(Objects::nonNull)
                .sorted()
                .toList();

        evaluation.setCommitCount(commitCount);
        evaluation.setInteractionCount(logs.size());
        evaluation.setAvgResponseTimeMs(average(responseTimes));
        evaluation.setMedianResponseTimeMs(median(responseTimes));
        evaluation.setActivitySummary(deepAnalysis.getTaskFlowAnalysis());

        return evaluationRepository.save(evaluation);
    }

    private Integer average(List<Integer> values) {
        if (values.isEmpty()) return null;
        return (int) Math.round(values.stream().mapToInt(Integer::intValue).average().orElse(0));
    }

    private Integer median(List<Integer> sortedValues) {
        if (sortedValues.isEmpty()) return null;
        int mid = sortedValues.size() / 2;
        if (sortedValues.size() % 2 == 0) {
            return (sortedValues.get(mid - 1) + sortedValues.get(mid)) / 2;
        }
        return sortedValues.get(mid);
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
