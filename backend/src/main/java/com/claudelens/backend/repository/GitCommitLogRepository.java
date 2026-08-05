package com.claudelens.backend.repository;

import com.claudelens.backend.domain.GitCommitLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

public interface GitCommitLogRepository extends MongoRepository<GitCommitLog, String> {
    List<GitCommitLog> findByProjectId(UUID projectId);
    List<GitCommitLog> findByProjectIdAndCommitHashIn(UUID projectId, List<String> commitHashes);
}
