package com.claudelens.backend.repository;

import com.claudelens.backend.domain.InteractionLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

public interface InteractionLogRepository extends MongoRepository<InteractionLog, String> {
    List<InteractionLog> findByProjectId(UUID projectId);
    List<InteractionLog> findByProjectIdAndTaskId(UUID projectId, UUID taskId);
    long countByProjectIdAndIsRetryTrue(UUID projectId);
}
