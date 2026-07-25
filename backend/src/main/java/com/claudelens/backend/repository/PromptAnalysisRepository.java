package com.claudelens.backend.repository;

import com.claudelens.backend.domain.PromptAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PromptAnalysisRepository extends JpaRepository<PromptAnalysis, UUID> {
    List<PromptAnalysis> findByProjectId(UUID projectId);
    void deleteByProjectId(UUID projectId);
}
